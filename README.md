# Kofi POS

Kofi POS es el sistema web de punto de venta de **Kofi**, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia.

## Equipo

- Pablo Ramírez ([@Tutuma-jar](https://github.com/Tutuma-jar))
- Natalia Arteaga

## Módulos

| Módulo | Especificación | Estado |
| --- | --- | --- |
| Acceso | `specs/001-acceso/` | Implementado; pulido en revisión |
| Menú | `specs/002-menu/` | Pendiente |
| Ventas | `specs/003-ventas/` | Pendiente |
| Dashboard | `specs/004-dashboard/` | Pendiente |
| Historial y reportes | `specs/005-historial/` | Pendiente |

El estado se actualiza en el PR que completa cada especificación.

## Arquitectura

TypeScript en todo el monorepo (Node 24 y workspaces de npm): interfaz con React y Vite, API con Fastify y contrato con Zod, sobre PostgreSQL. Se despliega en Render (interfaz y API) y Neon (base de datos). El detalle está en la [constitución](docs/constitution.md) y en [docs/architecture.md](docs/architecture.md).

```
apps/web/            interfaz web
apps/api/            API
packages/contracts/  contrato compartido entre interfaz y API
docs/                constitución, reglas de negocio y arquitectura
specs/               una carpeta por funcionalidad: spec.md, plan.md y tasks.md
```

Cada PR hacia `develop` debe pasar dos checks: `technical-checks` (tipos, lint, formato, pruebas y build) y `pr-rules` (rama, título y descripción del PR).

## Requisitos

Una vez por computadora (Windows):

1. Git: `winget install Git.Git`
2. Node 24, con `node` en el PATH del sistema
3. GitHub CLI: `winget install GitHub.cli` y luego `gh auth login`
4. Identidad de Git: `git config --global user.name "…"` y `git config --global user.email "…"`
5. En la app de Codex: usar el agente nativo de Windows y marcar el proyecto como de confianza
6. Confiar en los hooks de agente del proyecto:
   - En Claude, aceptar el aviso de confianza de la carpeta al abrir el proyecto. Para verlos, `/hooks` en Claude Code desde la terminal (`claude`); la app de escritorio no tiene ese comando.
   - En Codex, revisar y confiar en `SessionStart` y `PreToolUse` en **Settings → Hooks**. Codex pide hacerlo de nuevo cada vez que cambia `.codex/hooks.json`, y mientras tanto no ejecuta los hooks que cambiaron.

## Instalación

```bash
git clone https://github.com/Tutuma-jar/kofi-pos-v2.git
cd kofi-pos-v2
npm install   # dependencias, hooks de Git, skills y subagente del proyecto
```

## Desarrollo de Acceso

Ejecuta todos los comandos desde la raíz del repositorio, con Node 24 y npm 11.

### Preparar la base y el contrato

1. Crea una base propia de desarrollo en Neon; usa una rama distinta de producción y de las bases de las otras personas.
2. Copia `apps/api/.env.example` como `apps/api/.env` y completa `DATABASE_URL` con la cadena privada de esa base (con `?sslmode=require`). Mantén `PORT=3000` y `NODE_ENV=development`: el proxy web apunta a ese puerto. `.env` no se versiona; no compartas su contenido por chat ni en el PR.
3. Compila el contrato y aplica las migraciones:

```sh
npm run build:contracts
npm run migrate -w @kofi/api
```

Las migraciones pendientes se aplican en orden. Repetir el comando no vuelve a aplicar las ya registradas.

### Preparar las cuentas

Las cuentas se preparan con la CLI; no hay registro ni gestión de cuentas en la interfaz:

```sh
npm run accounts -w @kofi/api -- create
```

La CLI pide estos datos, en este orden:

| Dato | Qué escribir |
| --- | --- |
| Usuario | De 3 a 30 caracteres: letras a–z, dígitos, punto, guion o guion bajo. No distingue mayúsculas ni espacios alrededor y debe ser único. |
| Nombre visible | De 1 a 40 caracteres: el nombre que se mostrará en el sistema. |
| Rol | `owner` para dueño o `cashier` para cajero. |
| Contraseña | De 8 a 64 caracteres, no solo espacios. Escríbela en la terminal: no se muestra mientras la introduces. |

Repite `create` para cada persona. El dueño elige las contraseñas y las entrega a cada persona en privado. No las escribas en archivos, ejemplos, argumentos de comandos, chat ni PR.

Para comprobar las cuentas preparadas:

```sh
npm run accounts -w @kofi/api -- list
```

`list` muestra usuario, nombre visible y rol; nunca contraseñas ni hashes. La misma CLI admite `update` y `delete`, y pide los datos de forma interactiva. Cambiar el rol o la contraseña, o eliminar una cuenta, termina sus sesiones; cambiar solo el nombre visible las conserva.

### Arrancar con tres terminales

Deja estos procesos abiertos, cada uno en una terminal situada en la raíz:

Terminal 1 — recompilar el contrato al guardar:

```sh
npm run dev -w @kofi/contracts
```

Terminal 2 — API con la configuración de `apps/api/.env`:

```sh
npm run dev -w @kofi/api
```

Terminal 3 — interfaz con el proxy hacia la API:

```sh
npm run dev -w @kofi/web
```

Abre la URL que indica Vite (por defecto, [http://localhost:5173/ingresar](http://localhost:5173/ingresar)). Ingresa con una cuenta preparada: verás su nombre, su rol y «Cerrar sesión». La comprobación de salud está en [http://localhost:5173/api/health](http://localhost:5173/api/health), pasando por el proxy web, y debe responder `{"status":"ok"}`.

El ingreso mantiene una sesión por navegador. Cinco intentos fallidos en quince minutos bloquean la cuenta durante cinco minutos; la sesión vence a las doce horas. El detalle y los casos de prueba están en [SPEC-001](specs/001-acceso/spec.md).

### Comprobar Acceso

```sh
npm run test
npx playwright install chromium
npm run test:e2e
```

Las pruebas usan cuentas ficticias y una base en memoria. Los comandos compilan antes el contrato; E2E también compila la web y levanta sus propios servidores. Las demás comprobaciones están en [AGENTS.md](AGENTS.md#comandos).

Para medir el despliegue de comprobación con una persona, usa `npm run measure:access`: pide una contraseña oculta en la terminal, automatiza veinte ingresos y cierres después del calentamiento y luego cronometra un ingreso manual. RNF-4 exige al menos 19 de 20 ingresos en menos de 3 segundos y 19 de 20 cierres en menos de 2 segundos; el ingreso manual debe tardar menos de 15 segundos. El primer acceso tras la suspensión del servicio queda excluido. La evidencia de Pulido y su reevaluación aprobada están en [el informe de tiempos](specs/001-acceso/evidence/access-performance.json) y en [el plan](specs/001-acceso/plan.md#pulido--medición-asistida-t043).

## Flujo de trabajo

Las reglas completas están en [AGENTS.md](AGENTS.md) y la [constitución](docs/constitution.md), que Claude y Codex cargan automáticamente.

Cada funcionalidad sigue el ciclo de desarrollo guiado por especificaciones. El agente invoca la skill de cada paso cuando le toca, y una persona aprueba cada paso antes del siguiente o delega sus decisiones (por ejemplo, «delego 001-acceso»): en ese caso el agente decide con sus recomendaciones, las registra y todo se revisa en el PR antes de fusionarlo. Las skills también se pueden invocar a mano:

| Paso | Cómo |
| --- | --- |
| 1. Especificar | `/especificar` (Claude) o `$especificar` (Codex) → `spec.md` |
| 2. Revisar | `/revisar-spec` → lista de hallazgos |
| 3. Planificar | `/planificar` → `plan.md` |
| 4. Desglosar | `/desglosar` → `tasks.md`, en fases por historia |
| 5. Analizar | `/analizar` → consistencia entre documentos, antes de programar |
| 6. Implementar | `/implementar T<nnn>` → una tarea, tests primero |
| 7. Verificar | Automático: el subagente `verificador` recorre los RF |
| 8. Integrar | Una persona revisa y fusiona con squash merge |

Cada especificación se entrega **por historias priorizadas**: un PR de definición (con el contrato), un PR por historia (`feat/NNN-<nombre>-usN`) y un PR de pulido. Dentro de cada historia, la interfaz (contra un cliente simulado del contrato) y la API avanzan en paralelo, y la historia cierra integrada y probada de punta a punta.

### Hooks de Git

| Hook | Qué hace |
| --- | --- |
| `post-checkout` | Coloca cada rama nueva sobre `origin/develop` actualizado |
| `pre-commit` | Impide commits en `develop` y `main` y commits con secretos |
| `prepare-commit-msg` | Agrega `Refs: SPEC-NNN` según la rama |
| `pre-push` | Valida el nombre de la rama e impide pushes a `develop` o `main` y el force push |
| `post-merge` | Avisa si cambiaron las dependencias |

`npm run hooks` muestra si están activos.

### Hooks de agente

| Hook | Qué hace |
| --- | --- |
| `SessionStart` | Entrega la constitución al agente y le avisa si falta preparar el entorno |
| `PreToolUse` | Impide que el agente salte los hooks de Git, haga force push, publique en `develop` o `main` o fusione PR |

Si un cambio modifica `.codex/hooks.json`, cada persona que use Codex debe volver a confiar en los hooks en **Settings → Hooks** y abrir una sesión nueva.

## Skills de terceros

Cada persona instala estas skills en su computadora siguiendo su guía oficial, y las usa manualmente. No se copian al repositorio ni se modifican.

- **Impeccable:** https://impeccable.style/tutorials/getting-started/
- **Emil Design Engineering:** https://emilkowal.ski/skill
