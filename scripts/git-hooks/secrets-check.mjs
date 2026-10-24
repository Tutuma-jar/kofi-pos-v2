// Parte del pre-commit: impide commitear archivos o textos con secretos.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const FORBIDDEN_FILE = /(^|\/)(\.env(\..+)?|.*\.pem|.*\.key|id_rsa.*|credentials.*\.json)$/i;
const ALLOWED_FILE = /(^|\/)\.env\.example$/i;
const SECRET_PATTERNS = [
  [/postgres(ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i, 'URI de PostgreSQL con usuario y contraseña'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clave privada'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'token de GitHub'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, 'clave de API'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'clave de AWS'],
];

export function findSecrets() {
  const problems = [];
  const files = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean);
  for (const file of files) {
    if (FORBIDDEN_FILE.test(file) && !ALLOWED_FILE.test(file)) {
      problems.push(`${file}: archivo de credenciales o variables de entorno`);
      continue;
    }
    let added = '';
    try { added = git('diff', '--cached', '-U0', '--no-ext-diff', '--', file); } catch { continue; }
    added.split('\n').forEach((line) => {
      if (!line.startsWith('+') || line.startsWith('+++')) return;
      for (const [re, what] of SECRET_PATTERNS) if (re.test(line)) problems.push(`${file}: posible ${what}`);
    });
  }
  return problems;
}
