# Kofi POS

Kofi POS es el sistema web de punto de venta de **Kofi**, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia.

## Equipo

- Pablo Ramírez ([@Tutuma-jar](https://github.com/Tutuma-jar))
- Natalia Arteaga

## Módulos

| Módulo | Especificación | Estado |
| --- | --- | --- |
| Acceso | `specs/001-acceso/` | Pendiente |
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
6. Confiar en los hooks de agente del proyecto: en Claude, revisarlos en `/hooks`; en Codex, en **Settings → Hooks**

## Instalación

```bash
git clone https://github.com/Tutuma-jar/kofi-pos-v2.git
cd kofi-pos-v2
npm install   # dependencias y hooks de Git
```

## Flujo de trabajo

Las reglas completas están en [AGENTS.md](AGENTS.md) y la [constitución](docs/constitution.md), que Claude y Codex cargan automáticamente.

Cada funcionalidad sigue el ciclo de desarrollo guiado por especificaciones, con aprobación de una persona en cada paso:

| Paso | Resultado |
| --- | --- |
| 1. Especificar | `spec.md`, con historias priorizadas |
| 2. Revisar | Lista de hallazgos de QA |
| 3. Planificar | `plan.md`, con el contrato |
| 4. Desglosar | `tasks.md`, en fases por historia |
| 5. Analizar | Consistencia entre documentos, antes de programar |
| 6. Implementar | Una tarea, tests primero |
| 7. Verificar | Revisión independiente, RF por RF |
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

## Skills de terceros

Cada persona instala estas skills en su computadora siguiendo su guía oficial, y las usa manualmente. No se copian al repositorio ni se modifican.

- **Impeccable:** https://impeccable.style/tutorials/getting-started/
- **Emil Design Engineering:** https://emilkowal.ski/skill
