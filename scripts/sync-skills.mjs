// npm install → script prepare. Copia las skills del proyecto de .agents/skills/ (fuente única, la que lee Codex)
// a .claude/skills/ (la que lee Claude). Sin enlaces simbólicos, porque fallan en Windows.
// Solo reemplaza las copias que generó este script (las marca con MARKER); nunca toca otras skills de .claude/skills/.
// Nunca hace fallar npm install: ante un error, avisa y termina con código 0.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = join('.agents', 'skills');
const TARGET = join('.claude', 'skills');
const MARKER = '.generado-por-sync-skills';
// Skills de terceros instaladas por error en el proyecto: no son del proyecto y no se copian.
const THIRD_PARTY = ['impeccable', 'emil-design-eng'];

try {
  if (!existsSync(SOURCE)) process.exit(0);
  const skills = readdirSync(SOURCE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !THIRD_PARTY.includes(d.name) && existsSync(join(SOURCE, d.name, 'SKILL.md')))
    .map((d) => d.name);

  mkdirSync(TARGET, { recursive: true });
  // Quitar las copias generadas de skills que ya no existen en la fuente.
  for (const d of readdirSync(TARGET, { withFileTypes: true })) {
    if (d.isDirectory() && !skills.includes(d.name) && existsSync(join(TARGET, d.name, MARKER))) {
      rmSync(join(TARGET, d.name), { recursive: true, force: true });
    }
  }
  for (const name of skills) {
    const dest = join(TARGET, name);
    if (existsSync(dest) && !existsSync(join(dest, MARKER))) {
      console.warn(`⚠ ${dest} no lo generó sync-skills: no se reemplaza. Bórralo y ejecuta npm install para usar la skill del proyecto.`);
      continue;
    }
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(SOURCE, name), dest, { recursive: true });
    writeFileSync(join(dest, MARKER), `Copia generada desde ${SOURCE}/${name} por scripts/sync-skills.mjs. No la edites: edita la fuente y ejecuta npm install.\n`);
  }
} catch (error) {
  console.warn(`⚠ No se pudieron copiar las skills a ${TARGET} (${error.message}). Ejecuta: node scripts/sync-skills.mjs`);
}
