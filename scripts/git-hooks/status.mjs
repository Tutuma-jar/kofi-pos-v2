// npm run hooks → node scripts/git-hooks/status.mjs
// Muestra si los hooks de Git están activos y cuáles hay.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const HOOKS = [
  ['post-checkout', 'Coloca cada rama nueva sobre origin/develop actualizado'],
  ['pre-commit', 'Bloquea commits en develop/main y secretos'],
  ['prepare-commit-msg', 'Agrega Refs: SPEC-NNN según la rama'],
  ['pre-push', 'Rama válida, sin push a develop/main, sin force push'],
  ['post-merge', 'Avisa si cambiaron las dependencias'],
];
let path = '';
try { path = execFileSync('git', ['config', 'core.hooksPath'], { encoding: 'utf8' }).trim(); } catch {}
const active = path === '.githooks';
console.log(`Hooks de Git: ${active ? 'activos' : 'INACTIVOS: ejecuta npm install'} (core.hooksPath = ${path || 'sin definir'})`);
for (const [name, what] of HOOKS) {
  const ok = existsSync(join('.githooks', name));
  console.log(`  ${ok ? ' ' : '✖'} ${name.padEnd(19)} ${what}${ok ? '' : ' (falta el archivo)'}`);
}
console.log('\nHooks de agente: Claude → /hooks · Codex → Settings → Hooks');
