// .githooks/post-merge → exec node scripts/git-hooks/post-merge.mjs
// Tras un pull o merge, avisa si cambiaron las dependencias. No bloquea nunca.
import { execFileSync } from 'node:child_process';

let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n').filter((f) => /(^|\/)(package-lock\.json|package\.json)$/.test(f));
} catch { process.exit(0); }

if (changed.length) {
  console.log(`\n⚠ Cambiaron las dependencias (${changed.join(', ')}). Ejecuta:\n    npm install\n`);
}
