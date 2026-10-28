# Tareas — SPEC-006 Menú inicial

Estado: aprobadas y analizadas (sin hallazgos tras la corrección); Base común implementada · Fecha: 2026-10-28 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[api]` e `[integración]`. No hay tareas `[contrato]` ni `[web]`: la especificación no cambia `packages/contracts` ni la interfaz (plan §3 y §6). Las tareas que tocan la E2E, `AGENTS.md` o una base real usan `[integración]`.
- **`[P]`:** ninguna tarea lo lleva. Con un solo frente de código (`[api]`), las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Base común en `feat/006-menu-inicial-definicion`; la historia en `feat/006-menu-inicial-us1`; Pulido en `feat/006-menu-inicial-pulido`.
- **Dependencias de SPEC-002:** `saveCategory`, `saveProduct`, `getAdminMenu`, `getCurrentMenu`, `002_menu.sql`, `migrate`, la ruta de pruebas `POST /api/__test/menu` y `seedMenu` ya están en `develop`.
- **Dudas abiertas:** ninguna.
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Sin tareas: el módulo `menu` de la API, las migraciones, las herramientas de prueba y las reglas de lint de los módulos ya existen desde SPEC-001 y SPEC-002 (plan §3).

## Fase 2 — Base común

Rama: `feat/006-menu-inicial-definicion`.

- [x] **T001 [api]** Escribir `apps/api/src/modules/menu/official-menu.data.ts` con el tipo `OfficialCategory` y la constante `OFFICIAL_MENU`: las 6 categorías y los 37 productos de «Menú oficial», con el precio como texto («10,00») (plan §4, D-2, D-6; RF-1)
  Hecho cuando: `official-menu.data.test.ts` comprueba que hay 6 categorías y 37 productos; que cada nombre de categoría cumple `categoryNameSchema` y cada nombre de producto `productNameSchema`, sin cambiar al normalizarse; que cada precio cumple `priceSchema`; que no hay dos categorías ni dos productos con la misma `menuNameKey`; y que la lista (categoría, producto y `formatPrice` del precio) coincide exactamente, fila por fila, con la tabla «Menú oficial» leída de `specs/006-menu-inicial/spec.md`; y `npm run typecheck` pasa.

## Fase 3 — US1: empezar la base oficial con el menú de Kofi (P1)

Rama: `feat/006-menu-inicial-us1`.

- [ ] **T002 [api] [US1]** Escribir `official-menu.service.ts` con `loadOfficialMenu(db, menu = OFFICIAL_MENU)`: en una sola transacción, el bloqueo `pg_advisory_xact_lock`, `migrate` sobre el `batch`, `LOCK TABLE categories, products IN SHARE ROW EXCLUSIVE MODE` y el alta con `saveCategory` y `saveProduct`; devuelve `{ categories, products }`. Exportarlo desde `modules/menu/index.ts` (plan §5.1, D-3, D-4, D-5; RF-2, RF-4, RNF-2). Depende de: T001
  Hecho cuando: `official-menu.service.integration.test.ts` comprueba, en una base migrada sin menú, que devuelve `{ categories: 6, products: 37 }`, que `getAdminMenu` coincide con `OFFICIAL_MENU` con todo activo y `priceCents` igual al precio de la tabla (1500 para «Bs 15,00»), y que `getCurrentMenu` tiene los 37 productos; en una base sin tablas (`createEmptyTestDatabase`), que aplica las migraciones y carga lo mismo; con las cuentas del dueño y el cajero ya creadas, que carga sin tocarlas; y, con un `Database` que falla al insertar un producto intermedio (como en `seed-menu.integration.test.ts`), que el error llega a quien llamó, que en una base migrada `getAdminMenu` queda vacío y que en una base sin tablas no quedan `categories`, `products` ni `schema_migrations`.
- [ ] **T003 [api] [US1]** Añadir a `loadOfficialMenu` el rechazo de una base con menú: después de los bloqueos, si `categories` o `products` tienen alguna fila, lanza `OfficialMenuNotEmptyError` sin cambiar nada (plan §5.1, D-5; RF-3). Depende de: T002
  Hecho cuando: las pruebas de integración comprueban que se rechaza con `OfficialMenuNotEmptyError` y que `getAdminMenu` queda igual que antes con una sola categoría sin productos, con categorías y productos todos inactivos, con los 200 productos de `seedMenu` y al cargar por segunda vez; que dos cargas simultáneas (`Promise.all`) sobre una base vacía terminan con una carga completa y un `OfficialMenuNotEmptyError`, con 37 productos en la base; y, registrando las sentencias de la transacción, que `pg_advisory_xact_lock` va antes de la primera sentencia de `migrate` y `LOCK TABLE categories, products IN SHARE ROW EXCLUSIVE MODE` antes de la consulta que comprueba si hay menú.
- [ ] **T004 [api] [US1]** Escribir `official-menu.cli.ts` con `runOfficialMenuLoad({ env, createDatabase, write })`, sus tres mensajes y el punto de entrada (`import.meta.main`) que usa `process.env`, `createPgDatabase` y la salida de la terminal; añadir a `apps/api/package.json` el script `load:menu` (`node --env-file-if-exists=.env src/modules/menu/official-menu.cli.ts`) (plan §5.2, D-1, D-7; RF-2, RF-3, RF-4, RNF-1). Depende de: T003
  Hecho cuando: `official-menu.cli.integration.test.ts`, con PGlite como `createDatabase`, comprueba que una base vacía devuelve 0 y escribe «Menú oficial cargado: 6 categorías y 37 productos»; que una base con menú devuelve 1 y escribe «La base ya tiene categorías o productos. El menú oficial solo se carga en una base nueva»; que sin `DATABASE_URL`, con una `DATABASE_URL` inválida y con un `createDatabase` cuyo error contiene la dirección de la base devuelve 1 y escribe solo «No se pudo cargar el menú oficial. Comprueba la configuración y la conexión a la base», sin la dirección; y que siempre cierra la base que abrió; y `npm run build` incluye `dist/modules/menu/official-menu.cli.js`.
- [ ] **T005 [integración] [US1]** Añadir a `apps/api/test/e2e-server.ts` la ruta `POST /api/__test/official-menu`, que vacía ventas y menú como `POST /api/__test/menu` y llama a `loadOfficialMenu`, y escribir `e2e/menu-inicial-us1-cargar.spec.ts` (plan §8.2, D-8; RF-2). Depende de: T004
  Hecho cuando: la E2E comprueba que, con una sesión de cajero, «Ver menú» muestra las 6 categorías y los 37 productos con sus precios en el formato «Bs 10,00»; y que, con una sesión de dueño, «Administrar menú» los muestra activos y, tras cambiar el precio de «Americano» a 14, «Ver menú» muestra «Bs 14,00»; y `npm run test:e2e` pasa completo.

## Fase 4 — Pulido

Rama: `feat/006-menu-inicial-pulido`.

- [ ] **T006 [integración]** Añadir a «Comandos» de `AGENTS.md` la fila «Cargar el menú oficial en una base nueva» con `npm run load:menu -w @kofi/api` y una nota propia (⁵) (plan §9). Depende de: T005
  Hecho cuando: la fila está en la tabla y su nota explica que la ejecuta a mano la persona que prepara el sistema, que lee la base de `DATABASE_URL`, que solo carga en una base sin categorías ni productos y que no se ejecuta al desplegar; y `npm run format:check` pasa.
- [ ] **T007 [integración]** Comprobar el comando contra PostgreSQL real en dos bases de Neon de comprobación nuevas y vacías: en la primera, la persona lo ejecuta desde su computadora, cronometra la carga y lo repite para ver el rechazo; en la segunda, lanza dos cargas a la vez con el comando de Node del plan §8.3. Anotar los resultados en el PR de pulido (plan §8.3, D-5; RNF-3, RF-2, RF-3). Requiere a una persona con acceso a Neon. Depende de: T006
  Hecho cuando: el PR de pulido registra que, en la primera base, la primera ejecución escribió «Menú oficial cargado: 6 categorías y 37 productos» en menos de 1 minuto, la segunda escribió el mensaje de RF-3 sin cambios y «Ver menú» mostró los 37 productos; y que, en la segunda base, una de las dos cargas simultáneas escribió el mensaje de carga, la otra el de RF-3 y la base quedó con 37 productos.

## Cobertura

| RF / RNF | Tareas |
| --- | --- |
| RF-1 | T001 |
| RF-2 | T002, T004, T005, T007 |
| RF-3 | T003, T004, T007 |
| RF-4 | T002, T004 |
| RNF-1 | T004 |
| RNF-2 | T002 |
| RNF-3 | T007 |

## Cambios tras el análisis de consistencia

La persona pidió corregir los dos hallazgos menores (2026-10-28; plan §10). Las pruebas de RF-4 pasan a T002, la tarea que escribe la transacción, y la antigua T004 desaparece, así que las tareas siguientes se renumeran. T003 añade la prueba del orden de los bloqueos y T007 las dos cargas a la vez contra PostgreSQL real.
