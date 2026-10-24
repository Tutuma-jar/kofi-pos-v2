# Tareas — SPEC-002 Menú

Estado: aprobadas y analizadas (modo delegado, sin bloqueantes); Preparación y Base común implementadas · Fecha: 2026-10-24 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[contrato]`, `[api]`, `[web]` e `[integración]`. Las tareas que tocan la raíz del monorepo, la E2E o el despliegue usan `[integración]`.
- **`[P]`:** se puede hacer en paralelo con las tareas del otro frente de su fase. En Base común, las tareas `[api]` y `[web]` avanzan en paralelo una vez escrito el contrato. En las fases de historia, ninguna tarea `[web]` depende de una `[api]` ni al revés: las dos dependen solo de Preparación, Base común y, donde se indica, de SPEC-001. Dentro de un mismo frente, las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Preparación y Base común en `feat/002-menu-definicion`, como en SPEC-001; cada historia en `feat/002-menu-usN`; Pulido en `feat/002-menu-pulido`.
- **Dependencia de SPEC-001** (plan, D-1): las historias de Menú necesitan piezas de la historia 1 de Acceso (`requireSession`, la sesión de la interfaz y la pantalla inicial). Se indican como «SPEC-001 T0NN». **Ninguna historia de Menú empieza antes de que se fusione `feat/001-acceso-us1`** en `develop`.
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Rama: `feat/002-menu-definicion`.

- [x] **T001 [integración]** Crear el módulo `menu` vacío en las dos aplicaciones: `apps/api/src/modules/menu/index.ts` y `apps/web/src/modules/menu/index.ts`, y añadir a `eslint.config.test.ts` los casos de `menu` (otro módulo no puede importar sus archivos internos, sí su `index.ts`) (plan §3)
  Hecho cuando: las pruebas de las reglas de lint pasan con los casos nuevos, y `npm run lint` y `npm run typecheck` pasan.

## Fase 2 — Base común

Rama: `feat/002-menu-definicion`.

- [x] **T002 [contrato]** Añadir a `packages/contracts/src/errors.ts` los códigos `FORBIDDEN`, `NOT_FOUND`, `CATEGORY_HAS_ACTIVE_PRODUCTS` y `CATEGORY_INACTIVE` (plan §6.2; RF-1, RF-9, RF-10)
  Hecho cuando: las pruebas validan con `apiErrorSchema` los ejemplos de error de §6.2 del plan con los códigos nuevos y `npm run typecheck` pasa.
- [x] **T003 [contrato]** Escribir en `packages/contracts/src/menu.ts` las constantes de largo, `normalizeMenuName`, `menuNameKey`, `compareMenuNames`, `categoryNameSchema` y `productNameSchema` con sus mensajes (plan §5.1, §6.1, D-3, D-4; RF-2, RF-3, RF-6, RF-12). Depende de: T001
  Hecho cuando: las pruebas comprueban que «  Té   de   coca  » queda «Té de coca»; que «Café» y «cafe», «Pingüino» y «pinguino» tienen la misma clave y «Piña» y «Pina» no; que una «é» descompuesta vale lo mismo que la compuesta; que «Pina», «Pino», «Piña» y «Pipa» quedan en ese orden; y cada mensaje de nombre (vacío, solo espacios, carácter no admitido como emoji, comillas o salto de línea, y largo de 30 y 40).
- [x] **T004 [contrato]** Escribir en `menu.ts` `priceSchema` (`parsePrice`), `formatPrice`, `formatPriceInput` y `categoryIdSchema` (plan §5.2, §6.1, D-2; RF-6, RNF-2). Depende de: T003
  Hecho cuando: las pruebas cubren cada caso de precio de los casos límite de `spec.md` («12,5», «12.5», « 12,50 », «1000», «12,505», «1.000», «1 000», «1000,01», «0», «0,00», «-5», «Bs 12», «doce», vacío) con su resultado o su mensaje; que «0,1» y «0,2» dan 10 y 20 centavos; que 1250 se muestra «Bs 12,50» y 100000 «Bs 1000,00»; y los dos mensajes de `categoryIdSchema`.
- [x] **T005 [contrato]** Escribir en `menu.ts` `categoryInputSchema`, `productInputSchema`, `Category`, `AdminProduct`, `MenuProduct` y los esquemas de respuesta de las rutas, y exportar `menu.ts` desde `index.ts` (plan §6.1, §6.2; RF-2 a RF-6, RF-14, RF-15). Depende de: T002, T004
  Hecho cuando: las pruebas validan los ejemplos de §6.2 del plan, `productInputSchema` transforma el precio a `priceCents`, rechazan un `priceCents` fuera de 1–100000 en las respuestas, y `npm run typecheck` pasa.
- [x] **T006 [api] [P]** Escribir la migración `002_menu.sql`: `categories`, `products` y los disparadores `products_require_active_category` (`KM001`, con `FOR SHARE`) y `categories_keep_active_products` (`KM002`) (plan §4, D-5; RF-8, RF-10, RF-11, RF-12). Depende de: T001
  Hecho cuando: las pruebas de integración aplican las migraciones dos veces sin error; rechazan un precio de 0 o de 100001, un nombre de 31 o 41 caracteres y un `name_key` repetido; comprueban que insertar o reactivar un producto activo en una categoría inactiva lanza `KM001`, que desactivar una categoría con productos activos lanza `KM002` y que borrar una categoría con productos falla.
- [x] **T007 [api] [P]** Escribir `categories.repository.ts`: insertar, cambiar el nombre, cambiar `active`, buscar por id (con `FOR UPDATE` o `FOR SHARE`), buscar otra categoría por `name_key` y contar sus productos activos (plan §5.3, §5.4; RF-3, RF-10, RF-12). Depende de: T005, T006
  Hecho cuando: las pruebas de integración cubren cada función, incluida la búsqueda por `name_key` que excluye la propia categoría y cuenta las inactivas.
- [x] **T008 [api] [P]** Escribir `products.repository.ts`: insertar, actualizar nombre, categoría y precio, cambiar `active`, buscar por id (con `FOR UPDATE`), buscar otro producto por `name_key`, listar todos y listar los vigentes con su categoría (plan §5.3 a §5.5; RF-4, RF-5, RF-9, RF-12, RF-15). Depende de: T005, T006
  Hecho cuando: las pruebas de integración cubren cada función; el precio se lee como el entero guardado; la lista de vigentes excluye los productos inactivos y los de categorías inactivas.
- [x] **T009 [web] [P]** Hacer que `shared/http/api-fetch.ts` admita `PUT` (plan D-7). Depende de: T001
  Hecho cuando: una prueba comprueba una petición `PUT` con cuerpo JSON, y las pruebas existentes siguen pasando.
- [x] **T010 [web] [P]** Escribir `modules/menu/api/menu-client.ts`: interfaz `MenuClient` con las 10 operaciones del contrato y su cliente HTTP real sobre `api-fetch` (plan §6.2; RF-1 a RF-6, RF-9, RF-10, RF-14). Depende de: T005, T009
  Hecho cuando: las pruebas comprueban la ruta, el método y el cuerpo de cada operación, que las respuestas se validan con los esquemas del contrato y que un `ApiError` se propaga.
- [x] **T011 [web] [P]** Escribir `modules/menu/api/MenuClientProvider.tsx` y `useMenuClient`: el cliente en uso por contexto, que el proveedor siempre recibe (plan D-10). `main.tsx` provee el cliente real (corregido en T038: también en desarrollo). Depende de: T010
  Hecho cuando: una prueba de componente comprueba que `useMenuClient` devuelve el cliente del proveedor y falla con un error claro fuera de él, y el build de producción usa el cliente real.
- [x] **T012 [web] [P]** Escribir `modules/menu/dev/`: `fixtures.ts`, `menu-demo-client.ts` (implementa `MenuClient` con el menú en memoria) y `ScenarioPicker.tsx` con los escenarios menú vacío, menú cargado, nombre repetido, categoría con productos activos, sin permiso y sin conexión. En desarrollo y con `?escenarios=menu`, `main.tsx` provee el cliente simulado a la aplicación y monta el selector (corregido en T038; plan D-10, D-11; RF-1 a RF-10, RF-14). Depende de: T011
  Hecho cuando: las pruebas validan con los esquemas del contrato todos los datos y errores del cliente simulado, comprueban que crear y editar cambian el menú en memoria y que cambiar de escenario cambia sus respuestas, y el build de producción no contiene el selector ni el cliente simulado del menú.
- [x] **T013 [web] [P]** Añadir a `routes.tsx` el campo `homeLink` y las rutas `/menu` («Ver menú», los dos roles) y `/menu/administrar` («Administrar menú», `roles: ['owner']`), con páginas provisionales exportadas desde `modules/menu/index.ts` (plan §3, D-8; RF-1, RF-13). Depende de: T001
  Hecho cuando: una prueba de componente navega a las dos rutas y comprueba sus `roles` y su `homeLink`.

**Correcciones de la verificación** (primera ronda, «Cambios requeridos»):

- [x] **T037 [integración]** Corregir la integración con `develop`: integrar `origin/develop` (con SPEC-001 US1 y US2 fusionadas) con merge y resolver los conflictos de `main.tsx` y `routes.tsx`, conservando lo de SPEC-001 y añadiendo lo de 002 (proveedor del menú, `homeLink` y rutas del menú dentro de `RequireSession`). Depende de: T013
  Hecho cuando: el PR no tiene conflictos, `npm run typecheck`, `lint`, `format:check`, `test`, `build`, `test:git` y `test:e2e` pasan y la CI del PR pasa sobre el commit de la integración.
- [x] **T038 [web]** Corregir D-10 según DD-17 de SPEC-001: la aplicación usa el cliente real del menú también en desarrollo, y el cliente simulado y su selector se activan solo con `?escenarios=menu` (combinable con `acceso`: `?escenarios=acceso,menu`); actualizar `plan.md` (D-10, D-11), T011, T012 y T023. Depende de: T037
  Hecho cuando: una prueba comprueba qué escenarios activa el parámetro `escenarios`, el build no contiene nada de `dev/` del menú, y `plan.md` y `tasks.md` describen ese comportamiento.
- [ ] **T039 [integración]** Corregir los textos desfasados sobre SPEC-001: `plan.md` y `tasks.md` dejan de decir que `feat/001-acceso-us1` no está en `develop`, y las dependencias «SPEC-001 T0NN» se marcan como ya cumplidas. Depende de: T037
  Hecho cuando: ningún texto de `specs/002-menu/` dice que la historia 1 de Acceso falta en `develop`.

## Fase 3 — US1: armar el menú (P1)

Rama: `feat/002-menu-us1`. Empieza cuando `feat/001-acceso-us1` esté en `develop`.

- [ ] **T014 [api] [P] [US1]** Escribir en `categories.service.ts` crear y renombrar una categoría: nombre normalizado, repetido según `name_key` sin contar la propia, `unique_violation` traducido al mensaje, todo en una transacción (plan §5.3; RF-3, RF-7, RF-8, RF-12). Depende de: T007
  Hecho cuando: las pruebas de integración crean una categoría activa, la renombran, aceptan «bebidas» → «Bebidas», rechazan un nombre repetido (también de una inactiva) con su mensaje y comprueban que un error deja la base sin cambios.
- [ ] **T015 [api] [P] [US1]** Escribir en `products.service.ts` crear y editar un producto según §5.3 del plan: todos los campos que fallan en un solo `400`, categoría activa al crear o mover, edición en su propia categoría inactiva, nombre repetido sin contar el propio, y `unique_violation` y `KM001` traducidos (RF-4, RF-5, RF-6, RF-7, RF-8, RF-11, RF-12). Depende de: T007, T008
  Hecho cuando: las pruebas de integración cubren crear y editar; el `400` con nombre repetido, sin categoría y precio inválido a la vez; un nombre repetido en otra categoría y uno inactivo; crear en una categoría inactiva; editar el precio de un producto que está en una categoría inactiva; y la carrera simulada (categoría desactivada o nombre ocupado entre la comprobación y la escritura) con su mensaje.
- [ ] **T016 [api] [P] [US1]** Escribir `menu.views.ts` con `getAdminMenu` y `getCurrentMenu`, ordenados con `compareMenuNames`, y exportar `getCurrentMenu` desde `modules/menu/index.ts` (plan §5.5; RF-2, RF-15). Depende de: T008
  Hecho cuando: las pruebas de integración comprueban que la administración tiene todas las categorías y productos, con «Sin productos» representado como lista vacía, en el orden de «Comparación de nombres»; y que `getCurrentMenu` da nombre, categoría y precio de cada producto vendible, sin inactivos ni categorías inactivas.
- [ ] **T017 [api] [P] [US1]** Escribir `menu.routes.ts` con `menuPlugin`: `GET /api/menu/admin`, `POST` y `PUT /api/menu/categories`, `POST` y `PUT /api/menu/products`, con `requireSession` y `requireOwner` (plan §5.6, §6.2; RF-1 a RF-7). Depende de: T014, T015, T016, SPEC-001 T022
  Hecho cuando: las pruebas con `app.inject` cubren cada ruta con sus respuestas del contrato, `401` sin sesión y `403 FORBIDDEN` con una sesión de cajero sin cambios en la base, y `404` para un id inexistente o que no es un uuid.
- [ ] **T018 [web] [P] [US1]** Hacer que `HomePage` muestre los enlaces que recibe de `routes.tsx` según el rol de la sesión y el aviso de `location.state.notice` (plan §5.7, D-8; RF-1). Depende de: T013, SPEC-001 T029
  Hecho cuando: las pruebas de componente comprueban que el dueño ve «Administrar menú», que el cajero no lo ve y que el aviso recibido se muestra.
- [ ] **T019 [web] [P] [US1]** Escribir `MenuAdminPage.tsx` y `MenuAdminList.tsx`: lista con categorías y productos, precio con `formatPrice`, etiquetas «Inactiva» e «Inactivo», «Sin productos», menú vacío, y vuelta a `/` con el aviso ante `403` (plan §5.7, D-9; RF-1, RF-2). Depende de: T011, T012, T013
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren el menú cargado, el menú vacío, las etiquetas y el escenario sin permiso.
- [ ] **T020 [web] [P] [US1]** Escribir `CategoryForm.tsx` para crear y renombrar: `maxLength` de 30, mensaje de la API junto al campo, lo escrito se conserva y uso solo con teclado (RF-3, RNF-4). Depende de: T019
  Hecho cuando: las pruebas de componente cubren crear, renombrar, el escenario de nombre repetido, el límite de largo y el envío con Intro.
- [ ] **T021 [web] [P] [US1]** Escribir `ProductForm.tsx` para crear y editar: nombre con `maxLength` de 40, categorías activas, precio precargado con `formatPriceInput`, un mensaje por campo y aviso «Crea o reactiva una categoría antes de añadir productos» sin categorías activas (plan §5.7; RF-4, RF-5, RF-6, RNF-4). Depende de: T019
  Hecho cuando: las pruebas de componente cubren crear, editar con la precarga, los mensajes de cada campo con lo escrito conservado, el aviso sin categorías activas y el uso solo con teclado.
- [ ] **T022 [web] [P] [US1]** Escribir `SaveStatus.tsx` y el flujo de guardado de la página: «Cambios guardados» y lista recargada, o «No hay conexión. Los cambios no se guardaron» con lo escrito conservado (plan §5.7; RF-7). Depende de: T020, T021
  Hecho cuando: las pruebas de componente cubren un guardado correcto con la lista actualizada y el escenario sin conexión.
- [ ] **T023 [integración] [US1]** Registrar `menuPlugin` en `app.ts`, comprobar que la aplicación usa el cliente real del menú sin `?escenarios=menu` (plan D-10) y añadir a `e2e-server.ts` la ruta de prueba `POST /api/__test/menu`, que carga un menú con los servicios del módulo (plan §8.2; RF-1 a RF-7). Depende de: T017, T018, T019, T020, T021, T022, SPEC-001 T030
  Hecho cuando: la interfaz en `vite preview` administra el menú contra la API de E2E, una prueba comprueba que `buildApp` no registra rutas `/api/__test`, y `npm test` sigue pasando.
- [ ] **T024 [integración] [US1]** Escribir `e2e/menu-us1-armar-menu.spec.ts` con los 6 pasos de §8.2 del plan (RF-1 a RF-7). Depende de: T023
  Hecho cuando: `npm run test:e2e` pasa con la prueba de US1 contra la API real de E2E.

## Fase 4 — US2: sacar del menú lo que no se ofrece (P2)

Rama: `feat/002-menu-us2`.

- [ ] **T025 [api] [P] [US2]** Añadir a `products.service.ts` desactivar y reactivar: reactivar exige la categoría activa (`409 CATEGORY_INACTIVE` con su nombre); repetir la acción no cambia nada (plan §5.4; RF-9, RF-11). Depende de: T015
  Hecho cuando: las pruebas de integración cubren desactivar y reactivar conservando nombre, categoría y precio, el `409` con el nombre de la categoría y la acción repetida.
- [ ] **T026 [api] [P] [US2]** Añadir a `categories.service.ts` desactivar y reactivar: `409 CATEGORY_HAS_ACTIVE_PRODUCTS` con N («1 producto activo» en singular), `KM002` traducido al mismo `409`, reactivar sin cambiar sus productos y renombrar una categoría inactiva (plan §5.4; RF-8, RF-10, RF-11). Depende de: T014
  Hecho cuando: las pruebas de integración cubren desactivar sin productos activos y con solo inactivos, el `409` con 1 y con 3 productos, la carrera simulada con `KM002`, reactivar dejando inactivos sus productos inactivos y renombrar una inactiva.
- [ ] **T027 [api] [P] [US2]** Añadir a `menu.routes.ts` las rutas de acción `…/deactivate` y `…/reactivate` de categorías y productos (plan §6.2; RF-1, RF-9, RF-10). Depende de: T017, T025, T026
  Hecho cuando: las pruebas con `app.inject` cubren las cuatro rutas, sus `409` y `404`, y el `403` para el cajero.
- [ ] **T028 [web] [P] [US2]** Añadir a `MenuAdminList` las acciones desactivar y reactivar de cada categoría y producto, sin confirmación y sin opción de eliminar, con el mensaje de la API junto a la fila, y el flujo de guardado de `SaveStatus` («Cambios guardados» o falta de conexión) (RF-7, RF-9, RF-10, RF-12). Depende de: T019, T022
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren cada acción con «Cambios guardados», el escenario de categoría con productos activos, el escenario sin conexión y que no hay ninguna opción de eliminar.
- [ ] **T029 [web] [P] [US2]** Hacer que `ProductForm` no ofrezca categorías inactivas al crear ni al mover, y que al editar un producto de una categoría inactiva ofrezca la suya marcada «Inactiva» (plan §5.7; RF-5, RF-11). Depende de: T021
  Hecho cuando: las pruebas de componente cubren los dos casos con un menú simulado que tiene una categoría inactiva.
- [ ] **T030 [integración] [US2]** Escribir `e2e/menu-us2-desactivar.spec.ts` con los 5 pasos de §8.2 del plan, contra la API real de E2E (RF-9 a RF-12). Depende de: T027, T028, T029
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1 y US2.

## Fase 5 — US3: consultar el menú vigente (P3)

Rama: `feat/002-menu-us3`.

- [ ] **T031 [api] [P] [US3]** Añadir a `menu.routes.ts` `GET /api/menu` con `getCurrentMenu`, para las sesiones de dueño y de cajero (plan §5.5, §6.2; RF-13, RF-14, RF-15). Depende de: T016, T017
  Hecho cuando: las pruebas con `app.inject` comprueban el menú vigente ordenado con las dos sesiones, sin categorías sin productos activos, y `401` sin sesión.
- [ ] **T032 [web] [P] [US3]** Escribir `MenuPage.tsx` y `CurrentMenuList.tsx`: solo lectura, precio con `formatPrice`, aviso «El menú todavía no tiene productos disponibles», y el enlace «Ver menú» en la pantalla inicial para los dos roles (plan §5.7; RF-13, RF-14). Depende de: T011, T012, T018
  Hecho cuando: las pruebas de componente cubren el menú cargado sin ninguna acción de edición, el menú vacío y el enlace para el cajero y para el dueño.
- [ ] **T033 [integración] [US3]** Escribir `e2e/menu-us3-consultar.spec.ts` con los 3 pasos de §8.2 del plan, contra la API real de E2E (RF-13, RF-14). Depende de: T031, T032
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1, US2 y US3.

## Fase 6 — Pulido

Rama: `feat/002-menu-pulido`.

- [ ] **T034 [integración]** Escribir `apps/api/test/seed-menu.ts` y su script `npm run seed:menu -w @kofi/api`, que carga 200 productos de prueba con los servicios del módulo en la base de `DATABASE_URL` y se niega a hacerlo si la base ya tiene productos (plan D-12; RNF-3). Depende de: T033
  Hecho cuando: una prueba lo ejecuta sobre PGlite y comprueba 200 productos en el menú vigente, y que con productos previos no carga nada.
- [ ] **T035 [integración]** Desplegar en Render con el Blueprint apuntando a esta rama y su base de Neon de comprobación (`docs/architecture.md` §6.5), cargar los 200 productos con `seed:menu` y medir RNF-3 y el criterio de 30 segundos como indica el plan (§8.3). Requiere a una persona con acceso a Render y a Neon. Depende de: T034
  Hecho cuando: al menos 19 de cada 20 aperturas de la administración, de la consulta y de guardados tardan menos de 2 segundos, una persona crea un producto en menos de 30 segundos y los resultados quedan anotados en la descripción del PR de pulido.
- [ ] **T036 [integración]** Actualizar `README.md` con el estado del módulo Menú y cómo cargar el menú (RF-1 a RF-15). Depende de: T035
  Hecho cuando: el README describe quién administra y quién consulta el menú y cómo llegar a cada pantalla.

## Cobertura de RF

| RF | Tareas |
| --- | --- |
| RF-1 | T002, T010, T012, T013, T017, T018, T019, T023, T024, T027 |
| RF-2 | T003, T005, T010, T016, T019, T024 |
| RF-3 | T003, T007, T014, T017, T020, T024 |
| RF-4 | T005, T008, T015, T017, T021, T024 |
| RF-5 | T008, T015, T017, T021, T024, T029 |
| RF-6 | T003, T004, T005, T015, T017, T021, T024 |
| RF-7 | T014, T015, T017, T022, T024, T028 |
| RF-8 | T006, T014, T015, T026 |
| RF-9 | T002, T008, T025, T027, T028, T030 |
| RF-10 | T002, T006, T007, T026, T027, T028, T030 |
| RF-11 | T006, T015, T025, T026, T029, T030 |
| RF-12 | T003, T006, T007, T008, T014, T015, T028, T030 |
| RF-13 | T013, T031, T032, T033 |
| RF-14 | T005, T010, T012, T031, T032, T033 |
| RF-15 | T005, T008, T016, T031 |
| RNF-2 | T004, T008 |
| RNF-3 | T034, T035 |
| RNF-4 | T020, T021 |
