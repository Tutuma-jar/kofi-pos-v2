import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import {
  buildReport,
  measureCycles,
  readSecret,
  runMeasurement,
  createBrowserDriver,
} from './measure-access.mjs';

const samples = () => ({ loginMs: Array(20).fill(120), logoutMs: Array(20).fill(80) });

test('exige veinte resultados válidos por operación', () => {
  assert.throws(() => buildReport({ loginMs: [10], logoutMs: [10] }, 1000));
  const invalid = samples();
  invalid.loginMs[0] = NaN;
  assert.throws(() => buildReport(invalid, 1000));
});

test('aplica 19 de 20 y límites separados y estrictos de tres, dos y quince segundos', () => {
  const data = samples();
  data.loginMs.fill(2999);
  data.logoutMs.fill(1999);
  data.loginMs[0] = 3000;
  data.logoutMs[0] = 2000;
  const pass = buildReport(data, 14999);
  assert.equal(pass.login.limitMs, 3000);
  assert.equal(pass.logout.limitMs, 2000);
  assert.equal(pass.login.underLimit, 19);
  assert.equal(pass.logout.underLimit, 19);
  assert.equal(pass.rnf4Passed, true);
  assert.equal(pass.humanLogin.passed, true);
  data.loginMs[1] = 3000;
  assert.equal(buildReport(data, 14999).rnf4Passed, false);
  data.loginMs[1] = 2999;
  data.logoutMs[1] = 2100;
  const fail = buildReport(data, 15000);
  assert.equal(fail.rnf4Passed, false);
  assert.equal(fail.humanLogin.passed, false);
  assert.equal(buildReport(samples(), null).humanLogin, null);
});

test('excluye el calentamiento y ejecuta los veinte ciclos en orden', async () => {
  const calls = [];
  const driver = {
    async login() {
      calls.push('login');
      return calls.length === 1 ? 60000 : 150;
    },
    async logout() {
      calls.push('logout');
      return calls.length === 2 ? 40000 : 90;
    },
  };
  const result = await measureCycles(driver, 'persona', 'clave solo de prueba');
  assert.equal(calls.length, 42);
  assert.deepEqual(calls, Array.from({ length: 21 }, () => ['login', 'logout']).flat());
  assert.deepEqual(result, { loginMs: Array(20).fill(150), logoutMs: Array(20).fill(90) });
});

test('un ingreso fallido detiene la secuencia sin repetirlo', async () => {
  let attempts = 0;
  await assert.rejects(
    measureCycles(
      {
        async login() {
          attempts++;
          throw new Error('fallo');
        },
        async logout() {
          assert.fail('No debe cerrar una sesión que no inició');
        },
      },
      'persona',
      'clave de prueba',
    ),
  );
  assert.equal(attempts, 1);
});

function terminal(values) {
  const messages = [],
    prompts = [];
  return {
    interactive: true,
    messages,
    prompts,
    async ask(label, options) {
      prompts.push({ label, options });
      return values.shift() ?? '';
    },
    write(message) {
      messages.push(message);
    },
  };
}

test('pide la contraseña una vez como secreto y el informe no contiene credenciales', async () => {
  const secret = 'secreto exclusivo de la prueba';
  const io = terminal(['persona', secret, '']);
  const reports = [];
  let closed = false;
  const driver = {
    async login(username, password) {
      assert.equal(username, 'persona');
      assert.equal(password, secret);
      return 2800;
    },
    async logout() {
      return 80;
    },
    async humanLogin() {
      return 12000;
    },
    async close() {
      closed = true;
    },
  };
  const code = await runMeasurement({
    io,
    args: [],
    env: {},
    createDriver: async () => driver,
    saveReport: async (report) => reports.push(report),
  });
  assert.equal(code, 0);
  assert.equal(closed, true);
  assert.equal(io.prompts.filter((p) => p.options?.secret).length, 1);
  assert.equal(reports.at(-1).humanLogin.durationMs, 12000);
  assert.equal(
    io.messages.some((message) => message.includes('3 s') && message.includes('20/20')),
    true,
  );
  assert.equal(JSON.stringify({ reports, messages: io.messages }).includes(secret), false);
  assert.equal(JSON.stringify(reports).includes('persona'), false);
});

