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

Toda funcionalidad sigue este ciclo. La persona aprueba cada paso antes del siguiente, salvo que delegue sus decisiones (ver «Modo delegado»):

| Paso | Lo hace | Resultado |
| --- | --- | --- |
| 1. Especificar | skill `especificar` | `spec.md` |
| 2. Revisión de QA | skill `revisar-spec` | Hallazgos resueltos en `spec.md` |
| 3. Planificar | skill `planificar` | `plan.md`, con el contrato |
| 4. Desglosar | skill `desglosar` | `tasks.md` |
| 5. Analizar | skill `analizar` | Informe de consistencia |
| 6. Implementar | skill `implementar`, una tarea cada vez | Código, tests y casilla marcada |
| 7. Verificar | subagente `verificador` (regla 6) | Comentario y veredicto en el PR |

- Cuando la persona aprueba un paso, o al terminarlo en modo delegado, invoca la skill del siguiente sin esperar a que te lo pidan.
- Cada funcionalidad vive en `specs/NNN-<nombre>/` (`NNN` con tres dígitos, consecutivo).
- **Historias priorizadas:** `tasks.md` se organiza en fases verticales (Preparación, Base común, una fase por historia en orden P1, P2…, Pulido). Cada historia se integra y se prueba completa.
- **Contrato primero:** `plan.md` define el contrato y la fase «Base común» lo escribe en `packages/contracts`. Dentro de cada historia, la interfaz (`[web]`, contra un cliente simulado del contrato en `dev/`) y la API (`[api]`) avanzan en paralelo (`[P]`), sin esperarse; la tarea `[integración]` cierra la historia.
- No implementes con hallazgos bloqueantes del análisis ni con `[NECESITA ACLARACIÓN]` abiertos que afecten a la historia.
- No escribas código sin `spec.md` y `plan.md` aprobados. En modo delegado, solo las tareas de Preparación y Base común se implementan antes de que se apruebe la definición, en su mismo PR, y se aprueban junto con ella al fusionarlo.
- Implementa **una tarea a la vez**: primero sus tests y después el código. Al terminarla, márcala en `tasks.md`, haz su commit y detente, salvo que la persona pida continuar o estés en modo delegado.
- Si algo del código no encaja con la especificación, detente y propón corregir una de las dos; en modo delegado, aplica «Bloqueos y correcciones».

### Modo delegado

La persona puede delegar sus decisiones con un pedido explícito, por ejemplo «delego 001-acceso» o «delego la definición de 002-menu». Vale para lo que indique hasta que diga lo contrario. Mientras dure:

- **No preguntes:** decide cada punto con tu recomendación y regístralo como «Decisión delegada», con la decisión, el motivo y la alternativa descartada. Las de negocio van en «Aclaraciones» de `spec.md`; las técnicas, en «Decisiones técnicas» de `plan.md`; las demás, en «Observaciones» del PR.
- **No te detengas** entre pasos ni entre tareas: haz el commit de cada paso, publica la rama, actualiza el PR y sigue con el siguiente.
- Todo lo decidido queda aprobado al fusionar el PR que lo contiene (constitución, principio 2). Ninguna historia empieza antes de que se fusione el PR de definición, y el merge siempre lo hace una persona.
- Detente igualmente en los casos que indica «Bloqueos y correcciones».

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

### Bloqueos y correcciones

- **Vuelve al documento que tiene el problema**, corrígelo con la skill que le corresponde y rehaz solo lo que depende de él, en la misma rama y el mismo PR. Los documentos se actualizan en su sitio; el historial queda en Git.
- **«Cambios requeridos» del verificador:** añade tareas de corrección a `tasks.md` (por ejemplo, `T012 Corregir RF-4: …`), impleméntalas como cualquier otra y vuelve a delegar en el verificador, que edita su mismo comentario.
- **Si cambia el contrato durante una historia:** actualiza `plan.md` y `packages/contracts` en el PR de esa historia y dilo en «Observaciones», porque afecta al frente de la otra persona.
- **Una funcionalidad nueva** va en una especificación nueva: no amplíes la que está en marcha.

