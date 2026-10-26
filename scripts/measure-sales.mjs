import { createInterface } from 'node:readline/promises';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  saleQuoteSchema,
  saleResponseSchema,
  sessionResponseSchema,
  formatPrice,
  formatDateTime,
  formatPaymentMethod,
} from '@kofi/contracts';

const TARGET = 'https://kofi-web.onrender.com';
const COUNT = 20;
class MeasurementError extends Error {}
function duration(value) {
  if (!Number.isFinite(value) || value < 0)
    throw new MeasurementError('La medición no tiene un tiempo válido.');
  return value;
}
export function buildReport(samples, humanMs, metadata = {}) {
  if (metadata.productCount !== 200)
    throw new MeasurementError('La medición requiere exactamente 200 productos de prueba.');
  function summarize(values, limitMs) {
    if (!Array.isArray(values) || values.length !== COUNT)
      throw new MeasurementError('Se requieren veinte resultados por operación.');
    const durationsMs = values.map(duration);
    return {
      durationsMs,
      limitMs,
      underLimit: durationsMs.filter((ms) => ms < limitMs).length,
      p95Ms: [...durationsMs].sort((a, b) => a - b)[18],
    };
  }
  const open = summarize(samples.openMs, 2000),
    change = summarize(samples.changeMs, 1000),
    register = summarize(samples.registerMs, 2000);
  return {
    target: TARGET,
    localCommit: metadata.localCommit ?? null,
    measuredAtBolivia: new Date().toLocaleString('sv-SE', { timeZone: 'America/La_Paz' }),
    timeZone: 'America/La_Paz',
    productCount: 200,
    excludedWarmupPerOperation: 1,
    automatedSales: 21,
    open,
    change,
    register,
    rnf3Passed: [open, change, register].every((operation) => operation.underLimit >= 19),
    humanSale:
      humanMs === null
        ? null
        : { durationMs: duration(humanMs), limitMs: 30000, lineCount: 3, passed: humanMs < 30000 },
  };
}
export async function measureCycles(driver) {
  const result = {};
  for (const [operation, field] of [
    ['openSale', 'openMs'],
    ['changeDraft', 'changeMs'],
    ['registerSale', 'registerMs'],
  ]) {
    await driver[operation]();
    result[field] = [];
    for (let i = 0; i < COUNT; i++) result[field].push(duration(await driver[operation]()));
  }
  return result;
}