test('un error de Playwright no imprime la contraseña ni la traza y cierra el navegador', async () => {
  const secret = 'contraseña ficticia en un error';
  const io = terminal(['persona', secret]);
  let closed = false;
  const code = await runMeasurement({
    io,
    args: [],
    env: {},
    createDriver: async () => ({
      async login() {
        throw new Error(`locator.fill("${secret}")`);
      },
      async close() {
        closed = true;
      },
    }),
    saveReport: async () => assert.fail('No debe guardar una medición incompleta'),
  });
  assert.equal(code, 1);
  assert.equal(closed, true);
  assert.equal(io.messages.join('\n').includes(secret), false);
  assert.equal(io.messages.join('\n').includes('locator.fill'), false);
});

test('rechaza argumentos, depuración y entrada redirigida antes de pedir credenciales', async () => {
  for (const settings of [
    { args: ['--password', 'dato-ficticio'], env: {} },
    { args: [], env: { DEBUG: 'pw:api' } },
    { args: [], env: { PWDEBUG: '1' } },
    { args: [], env: {}, interactive: false },
  ]) {
    const io = terminal([]);
    io.interactive = settings.interactive ?? true;
    assert.equal(
      await runMeasurement({
        ...settings,
        io,
        createDriver: async () => assert.fail('No debe abrir el navegador'),
        saveReport: async () => assert.fail('No debe guardar datos'),
      }),
      1,
    );
    assert.equal(io.prompts.length, 0);
    assert.equal(io.messages.join('\n').includes('dato-ficticio'), false);
  }
});

test('la entrada secreta no tiene eco y restaura la terminal al terminar o cancelar', async () => {
  for (const cancel of [false, true]) {
    const input = Object.assign(new PassThrough(), {
      isTTY: true,
      isRaw: false,
      setRawMode(raw) {
        this.isRaw = raw;
      },
    });
    const output = new PassThrough();
    let written = '';
    output.on('data', (data) => {
      written += data;
    });
    const value = readSecret(input, output);
    input.write(cancel ? 'ficticia\x03' : 'claveX\x7f de prueba\r');
    if (cancel) await assert.rejects(value);
    else assert.equal(await value, 'clave de prueba');
    assert.equal(written, '\n');
    assert.equal(input.isRaw, false);
    assert.equal(input.listenerCount('keypress'), 0);
  }
  await assert.rejects(readSecret(new PassThrough(), new PassThrough()));
});

test('lee tiempos reales de Chromium sin cuerpos ni cookies', { timeout: 30000 }, async (t) => {
  const html = `<!doctype html><div id="app"></div><script>
    const app = document.getElementById('app');
    function loginForm() {
      app.innerHTML = '<form><label>Usuario<input name="username"></label><label>Contraseña<input name="password" type="password"></label><button>Ingresar</button></form>';
      app.querySelector('form').onsubmit = async e => {
        e.preventDefault();
        const response = await fetch('/api/auth/login', {method:'POST', body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});
        await response.json();
        if (response.ok) {
          app.innerHTML = '<button>Cerrar sesión</button>';
          app.querySelector('button').onclick = async () => { await fetch('/api/auth/logout', {method:'POST'}); loginForm(); };
        }
      };
    }
    loginForm();
  </script>`;
  const server = createServer((req, res) => {
    req.resume();
    if (req.method === 'POST') {
      const login = req.url.endsWith('login');
      res.writeHead(login ? 200 : 204, { 'Content-Type': 'application/json' });
      res.end(login ? '{}' : undefined);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const target = `http://127.0.0.1:${server.address().port}`;
  let driver;
  t.signal.addEventListener(
    'abort',
    () => {
      void driver?.close();
      server.closeAllConnections();
    },
    { once: true },
  );
  try {
    driver = await createBrowserDriver(target, { chromium, headless: true });
    const result = await measureCycles(driver, 'persona', 'clave solo de prueba');
    assert.equal(result.loginMs.length, 20);
    assert.equal(result.logoutMs.length, 20);
    assert.ok(
      [...result.loginMs, ...result.logoutMs].every((ms) => Number.isFinite(ms) && ms >= 0),
    );
  } finally {
    await driver?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
