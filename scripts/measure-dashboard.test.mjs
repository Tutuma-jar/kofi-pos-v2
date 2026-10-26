import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, measureCycles, runMeasurement, verifyDeployedFrontend, createBrowserDriver, requireForeground } from './measure-dashboard.mjs';

const samples = () => ({ openMs: Array(20).fill(200), refreshMs: Array(20).fill(150) });
const metadata = { productCount: 202, monthlySalesCount: 6000, month: '2026-10', localCommit: 'ficticio' };
test('solo admite muestras visibles y con foco durante todo el intervalo', () => {
  assert.doesNotThrow(() => requireForeground({visibilityState:'visible',hasFocus:true,lostFocus:false}));
  for(const state of [{visibilityState:'hidden',hasFocus:false,lostFocus:true},{visibilityState:'visible',hasFocus:false,lostFocus:false},{visibilityState:'visible',hasFocus:true,lostFocus:true}]) assert.throws(()=>requireForeground(state),/primer plano/);
});
const fakeFrontend = bundle => async url => ({ ok: true, text: async () => String(url).endsWith('.js') ? bundle : '<script type="module" src="/assets/index-test.js"></script>' });
test('rechaza una web anterior al Dashboard antes de pedir el ingreso', async () => {
  let opened = false;
  await assert.rejects(createBrowserDriver('owner', { fetch: fakeFrontend('cliente sin secciones'), chromium: { async launch() { opened=true; } } }), /web desplegada/);
  assert.equal(opened,false);
});
test('acepta la web actual y rechaza scripts de otro origen sin leer sesión', async () => {
  assert.equal(await verifyDeployedFrontend('https://ejemplo.invalid',fakeFrontend('today-title month-title')),true);
  await assert.rejects(verifyDeployedFrontend('https://ejemplo.invalid',async()=>({ok:true,text:async()=>'<script type="module" src="https://otro.invalid/index.js"></script>'})),/mismo origen/);
});
test('exige el volumen y veinte tiempos finitos no negativos', () => {
  for (const bad of [199, 0, NaN]) assert.throws(() => buildReport({}, { ...metadata, productCount: bad }));
  assert.throws(() => buildReport({}, { ...metadata, monthlySalesCount: 5999 }));
  for (const invalid of [[1], Array(20).fill(NaN), Array(20).fill(-1)])
    assert.throws(() => buildReport({ owner: { ...samples(), refreshMs: invalid, humanMs: 5000 }, cashier: { ...samples(), humanMs: 5000 } }, metadata));
});
test('conserva muestras y límites estrictos sin filtrar metadatos privados', () => {
  const owner = { ...samples(), humanMs: 9999 };
  owner.openMs[0] = 2000;
  const input = { owner, cashier: { ...samples(), humanMs: 10000 } };
  const report = buildReport(input, { ...metadata, password: 'privado', cookie: 'privado' });
  assert.equal(report.roles.owner.open.underLimit, 19);
  assert.equal(report.rnf3Passed, true);
  assert.equal(report.humanPassed, false);
  assert.equal(report.roles.cashier.human.passed, false);
  assert.deepEqual(report.roles.owner.open.durationsMs, owner.openMs);
  assert.equal(JSON.stringify(report).includes('privado'), false);
  owner.openMs[1] = 2000;
  assert.equal(buildReport(input, metadata).rnf3Passed, false);
  assert.throws(() => buildReport({ owner: { ...owner, humanMs: Infinity } }, metadata));
});
test('excluye un calentamiento y conserva veinte muestras por operación', async () => {
  const calls = [];
  const driver = Object.fromEntries(['openSummary', 'refreshSummary'].map(operation => [operation, async () => {
    calls.push(operation);
    return calls.filter(value => value === operation).length === 1 ? 60000 : 125;
  }]));
  assert.deepEqual(await measureCycles(driver), { openMs: Array(20).fill(125), refreshMs: Array(20).fill(125) });
  assert.equal(calls.length, 42);
});
test('ejecuta ambos roles y delega cada recorrido humano al driver', async () => {
  const calls = [], saved = [];
  const result = await runMeasurement({
    io: { interactive: true, write() {} }, args: [], env: {}, metadata: { localCommit: 'ficticio' },
    async createDriver(role) {
      calls.push(role);
      return { async login() {}, async inspect() { return metadata; }, async openSummary() { return 150; }, async refreshSummary() { return 150; }, async humanReadTotal() { calls.push('humano ' + role); return 4000; }, async close() { calls.push('cerrar ' + role); } };
    },
    async saveReport(report) { saved.push(report); },
  });
  assert.equal(result, 0);
  assert.deepEqual(calls, ['owner', 'humano owner', 'cerrar owner', 'cashier', 'humano cashier', 'cerrar cashier']);
  assert.equal(saved.at(-1).humanPassed, true);
});
test('rechaza argumentos, depuración y ejecución no interactiva antes de abrir Chromium', async () => {
  for (const invalid of [{ args: ['clave'] }, { env: { DEBUG: '*' } }, { env: { PWDEBUG: '1' } }, { io: { interactive: false, write() {} } }]) {
    let opened = false;
    assert.equal(await runMeasurement({ io: { interactive: true, write() {} }, args: [], env: {}, async createDriver() { opened = true; }, async saveReport() {}, ...invalid }), 1);
    assert.equal(opened, false);
  }
});
test('cierra el navegador si falla y no imprime detalles privados del error', async () => {
  let closed = false;
  const messages = [];
  assert.equal(await runMeasurement({ io: { interactive: true, write: message => messages.push(message) }, args: [], env: {}, async createDriver() { return { async login() { throw Error('clave privada'); }, async close() { closed = true; } }; }, async saveReport() {} }), 1);
  assert.equal(closed, true);
  assert.equal(messages.join('').includes('clave privada'), false);
});