export async function createBrowserDriver(target = TARGET, options = {}) {
  const chromium = options.chromium ?? (await import('@playwright/test')).chromium;
  const browser = await chromium.launch({ headless: options.headless ?? false });
  try {
    const context = await browser.newContext({ baseURL: target });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    const origin = new URL(target).origin;
    let quote, first;
    const assertOrigin = () => {
      if (new URL(page.url()).origin !== origin)
        throw new MeasurementError('El navegador salió del sitio de comprobación.');
    };
    const responseFor = (path, method, timeout = 90000) => {
      const response = page.waitForResponse(
        (response) =>
          response.url() === new URL(path, target).href && response.request().method() === method,
        { timeout },
      );
      void response.catch(() => {});
      return response;
    };
    const jsonResponse = async (response, status) => {
      await response.finished();
      if (response.status() !== status)
        throw new MeasurementError(
          'La API rechazó una operación. La medición se detuvo sin reintentar.',
        );
      return response.json();
    };
    const paint = () =>
      page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    const productButton = (product) =>
      page.getByRole('button', {
        name: `${product.name} · ${formatPrice(product.priceCents)}`,
        exact: true,
      });
    const showQuote = async (calculated) => {
      await page.waitForFunction(
        (expected) =>
          document.querySelector('output[aria-label="Total de la venta"]')?.textContent ===
          expected,
        formatPrice(calculated.totalCents),
      );
      await paint();
      assertOrigin();
      quote = calculated;
      if (
        (await page
          .getByRole('region', { name: 'Productos para vender', exact: true })
          .getByRole('button')
          .count()) !== 200
      )
        throw new MeasurementError('La interfaz no muestra los 200 productos de prueba.');
    };
    const openSale = async () => {
      assertOrigin();
      const response = responseFor('/api/sales/quote', 'POST');
      const start = performance.now();
      await page.goto('/ventas/nueva');
      const calculated = saleQuoteSchema.parse(await jsonResponse(await response, 200));
      const products = calculated.menu.flatMap((category) => category.products);
      if (
        products.length !== 200 ||
        !products.every(
          (product, index) =>
            product.name === `Producto de prueba ${String(index + 1).padStart(3, '0')}`,
        )
      )
        throw new MeasurementError(
          'Se requieren los 200 productos vigentes de seed:menu; no se midió otro menú.',
        );
      first = products[0];
      await productButton(products.at(-1)).waitFor({ state: 'visible' });
      await showQuote(calculated);
      return duration(performance.now() - start);
    };
    const addFirst = async () => {
      const response = responseFor('/api/sales/quote', 'POST');
      await productButton(first).click();
      await showQuote(saleQuoteSchema.parse(await jsonResponse(await response, 200)));
    };
    const showSale = async (sale) => {
      await page
        .getByText(
          `Venta N.º ${sale.number} registrada · ${formatPrice(sale.totalCents)} · ${formatPaymentMethod(sale.paymentMethod)} · ${formatDateTime(sale.registeredAt)}`,
          { exact: true },
        )
        .waitFor({ state: 'visible' });
      await page
        .getByText('Elige los productos de la venta', { exact: true })
        .waitFor({ state: 'visible' });
      await paint();
      assertOrigin();
      if (
        (await page.getByLabel('Efectivo', { exact: true }).isChecked()) ||
        (await page.getByLabel('QR', { exact: true }).isChecked())
      )
        throw new MeasurementError('La preparación no se vació después del registro.');
      quote = { ...quote, lines: [], totalCents: 0, notices: [] };
    };
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).waitFor({ state: 'visible' });
    return {
      async login() {
        await jsonResponse(await responseFor('/api/auth/login', 'POST', 600000), 200);
        await page
          .getByRole('link', { name: 'Nueva venta', exact: true })
          .waitFor({ state: 'visible' });
        assertOrigin();
      },
      async inspect() {
        assertOrigin();
        const session = await context.request.get('/api/auth/session');
        if (session.status() !== 200)
          throw new MeasurementError('La medición necesita una sesión válida.');
        sessionResponseSchema.parse(await session.json());
        await openSale();
        return { productCount: quote.menu.flatMap((category) => category.products).length };
      },
      openSale,
      async changeDraft() {
        assertOrigin();
        if (!quote.lines.length) await addFirst();
        const response = responseFor('/api/sales/quote', 'POST');
        const start = performance.now();
        await page.getByRole('button', { name: `Sumar ${first.name}`, exact: true }).click();
        await showQuote(saleQuoteSchema.parse(await jsonResponse(await response, 200)));
        return duration(performance.now() - start);
      },
      async registerSale() {
        assertOrigin();
        if (quote.lines.length) {
          await page.getByRole('button', { name: 'Descartar venta', exact: true }).click();
          await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Descartar', exact: true })
            .click();
          await page
            .getByText('Elige los productos de la venta', { exact: true })
            .waitFor({ state: 'visible' });
          quote = { ...quote, lines: [], totalCents: 0, notices: [] };
        }
        await addFirst();
        await page.getByLabel('Efectivo', { exact: true }).check();
        const response = responseFor('/api/sales', 'POST');
        const start = performance.now();
        await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
        const { sale } = saleResponseSchema.parse(await jsonResponse(await response, 201));
        await showSale(sale);
        return duration(performance.now() - start);
      },
      async humanRegister() {
        assertOrigin();
        await page.bringToFront();
        const response = responseFor('/api/sales', 'POST', 600000);
        const start = performance.now();
        await page.goto('/ventas/nueva');
        const { sale } = saleResponseSchema.parse(await jsonResponse(await response, 201));
        if (sale.lines.length !== 3 || sale.lines.some((line) => line.quantity !== 1))
          throw new MeasurementError(
            'La prueba humana requiere tres productos distintos, una unidad de cada uno. La venta no se repitió.',
          );
        await showSale(sale);
        return duration(performance.now() - start);
      },
      async close() {
        try {
          await context.request.post('/api/auth/logout', { timeout: 10000 });
        } catch {
          /* Sin detalles de sesión. */
        } finally {
          await browser.close();
        }
      },
    };
  } catch {
    await browser.close();
    throw new MeasurementError('No se pudo abrir el ingreso. Comprueba el despliegue y Chromium.');
  }
}

