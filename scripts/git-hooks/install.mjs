// npm install → script prepare. Activa los hooks de Git del proyecto (core.hooksPath = .githooks).
// No hace nada fuera de un repositorio Git (por ejemplo, un build en Render) y nunca hace fallar npm install.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

let inside = false;
try { inside = git('rev-parse', '--is-inside-work-tree') === 'true'; } catch {}
if (!inside) process.exit(0);

try {
  git('config', 'core.hooksPath', '.githooks');
} catch (error) {
  console.warn(`⚠ No se pudieron activar los hooks de Git (${error.message.trim()}). Ejecuta: git config core.hooksPath .githooks`);
}
