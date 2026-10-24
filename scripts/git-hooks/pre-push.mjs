// .githooks/pre-push → exec node scripts/git-hooks/pre-push.mjs "$@"
// Bloquea pushes a develop o main, nombres de rama inválidos y force push.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PROTECTED, validateBranch } from '../git-rules.mjs';

const ZERO = /^0+$/;
const isAncestor = (a, b) => {
  try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch { return false; }
};
const hasObject = (sha) => {
  try { execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { stdio: 'ignore' }); return true; } catch { return false; }
};

const errors = [];
for (const line of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
  const [, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
  if (!remoteRef?.startsWith('refs/heads/')) continue; // tags u otras refs
  const branch = remoteRef.slice('refs/heads/'.length);
  if (ZERO.test(localSha)) continue; // borrado de rama remota
  if (PROTECTED.includes(branch)) { errors.push(`No se hace push a "${branch}": los cambios llegan solo por PR.`); continue; }
  errors.push(...validateBranch(branch));
  // Force push: la rama remota existe y su commit no es ancestro del que se publica.
  // Si el commit remoto no está en local, no se puede comprobar: se pide fetch.
  if (!ZERO.test(remoteSha)) {
    if (!hasObject(remoteSha)) errors.push(`"${branch}" cambió en el remoto. Ejecuta git fetch y git merge origin/${branch} antes de publicar.`);
    else if (!isAncestor(remoteSha, localSha) && process.env.KOFI_ALLOW_FORCE !== '1') {
      errors.push(`Push rechazado: reescribiría "${branch}" en el remoto (force push). Integra con git merge en lugar de reescribir. Solo una persona, con confirmación del responsable, puede usar KOFI_ALLOW_FORCE=1.`);
    }
  }
}
if (errors.length) { console.error(`\n✖ ${errors.join('\n  ')}\n`); process.exit(1); }
