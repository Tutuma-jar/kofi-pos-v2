import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { checkProductionBuild } from './check-production-build.mjs';

const cacheRoot = fileURLToPath(new URL('../node_modules/.cache/build-guard-tests/', import.meta.url));
mkdirSync(cacheRoot, { recursive: true });
const fixtures = [];

function fixture(main) {
  const root = mkdtempSync(join(cacheRoot, 'fixture-'));
  fixtures.push(root);
  mkdirSync(join(root, 'src/modules/auth/dev'), { recursive: true });
  mkdirSync(join(root, 'src/modules/menu/dev'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<script type="module" src="/src/main.ts"></script>\n');
  writeFileSync(join(root, 'src/main.ts'), main);
  writeFileSync(join(root, 'src/modules/auth/dev/ScenarioPicker.ts'), 'export const label = "selector de prueba";\n');
  writeFileSync(join(root, 'src/modules/menu/dev/fixtures.ts'), 'export const label = "datos de prueba";\n');
  return { root, configFile: false, write: false };
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    const target = realpathSync(root);
    // Solo se borran las carpetas temporales creadas por esta prueba dentro de su caché.
    assert.equal(dirname(target), realpathSync(resolve(cacheRoot)));
    assert.ok(basename(target).startsWith('fixture-'));
    rmSync(target, { recursive: true, force: true });
  }
});

test('rechaza ScenarioPicker importado desde el punto de montaje sin la guarda de desarrollo', async () => {
  await assert.rejects(checkProductionBuild(fixture(`
    import { label } from './modules/auth/dev/ScenarioPicker.ts';
    document.body.textContent = label;
  `)), /dev[/\\].*ScenarioPicker/);
});

test('rechaza también un chunk dinámico de desarrollo y datos de otro módulo', async () => {
  await assert.rejects(checkProductionBuild(fixture(`
    const { label } = await import('./modules/menu/dev/fixtures.ts');
    document.body.textContent = label;
  `)), /dev[/\\].*fixtures/);
});

test('acepta el import dinámico bajo import.meta.env.DEV, excluido de producción', async () => {
  await checkProductionBuild(fixture(`
    if (import.meta.env.DEV) {
      const { label } = await import('./modules/auth/dev/ScenarioPicker.ts');
      document.body.textContent = label;
    } else document.body.textContent = 'Aplicación';
  `));
});

test('no confunde un texto legítimo con un módulo incluido', async () => {
  await checkProductionBuild(fixture(`document.body.textContent = 'ScenarioPicker y dev/ como texto';`));
});
