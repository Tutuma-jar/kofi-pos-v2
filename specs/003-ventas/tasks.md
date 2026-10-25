# Tareas — SPEC-003 Ventas

Estado: aprobadas y analizadas (modo delegado, sin bloqueantes); Preparación y Base común implementadas, con las correcciones del medio de pago (T028–T031) · Fecha: 2026-10-24 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[contrato]`, `[api]`, `[web]` e `[integración]`. Las tareas que tocan la raíz del monorepo, la E2E o el despliegue usan `[integración]`.
- **`[P]`:** se puede hacer en paralelo con las tareas del otro frente de su fase. En Base común, las tareas `[api]` y `[web]` avanzan en paralelo una vez escrito el contrato. En las fases de historia, ninguna tarea `[web]` depende de una `[api]` ni al revés: las dos dependen solo de Preparación y Base común. Dentro de un mismo frente, las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Preparación y Base común, con sus correcciones, en `feat/003-ventas-definicion`, como en SPEC-001 y SPEC-002; cada historia en `feat/003-ventas-usN`; Pulido en `feat/003-ventas-pulido`.
- **Dependencia de SPEC-002** (plan, encabezado y D-1): Preparación y Base común no usan nada de las historias de Menú. La historia 1 de Ventas necesita tres piezas de la historia 1 de Menú, que **todavía no está en `develop`**: `getCurrentMenu` (SPEC-002 T016), los enlaces de la pantalla inicial (SPEC-002 T018) y la ruta de pruebas `POST /api/__test/menu` (SPEC-002 T023); la prueba de punta a punta usa además la edición del menú (SPEC-002 T017). Por eso **las historias de Ventas empiezan cuando se fusionen el PR de definición de 003 y `feat/002-menu-us1`**. Dentro de US1, solo la tarea de integración (T020) usa esas piezas; las demás trabajan con un menú vigente falso o con el cliente simulado. Ventas no usa `GET /api/menu` (SPEC-002 T031).
- **Dependencia de SPEC-001:** `requireSession`, `createAuthService` y la sesión de la interfaz ya están en `develop` (#15 y #17).
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Rama: `feat/003-ventas-definicion`.

- [x] **T001 [integración]** Crear el módulo `sales` vacío en las dos aplicaciones: `apps/api/src/modules/sales/index.ts` y `apps/web/src/modules/sales/index.ts`, con su prueba de humo, y añadir a `eslint.config.test.ts` los casos de `sales` (otro módulo no puede importar sus archivos internos, sí su `index.ts`) (plan §3)
  Hecho cuando: las pruebas de las reglas de lint pasan con los casos nuevos, y `npm run lint` y `npm run typecheck` pasan.

## Fase 2 — Base común

Rama: `feat/003-ventas-definicion`.

- [x] **T002 [contrato]** Añadir a `packages/contracts/src/errors.ts` el código `MENU_CHANGED` (plan §6.2; RF-7)
  Hecho cuando: las pruebas validan con `apiErrorSchema` el ejemplo de `409 MENU_CHANGED` de §6.2 del plan y `npm run typecheck` pasa.
- [x] **T003 [contrato]** Escribir `packages/contracts/src/datetime.ts` con `BOLIVIA_TIME_ZONE` y `formatDateTime`, y exportarlo desde `index.ts` (plan §5.6, D-7; RF-6, RF-11)
  Hecho cuando: las pruebas comprueban que `2026-10-24T18:05:12.000Z` se muestra «24/10/2026 14:05», `2027-01-05T13:30:00.000Z` «05/01/2027 09:30» y `2026-10-25T03:59:00.000Z` «24/10/2026 23:59» (el día de Bolivia, no el de UTC), con cualquier zona horaria en el proceso de pruebas.
- [x] **T004 [contrato]** Escribir en `packages/contracts/src/sales.ts` `SALE_MAX_LINES`, `SALE_MAX_QUANTITY`, `SALE_MESSAGES`, `saleDraftLineSchema`, `saleQuoteRequestSchema` y `registerSaleRequestSchema` (plan §6.1; RF-3, RF-5, RF-6, RF-8). Depende de: T001
  Hecho cuando: las pruebas validan las entradas de los ejemplos de §6.2 del plan y rechazan, con el mensaje de `SALE_MESSAGES` correspondiente, 0 y 100 unidades, 31 líneas, un producto repetido y un registro sin líneas; y `registerSaleRequestSchema` exige `unitPriceCents` y un `draftId` uuid.
- [x] **T005 [contrato]** Escribir en `sales.ts` `saleLineSchema`, `saleQuoteSchema` (con `menu` del esquema `currentMenuResponseSchema` de SPEC-002), `saleSchema` y `saleResponseSchema`, y exportar `sales.ts` desde `index.ts` (plan §6.1, §6.2; RF-2, RF-4, RF-6, RF-11). Depende de: T002, T003, T004
  Hecho cuando: las pruebas validan las respuestas de los ejemplos de §6.2 del plan, aceptan `registeredBy.userId` nulo, rechazan una venta sin líneas, un `registeredAt` sin zona horaria y un rol desconocido, y `npm run typecheck` pasa.
- [x] **T006 [api] [P]** Escribir la migración `003_sales.sql`: `sale_counter` con su fila, `sales`, `sale_lines`, el disparador diferido `sales_check_lines` (`KS001`) y los disparadores `sales_immutable` y `sale_lines_immutable` (`KS002`) (plan §4, D-4; RF-6, RF-9, RF-10, RF-11, RNF-2). Depende de: T001
  Hecho cuando: las pruebas de integración aplican las migraciones dos veces sin error; rechazan un subtotal distinto de precio por cantidad, una cantidad de 0 o de 100, un número o un `draft_id` repetidos y una venta cuyo total no es la suma de sus líneas o que no tiene líneas (`KS001`, al confirmar); comprueban que modificar o borrar una venta o una línea lanza `KS002`, y que eliminar la cuenta que registró una venta deja `registered_by_user_id` en `NULL` con el nombre y el rol intactos.
- [x] **T007 [api] [P]** Escribir `sales.repository.ts`: `nextSaleNumber` (incrementa `sale_counter`), `insertSale` (venta y líneas en orden), `findSaleByDraftId` y `listRegisteredSales` por rango de `registered_at` (plan §5.3, §6.3; RF-6, RF-8, RF-10, RF-11). Depende de: T005, T006
  Hecho cuando: las pruebas de integración cubren cada función; los números salen 1, 2, 3; una transacción que falla después de `nextSaleNumber` no deja hueco; las ventas leídas cumplen `saleSchema`, con las líneas en su orden y `registeredAt` en ISO 8601; y el rango incluye `from` y excluye `to`.
- [x] **T008 [web] [P]** Escribir `modules/sales/api/sales-client.ts`: interfaz `SalesClient` (`quote`, `register`) y su cliente HTTP real sobre `api-fetch` (plan §6.2; RF-2 a RF-8). Depende de: T005
  Hecho cuando: las pruebas comprueban la ruta, el método y el cuerpo de cada operación, que las respuestas `200` y `201` se validan con los esquemas del contrato y que un `ApiError` se propaga.
- [x] **T009 [web] [P]** Escribir `modules/sales/api/SalesClientProvider.tsx` y `useSalesClient`: el cliente en uso por contexto, que el proveedor siempre recibe; `main.tsx` provee el cliente real, también en desarrollo (plan D-10). Depende de: T008
  Hecho cuando: una prueba de componente comprueba que `useSalesClient` devuelve el cliente del proveedor y falla con un error claro fuera de él, y el build de producción usa el cliente real.
- [x] **T010 [web] [P]** Escribir `modules/sales/dev/`: `fixtures.ts`, `sales-demo-client.ts` (implementa `SalesClient` con un menú en memoria) y `ScenarioPicker.tsx` con los escenarios menú cargado, menú vacío, cambió un precio, producto retirado, sin conexión y respuesta perdida; añadir `ventas` a `scenarios.ts` y, en desarrollo y con `?escenarios=ventas`, proveer en `main.tsx` el cliente simulado y montar su selector (plan D-10; RF-2 a RF-9). Depende de: T009
  Hecho cuando: las pruebas validan con los esquemas del contrato todos los datos y errores del cliente simulado; comprueban que `quote` calcula las líneas del menú en memoria, que «cambió un precio» y «producto retirado» producen sus avisos y el `409 MENU_CHANGED`, que «respuesta perdida» falla el primer registro y devuelve la misma venta en el reintento, y que `requestedScenarios` reconoce `ventas` solo y combinado con `acceso` y `menu`; y el build de producción no contiene nada de `dev/` de ventas.
- [x] **T011 [web] [P]** Añadir a `routes.tsx` la ruta `/ventas/nueva` con `homeLink: 'Nueva venta'` y los dos roles, con una página `NewSalePage` provisional exportada desde `modules/sales/index.ts` (plan §3, D-11; RF-1). Depende de: T001
  Hecho cuando: una prueba de componente navega a la ruta con una sesión de cajero y otra de dueño, y comprueba sus `roles` y su `homeLink`.

**Correcciones tras las respuestas a las dudas abiertas** (Kofi cobra en efectivo y con QR; plan §11):

- [x] **T028 [contrato]** Añadir a `sales.ts` `PAYMENT_METHODS`, `paymentMethodSchema`, `formatPaymentMethod` y el texto `SALE_MESSAGES.paymentMethod`, y `paymentMethod` en `registerSaleRequestSchema` y `saleSchema` (plan §6.1, §6.2, D-13; RF-6, RF-11). Depende de: T005
  Hecho cuando: las pruebas aceptan `cash` y `qr`, rechazan un registro sin medio de pago o con `card` con «Elige el medio de pago» bajo `paymentMethod`, exigen `paymentMethod` en una venta, comprueban que `formatPaymentMethod` da «Efectivo» y «QR», y validan los ejemplos de §6.2 del plan.
- [x] **T029 [api] [P]** Añadir la columna `payment_method` a `003_sales.sql`, corrigiendo la migración en su sitio (plan §4, §11, D-13; RF-6, RF-11). Depende de: T006
  Hecho cuando: las pruebas de integración guardan una venta con `cash` y otra con `qr` y rechazan una sin medio de pago o con otro valor, y las demás pruebas de la migración siguen pasando.
- [x] **T030 [api] [P]** Guardar y leer el medio de pago en `sales.repository.ts` (plan §5.3; RF-6, RF-11). Depende de: T028, T029
  Hecho cuando: las pruebas de integración comprueban que `insertSale`, `findSaleByDraftId` y `listRegisteredSales` devuelven el `paymentMethod` guardado y que las ventas leídas cumplen `saleSchema`.
- [x] **T031 [web] [P]** Hacer que el cliente simulado de ventas registre el medio de pago recibido y devuelva el `400` sin él, y que el reintento de una venta ya registrada devuelva su medio de pago original (plan §5.3, D-10; RF-6, RF-8). Depende de: T028, T010
  Hecho cuando: las pruebas del cliente simulado cubren una venta con `cash` y otra con `qr`, el `400` con `fields.paymentMethod` y el reintento con otro medio de pago que devuelve la venta original, y validan las ventas con `saleSchema`.

## Fase 3 — US1: registrar una venta pagada (P1)

Rama: `feat/003-ventas-us1`. Empieza cuando se fusionen el PR de definición de 003 y `feat/002-menu-us1`.

- [x] **T012 [api] [P] [US1]** Escribir `sales.pricing.ts` con `priceDraft` (plan §5.1; RF-4, RF-5, RF-7, RNF-2). Depende de: T005
  Hecho cuando: las pruebas unitarias cubren subtotales y total; una venta vacía con total 0; el aviso de precio cambiado con el precio nuevo en formato «Bs 13,00»; el de una línea retirada y el de un producto recién agregado que ya no está; un cambio de nombre o de categoría sin aviso; `menuChanged` solo con cambios de precio o retiros; y 30 líneas de 99 unidades a 100000 centavos con total 297000000.
- [x] **T013 [api] [P] [US1]** Escribir en `sales.service.ts` el cálculo de la venta en preparación (`quote`) con el menú vigente inyectado (plan §5.2, D-1, D-2; RF-2 a RF-5). Depende de: T012
  Hecho cuando: las pruebas de integración, con un menú vigente falso, comprueban que la respuesta cumple `saleQuoteSchema`, trae el menú tal como lo da la función y las líneas calculadas, y que un menú vacío devuelve `menu: []` sin líneas.
- [x] **T014 [api] [P] [US1]** Escribir en `sales.service.ts` el registro (`register`): venta previa por `draftId` antes de mirar el menú, `409 MENU_CHANGED`, número, cuenta de la sesión, medio de pago, hora de `clock.ts`, todo en una transacción, y `unique_violation` de `draft_id` traducido a la venta existente (plan §5.3, D-4, D-5, D-6, D-13; RF-6 a RF-11). Depende de: T012, T030
  Hecho cuando: las pruebas de integración registran una venta con número, fecha del reloj falso, nombre y rol de la cuenta, líneas, total y medio de pago; devuelven la misma venta, con su medio de pago original, para el mismo `draftId` aunque el menú o el medio de pago de la petición hayan cambiado; rechazan con `409` un precio cambiado o un producto retirado sin consumir número; registran con el nombre nuevo de un producto renombrado; rechazan un `draftId` de otra cuenta; cubren la carrera simulada del `draftId`; y comprueban que cambiar el menú después no cambia la venta.
- [x] **T015 [api] [P] [US1]** Escribir `sales.routes.ts` con `salesPlugin`: `POST /api/sales/quote` y `POST /api/sales` con `requireSession`; exportar `salesPlugin` y `listRegisteredSales` desde `modules/sales/index.ts` (plan §6.2, §6.3; RF-1, RF-3, RF-6, RF-8, RF-11). Depende de: T013, T014
  Hecho cuando: las pruebas con `app.inject` y un menú vigente falso cubren las dos rutas con sesión de cajero y de dueño, `201` y `200` del registro, los `400` de límites, de venta vacía, sin medio de pago y de `draftId` ajeno con `fields`, el `409`, y `401` sin sesión sin ninguna venta nueva.
- [x] **T016 [web] [P] [US1]** Escribir `state/useSaleDraft.ts` con un almacén en memoria: abrir con la venta vacía, agregar, «+», «−», «Quitar», cálculo con `quote`, acciones bloqueadas mientras calcula, mensaje de límite y falta de conexión sin cambios (plan §5.4; RF-3, RF-4, RF-5, RF-9). Depende de: T010
  Hecho cuando: las pruebas del hook, con el cliente simulado, cubren cada cambio con su lista enviada, que agregar un producto ya presente suma 1, el `400` de límite y el escenario sin conexión dejando la venta como estaba, y los avisos recibidos.
- [x] **T017 [web] [P] [US1]** Escribir `NewSalePage.tsx` y `ProductPicker.tsx`: productos para vender por categoría con `formatPrice`, aviso de menú vacío y elegir un producto con teclado (plan §5.4; RF-1, RF-2, RF-3, RNF-4). Depende de: T011, T016
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren el menú cargado, el menú vacío sin poder agregar, y agregar con Intro y con la barra espaciadora.
- [x] **T018 [web] [P] [US1]** Escribir `SaleDraftLines.tsx`: líneas con nombre, cantidad, precio y subtotal, total, «Elige los productos de la venta» con «Bs 0,00», «+», «−» deshabilitado en 1, «Quitar» y los avisos de RF-5 hasta el siguiente cambio (plan §5.4; RF-3, RF-4, RF-5, RNF-4). Depende de: T016
  Hecho cuando: las pruebas de componente cubren una venta de dos líneas con sus importes tal como llegan del cliente, la venta vacía, los botones de cada línea con teclado y los escenarios de precio cambiado y producto retirado.
- [x] **T019 [web] [P] [US1]** Escribir el registro en `useSaleDraft`, `PaymentMethodPicker.tsx` y `SaleConfirmation.tsx`: elección de «Efectivo» o «QR» sin valor por defecto, «Registrar venta» deshabilitado con la venta vacía, sin medio de pago y mientras registra, confirmación «Venta N.º … registrada · … · [medio de pago] · …» con `formatPaymentMethod` y `formatDateTime`, `409` con nuevo cálculo, sin conexión con el mismo `draftId` en el reintento, y venta vacía, sin medio de pago y con `draftId` nuevo tras registrar (plan §5.4, D-13; RF-6, RF-7, RF-8, RF-9, RNF-4). Depende de: T017, T018, T031
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren el registro con «Efectivo» y con «QR» y su confirmación (que desaparece al agregar otro producto), el botón deshabilitado sin medio de pago, la elección con teclado, el doble clic con un solo registro, el escenario de precio cambiado al registrar y el de respuesta perdida con el reintento que muestra la misma venta.
- [ ] **T020 [integración] [US1]** Registrar `salesPlugin` en `app.ts` con `getCurrentMenu` de `modules/menu/index.ts` y la sesión de SPEC-001, comprobar que la aplicación usa el cliente real de ventas sin `?escenarios=ventas`, y añadir a `e2e-server.ts` la ruta `GET /api/__test/sales` con `listRegisteredSales` (plan D-1, §8.2; RF-1, RF-2, RF-11). Depende de: T015, T019, SPEC-002 T016, SPEC-002 T018, SPEC-002 T023
  Hecho cuando: la interfaz en `vite preview` registra una venta contra la API de E2E con un menú cargado por `POST /api/__test/menu`, la pantalla inicial muestra «Nueva venta» a los dos roles, una prueba comprueba que `buildApp` no registra rutas `/api/__test`, y `npm test` sigue pasando.
- [ ] **T021 [integración] [US1]** Escribir `e2e/sales-us1-registrar-venta.spec.ts` con los 5 pasos de §8.2 del plan; el paso 4 cambia el precio con la ruta de edición del menú y una sesión de dueño (RF-1 a RF-11). Depende de: T020, SPEC-002 T017
  Hecho cuando: `npm run test:e2e` pasa con la prueba de US1 contra la API real de E2E.

## Fase 4 — US2: no perder la venta en preparación (P2)

Rama: `feat/003-ventas-us2`. Esta historia no tiene tareas `[api]`: lo que pide se resuelve en la interfaz (plan D-8, D-9), y la API ya recalcula cualquier venta en preparación recuperada (US1).

- [ ] **T022 [web] [P] [US2]** Escribir `state/draft-store.ts` sobre `localStorage` (`kofi:sales:draft`) con la cuenta, el `draftId`, el medio de pago elegido y las líneas, sincronizado entre pestañas, y usarlo en `useSaleDraft` en lugar del almacén en memoria (plan §5.5, D-8; RF-10, RF-12, RF-13). Depende de: T019
  Hecho cuando: las pruebas comprueban que la venta se recupera, con su medio de pago, al volver a montar la página con la misma cuenta y se recalcula, que con otra cuenta se descarta, que un evento `storage` de otra pestaña actualiza la venta mostrada, que registrar o descartar la borra, y que con `localStorage` vacío, inválido o que lanza errores la página empieza vacía.
- [ ] **T023 [web] [P] [US2]** Añadir a `SessionProvider` el aviso `onSessionEnd('logout' | 'terminated')`, pasarle desde `routes.tsx` `discardStoredSaleDraft` exportado por `modules/sales/index.ts` (plan §5.5, D-9; RF-13). Depende de: T022
  Hecho cuando: las pruebas de componente comprueban que `onSessionEnd` se llama al cerrar sesión y ante `SESSION_TERMINATED`, que no se llama ante `SESSION_EXPIRED` ni `SESSION_MISSING`, y que tras cerrar sesión no queda venta guardada; y las pruebas existentes de `auth` siguen pasando.
- [ ] **T024 [web] [P] [US2]** Escribir `DiscardSaleDialog.tsx` y la opción «Descartar venta», visible solo con líneas, con «¿Descartar esta venta? Se quitarán todos sus productos», «Descartar» y «Volver» (RF-14). Depende de: T018
  Hecho cuando: las pruebas de componente cubren que la opción no aparece con la venta vacía, que «Volver» conserva la venta, que «Descartar» la vacía sin registrar nada y que el diálogo se usa con teclado.
- [ ] **T025 [integración] [US2]** Escribir `e2e/sales-us2-conservar-venta.spec.ts` con los 5 pasos de §8.2 del plan, contra la API real de E2E (RF-12, RF-13, RF-14). Depende de: T021, T022, T023, T024
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1 y US2.

## Fase 5 — Pulido

Rama: `feat/003-ventas-pulido`.

- [ ] **T026 [integración]** Desplegar en Render con el Blueprint apuntando a esta rama y su base de Neon de comprobación (`docs/architecture.md` §6.5), cargar los 200 productos con `seed:menu` (SPEC-002 T034) y medir RNF-3 y el criterio de 30 segundos como indica el plan (§8.3). Requiere a una persona con acceso a Render y a Neon. Depende de: T025, SPEC-002 T034
  Hecho cuando: al menos 19 de cada 20 aperturas de «Nueva venta» y registros tardan menos de 2 segundos, 19 de cada 20 cambios menos de 1 segundo, una persona registra una venta de 3 productos en menos de 30 segundos y los resultados quedan anotados en la descripción del PR de pulido.
- [ ] **T027 [integración]** Actualizar `README.md` con el estado del módulo Ventas: quién registra ventas, cómo llegar a «Nueva venta» y qué se conserva de una venta en preparación (RF-1 a RF-14). Depende de: T026
  Hecho cuando: el README describe esos tres puntos.

## Cobertura de RF

| RF | Tareas |
| --- | --- |
| RF-1 | T001, T011, T015, T017, T020, T021 |
| RF-2 | T005, T008, T010, T013, T017, T020, T021 |
| RF-3 | T004, T010, T015, T016, T017, T018, T021 |
| RF-4 | T005, T012, T013, T016, T018, T021 |
| RF-5 | T004, T010, T012, T013, T016, T018, T021 |
| RF-6 | T003, T004, T005, T006, T007, T014, T015, T019, T021, T028, T029, T030, T031 |
| RF-7 | T002, T010, T012, T014, T019, T021 |
| RF-8 | T004, T007, T010, T014, T015, T019, T021, T031 |
| RF-9 | T006, T010, T014, T016, T019, T021 |
| RF-10 | T006, T007, T014, T022 |
| RF-11 | T003, T005, T006, T007, T014, T015, T020, T021, T028, T029, T030 |
| RF-12 | T022, T025 |
| RF-13 | T022, T023, T025 |
| RF-14 | T024, T025 |
| RNF-1 | T017, T018, T019, T021, T024, T025 (textos en español comparados tal como los define `spec.md`) |
| RNF-2 | T006, T012 |
| RNF-3 | T026 |
| RNF-4 | T017, T018, T019, T024 |
