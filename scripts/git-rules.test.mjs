// Pruebas de scripts/git-rules.mjs: npm run test:git
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specOf, validateBranch, validatePrTitle, validatePrBody } from './git-rules.mjs';

const BODY = `## Resumen
Inicio y cierre de sesión.

## Cambios
- auth: formulario y endpoint.

## Verificación
npm test: 12 pruebas en verde.

## Relacionado
specs/001-acceso/

## Observaciones
Ninguna.
`;

test('specOf extrae el número de la especificación', () => {
  assert.equal(specOf('feat/001-acceso-us1'), '001');
  assert.equal(specOf('docs/001-acceso'), '001');
  assert.equal(specOf('chore/configurar-ci'), null);
  assert.equal(specOf(''), null);
});

test('validateBranch acepta ramas de especificación y de trabajo general', () => {
  for (const name of [
    'feat/001-acceso',
    'feat/001-acceso-us1',
    'feat/001-acceso-definicion',
    'feat/001-acceso-pulido',
    'fix/003-redondeo-total',
    'chore/configurar-ci',
    'docs/001-acceso',
  ]) {
    assert.deepEqual(validateBranch(name), [], name);
  }
});

test('validateBranch rechaza feat sin número, números mal formados y mayúsculas', () => {
  for (const name of ['feat/acceso', 'feat/1-acceso', 'feat/task-021-x', 'Feature/Foo', 'chore/una-dos-tres-cuatro-cinco-seis']) {
    const errors = validateBranch(name);
    assert.ok(errors.length > 0, name);
    assert.equal(errors.at(-1), 'Ejemplo válido: feat/001-acceso');
  }
});

test('validateBranch rechaza nombres de más de 60 caracteres', () => {
  const name = `chore/${'a'.repeat(55)}`;
  assert.ok(validateBranch(name).length > 0);
});

test('validatePrTitle acepta títulos con y sin especificación', () => {
  assert.deepEqual(validatePrTitle('feat(auth): iniciar y cerrar sesión [SPEC-001]', 'feat/001-acceso'), []);
  assert.deepEqual(validatePrTitle('chore(ci): configurar pipeline', 'chore/configurar-ci'), []);
  assert.deepEqual(validatePrTitle('ci: configurar la check technical-checks', 'ci/configurar-ci'), []);
});

test('validatePrTitle exige [SPEC-NNN] en las ramas de una especificación', () => {
  const errors = validatePrTitle('feat(auth): iniciar y cerrar sesión', 'feat/001-acceso');
  assert.ok(errors.some((e) => e.includes('[SPEC-001]')));
});

test('validatePrTitle rechaza mayúscula inicial, punto final y formato inválido', () => {
  assert.ok(validatePrTitle('feat(auth): Iniciar sesión', 'chore/x').some((e) => e.includes('minúscula')));
  assert.ok(validatePrTitle('feat(auth): iniciar sesión.', 'chore/x').some((e) => e.includes('punto')));
  assert.ok(validatePrTitle('Feat: Algo.', 'chore/x').some((e) => e.includes('formato')));
});

test('validatePrTitle rechaza títulos de más de 72 caracteres', () => {
  const title = `docs: ${'a'.repeat(70)}`;
  assert.ok(validatePrTitle(title).some((e) => e.includes('máximo 72')));
});

test('validatePrBody acepta una descripción completa que enlaza la especificación', () => {
  assert.deepEqual(validatePrBody(BODY, 'feat/001-acceso'), []);
});

test('validatePrBody exige el enlace a la especificación en sus ramas', () => {
  const body = BODY.replace('specs/001-acceso/', 'Ninguna.');
  assert.ok(validatePrBody(body, 'feat/001-acceso').some((e) => e.includes('specs/001-<nombre>/')));
  assert.deepEqual(validatePrBody(body, 'chore/configurar-ci'), []);
});

test('validatePrBody cuenta como vacía una sección con solo un comentario', () => {
  const body = BODY.replace('Ninguna.\n', '<!-- guía -->\n');
  assert.ok(validatePrBody(body).some((e) => e.includes('"## Observaciones" está vacía')));
});

test('validatePrBody detecta secciones faltantes y fuera de orden', () => {
  assert.ok(validatePrBody('## Resumen\nAlgo.\n').some((e) => e.includes('Falta la sección "## Cambios"')));
  const swapped = BODY.replace('## Resumen', '## TEMP').replace('## Cambios', '## Resumen').replace('## TEMP', '## Cambios');
  assert.ok(validatePrBody(swapped).some((e) => e.includes('fuera de orden')));
});

test('validatePrBody acepta saltos de línea CRLF', () => {
  assert.deepEqual(validatePrBody(BODY.replace(/\n/g, '\r\n'), 'feat/001-acceso'), []);
});
