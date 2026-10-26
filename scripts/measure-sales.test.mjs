import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildReport,
  measureCycles,
  runMeasurement,
  createBrowserDriver,
} from './measure-sales.mjs';

const samples = () => ({
  openMs: Array(20).fill(150),
  changeMs: Array(20).fill(120),
  registerMs: Array(20).fill(200),
});
test('exige 200 productos y veinte tiempos finitos no negativos por operación', () => {
  for (const key of ['openMs', 'changeMs', 'registerMs']) {
    for (const invalid of [[1], Array(20).fill(NaN), Array(20).fill(-1)]) {
      assert.throws(() =>
        buildReport({ ...samples(), [key]: invalid }, null, { productCount: 200 }),
      );
    }
  }
  assert.throws(() => buildReport(samples(), null, { productCount: 201 }));
  assert.throws(() => buildReport(samples(), Infinity, { productCount: 200 }));
});
test('aplica 19/20 y límites estrictos de 2 s, 1 s y 30 s, sin filtrar metadatos privados', () => {
  const data = samples();
  data.openMs[0] = 2000;
  data.changeMs[0] = 1000;
  data.registerMs[0] = 2000;
  const report = buildReport(data, 29999, {
    productCount: 200,
    localCommit: 'ficticio',
    password: 'privado',
    cookie: 'privado',
  });
  assert.equal(report.rnf3Passed, true);
  assert.equal(report.open.underLimit, 19);
  assert.equal(report.change.underLimit, 19);
  assert.equal(report.register.underLimit, 19);
  assert.equal(report.change.limitMs, 1000);
  assert.equal(report.register.limitMs, 2000);
  assert.equal(report.humanSale.passed, true);
  assert.equal(report.timeZone, 'America/La_Paz');
  assert.equal(JSON.stringify(report).includes('privado'), false);
  assert.equal(buildReport(data, 30000, { productCount: 200 }).humanSale.passed, false);
  data.changeMs[1] = 1000;
  assert.equal(buildReport(data, null, { productCount: 200 }).rnf3Passed, false);
  assert.equal(buildReport(samples(), null, { productCount: 200 }).humanSale, null);
});
test('excluye un calentamiento por operación y conserva las 60 muestras en orden', async () => {
  const calls = [];
  const driver = Object.fromEntries(
    ['openSale', 'changeDraft', 'registerSale'].map((operation) => [
      operation,
      async () => {
        calls.push(operation);
        return calls.filter((call) => call === operation).length === 1 ? 60000 : 150;
      },
    ]),
  );
  assert.deepEqual(await measureCycles(driver), {
    openMs: Array(20).fill(150),
    changeMs: Array(20).fill(150),
    registerMs: Array(20).fill(150),
  });
  assert.equal(calls.length, 63);
});
function io() {
  return {
    interactive: true,
    messages: [],
    prompts: [],
    write(message) {
      this.messages.push(message);
    },
    async ask(prompt) {
      this.prompts.push(prompt);
      return '';
    },
  };
}
function fakeDriver() {
  return {
    async login() {},
    async inspect() {
      return { productCount: 200 };
    },
    async openSale() {
      return 100;
    },
    async changeDraft() {
      return 100;
    },
    async registerSale() {
      return 100;
    },
    async humanRegister() {
      return 12000;
    },
    async close() {},
  };
}
test('guarda informe parcial y completo y solo pide Enter para la venta humana', async () => {
  const terminal = io(),
    reports = [];
  const driver = fakeDriver();
  let closed = false;
  driver.close = async () => {
    closed = true;
  };
  const code = await runMeasurement({
    io: terminal,
    args: [],
    env: {},
    createDriver: async () => driver,
    saveReport: async (report) => reports.push(report),
    metadata: { localCommit: 'ficticio' },
  });
  assert.equal(code, 0);
  assert.equal(closed, true);
  assert.equal(reports.length, 2);
  assert.equal(reports[0].humanSale, null);
  assert.equal(reports[1].humanSale.durationMs, 12000);
  assert.equal(terminal.prompts.length, 1);
  assert.equal(/usuario|contraseña/i.test(terminal.prompts.join('')), false);
});
test('rechaza argumentos, depuración y entrada redirigida antes de abrir Chromium', async () => {
  for (const settings of [
    { args: ['privado'], env: {} },
    { args: [], env: { DEBUG: '1' } },
    { args: [], env: { PWDEBUG: '1' } },
    { args: [], env: {}, interactive: false },
  ]) {
    const terminal = io();
    terminal.interactive = settings.interactive ?? true;
    assert.equal(
      await runMeasurement({
        ...settings,
        io: terminal,
        createDriver: async () => assert.fail(),
        saveReport: async () => assert.fail(),
      }),
      1,
    );
    assert.equal(terminal.messages.join('').includes('privado'), false);
  }
});
test('detiene errores sin reintentar registros, sin imprimir secretos y cerrando el navegador', async () => {
  for (const failure of ['menu', 'register', 'human']) {
    const terminal = io(),
      driver = fakeDriver();
    let calls = 0,
      closed = false;
    if (failure === 'menu') driver.inspect = async () => ({ productCount: 199 });
    driver.registerSale = async () => {
      calls++;
      if (failure === 'register') throw new Error('cookie-privada');
      return 100;
    };
    if (failure === 'human')
      driver.humanRegister = async () => {
        throw new Error('cookie-privada');
      };
    driver.close = async () => {
      closed = true;
    };
    assert.equal(
      await runMeasurement({
        io: terminal,
        args: [],
        env: {},
        createDriver: async () => driver,
        saveReport: async () => {},
      }),
      1,
    );
    assert.equal(calls, failure === 'menu' ? 0 : failure === 'register' ? 1 : 21);
    assert.equal(closed, true);
    assert.equal(terminal.messages.join('').includes('cookie-privada'), false);
  }
});