export async function runMeasurement({ io, args, env, createDriver, saveReport, metadata = {} }) {
  let driver;
  try {
    if (args.length || env.DEBUG || env.PWDEBUG || !io.interactive)
      throw new MeasurementError(
        'Ejecuta sin argumentos, sin DEBUG ni PWDEBUG y desde una terminal interactiva.',
      );
    io.write(
      'Medición de Ventas en comprobación: creará 21 ventas automáticas ficticias y una humana. Ingresa en Chromium; escribe la contraseña solo en ese navegador.',
    );
    driver = await createDriver();
    await driver.login();
    const size = await driver.inspect();
    if (size.productCount !== 200)
      throw new MeasurementError('Se requieren exactamente 200 productos vigentes de prueba.');
    io.write(
      'Midiendo veinte aperturas, veinte cambios y veinte registros. No uses Chromium durante estas series.',
    );
    const samples = await measureCycles(driver);
    const report = buildReport(samples, null, { ...metadata, productCount: 200 });
    await saveReport(report);
    io.write(
      `Resultados: aperturas < 2 s ${report.open.underLimit}/20; cambios < 1 s ${report.change.underLimit}/20; registros < 2 s ${report.register.underLimit}/20.`,
    );
    io.write(
      'Ahora registra tú una venta de TRES productos distintos, una unidad de cada uno, con Efectivo o QR. Al pulsar Enter se abrirá Nueva venta y empezará el cronómetro. El medidor no elegirá productos ni registrará por ti.',
    );
    await io.ask('Pulsa Enter cuando estés listo: ');
    const result = buildReport(samples, await driver.humanRegister(), {
      ...metadata,
      productCount: 200,
    });
    await saveReport(result);
    io.write(
      `Venta humana: ${(result.humanSale.durationMs / 1000).toFixed(3)} s. ${result.humanSale.passed ? 'Cumple' : 'No cumple'} el límite de 30 s. RNF-3: ${result.rnf3Passed ? 'cumple' : 'no cumple'}. Informe guardado sin credenciales en la carpeta Git.`,
    );
    return result.rnf3Passed && result.humanSale.passed ? 0 : 1;
  } catch (error) {
    io.write(
      error instanceof MeasurementError
        ? error.message
        : 'No se pudo completar la medición. Se detuvo sin imprimir detalles de sesión ni repetir operaciones.',
    );
    return 1;
  } finally {
    try {
      await driver?.close();
    } catch {
      /* Sin trazas ni datos de sesión. */
    }
  }
}
async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const io = {
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    write(message) {
      process.stdout.write(`${message}\n`);
    },
    async ask(label) {
      const reader = createInterface({ input: process.stdin, output: process.stdout });
      try {
        return await reader.question(label);
      } finally {
        reader.close();
      }
    },
  };
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  process.exitCode = await runMeasurement({
    io,
    args: process.argv.slice(2),
    env: process.env,
    metadata: { localCommit: git('rev-parse', 'HEAD') },
    createDriver: () => createBrowserDriver(),
    async saveReport(report) {
      await writeFile(
        resolve(root, git('rev-parse', '--git-path', 'sales-performance.json')),
        `${JSON.stringify(report, null, 2)}\n`,
        { mode: 0o600 },
      );
    },
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => {
    process.stderr.write('No se pudo completar la medición.\n');
    process.exitCode = 1;
  });
