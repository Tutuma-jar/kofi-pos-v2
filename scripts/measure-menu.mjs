import { createInterface } from 'node:readline/promises';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  adminMenuResponseSchema,
  currentMenuResponseSchema,
  productResponseSchema,
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
    throw new MeasurementError('La medición requiere exactamente 200 productos.');
  const summarize = (values) => {
    if (!Array.isArray(values) || values.length !== COUNT)
      throw new MeasurementError('La medición requiere veinte resultados por operación.');
    const durationsMs = values.map(duration);
    return {
      durationsMs,
      limitMs: 2000,
      underLimit: durationsMs.filter((ms) => ms < 2000).length,
      p95Ms: [...durationsMs].sort((a, b) => a - b)[18],
    };
  };
  const admin = summarize(samples.adminMs),
    current = summarize(samples.currentMs),
    save = summarize(samples.saveMs);
  return {
    target: TARGET,
    localCommit: metadata.localCommit ?? null,
    measuredAtBolivia: new Date().toLocaleString('sv-SE', { timeZone: 'America/La_Paz' }),
    timeZone: 'America/La_Paz',
    productCountBeforeHuman: 200,
    excludedWarmupPerOperation: 1,
    admin,
    current,
    save,
    rnf3Passed: [admin, current, save].every((operation) => operation.underLimit >= 19),
    humanCreation:
      humanMs === null
        ? null
        : { durationMs: duration(humanMs), limitMs: 30000, passed: humanMs < 30000 },
  };
}