En modo delegado resuelves solo los fallos técnicos (tests, CI, lint, tipos, build), las incoherencias entre documentos, los «Cambios requeridos», las ambigüedades de negocio y los cambios de contrato. Te detienes siempre, también en modo delegado, y lo informas a la persona cuando:

- el mismo fallo técnico persiste tras dos intentos, o el verificador pide cambios por tercera vez;
- falta un dato que solo conocen las personas (por ejemplo, precios o cómo trabaja el local): márcalo `[NECESITA ACLARACIÓN]` en lugar de suponerlo;
- hay más de 3 `[NECESITA ACLARACIÓN]` abiertos, o alguno afecta a la historia en curso;
- algo entra en conflicto con la constitución;
- el pedido amplía el alcance de la especificación.

### Documentación

| Archivo | Contenido |
| --- | --- |
| `docs/constitution.md` | Principios innegociables |
| `docs/business-rules.md` | Qué es Kofi, módulos y reglas que aplican a todo el producto |
| `docs/architecture.md` | Stack, estructura y decisiones técnicas globales |
| `specs/NNN-<nombre>/` | `spec.md`, `plan.md`, `tasks.md` y, si existe, `quickstart.md` de cada funcionalidad |

Consulta solo lo pertinente a la tarea.

### 7. Compatibilidad

El equipo trabaja en Windows: una persona con la app de Claude y otra con la app de Codex. Todo lo que se añada al flujo (hooks, scripts, configuración) debe funcionar en ambas apps tras clonar y ejecutar `npm install`, estar escrito en Node sin depender de Bash ni de PowerShell, usar saltos de línea LF, no usar enlaces simbólicos y configurarse para las dos herramientas en el mismo cambio. Si cambias `.codex/hooks.json`, indica en el PR que quien use Codex debe volver a confiar en los hooks en Settings → Hooks.

## Comandos

Requisitos: Node 24 y npm 11.

| Acción | Comando |
| --- | --- |
| Instalar dependencias (activa los hooks de Git, las skills y el subagente) | `npm install` |
| Comprobar los tipos¹ | `npm run typecheck` |
| Revisar el código con ESLint | `npm run lint` |
| Formatear con Prettier | `npm run format` |
| Comprobar el formato | `npm run format:check` |
| Pruebas con Vitest¹ | `npm run test` |
| Pruebas de extremo a extremo con Playwright¹ ² | `npm run test:e2e` |
| Compilar¹ | `npm run build` |
| Comprobar que el build web excluye desarrollo | `npm run check:web-build` |
| Probar la detección de módulos de desarrollo | `npm run test:build` |
| Pruebas de las reglas de Git y del guardián de comandos | `npm run test:git` |
| Ver los hooks de Git | `npm run hooks` |
| Probar los medidores de acceso, menú y ventas con datos ficticios | `npm run test:measure` |
| Probar solo el medidor de menú con datos ficticios | `npm run test:measure:menu` |
| Medir acceso en el despliegue de prueba³ | `npm run measure:access` |
| Medir menú en el despliegue de prueba³ | `npm run measure:menu` |
| Medir ventas en el despliegue de prueba³ | `npm run measure:sales` |

¹ Compila antes `@kofi/contracts`.
² Compila también `@kofi/web` y necesita Chromium de Playwright: `npx playwright install chromium`.

³ Mediciones interactivas que ejecuta la persona en su terminal, fuera de las comprobaciones automáticas. Acceso (T043) pide una contraseña sin eco y después un ingreso manual en Chromium. Menú (T035) y Ventas (T026) piden ingresar directamente en Chromium, miden tres series de veinte operaciones y cronometran una creación o venta manual. No reciben credenciales por chat, archivos ni argumentos. Las comprobaciones automáticas usan `npm run test:measure` con datos ficticios.
