// .githooks/prepare-commit-msg → exec node scripts/git-hooks/prepare-commit-msg.mjs "$@"
// Agrega "Refs: SPEC-NNN" según la rama, si el mensaje no lo tiene. No bloquea nunca.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [file, source] = process.argv.slice(2);
if (!file || source === 'merge' || source === 'squash') process.exit(0);

let branch = '';
try { branch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { process.exit(0); }
const spec = branch.match(/^[a-z]+\/(\d{3})-/)?.[1];
if (!spec) process.exit(0);

const message = readFileSync(file, 'utf8');
if (new RegExp(`^Refs:.*SPEC-${spec}\\b`, 'mi').test(message)) process.exit(0);

// Insertar antes de las líneas de comentario (#) y de otros trailers finales.
const lines = message.split('\n');
let end = lines.length;
while (end > 0 && (lines[end - 1].startsWith('#') || lines[end - 1].trim() === '')) end--;
const body = lines.slice(0, end);
const trailer = `Refs: SPEC-${spec}`;
const lastIsTrailer = body.length > 0 && /^[A-Za-z-]+: /.test(body[body.length - 1]) && body.length > 1;
const insert = lastIsTrailer ? [trailer] : ['', trailer];
writeFileSync(file, [...body, ...insert, ...lines.slice(end)].join('\n'));