test(
  'Chromium mide ventas reales en una API efímera y permite una venta humana de tres líneas',
  { timeout: 90000 },
  async () => {
    const { chromium, request } = await import('@playwright/test');
    const { createServer } = await import('vite');
    const { resolve } = await import('node:path');
    const { buildE2eApp } = await import('../apps/api/test/e2e-server.ts');
    const { TEST_ACCOUNTS } = await import('../e2e/fixtures.ts');
    const browser = await chromium.launch({ headless: true });
    let driver, api, web, client;
    try {
      api = await buildE2eApp();
      const apiTarget = await api.listen({ port: 0, host: '127.0.0.1' });
      web = await createServer({
        root: resolve('apps/web'),
        configFile: resolve('apps/web/vite.config.ts'),
        logLevel: 'error',
        server: {
          host: '127.0.0.1',
          port: 0,
          proxy: { '/api': { target: apiTarget, changeOrigin: true } },
        },
      });
      await web.listen();
      const target = `http://127.0.0.1:${web.httpServer.address().port}`;
      client = await request.newContext({ baseURL: target });
      const seed = await client.post('/api/__test/menu', {
        data: {
          categories: [
            {
              name: 'Pruebas de rendimiento',
              products: Array.from({ length: 200 }, (_, i) => ({
                name: `Producto de prueba ${String(i + 1).padStart(3, '0')}`,
                price: '10,00',
              })),
            },
          ],
        },
      });
      assert.equal(seed.status(), 200);
      driver = await createBrowserDriver(target, {
        chromium: { launch: async () => browser },
        headless: true,
      });
      const page = browser.contexts()[0].pages()[0];
      const login = driver.login();
      await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.cashier.username);
      await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.cashier.password);
      await page.getByLabel('Contraseña', { exact: true }).press('Enter');
      await login;
      assert.equal((await driver.inspect()).productCount, 200);
      const results = await measureCycles(driver);
      assert.ok(
        Object.values(results)
          .flat()
          .every((value) => Number.isFinite(value) && value > 0),
      );
      assert.equal((await (await client.get('/api/__test/sales')).json()).sales.length, 21);
      const human = driver.humanRegister();
      for (let i = 1; i <= 3; i++)
        await page
          .getByRole('button', {
            name: `Producto de prueba ${String(i).padStart(3, '0')} · Bs 10,00`,
            exact: true,
          })
          .click();
      await page.getByLabel('QR', { exact: true }).check();
      await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
      assert.ok((await human) > 0);
      const sales = (await (await client.get('/api/__test/sales')).json()).sales;
      assert.equal(sales.length, 22);
      assert.equal(sales.at(-1).lines.length, 3);
    } finally {
      await driver?.close();
      await browser.close();
      await client?.dispose();
      await web?.close();
      await api?.close();
    }
  },
);
