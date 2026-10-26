import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { todaySummarySchema, monthSummarySchema, sessionResponseSchema, currentMenuResponseSchema, formatDate, formatMonth, formatPrice, formatDateTime } from '@kofi/contracts';

const TARGET = 'https://kofi-web.onrender.com';
const ROLES = ['owner', 'cashier'];
class MeasurementError extends Error {}
function duration(value) {
  if (!Number.isFinite(value) || value < 0) throw new MeasurementError('La duración no es válida.');
  return value;
}
export function buildReport(input, metadata = {}) {
  if (!Number.isInteger(metadata.productCount) || metadata.productCount < 200 || metadata.monthlySalesCount !== 6000)
    throw new MeasurementError('Se requieren al menos 200 productos vigentes y 6000 ventas del mes.');
  const summarize = values => {
    if (!Array.isArray(values) || values.length !== 20) throw new MeasurementError('Se requieren veinte muestras por operación.');
    const durationsMs = values.map(duration);
    return { durationsMs, limitMs: 2000, underLimit: durationsMs.filter(ms => ms < 2000).length, p95Ms: [...durationsMs].sort((a,b) => a-b)[18] };
  };
  const roles = {};
  for (const role of ROLES) if (input[role]) {
    const { openMs, refreshMs, humanMs } = input[role];
    roles[role] = { open: summarize(openMs), refresh: summarize(refreshMs), human: { durationMs: duration(humanMs), limitMs: 10000, passed: humanMs < 10000 } };
  }
  const complete = ROLES.every(role => roles[role]);
  return { target: TARGET, measuredAtBolivia: new Date().toLocaleString('sv-SE', { timeZone: 'America/La_Paz' }), timeZone: 'America/La_Paz', localCommit: metadata.localCommit ?? null, browserVersion: metadata.browserVersion ?? null, platform: process.platform, nodeVersion: process.versions.node, productCount: metadata.productCount, monthlySalesCount: metadata.monthlySalesCount, month: metadata.month, excludedWarmupPerOperation: 1, complete, roles, rnf3Passed: complete && ROLES.every(role => roles[role].open.underLimit >= 19 && roles[role].refresh.underLimit >= 19), humanPassed: complete && ROLES.every(role => roles[role].human.passed) };
}
export async function measureCycles(driver) {
  const samples = {};
  for (const [operation, field] of [['openSummary','openMs'], ['refreshSummary','refreshMs']]) {
    await driver[operation]();
    samples[field] = [];
    for (let index=0; index<20; index++) samples[field].push(duration(await driver[operation]()));
  }
  return samples;
}
export async function createBrowserDriver(role, options = {}) {
  const chromium = options.chromium ?? (await import('@playwright/test')).chromium;
  const browser = await chromium.launch({ headless: options.headless ?? false });
  const target = options.target ?? TARGET;
  try {
    const context = await browser.newContext({ baseURL: target });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    await page.goto('/ingresar');
    const json = async (response, schema) => {
      if (typeof response.finished === 'function') await response.finished();
      if (response.status() !== 200) throw new MeasurementError('La API rechazó la consulta. La medición se detuvo sin reintentar.');
      return schema.parse(await response.json());
    };
    const paint = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const show = async (summary, period) => {
      const name = period === 'today' ? `Hoy · ${formatDate(summary.date)}` : formatMonth(summary.month);
      const section = page.getByRole('region', { name, exact: true });
      await section.waitFor();
      await section.getByText(`Datos al ${formatDateTime(summary.asOf)}`, { exact: true }).waitFor();
      for (const [index, text] of [formatPrice(summary.totalCents), `${summary.salesCount} ${summary.salesCount === 1 ? 'venta' : 'ventas'}`, summary.averageTicketCents === null ? '—' : formatPrice(summary.averageTicketCents)].entries()) {
        await section.locator('dd').nth(index).filter({ hasText: text }).waitFor();
      }
      if (period === 'month') {
        const rows = section.getByRole('table', { name: 'Ventas por día' }).getByRole('row');
        if (await rows.count() !== summary.days.length + 1) throw new MeasurementError('La tabla del mes no coincide con la respuesta.');
      }
    };
    const responseFor = path => {
      const result = page.waitForResponse(response => response.url() === new URL(path,target).href && response.request().method() === 'GET');
      void result.catch(() => {});
      return result;
    };
    const querySummary = async action => {
      const today = responseFor('/api/dashboard/today');
      const month = role === 'owner' ? responseFor('/api/dashboard/month') : null;
      const start = performance.now();
      await action();
      const daily = await json(await today,todaySummarySchema);
      const monthly = month ? await json(await month,monthSummarySchema) : null;
      await page.getByRole('status').waitFor({ state: 'hidden' });
      await show(daily,'today');
      if (monthly) {
        if (monthly.salesCount !== 6000) throw new MeasurementError('Cambió el volumen de ventas durante la medición.');
        await show(monthly,'month');
      } else if (await page.locator('#month-title').count()) throw new MeasurementError('El cajero no debe ver el mes.');
      await paint();
      if (new URL(page.url()).origin !== new URL(target).origin) throw new MeasurementError('El navegador salió del sitio de comprobación.');
      return duration(performance.now()-start);
    };
    return {
      async login() {
        await page.getByRole('heading', { name: 'Kofi POS', exact: true }).waitFor({ timeout: 600000 });
        const { user } = await json(await page.request.get('/api/auth/session'),sessionResponseSchema);
        if (user.role !== role) throw new MeasurementError(`Ingresa con el rol ${role === 'owner' ? 'Dueño' : 'Cajero'} y vuelve a ejecutar.`);
      },
      async inspect() {
        const menu = await json(await page.request.get('/api/menu'),currentMenuResponseSchema);
        const productCount = menu.categories.reduce((sum,category) => sum+category.products.length,0);
        if (role === 'owner') {
          const month = await json(await page.request.get('/api/dashboard/month'),monthSummarySchema);
          return { productCount, monthlySalesCount: month.salesCount, month: month.month, browserVersion: browser.version() };
        }
        const denied = await page.request.get('/api/dashboard/month');
        if (denied.status() !== 403) throw new MeasurementError('El mes debe rechazar al cajero con 403.');
        return { productCount };
      },
      async openSummary() {
        await page.goto('/');
        const link = page.getByRole('link', { name: 'Resumen de ventas', exact: true });
        await link.waitFor();
        return querySummary(() => link.click());
      },
      async refreshSummary() {
        return querySummary(() => page.getByRole('button', { name: 'Actualizar', exact: true }).click());
      },
      async humanReadTotal() {
        await page.goto('/');
        await page.getByRole('link', { name: 'Resumen de ventas', exact: true }).waitFor();
        // Controles del medidor, fuera de React. La persona navega y confirma su propia lectura.
        await page.evaluate(() => {
          const panel = document.createElement('aside');
          panel.id = 'kofi-dashboard-measurement';
          panel.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:2147483647;background:white;color:black;border:2px solid black;padding:12px;max-width:320px;font:16px sans-serif';
          const text = document.createElement('p');
          text.textContent = 'Prueba humana: pulsa Comenzar, abre Resumen de ventas y lee el total de hoy. Después confirma que lo identificaste.';
          const start = document.createElement('button'); start.textContent = 'Comenzar';
          const done = document.createElement('button'); done.textContent = 'Ya identifiqué el total de hoy'; done.disabled = true;
          start.onclick = () => {
            if (location.pathname !== '/') return;
            panel.dataset.start = String(performance.now()); start.disabled = true; done.disabled = false;
          };
          done.onclick = () => {
            if (location.pathname !== '/resumen' || !document.querySelector('#today-title') || document.querySelector('[role="status"]')) return;
            panel.dataset.duration = String(performance.now()-Number(panel.dataset.start)); done.disabled = true;
          };
          panel.append(text,start,done); document.body.append(panel);
        });
        await page.waitForFunction(() => Boolean(document.getElementById('kofi-dashboard-measurement')?.dataset.duration), undefined, { timeout: 600000 });
        const elapsed = await page.evaluate(() => {
          const panel = document.getElementById('kofi-dashboard-measurement');
          const value = Number(panel.dataset.duration); panel.remove(); return value;
        });
        return duration(elapsed);
      },
      async close() {
        try { await context.request.post('/api/auth/logout', { timeout: 10000 }); }
        catch { /* Sin detalles de sesión. */ }
        finally { await browser.close(); }
      },
    };
  } catch {
    await browser.close();
    throw new MeasurementError('No se pudo abrir Chromium. Comprueba el despliegue y el navegador.');
  }
}
export async function runMeasurement({ io, args, env, createDriver, saveReport, metadata = {} }) {
  let driver;
  try {
    if (args.length || env.DEBUG || env.PWDEBUG || !io.interactive) throw new MeasurementError('Ejecuta sin argumentos, sin depuración y desde una terminal interactiva.');
    const input = {};
    let inspected;
    for (const role of ROLES) {
      io.write(`Ingresa como ${role === 'owner' ? 'Dueño' : 'Cajero'} en Chromium. Escribe la contraseña solo en el navegador.`);
      driver = await createDriver(role);
      await driver.login();
      const size = await driver.inspect();
      if (role === 'owner') {
        inspected = { ...metadata, ...size };
        buildReport({},inspected);
      } else if (size.productCount !== inspected.productCount) throw new MeasurementError('Cambió el volumen de productos durante la medición.');
      io.write('Midiendo veinte aperturas y veinte actualizaciones. No uses Chromium hasta que aparezcan los controles de la prueba humana.');
      const samples = await measureCycles(driver);
      io.write('Prueba humana: en Chromium pulsa Comenzar, abre Resumen de ventas, identifica el total de hoy y pulsa Ya identifiqué el total de hoy. El medidor no hará ese recorrido por ti.');
      input[role] = { ...samples, humanMs: await driver.humanReadTotal() };
      await saveReport(buildReport(input,inspected));
      await driver.close(); driver = null;
    }
    const report = buildReport(input,inspected);
    io.write(`RNF-3: ${report.rnf3Passed ? 'cumple' : 'no cumple'}. Recorridos humanos: ${report.humanPassed ? 'cumplen' : 'no cumplen'}. Informe guardado sin credenciales.`);
    return report.rnf3Passed && report.humanPassed ? 0 : 1;
  } catch (error) {
    io.write(error instanceof MeasurementError ? error.message : 'La medición se detuvo sin imprimir datos privados ni repetir operaciones.');
    return 1;
  } finally { try { await driver?.close(); } catch { /* Sin trazas privadas. */ } }
}
async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const git = (...args) => execFileSync('git',args,{ cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'] }).trim();
  process.exitCode = await runMeasurement({
    io: { interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY), write: message => process.stdout.write(`${message}\n`) },
    args: process.argv.slice(2), env: process.env, metadata: { localCommit: git('rev-parse','HEAD') },
    createDriver: role => createBrowserDriver(role),
    async saveReport(report) { await writeFile(resolve(root,git('rev-parse','--git-path','dashboard-performance.json')),`${JSON.stringify(report,null,2)}\n`,{ mode:0o600 }); },
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => { process.stderr.write('No se pudo completar la medición.\n'); process.exitCode=1; });
