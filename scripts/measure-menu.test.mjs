import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import {
  buildReport,
  measureCycles,
  runMeasurement,
  createBrowserDriver,
} from './measure-menu.mjs';

const samples = () => ({
  adminMs: Array(20).fill(100),
  currentMs: Array(20).fill(120),
  saveMs: Array(20).fill(150),
});
test('exige 20 duraciones finitas no negativas por operación y exactamente 200 productos', () => {
  for (const field of ['adminMs', 'currentMs', 'saveMs']) {
    const data = samples();
    data[field] = [100];
    assert.throws(() => buildReport(data, null, { productCount: 200 }));
    data[field] = Array(20).fill(NaN);
    assert.throws(() => buildReport(data, null, { productCount: 200 }));
    data[field] = Array(20).fill(-1);
    assert.throws(() => buildReport(data, null, { productCount: 200 }));
  }
  assert.throws(() => buildReport(samples(), null, { productCount: 199 }));
  assert.throws(() => buildReport(samples(), Infinity, { productCount: 200 }));
});
test('aplica 19 de 20 con límites estrictos de 2 segundos y creación humana menor de 30 segundos', () => {
  const data = samples();
  data.adminMs[0] = 2000;
  data.currentMs[0] = 2000;
  data.saveMs[0] = 2000;
  const report = buildReport(data, 29999, { productCount: 200, localCommit: 'commit-ficticio' });
  assert.equal(report.rnf3Passed, true);
  assert.equal(report.humanCreation.passed, true);
  assert.equal(report.admin.underLimit, 19);
  assert.equal(report.current.underLimit, 19);
  assert.equal(report.save.underLimit, 19);
  assert.equal(report.timeZone, 'America/La_Paz');
  assert.equal(report.localCommit, 'commit-ficticio');
  assert.equal(
    JSON.stringify(
      buildReport(samples(), null, {
        productCount: 200,
        username: 'usuario-privado',
        password: 'clave-privada',
        cookie: 'cookie-privada',
      }),
    ).includes('privad'),
    false,
  );
  assert.equal(buildReport(data, 30000, { productCount: 200 }).humanCreation.passed, false);
  data.saveMs[1] = 2000;
  assert.equal(buildReport(data, null, { productCount: 200 }).rnf3Passed, false);
  assert.equal(buildReport(samples(), null, { productCount: 200 }).humanCreation, null);
});