export async function measureCycles(driver) {
  const result = {};
  for (const [operation, field] of [
    ['openAdmin', 'adminMs'],
    ['openCurrent', 'currentMs'],
    ['saveProduct', 'saveMs'],
  ]) {
    await driver[operation]();
    result[field] = [];
    for (let index = 0; index < COUNT; index++)
      result[field].push(duration(await driver[operation]()));
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
    let products = [],
      currentProducts = [],
      first;
    const origin = new URL(target).origin;
    const assertOrigin = () => {
      if (new URL(page.url()).origin !== origin)
        throw new MeasurementError('El navegador salió del sitio de comprobación.');
    };
    const responseFor = (path, method, timeout = 90000) => {
      const pending = page.waitForResponse(
        (response) =>
          response.url() === new URL(path, target).href && response.request().method() === method,
        { timeout },
      );
      // Otra operación puede fallar antes de consumir esta espera. Cerrar el navegador no debe
      // producir rechazos sin capturar ni trazas; quien la espera sigue recibiendo el error.
      void pending.catch(() => {});
      return pending;
    };
    const jsonResponse = async (response, status) => {
      await response.finished();
      if (response.status() !== status)
        throw new MeasurementError('La API rechazó una operación. La medición se detuvo.');
      return response.json();
    };
    const paint = () =>
      page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    const adminReady = async () => {
      await page
        .getByRole('button', { name: `Editar ${products.at(-1).name}`, exact: true })
        .waitFor({ state: 'visible' });
      if ((await page.getByRole('main').locator('li').count()) !== 200)
        throw new MeasurementError('La administración no muestra los 200 productos.');
      await paint();
    };
    const openAdmin = async () => {
      assertOrigin();
      const start = performance.now();
      const response = responseFor('/api/menu/admin', 'GET');
      await page.goto('/menu/administrar');
      products = adminMenuResponseSchema
        .parse(await jsonResponse(await response, 200))
        .categories.flatMap((category) => category.products);
      if (products.length !== 200)
        throw new MeasurementError('La medición requiere exactamente 200 productos.');
      first = products[0];
      await adminReady();
      return duration(performance.now() - start);
    };
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).waitFor({ state: 'visible' });
    return {
      async login() {
        const response = await responseFor('/api/auth/login', 'POST', 600000);
        await jsonResponse(response, 200);
        await page
          .getByRole('link', { name: 'Administrar menú', exact: true })
          .waitFor({ state: 'visible' });
        assertOrigin();
      },
      async inspect() {
        assertOrigin();
        const session = await context.request.get('/api/auth/session');
        if (session.status() !== 200 || (await session.json()).user?.role !== 'owner')
          throw new MeasurementError('La medición necesita una sesión de dueño.');
        await openAdmin();
        const response = await context.request.get('/api/menu');
        if (response.status() !== 200)
          throw new MeasurementError('No se pudo comprobar el menú vigente.');
        currentProducts = currentMenuResponseSchema
          .parse(await response.json())
          .categories.flatMap((category) => category.products);
        return { productCount: products.length, currentProductCount: currentProducts.length };
      },
      openAdmin,
      async openCurrent() {
        assertOrigin();
        const start = performance.now();
        const response = responseFor('/api/menu', 'GET');
        await page.goto('/menu');
        currentProducts = currentMenuResponseSchema
          .parse(await jsonResponse(await response, 200))
          .categories.flatMap((category) => category.products);
        if (currentProducts.length !== 200)
          throw new MeasurementError('La consulta debe tener los 200 productos de prueba activos.');
        await page
          .getByRole('main')
          .getByText(currentProducts.at(-1).name, { exact: true })
          .waitFor({ state: 'visible' });
        if ((await page.getByRole('main').locator('li').count()) !== 200)
          throw new MeasurementError('La consulta no muestra los 200 productos.');
        await paint();
        return duration(performance.now() - start);
      },
      async saveProduct() {
        assertOrigin();
        if (new URL(page.url()).pathname !== '/menu/administrar') await openAdmin();
        await page.getByRole('button', { name: `Editar ${first.name}`, exact: true }).click();
        await page.getByLabel('Precio (Bs)').waitFor({ state: 'visible' });
        // Guardar los valores precargados realiza un PUT real y conserva los precios de prueba.
        const response = responseFor(`/api/menu/products/${first.id}`, 'PUT');
        const reload = responseFor('/api/menu/admin', 'GET');
        const start = performance.now();
        await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
        productResponseSchema.parse(await jsonResponse(await response, 200));
        products = adminMenuResponseSchema
          .parse(await jsonResponse(await reload, 200))
          .categories.flatMap((category) => category.products);
        await page.getByText('Cambios guardados', { exact: true }).waitFor({ state: 'visible' });
        await adminReady();
        return duration(performance.now() - start);
      },
      async humanCreate() {
        assertOrigin();
        await page.bringToFront();
        const response = responseFor('/api/menu/products', 'POST', 600000);
        const start = performance.now();
        await page.goto('/menu/administrar');
        const created = productResponseSchema.parse(
          await jsonResponse(await response, 201),
        ).product;
        await page
          .getByRole('button', { name: `Editar ${created.name}`, exact: true })
          .waitFor({ state: 'visible' });
        await page.getByText('Cambios guardados', { exact: true }).waitFor({ state: 'visible' });
        await paint();
        return duration(performance.now() - start);
      },
      async close() {
        try {
          await context.request.post('/api/auth/logout', { timeout: 10000 });
        } catch {
          /* Cierre sin detalles de sesión. */
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
      'Medición de Menú en el despliegue de comprobación. Ingresa como dueño en Chromium; escribe tu contraseña únicamente en ese navegador.',
    );
    driver = await createDriver();
    await driver.login();
    const size = await driver.inspect();
    if (size.productCount !== 200 || size.currentProductCount !== 200)
      throw new MeasurementError(
        'Se requieren exactamente 200 productos, todos vigentes, antes de medir.',
      );
    io.write(
      'Midiendo veinte aperturas de administración, veinte consultas y veinte guardados. Deja Chromium abierto sin usarlo durante esta parte.',
    );
    const samples = await measureCycles(driver);
    const report = buildReport(samples, null, { ...metadata, productCount: 200 });
    await saveReport(report);
    io.write(
      `Resultados < 2 s: administración ${report.admin.underLimit}/20, consulta ${report.current.underLimit}/20, guardados ${report.save.underLimit}/20.`,
    );
    io.write(
      'Ahora crea tú UN producto nuevo en una categoría existente. Prepara un nombre único y un precio. Al pulsar Enter se abrirá la administración y comenzará el cronómetro de 30 segundos. El medidor no completará el formulario.',
    );
    await io.ask('Pulsa Enter cuando estés listo: ');
    const result = buildReport(samples, await driver.humanCreate(), {
      ...metadata,
      productCount: 200,
    });
    await saveReport(result);
    io.write(
      `Creación manual: ${(result.humanCreation.durationMs / 1000).toFixed(3)} s. ${result.humanCreation.passed ? 'Cumple' : 'No cumple'} el límite de 30 s.`,
    );
    io.write(
      `RNF-3: ${result.rnf3Passed ? 'cumple' : 'no cumple'}. Informe guardado sin credenciales en la carpeta Git.`,
    );
    return result.rnf3Passed && result.humanCreation.passed ? 0 : 1;
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
  const localCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  process.exitCode = await runMeasurement({
    io,
    args: process.argv.slice(2),
    env: process.env,
    metadata: { localCommit },
    createDriver: () => createBrowserDriver(),
    async saveReport(report) {
      const path = execFileSync('git', ['rev-parse', '--git-path', 'menu-performance.json'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      await writeFile(resolve(root, path), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    },
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => {
    process.stderr.write('No se pudo completar la medición.\n');
    process.exitCode = 1;
  });
