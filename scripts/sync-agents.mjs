// npm install → script prepare. Genera los subagentes de cada app a partir de .agents/subagents/ (fuente única):
//   .claude/agents/<nombre>.md   Markdown con frontmatter, más las restricciones de herramientas de Claude.
//   .codex/agents/<nombre>.toml  TOML con name, description y developer_instructions (el cuerpo de la fuente).
// Solo reemplaza o borra los archivos que generó este script (llevan MARKER); nunca toca otros agentes.
// Nunca hace fallar npm install: ante un error, avisa y termina con código 0.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join('.agents', 'subagents');
const CLAUDE = join('.claude', 'agents');
const CODEX = join('.codex', 'agents');
const MARKER = 'Generado por scripts/sync-agents.mjs';
// En Claude, el subagente no edita archivos ni delega en otros agentes; conserva Bash para ejecutar pruebas.
const CLAUDE_EXTRA = { disallowedTools: 'Write, Edit, NotebookEdit, Agent', model: 'inherit' };

function parse(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('falta el frontmatter');
  // Frontmatter simple: una línea "clave: valor" por campo; el valor puede ir entre comillas dobles.
  const meta = Object.fromEntries(m[1].split('\n').filter(Boolean).map((line) => {
    const i = line.indexOf(':');
    const value = line.slice(i + 1).trim();
    return [line.slice(0, i).trim(), value.startsWith('"') ? JSON.parse(value) : value];
  }));
  if (!meta.name || !meta.description) throw new Error('el frontmatter necesita name y description');
  return { meta, body: m[2].trim() };
}

const tomlString = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const tomlMultiline = (s) => `"""\n${s.replace(/\\/g, '\\\\').replace(/"""/g, '""\\"')}\n"""`;

function claudeFile({ meta, body }) {
  // name y description van entre comillas: un " #" sin comillas empezaría un comentario de YAML.
  const front = { name: JSON.stringify(meta.name), description: JSON.stringify(meta.description), ...CLAUDE_EXTRA };
  return `---\n${Object.entries(front).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n<!-- ${MARKER} desde .agents/subagents. No lo edites: edita la fuente y ejecuta npm install. -->\n\n${body}\n`;
}

function codexFile({ meta, body }) {
  return `# ${MARKER} desde .agents/subagents. No lo edites: edita la fuente y ejecuta npm install.\nname = ${tomlString(meta.name)}\ndescription = ${tomlString(meta.description)}\ndeveloper_instructions = ${tomlMultiline(body)}\n`;
}

function sync(dir, ext, render, agents) {
  mkdirSync(dir, { recursive: true });
  const generated = (file) => readFileSync(file, 'utf8').includes(MARKER);
  for (const f of readdirSync(dir)) {
    const file = join(dir, f);
    if (f.endsWith(ext) && !agents.has(f.slice(0, -ext.length)) && generated(file)) rmSync(file);
  }
  for (const [name, agent] of agents) {
    const file = join(dir, `${name}${ext}`);
    if (existsSync(file) && !generated(file)) {
      console.warn(`⚠ ${file} no lo generó sync-agents: no se reemplaza. Bórralo y ejecuta npm install para usar el subagente del proyecto.`);
      continue;
    }
    writeFileSync(file, render(agent));
  }
}

try {
  if (!existsSync(SOURCE)) process.exit(0);
  const agents = new Map();
  for (const f of readdirSync(SOURCE).filter((f) => f.endsWith('.md'))) {
    try {
      const agent = parse(readFileSync(join(SOURCE, f), 'utf8'));
      agents.set(agent.meta.name, agent);
    } catch (error) {
      console.warn(`⚠ ${join(SOURCE, f)}: ${error.message}. No se generó.`);
    }
  }
  sync(CLAUDE, '.md', claudeFile, agents);
  sync(CODEX, '.toml', codexFile, agents);
} catch (error) {
  console.warn(`⚠ No se pudieron generar los subagentes (${error.message}). Ejecuta: node scripts/sync-agents.mjs`);
}
