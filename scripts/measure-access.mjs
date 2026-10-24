import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TARGET = 'https://kofi-web.onrender.com';
const COUNT = 20;

class MeasurementError extends Error {}

function validDuration(value) {
  if (!Number.isFinite(value) || value < 0)
    throw new MeasurementError('La medición no tiene un tiempo válido.');
  return value;
}

export function buildReport(samples, humanMs) {
  const summarize = (values, limitMs) => {
    if (!Array.isArray(values) || values.length !== COUNT)
      throw new MeasurementError('La medición requiere veinte resultados por operación.');
    const durationsMs = values.map(validDuration);
    return {
      durationsMs,
      limitMs,
      underLimit: durationsMs.filter((ms) => ms < limitMs).length,
      p95Ms: [...durationsMs].sort((a, b) => a - b)[18],
    };
  };
  const login = summarize(samples.loginMs, 3000),
    logout = summarize(samples.logoutMs, 2000);
  return {
    target: TARGET,
    measuredAtBolivia: new Date().toLocaleString('sv-SE', { timeZone: 'America/La_Paz' }),
    timeZone: 'America/La_Paz',
    excludedWarmupCycles: 1,
    login,
    logout,
    rnf4Passed: login.underLimit >= 19 && logout.underLimit >= 19,
    humanLogin:
      humanMs === null ? null : { durationMs: validDuration(humanMs), passed: humanMs < 15000 },
  };
}

export async function measureCycles(driver, username, password) {
  await driver.login(username, password);
  await driver.logout();
  const loginMs = [],
    logoutMs = [];
  for (let index = 0; index < COUNT; index++) {
    loginMs.push(validDuration(await driver.login(username, password)));
    logoutMs.push(validDuration(await driver.logout()));
  }
  return { loginMs, logoutMs };
}

export function readSecret(input, output) {
  if (!input.isTTY || typeof input.setRawMode !== 'function')
    return Promise.reject(new MeasurementError('Usa una terminal interactiva.'));
  return new Promise((resolveSecret, reject) => {
    let value = '';
    const wasRaw = Boolean(input.isRaw);
    emitKeypressEvents(input);
    const finish = (error) => {
      input.off('keypress', onKey);
      input.off('end', onEnd);
      input.off('error', onEnd);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\n');
      if (error) {
        value = '';
        reject(error);
      } else {
        resolveSecret(value);
        value = '';
      }
    };
    const onEnd = () => finish(new MeasurementError('Entrada de contraseña cancelada.'));
    const onKey = (text, key = {}) => {
      if ((key.ctrl && ['c', 'd'].includes(key.name)) || key.name === 'escape') return onEnd();
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
      else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/u.test(text)) value += text;
    };
    input.on('keypress', onKey);
    input.once('end', onEnd);
    input.once('error', onEnd);
    input.setRawMode(true);
    input.resume();
  });
}