test(
  'Chromium mide la interfaz completa, los guardados reales y una creación humana',
  { timeout: 60000 },
  async () => {
    const categoryId = randomUUID();
    const products = Array.from({ length: 200 }, (_, index) => ({
      id: randomUUID(),
      name: `Producto ${String(index).padStart(3, '0')}`,
      categoryId,
      priceCents: 1000,
      active: true,
    }));
    let saves = 0;
    let refuseSave = false;
    const html = `<!doctype html><meta charset="utf-8"><div id="root"></div><script>
    const root = document.getElementById('root');
    const catId = ${JSON.stringify(categoryId)};
    async function admin() {
      const response = await fetch('/api/menu/admin'); const menu = await response.json();
      root.innerHTML = '<main><h1>Administrar menú</h1><button id="create">Crear producto</button><ul></ul></main>';
      root.querySelector('#create').onclick = () => edit();
      for (const product of menu.categories[0].products) {
        const row = document.createElement('li'); const label = document.createElement('span'); label.textContent = product.name; row.append(label);
        const button = document.createElement('button'); button.textContent = 'Editar'; button.setAttribute('aria-label', 'Editar ' + product.name); button.onclick = () => edit(product); row.append(button); root.querySelector('ul').append(row);
      }
    }
    function edit(product) {
      root.innerHTML = '<main><form><label>Nombre del producto<input name="name"></label><label>Precio (Bs)<input name="price"></label><button>Guardar producto</button></form></main>';
      root.querySelector('[name=name]').value = product?.name || ''; root.querySelector('[name=price]').value = '10,00';
      root.querySelector('form').onsubmit = async event => { event.preventDefault();
        const saved = await fetch(product ? '/api/menu/products/' + product.id : '/api/menu/products', { method: product ? 'PUT' : 'POST', body: JSON.stringify({ name: root.querySelector('[name=name]').value }) });
        if (!saved.ok) return;
        await admin(); const notice = document.createElement('p'); notice.textContent = 'Cambios guardados'; root.querySelector('main').append(notice);
      };
    }
    async function current() { const menu = await (await fetch('/api/menu')).json(); root.innerHTML = '<main><h1>Menú</h1><ul></ul></main>'; for (const product of menu.categories[0].products) { const li = document.createElement('li'); li.textContent = product.name; root.querySelector('ul').append(li); } }
    if (location.pathname === '/menu/administrar') admin();
    else if (location.pathname === '/menu') current();
    else { root.innerHTML = '<form><label>Usuario<input></label><label>Contraseña<input type="password"></label><button>Ingresar</button></form>'; root.querySelector('form').onsubmit = async event => { event.preventDefault(); await fetch('/api/auth/login', { method: 'POST' }); root.innerHTML = '<a href="/menu/administrar">Administrar menú</a>'; }; }
  </script>`;
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        res.setHeader(
          'Content-Type',
          req.url.startsWith('/api') ? 'application/json' : 'text/html; charset=utf-8',
        );
        if (req.url === '/api/auth/session')
          return res.end(JSON.stringify({ user: { role: 'owner' } }));
        if (req.url === '/api/auth/login' || req.url === '/api/auth/logout') return res.end('{}');
        if (req.url === '/api/menu/admin')
          return setTimeout(
            () =>
              res.end(
                JSON.stringify({
                  categories: [{ id: categoryId, name: 'Pruebas', active: true, products }],
                }),
              ),
            15,
          );
        if (req.url === '/api/menu')
          return res.end(
            JSON.stringify({
              categories: [
                {
                  id: categoryId,
                  name: 'Pruebas',
                  products: products.map(({ id, name, priceCents }) => ({ id, name, priceCents })),
                },
              ],
            }),
          );
        if (req.method === 'PUT') {
          if (refuseSave) {
            res.statusCode = 409;
            return res.end('{"error":{"message":"conflicto ficticio"}}');
          }
          saves++;
          return res.end(JSON.stringify({ product: products[0] }));
        }
        if (req.method === 'POST' && req.url === '/api/menu/products') {
          const product = { ...products[0], id: randomUUID(), name: JSON.parse(body).name };
          products.push(product);
          res.statusCode = 201;
          return res.end(JSON.stringify({ product }));
        }
        res.end(html);
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ headless: true });
    let driver;
    try {
      driver = await createBrowserDriver(`http://127.0.0.1:${server.address().port}`, {
        chromium: { launch: async () => browser },
        headless: true,
      });
      const page = browser.contexts()[0].pages()[0];
      const login = driver.login();
      await page.getByLabel('Usuario', { exact: true }).fill('persona ficticia');
      await page.getByLabel('Contraseña', { exact: true }).fill('solo prueba');
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await login;
      assert.deepEqual(await driver.inspect(), { productCount: 200, currentProductCount: 200 });
      const measured = await measureCycles(driver);
      assert.equal(measured.adminMs.length, 20);
      assert.equal(measured.currentMs.length, 20);
      assert.equal(measured.saveMs.length, 20);
      assert.equal(saves, 21);
      assert.ok(
        [...measured.adminMs, ...measured.currentMs, ...measured.saveMs].every(
          (value) => Number.isFinite(value) && value > 0,
        ),
      );
      const human = driver.humanCreate();
      await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
      await page.getByLabel('Nombre del producto').fill('Producto manual ficticio');
      await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
      assert.ok((await human) > 0);
      assert.equal(products.length, 201);
      refuseSave = true;
      await assert.rejects(driver.saveProduct(), /La API rechazó una operación/);
    } finally {
      await driver?.close();
      await browser.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
test('excluye un calentamiento por operación y mide 20 ciclos de cada una', async () => {
  const calls = [];
  const driver = Object.fromEntries(
    ['openAdmin', 'openCurrent', 'saveProduct'].map((operation) => [
      operation,
      async () => {
        calls.push(operation);
        return calls.filter((value) => value === operation).length === 1 ? 60000 : 150;
      },
    ]),
  );
  const measured = await measureCycles(driver);
  assert.equal(calls.length, 63);
  assert.deepEqual(measured, {
    adminMs: Array(20).fill(150),
    currentMs: Array(20).fill(150),
    saveMs: Array(20).fill(150),
  });
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
test('guarda muestras parciales y completas, pide ingreso en navegador y cronometra la creación humana', async () => {
  const terminal = io(),
    reports = [];
  let closed = false,
    manual = 0;
  const result = await runMeasurement({
    io: terminal,
    args: [],
    env: {},
    metadata: { localCommit: 'ficticio' },
    createDriver: async () => ({
      async login() {},
      async inspect() {
        return { productCount: 200, currentProductCount: 200 };
      },
      async openAdmin() {
        return 120;
      },
      async openCurrent() {
        return 130;
      },
      async saveProduct() {
        return 150;
      },
      async humanCreate() {
        manual++;
        return 12000;
      },
      async close() {
        closed = true;
      },
    }),
    saveReport: async (report) => reports.push(report),
  });
  assert.equal(result, 0);
  assert.equal(closed, true);
  assert.equal(manual, 1);
  assert.equal(reports[0].humanCreation, null);
  assert.equal(reports.at(-1).humanCreation.durationMs, 12000);
  assert.equal(terminal.prompts.length, 1);
  assert.equal(/contraseña|usuario/i.test(terminal.prompts.join('\n')), false);
});
test('rechaza argumentos, depuración y entrada redirigida sin abrir navegador', async () => {
  for (const settings of [
    { args: ['secreto-ficticio'], env: {} },
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
    assert.equal(terminal.messages.join('\n').includes('secreto-ficticio'), false);
  }
});
test('una base incorrecta o un error detiene la medición sin reintentar ni exponer secretos', async () => {
  for (const mode of ['size', 'error']) {
    const terminal = io();
    let calls = 0,
      closed = false;
    const result = await runMeasurement({
      io: terminal,
      args: [],
      env: {},
      createDriver: async () => ({
        async login() {},
        async inspect() {
          return { productCount: mode === 'size' ? 201 : 200, currentProductCount: 200 };
        },
        async openAdmin() {
          calls++;
          throw new Error('cookie y contraseña ficticias');
        },
        async close() {
          closed = true;
        },
      }),
      saveReport: async () => assert.fail(),
    });
    assert.equal(result, 1);
    assert.equal(closed, true);
    assert.equal(calls, mode === 'size' ? 0 : 1);
    assert.equal(terminal.messages.join('\n').includes('cookie y contraseña ficticias'), false);
  }
});
