// Pruebas de scripts/agent-hooks/guard-commands.mjs: npm run test:git
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./guard-commands.mjs', import.meta.url));

// Devuelve el motivo del bloqueo, o null si el comando se permite.
function guard(toolInput) {
  const r = spawnSync(process.execPath, [script], { input: JSON.stringify({ tool_name: 'Bash', tool_input: toolInput }), encoding: 'utf8' });
  assert.equal(r.status, 0, `el guardián terminó con ${r.status}: ${r.stderr}`);
  const out = r.stdout.trim();
  if (!out) return null;
  const decision = JSON.parse(out).hookSpecificOutput;
  assert.equal(decision.permissionDecision, 'deny');
  return decision.permissionDecisionReason;
}
const blocks = (command, hint) => {
  const reason = guard({ command });
  assert.ok(reason, `debería bloquearse: ${command}`);
  assert.ok(reason.includes(hint), `motivo inesperado para ${command}: ${reason}`);
};
const allows = (command) => assert.equal(guard({ command }), null, `debería permitirse: ${command}`);

test('bloquea el force push en cualquier forma', () => {
  blocks('git push origin feat/001-acceso --force', 'force push');
  blocks('git push origin +feat/001-acceso', 'force push');
  blocks('git push --force-with-lease origin feat/001-acceso', 'force push');
});

test('bloquea los pushes a develop y main', () => {
  blocks('git -C . push origin develop', '`develop` y `main`');
  blocks('git push -u origin HEAD:main', '`develop` y `main`');
  blocks('C:\\Program Files\\Git\\cmd\\git.exe push origin develop', '`develop` y `main`');
});

test('bloquea --no-verify y git commit -n', () => {
  blocks("git commit -m 'x' --no-verify", 'no-verify');
  blocks("git commit -nm 'x'", 'no-verify');
});

test('bloquea gh pr merge, también dentro de un comando compuesto', () => {
  blocks('git add . && gh pr merge 12 --squash', 'merge');
});

test('bloquea cambiar o quitar core.hooksPath', () => {
  blocks('git config core.hooksPath /dev/null', 'hooksPath');
  blocks('git config set core.hooksPath otra-carpeta', 'hooksPath');
  blocks('git config --unset core.hooksPath', 'hooksPath');
  blocks('git config unset core.hooksPath', 'hooksPath');
  blocks('git -c core.hooksPath=/dev/null commit -m x', 'hooksPath');
});

test('permite leer core.hooksPath o fijarlo en .githooks', () => {
  allows('git config core.hooksPath');
  allows('git config --get core.hooksPath');
  allows('git config get core.hooksPath');
  allows('git config core.hooksPath .githooks');
  allows('git -c core.hooksPath=.githooks status');
});

test('bloquea git add -f de archivos .env', () => {
  blocks('git add -f apps/api/.env', '.env');
});

test('permite los comandos normales', () => {
  allows('git push -u origin feat/001-acceso');
  allows("git commit -m 'feat: develop main support'");
  allows('npm run build && git status');
  allows('git -c user.name=Prueba commit -m x');
});

test('ignora las llamadas sin tool_input.command', () => {
  assert.equal(guard({ file_path: 'README.md' }), null);
});
