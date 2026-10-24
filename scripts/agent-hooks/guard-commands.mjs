// Hook de agente PreToolUse (Claude y Codex) para comandos de shell.
// Bloquea operaciones que nunca debe hacer un agente; lo demás sigue el flujo normal de permisos.
import { readFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const command = input?.tool_input?.command;
if (typeof command !== 'string') process.exit(0);

// Divide en subcomandos por operadores de shell y en palabras, quitando comillas.
// Limitación conocida: también analiza el cuerpo de los heredocs, así que una línea de un mensaje
// que empiece por un comando prohibido (por ejemplo, «git add -f … .env») se bloquea. Se acepta
// porque falla del lado seguro: se reescribe esa línea o se usa `git commit -F <archivo>`.
const segments = command.split(/&&|\|\||;|\||\n/).map((s) =>
  (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^["']|["']$/g, '')));

function gitArgs(words) {
  const i = words.findIndex((w) => /(^|[\\/])git(\.exe)?$/i.test(w));
  if (i === -1) return null;
  const rest = words.slice(i + 1);
  // Saltar opciones globales de git (-C dir, -c k=v, --git-dir=…)
  let j = 0;
  while (j < rest.length && rest[j].startsWith('-')) j += ['-C', '-c'].includes(rest[j]) ? 2 : 1;
  return { sub: rest[j], args: rest.slice(j + 1) };
}

const reasons = [];
for (const words of segments) {
  const g = gitArgs(words);
  if (g) {
    if (g.args.includes('--no-verify') || (g.sub === 'commit' && g.args.some((a) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(a)))) {
      reasons.push('`--no-verify` salta los hooks de Git del proyecto.');
    }
    if (g.sub === 'push') {
      if (g.args.some((a) => /^(-f|--force|--force-with-lease(=.*)?|--force-if-includes)$/.test(a) || /^\+/.test(a))) {
        reasons.push('No se hace force push: integra con `git merge`.');
      }
      if (g.args.some((a) => /(^|:)(refs\/heads\/)?(develop|main)$/.test(a))) {
        reasons.push('`develop` y `main` solo reciben cambios por PR.');
      }
    }
    if (g.sub === 'config' && g.args.some((a) => a === 'core.hooksPath') && !g.args.includes('.githooks')) {
      reasons.push('No se cambia `core.hooksPath`: desactivaría los hooks de Git.');
    }
    if (g.sub === 'add' && g.args.some((a) => a === '-f' || a === '--force') && g.args.some((a) => /(^|[\\/])\.env(\.|$)/.test(a))) {
      reasons.push('No se fuerza el commit de archivos `.env`.');
    }
  }
  const ghIdx = words.findIndex((w) => /(^|[\\/])gh(\.exe)?$/i.test(w));
  if (ghIdx !== -1 && words[ghIdx + 1] === 'pr' && words[ghIdx + 2] === 'merge') {
    reasons.push('El merge de un PR lo hace una persona.');
  }
}

// El bloqueo se comunica solo con JSON y código 0: Codex ignora el código 2 (probado en su app de Windows)
// y Claude acepta las dos formas.
if (reasons.length) {
  const reason = `Bloqueado por el proyecto: ${[...new Set(reasons)].join(' ')}`;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
}
