// .githooks/pre-commit → exec node scripts/git-hooks/pre-commit.mjs
// Bloquea commits en develop o main y commits con secretos.
import { execFileSync } from 'node:child_process';
import { PROTECTED } from '../git-rules.mjs';
import { findSecrets } from './secrets-check.mjs';

let branch = '';
try { branch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}

if (PROTECTED.includes(branch)) {
  console.error(`\n✖ No se hacen commits en "${branch}". Crea una rama para la tarea:\n    git switch -c <tipo>/NNN-<descripcion>\n  El hook post-checkout la colocará sobre origin/develop actualizado y tus cambios se conservan.\n`);
  process.exit(1);
}

const secrets = findSecrets();
if (secrets.length) {
  console.error(`\n✖ El commit incluye posibles secretos:\n${secrets.map((s) => `    ${s}`).join('\n')}\n\n  Quítalos del commit (git restore --staged <archivo>) y guárdalos en .env, que no se versiona.\n  Si es un falso positivo, cámbialo para que no parezca un secreto; no uses --no-verify.\n`);
  process.exit(1);
}