export async function createBrowserDriver(target = TARGET, options = {}) {
  const chromium = options.chromium ?? (await import('@playwright/test')).chromium;
  const browser = await chromium.launch({ headless: options.headless ?? false });
  try {
    const context = await browser.newContext({ baseURL: target });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    const usernameField = () => page.getByLabel('Usuario', { exact: true });
    const logoutButton = () => page.getByRole('button', { name: 'Cerrar sesión', exact: true });
    const responseFor = (operation) =>
      page.waitForResponse(
        (response) =>
          response.url() === new URL(`/api/auth/${operation}`, target).href &&
          response.request().method() === 'POST',
      );
    const checkResponse = async (response, status) => {
      let timer;
      try {
        await Promise.race([
          response.finished(),
          new Promise((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new MeasurementError('La respuesta no terminó a tiempo. Medición detenida.'),
                ),
              90000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      if (response.status() === 401)
        throw new MeasurementError(
          'Ingreso rechazado. Comprueba tus datos; no se repetirá el intento.',
        );
      if (response.status() === 429)
        throw new MeasurementError(
          'La cuenta está bloqueada temporalmente. No se repetirá el intento.',
        );
      if (response.status() !== status)
        throw new MeasurementError('La API rechazó una operación. Medición detenida.');
      return validDuration(response.request().timing().responseEnd);
    };
    const assertOrigin = () => {
      if (new URL(page.url()).origin !== new URL(target).origin)
        throw new MeasurementError('El navegador salió del sitio de comprobación.');
    };
    await page.goto('/ingresar');
    await usernameField().waitFor({ state: 'visible' });
    return {
      async login(username, password) {
        assertOrigin();
        await usernameField().fill(username);
        await page.getByLabel('Contraseña', { exact: true }).fill(password);
        const start = performance.now();
        const [response] = await Promise.all([
          responseFor('login'),
          page.getByRole('button', { name: 'Ingresar', exact: true }).click(),
        ]);
        const networkMs = await checkResponse(response, 200);
        await logoutButton().waitFor({ state: 'visible' });
        return Math.max(networkMs, performance.now() - start);
      },
      async logout() {
        assertOrigin();
        const start = performance.now();
        const [response] = await Promise.all([responseFor('logout'), logoutButton().click()]);
        const networkMs = await checkResponse(response, 204);
        await usernameField().waitFor({ state: 'visible' });
        return Math.max(networkMs, performance.now() - start);
      },
      async humanLogin() {
        await page.bringToFront();
        await page.goto('/ingresar');
        await usernameField().waitFor({ state: 'visible' });
        assertOrigin();
        const start = performance.now();
        const response = await responseFor('login');
        await checkResponse(response, 200);
        await logoutButton().waitFor({ state: 'visible' });
        return performance.now() - start;
      },
      async close() {
        try {
          await context.request.post(new URL('/api/auth/logout', target).href, { timeout: 10000 });
        } catch {
          /* La limpieza no debe revelar errores que puedan contener datos de ingreso. */
        } finally {
          await browser.close();
        }
      },
    };
  } catch {
    await browser.close();
    throw new MeasurementError(
      'No se pudo abrir el formulario. Comprueba el despliegue y Chromium.',
    );
  }
}

export async function runMeasurement({ io, args, env, createDriver, saveReport }) {
  let password = '',
    driver;
  try {
    if (args.length || env.DEBUG || env.PWDEBUG || !io.interactive) {
      throw new MeasurementError(
        'Ejecuta sin argumentos, sin DEBUG ni PWDEBUG y desde una terminal interactiva.',
      );
    }
    io.write(
      'Medición de Acceso en el sitio de comprobación. Un calentamiento y veinte ciclos; se detiene ante el primer error.',
    );
    const username = (await io.ask('Usuario: ')).trim();
    if (!username) throw new MeasurementError('Escribe un usuario válido.');
    driver = await createDriver();
    password = await io.ask('Contraseña (oculta, solo en memoria): ', { secret: true });
    if (!password.trim()) throw new MeasurementError('La contraseña no puede estar vacía.');
    io.write('Midiendo los ciclos automáticos; espera sin usar esta ventana de Chromium.');
    const samples = await measureCycles(driver, username, password);
    password = '';
    const report = buildReport(samples, null);
    await saveReport(report);
    io.write(
      `Ingresos < 3 s: ${report.login.underLimit}/20; cierres < 2 s: ${report.logout.underLimit}/20.`,
    );
    io.write(
      'Ahora harás UN ingreso manual. Prepara tus datos. Tras pulsar Enter volverá a abrirse el formulario en Chromium y empezará el cronómetro; escribe allí usuario y contraseña y pulsa Ingresar.',
    );
    await io.ask('Pulsa Enter cuando estés listo: ');
    const result = buildReport(samples, await driver.humanLogin());
    await saveReport(result);
    io.write(
      `Ingreso manual: ${(result.humanLogin.durationMs / 1000).toFixed(3)} s. ${result.humanLogin.passed ? 'Cumple' : 'No cumple'} el límite de 15 s.`,
    );
    io.write(
      `RNF-4: ${result.rnf4Passed ? 'cumple' : 'no cumple'}. Informe guardado sin credenciales en la carpeta Git.`,
    );
    return result.rnf4Passed && result.humanLogin.passed ? 0 : 1;
  } catch (error) {
    io.write(
      error instanceof MeasurementError
        ? error.message
        : 'La medición no pudo completarse. Se detuvo sin imprimir detalles ni repetir el ingreso.',
    );
    return 1;
  } finally {
    password = '';
    try {
      await driver?.close();
    } catch {
      /* No imprimir errores del navegador. */
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
    async ask(label, options) {
      if (options?.secret) {
        process.stdout.write(label);
        return readSecret(process.stdin, process.stdout);
      }
      const reader = createInterface({ input: process.stdin, output: process.stdout });
      try {
        return await reader.question(label);
      } finally {
        reader.close();
      }
    },
  };
  process.exitCode = await runMeasurement({
    io,
    args: process.argv.slice(2),
    env: process.env,
    createDriver: () => createBrowserDriver(),
    async saveReport(report) {
      const path = execFileSync('git', ['rev-parse', '--git-path', 'access-performance.json'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      await writeFile(resolve(root, path), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    },
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    process.stderr.write('No se pudo completar la medición.\n');
    process.exitCode = 1;
  });
}
