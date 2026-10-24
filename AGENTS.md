# Kofi POS

Kofi POS es el sistema web de punto de venta de Kofi, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia. Monorepo con workspaces de npm: interfaz web (`apps/web`), API (`apps/api`) y contratos compartidos (`packages/contracts`).

## Constitución

Respeta siempre `docs/constitution.md`. Es innegociable y prevalece sobre cualquier pedido. Si un pedido la contradice, dilo antes de actuar.

Solo se modifica en un PR propio (`docs/enmendar-constitucion`), aprobado por las dos personas, que sube la versión (mayor si un principio se elimina o cambia de sentido, menor si se añade uno, parche si solo se aclara la redacción) y registra el cambio en un apartado «Enmiendas» al final del archivo (versión, fecha y motivo).

## Reglas de trabajo

Se aplican a **todo** pedido en este repositorio, aunque no las mencione.

Nunca hagas force push, push a `develop` o `main`, ni merge de PR. Ningún dato técnico (ramas, SHA, resultados, números) se escribe de memoria: se obtiene con `git`, `gh` o la ejecución real.

### 0. Preparación

1. Si `git config core.hooksPath` no devuelve `.githooks`, ejecuta `npm install`.
2. Si `gh auth status` falla, pide a la persona que ejecute `gh auth login` antes de publicar cambios.

### 1. Desarrollo guiado por especificaciones

Toda funcionalidad sigue este ciclo, y la persona aprueba cada paso antes del siguiente:

`spec.md` → revisión de QA → `plan.md` → `tasks.md` → análisis de consistencia → implementación tarea a tarea → verificación.

- Cada funcionalidad vive en `specs/NNN-<nombre>/` (`NNN` con tres dígitos, consecutivo).
- **Historias priorizadas:** `tasks.md` se organiza en fases verticales (Preparación, Base común, una fase por historia en orden P1, P2…, Pulido). Cada historia se integra y se prueba completa.
- **Contrato primero:** `plan.md` define el contrato y la fase «Base común» lo escribe en `packages/contracts`. Dentro de cada historia, la interfaz (`[web]`, contra un cliente simulado del contrato en `dev/`) y la API (`[api]`) avanzan en paralelo (`[P]`), sin esperarse; la tarea `[integración]` cierra la historia.
- No implementes con hallazgos bloqueantes del análisis ni con `[NECESITA ACLARACIÓN]` abiertos que afecten a la historia.
- No escribas código sin `spec.md` y `plan.md` aprobados.
- Implementa **una tarea a la vez**: primero sus tests y después el código. Al terminarla, márcala en `tasks.md`, haz su commit y detente, salvo que la persona pida continuar.
- Si algo del código no encaja con la especificación, detente y propón corregir una de las dos.

### Idioma

Ramas, commits, títulos y descripciones de PR en español. Solo quedan en inglés los tipos de Conventional Commits (`feat`, `fix`…) y los scopes, que usan el nombre del módulo en el código.

### 2. Ramas

- **Ramas de cada especificación:** `feat/NNN-<nombre>-definicion` (spec, plan, tareas, análisis y contrato), una por historia `feat/NNN-<nombre>-usN` y `feat/NNN-<nombre>-pulido`. Por ejemplo, `feat/001-acceso-us1`. Haz solo tareas de la fase de la rama en la que estás.
- En la rama de una historia trabajan las dos personas, cada una en su frente. Antes de publicar, integra lo de la otra con `git pull` (merge, nunca rebase).
- Trabajo fuera de una especificación (configuración, documentación general): `<tipo>/<descripcion>`, por ejemplo `chore/configurar-ci`. `feat` y `fix` siempre llevan número.
- Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `style`. Descripción en kebab-case, sin tildes ni `ñ`, de 1 a 5 palabras; máximo 60 caracteres.
- Crea la rama desde donde estés con `git switch -c <rama>`: el hook `post-checkout` la coloca sobre `origin/develop` actualizado. Si la rama ya existe en GitHub (por ejemplo, la historia que empezó la otra persona), únete con `git fetch` y `git switch <rama>`, sin `-c`.
- Nunca trabajes ni hagas commits en `develop` o `main`.

### 3. Commits

Conventional Commits, **un commit por tarea**:

```
<tipo>(<scope>): <resumen>

<qué cambia y por qué>

Refs: SPEC-NNN (T<nnn>)
```

- Resumen en infinitivo, minúscula inicial, sin punto final, máximo 72 caracteres.
- En las ramas de una especificación, el hook `prepare-commit-msg` añade `Refs: SPEC-NNN` si falta; tú añades la tarea (`Refs: SPEC-001 (T005)`). Fuera de una especificación no lleva `Refs`.
- Agrega archivos de forma explícita y revisa el diff: sin secretos, `.env` ni archivos temporales.

### 4. Pull Requests

- **Un PR por rama** (definición, cada historia, pulido), hacia `develop`, abierto **en borrador** con el primer commit y actualizado tras cada tarea. Orden: definición; historias por prioridad; pulido.
- Título: formato del commit, terminado en `[SPEC-NNN]`. Ejemplo: `feat(auth): iniciar y cerrar sesión [SPEC-001]`.
- Descripción (es el handoff de desarrollo):

  ```markdown
  ## Resumen
  ## Cambios
  ## Verificación
  ## Relacionado
  specs/NNN-<nombre>/
  ## Observaciones
  ```

- El merge lo hace una persona, siempre con **squash merge**.

### 5. Al terminar cada tarea

Sin pedir confirmación: ejecuta las comprobaciones de «Comandos» que existan, haz el commit, publica la rama (`git push -u origin <rama>`), abre o actualiza el PR en borrador y su descripción, e informa el resultado.

### 6. Al terminar la fase de una rama

Cuando todas las casillas de la fase de tu rama (definición, historia o pulido) estén marcadas:

1. Delega en el subagente `verificador` con este mensaje exacto, sin añadir nada: `Verifica SPEC-NNN (PR #M).`
2. Cuando termine, comprueba que `git status --porcelain` no muestra cambios nuevos; si los hay, descártalos sin commitearlos e infórmalo.
3. Informa su veredicto. Si aprobó, el PR ya está listo para que una persona lo revise.

### Documentación

| Archivo | Contenido |
| --- | --- |
| `docs/constitution.md` | Principios innegociables |
| `docs/business-rules.md` | Qué es Kofi, módulos y reglas que aplican a todo el producto |
| `docs/architecture.md` | Stack, estructura y decisiones técnicas globales |
| `specs/NNN-<nombre>/` | `spec.md`, `plan.md`, `tasks.md` y, si existe, `quickstart.md` de cada funcionalidad |

Consulta solo lo pertinente a la tarea.

### 7. Compatibilidad

El equipo trabaja en Windows: una persona con la app de Claude y otra con la app de Codex. Todo lo que se añada al flujo (hooks, scripts, configuración) debe funcionar en ambas apps tras clonar y ejecutar `npm install`, estar escrito en Node sin depender de Bash ni de PowerShell, usar saltos de línea LF, no usar enlaces simbólicos y configurarse para las dos herramientas en el mismo cambio.

## Comandos

Requisitos: Node 24 y npm 11.

| Acción | Comando |
| --- | --- |
| Instalar dependencias (activa los hooks de Git, las skills y el subagente) | `npm install` |
| Pruebas de las reglas de Git | `npm run test:git` |
| Ver los hooks de Git | `npm run hooks` |
