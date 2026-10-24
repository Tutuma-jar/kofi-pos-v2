# Arquitectura — Kofi POS

Stack, estructura y decisiones técnicas que afectan a todo el proyecto. Cada decisión global nueva se registra aquí en el mismo PR que la introduce.

## 1. Stack

Fijado por el principio 1 de la [constitución](constitution.md).

| Parte | Tecnología |
| --- | --- |
| Lenguaje | TypeScript en todo el monorepo |
| Entorno | Node 24 (`.node-version`) y npm 11, con workspaces de npm |
| Interfaz (`apps/web`) | React con Vite: aplicación de una sola página, compilada a archivos estáticos |
| API (`apps/api`) | Fastify |
| Contrato (`packages/contracts`) | Esquemas de Zod y sus tipos |
| Base de datos | PostgreSQL |
| Despliegue | Render: la interfaz como sitio estático y la API como servicio web. Neon: PostgreSQL administrado |

Las demás dependencias (acceso a datos, pruebas, lint, formato…) se justifican en el `plan.md` que las introduce. Las de uso global, adoptadas en [`specs/001-acceso/plan.md`](../specs/001-acceso/plan.md#7-decisiones-técnicas):

| Uso | Herramienta |
| --- | --- |
| Acceso a datos | `pg` con SQL escrito a mano y migraciones propias (§6.4) |
| Base de datos en pruebas | `@electric-sql/pglite`: PostgreSQL en memoria |
| Pruebas unitarias, de integración y de componentes | Vitest, con `jsdom` y Testing Library en la interfaz |
| Pruebas de punta a punta | Playwright con Chromium, en `e2e/` |
| Lint y formato | ESLint con `typescript-eslint` y `eslint-plugin-react-hooks`; Prettier |
| Rutas de la interfaz | `react-router` en modo biblioteca |
| Cookies en la API | `@fastify/cookie` |
| TypeScript de la API en desarrollo | El de Node 24, sin dependencias (`erasableSyntaxOnly`); en producción se compila con `tsc` |

## 2. Ramas

| Rama | Uso |
| --- | --- |
| `develop` | Rama por defecto y de integración. Solo recibe cambios por PR, con squash merge |
| `main` | Producción. Render despliega automáticamente desde `main` (§6.5). Recibe `develop` con un PR que abre una persona cuando se completa una especificación |

## 3. Estructura

Monorepo con workspaces de npm: `apps/` para lo que se ejecuta o despliega, `packages/` para lo compartido. Las carpetas de aplicaciones, paquetes y módulos se crean a medida que llega su especificación, no todas al inicio.

```
apps/
├── web/                         interfaz web (paquete @kofi/web)
│   └── src/
│       ├── modules/
│       │   ├── auth/            api/ components/ pages/ dev/
│       │   ├── menu/
│       │   ├── sales/           api/ components/ pages/ state/ dev/
│       │   ├── dashboard/
│       │   └── history/
│       ├── shared/              components/ http/ layout/ styles/
│       ├── routes.tsx
│       └── main.tsx
└── api/                         API (paquete @kofi/api)
    ├── test/                    base de pruebas (PGlite) y API para E2E
    └── src/
        ├── modules/
        │   ├── auth/
        │   ├── menu/
        │   ├── sales/
        │   ├── dashboard/
        │   └── history/
        ├── shared/              clock.ts config/ database/ http/
        ├── app.ts               buildApp(deps): lo usan server.ts y las pruebas
        └── server.ts
packages/
└── contracts/                   contrato entre interfaz y API (paquete @kofi/contracts)
    └── src/
        ├── auth.ts
        ├── menu.ts
        └── …
e2e/                             pruebas de punta a punta (Playwright), una por historia
docs/                            constitution.md, business-rules.md, architecture.md
specs/                           NNN-<nombre>/ spec.md plan.md tasks.md
render.yaml                      despliegue en Render (§6.5)
```

## 4. Convenciones

### 4.1 Raíz

| Carpeta | Regla |
| --- | --- |
| `apps/` | Una aplicación **nunca importa** de otra. Lo que compartan va a `packages/` |
| `packages/` | No depende de ninguna aplicación |

### 4.2 Módulos

- **Mismo nombre de dominio en las dos aplicaciones y en el contrato:** `auth`, `menu`, `sales`, `dashboard` y `history`.
- **Nombres del negocio, en inglés:** `menu` y no `catalog`, porque en una cafetería se habla del menú. Los componentes de interfaz que también se llamen «menú» (navegación, desplegables) usan nombres específicos, como `NavMenu`, y nunca van dentro de `modules/menu/`.
- **Un módulo no importa los archivos internos de otro.** Lo común va a `shared/`.
- **Superficie pública:** cada módulo, en las dos aplicaciones, expone un `index.ts`, y los demás módulos importan solo de ahí. Una regla `no-restricted-imports` de ESLint lo comprueba.
- **Pruebas junto al código:** `*.test.ts` (unitarias) y `*.integration.test.ts` (integración).

### 4.3 Dentro de cada módulo

| Aplicación | Convención | Ejemplo |
| --- | --- | --- |
| `apps/api` | **Archivos planos con sufijo de capa.** Subcarpeta solo a partir de **tres o más archivos de la misma capa** | `menu/products.routes.ts`, `products.service.ts`, `products.model.ts` |
| `apps/web` | **Subcarpetas por tipo** | `menu/api/`, `menu/components/`, `menu/pages/`, `sales/state/` y `dev/` |

| Tipo | Convención | Ejemplo |
| --- | --- | --- |
| Componentes de interfaz | `PascalCase` | `ProductForm.tsx` |
| Hooks de interfaz | `useAlgo` | `useSalesOrder.ts` |
| Otros archivos de la interfaz | `kebab-case` | `menu-client.ts` |
| API | `<entidad>.<capa>` | `products.service.ts` |
| Contratos | `<módulo>` | `menu.ts` |

### 4.4 Contratos (`packages/contracts`)

- **Única fuente del contrato** entre interfaz y API: esquemas de Zod y sus tipos para peticiones, respuestas y errores de cada módulo.
- La API los usa para **validar**; la interfaz, para **tipar** sus clientes.
- Si cambia un campo, `npm run typecheck` falla en las dos aplicaciones.
- Se compila antes que las aplicaciones: los scripts `typecheck`, `test` y `build` de la raíz lo compilan primero.

### 4.5 Escenarios de desarrollo

Permiten forzar estados de la interfaz (vacío, error, conflicto…) en desarrollo sin depender de la API, y trabajar la interfaz mientras la API se implementa.

```
apps/web/src/modules/<módulo>/dev/
├── fixtures.ts
├── <módulo>-demo-client.ts
└── ScenarioPicker.tsx
```

- El código real **no importa** de `dev/`; solo lo hace el punto de montaje, y únicamente en desarrollo.
- **No llega a producción:** se carga con una importación condicionada al modo de desarrollo (`import.meta.env.DEV` en Vite), para que el build lo excluya.
- Las pruebas pueden reutilizar sus fixtures.
- **Se simula solo contra un contrato aprobado** en `packages/contracts`, nunca contra uno inventado. El cliente simulado implementa la misma interfaz que el cliente real, y sus datos se validan con los esquemas del contrato. Así la interfaz puede avanzar en paralelo con la API, y la integración consiste en cambiar el cliente simulado por el real.

## 5. Comprobaciones de la estructura

Se aplican desde que existen las aplicaciones (`001-acceso`):

- `npm run typecheck`, `lint`, `test` y `build` pasan desde la raíz.
- Ninguna aplicación importa de otra (comprobable con una regla de lint de imports).
- El build de producción de `apps/web` no contiene nada de `dev/`.

## 6. Decisiones globales

Adoptadas en [`specs/001-acceso/plan.md`](../specs/001-acceso/plan.md), que tiene el detalle y las alternativas descartadas.

### 6.1 Mismo origen

- Todas las rutas de la API van bajo `/api`.
- La interfaz y la API se sirven desde el mismo origen: en Render, el sitio estático reescribe `/api/*` al servicio de la API; en desarrollo, el proxy de Vite hace lo mismo. No hay CORS.

### 6.2 Sesión

- La sesión es una cookie `kofi_session` (`HttpOnly`, `SameSite=Strict`, `Secure` en producción) con un token aleatorio. En la base solo se guarda su SHA-256.
- Toda ruta protegida de cualquier módulo usa `requireSession`, que exporta el módulo `auth` de la API. Ante una sesión inválida responde `401` con `SESSION_MISSING`, `SESSION_EXPIRED` o `SESSION_TERMINATED`.
- Las respuestas de la API llevan `Cache-Control: no-store`.

### 6.3 Errores

- Formato común, definido en `packages/contracts/src/errors.ts`: `{ error: { code, message, fields?, … } }`.
- `code` es estable y en inglés (`INVALID_CREDENTIALS`); la interfaz lo usa para decidir qué hacer.
- `message` está en español, lo arma la API y la interfaz lo muestra tal cual.

### 6.4 Datos

- Solo `apps/api/src/shared/database` habla con PostgreSQL, mediante la interfaz `Database` (`query`, `transaction`), con un adaptador de `pg` en producción y otro de PGlite en pruebas.
- Las migraciones son archivos SQL numerados en `apps/api/src/shared/database/migrations/` (`NNN_<nombre>.sql`). `migrate.ts` aplica en orden las pendientes y las registra en `schema_migrations`.
- La hora de la API sale solo de `shared/clock.ts`, que las pruebas reemplazan por un reloj falso.

### 6.5 Despliegue

- `render.yaml` (Blueprint) describe el sitio estático de la interfaz y el servicio web de la API. Los secretos (`DATABASE_URL`) se declaran sin valor y se cargan en Render.
- Render despliega desde `main`. La API aplica las migraciones pendientes al arrancar.
- **Despliegues de comprobación:** mientras una especificación no esté en `main`, el Blueprint puede apuntar temporalmente a su rama, con una base de Neon propia, para comprobar el despliegue. Después vuelve a `main`.
- Los dos servicios usan el **plan gratuito**: la API se suspende tras 15 minutos sin tráfico y tarda alrededor de un minuto en reactivarse. Las especificaciones no fijan tiempos de respuesta para ese primer acceso.
- Neon aloja PostgreSQL. Cada persona usa en desarrollo su propia base (`DATABASE_URL` en `apps/api/.env`, que no se versiona).

### 6.6 Rutas de la interfaz

- Las rutas se declaran en `apps/web/src/routes.tsx` con `react-router`.
- Cada ruta protegida declara los roles que pueden verla (`roles`; por defecto, `owner` y `cashier`). La interfaz solo usa esa lista para navegar y para no mostrar lo que el rol no puede ver; los permisos reales los aplica la API en cada módulo.
