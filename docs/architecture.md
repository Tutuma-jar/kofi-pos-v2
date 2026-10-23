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

Las demás dependencias (acceso a datos, pruebas, lint, formato…) se justifican en el `plan.md` que las introduce.

## 2. Ramas

| Rama | Uso |
| --- | --- |
| `develop` | Rama por defecto y de integración. Solo recibe cambios por PR, con squash merge |
| `main` | No se usa por ahora. Se decide al configurar el despliegue en `001-acceso` |

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
│       ├── shared/              components/ layout/ styles/
│       └── main.tsx
└── api/                         API (paquete @kofi/api)
    └── src/
        ├── modules/
        │   ├── auth/
        │   ├── menu/
        │   ├── sales/
        │   ├── dashboard/
        │   └── history/
        ├── shared/              config/ database/ http/
        └── server.ts
packages/
└── contracts/                   contrato entre interfaz y API (paquete @kofi/contracts)
    └── src/
        ├── auth.ts
        ├── menu.ts
        └── …
docs/                            constitution.md, business-rules.md, architecture.md
specs/                           NNN-<nombre>/ spec.md plan.md tasks.md
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
- Se compila antes que las aplicaciones (el script `build` de la raíz lo ejecuta primero).

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
