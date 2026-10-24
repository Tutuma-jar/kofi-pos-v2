// .githooks/post-checkout → exec node scripts/git-hooks/post-checkout.mjs "$@"
// Al crear una rama propia, la coloca sobre origin/develop actualizado. Nunca bloquea: solo recoloca o avisa.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };

const [, , isBranchCheckout] = process.argv.slice(2);
if (isBranchCheckout !== '1') process.exit(0); // checkout de archivos, no de rama

const branch = tryGit('symbolic-ref', '--short', 'HEAD');
if (!branch || ['develop', 'main'].includes(branch)) process.exit(0);

// ¿Rama recién creada? Su reflog tiene una sola entrada "branch: Created from …"
const reflog = (tryGit('reflog', 'show', '--format=%gs', `refs/heads/${branch}`) ?? '').split('\n').filter(Boolean);
if (reflog.length !== 1 || !reflog[0].startsWith('branch: Created from')) process.exit(0);

// ¿Rama compartida? Si ya existe en el remoto (por ejemplo, la rama de una historia que
// creó la otra persona), se respeta tal cual: nunca se reinicia ni se le quita el upstream.
if (tryGit('rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`) !== null) process.exit(0);

// Base: origin/develop, o la declarada para una especificación dependiente (KOFI_BASE=origin/feat/002-menu)
const base = process.env.KOFI_BASE || 'origin/develop';
const [remote, ...rest] = base.split('/');

if (tryGit('fetch', remote, rest.join('/')) === null) {
  console.warn(`⚠ No se pudo actualizar ${base} (¿sin red?). La rama "${branch}" NO se recolocó.`);
  process.exit(0);
}

if (git('rev-parse', 'HEAD') !== git('rev-parse', base)) {
  // --keep conserva los cambios sin commitear y aborta si chocarían; nunca los pierde
  if (tryGit('reset', '--keep', base) === null) {
    console.warn(`⚠ Tienes cambios que chocan con ${base}. Commitéalos en su rama o guárdalos y vuelve a crear la rama.`);
    process.exit(0);
  }
}
tryGit('branch', '--unset-upstream'); // que nunca apunte a develop como upstream

// Aviso informativo: otras ramas remotas de la misma especificación (otros frentes o un posible duplicado)
const spec = branch.match(/^[a-z]+\/(\d{3})-/)?.[1];
if (spec) {
  tryGit('fetch', remote, '--prune');
  const others = (tryGit('branch', '-r', '--list', `${remote}/*/${spec}-*`) ?? '')
    .split('\n').map((r) => r.trim()).filter((r) => r && r !== `${remote}/${branch}`);
  if (others.length) console.log(`ℹ Otras ramas de la especificación ${spec}: ${others.join(', ')}. Si alguna es la misma fase, únete a ella con git switch en lugar de crear otra.`);
}

console.log(`✔ "${branch}" creada desde ${base} actualizado (${git('rev-parse', '--short', 'HEAD')}).`);
