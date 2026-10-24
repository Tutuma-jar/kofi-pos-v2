// Reglas compartidas por los hooks de Git y la check pr-rules. Solo Node, sin dependencias.
// Cada error se explica en español y termina con un ejemplo válido, para que un agente pueda corregirse solo.
export const TYPES = ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'perf', 'ci', 'style'];
export const PROTECTED = ['develop', 'main'];

// <tipo>/NNN-<descripcion> (NNN = número de la especificación) o <tipo>/<descripcion>.
// feat y fix siempre pertenecen a una especificación.
const BRANCH = new RegExp(`^(${TYPES.join('|')})/(\\d{3}-)?[a-z0-9]+(?:-[a-z0-9]+){0,4}$`);
const NEEDS_SPEC = ['feat', 'fix'];

export function specOf(branch = '') {
  return branch.match(/^[a-z]+\/(\d{3})-/)?.[1] ?? null;
}

export function validateBranch(name) {
  const errors = [];
  if (!BRANCH.test(name) || name.length > 60) {
    errors.push(
      `Nombre de rama inválido: "${name}".`,
      `Formato: <tipo>/NNN-<descripcion> o <tipo>/<descripcion>; tipo: ${TYPES.join(', ')}; NNN = número de la especificación (3 dígitos);`,
      'descripción en kebab-case, minúsculas, sin tildes ni ñ, de 1 a 5 palabras; máximo 60 caracteres.',
    );
  } else if (NEEDS_SPEC.includes(name.split('/')[0]) && !specOf(name)) {
    errors.push(`Las ramas ${NEEDS_SPEC.join(' y ')} pertenecen a una especificación: incluye su número (NNN-).`);
  }
  if (errors.length) errors.push('Ejemplo válido: feat/001-acceso');
  return errors;
}

const TITLE = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: (\\S.*?)( \\[SPEC-\\d{3}\\])?$`);

export function validatePrTitle(title, branch = '') {
  const errors = [];
  const m = title.match(TITLE);
  if (!m) errors.push('El título no sigue el formato <tipo>(<scope>): <resumen> [SPEC-NNN].');
  else {
    const summary = m[3];
    if (/^[A-ZÁÉÍÓÚÑ]/.test(summary)) errors.push('El resumen empieza en minúscula.');
    if (/\.$/.test(summary)) errors.push('El resumen no termina en punto.');
  }
  if (title.length > 72) errors.push(`El título tiene ${title.length} caracteres; máximo 72.`);
  const spec = specOf(branch);
  if (spec && !title.endsWith(`[SPEC-${spec}]`)) errors.push(`La rama es de la especificación ${spec}: el título debe terminar en [SPEC-${spec}].`);
  if (errors.length) errors.push('Ejemplo válido: feat(auth): iniciar y cerrar sesión [SPEC-001]');
  return errors;
}

export const PR_SECTIONS = ['Resumen', 'Cambios', 'Verificación', 'Relacionado', 'Observaciones'];

export function validatePrBody(body = '', branch = '') {
  const text = body.replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n/g, '\n');
  const errors = [];
  let last = -1;
  for (const name of PR_SECTIONS) {
    const re = new RegExp(`^##\\s+${name}\\s*$`, 'm');
    const m = re.exec(text);
    if (!m) { errors.push(`Falta la sección "## ${name}".`); continue; }
    if (m.index < last) errors.push(`La sección "## ${name}" está fuera de orden.`);
    last = m.index;
    const rest = text.slice(m.index + m[0].length);
    const next = rest.search(/^##\s+/m);
    if (!(next === -1 ? rest : rest.slice(0, next)).trim()) errors.push(`La sección "## ${name}" está vacía (escribe «Ninguno/Ninguna» si no aplica).`);
  }
  // Una rama de especificación debe enlazar su carpeta specs/NNN-…
  const spec = specOf(branch);
  if (spec && !new RegExp(`specs/${spec}-[a-z0-9-]+`).test(text)) {
    errors.push(`La sección "## Relacionado" debe enlazar la especificación: specs/${spec}-<nombre>/.`);
  }
  return errors;
}
