// Hook de agente SessionStart (Claude y Codex). Su salida se añade al contexto del agente.
// 1) Entrega la constitución del proyecto. 2) Avisa de problemas de preparación.
// No instala ni cambia nada.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000 }).trim(); } catch { return null; } };

const constitution = join('docs', 'constitution.md');
const out = [];
if (existsSync(constitution)) {
  out.push('Constitución del proyecto (innegociable):', readFileSync(constitution, 'utf8').trim(), '');
}

const notes = [];
if (run('git', ['config', 'core.hooksPath']) !== '.githooks') {
  notes.push('Los hooks de Git no están instalados: ejecuta `npm install` antes de trabajar.');
}
if (run('gh', ['auth', 'status']) === null) {
  notes.push('GitHub CLI no tiene sesión: pide a la persona que ejecute `gh auth login` antes de cerrar la fase.');
}
const branch = run('git', ['symbolic-ref', '--short', 'HEAD']);
if (branch === 'develop' || branch === 'main') {
  notes.push(`Estás en \`${branch}\`: crea la rama de la especificación antes de modificar archivos.`);
}
if (notes.length) out.push(`Preparación:\n- ${notes.join('\n- ')}`);

if (out.length) console.log(out.join('\n'));
