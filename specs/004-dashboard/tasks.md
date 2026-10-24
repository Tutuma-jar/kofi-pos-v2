# Tareas — SPEC-004 Dashboard

Estado: aprobadas y analizadas (modo delegado, sin bloqueantes) · Fecha: 2026-10-24 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[contrato]`, `[api]`, `[web]` e `[integración]`. Las tareas que tocan la raíz del monorepo, la E2E o el despliegue usan `[integración]`.
- **`[P]`:** se puede hacer en paralelo con las tareas del otro frente de su fase. En Base común, las tareas `[api]` y `[web]` avanzan en paralelo una vez escrito el contrato. En las fases de historia, ninguna tarea `[web]` depende de una `[api]` ni al revés: las dos dependen solo de Preparación y Base común (y, en US2, de las de su mismo frente en US1). Dentro de un mismo frente, las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Preparación y Base común en `feat/004-dashboard-definicion`, como en SPEC-001 a SPEC-003; cada historia en `feat/004-dashboard-usN`; Pulido en `feat/004-dashboard-pulido`.
- **Dependencia de SPEC-003 y SPEC-002** (plan, encabezado y D-1): Preparación y Base común no usan nada de sus historias. Las historias del Dashboard necesitan de la historia 1 de Ventas, que **todavía no está en `develop`**, la exportación de `listRegisteredSales` y `salesPlugin` (SPEC-003 T015) y su registro en `app.ts` (SPEC-003 T020); y de la historia 1 de Menú, que Ventas también necesita, los enlaces de la pantalla inicial (SPEC-002 T018) y la ruta de pruebas `POST /api/__test/menu` (SPEC-002 T023). Por eso **las historias del Dashboard empiezan cuando se fusionen el PR de definición de 004 y `feat/003-ventas-us1`** (que llega después de `feat/002-menu-us1`). Dentro de cada historia, solo las tareas `[integración]` usan esas piezas; las demás trabajan con ventas falsas o con el cliente simulado.
- **Dudas abiertas** (`spec.md` §9): las dos afectan a US1 y la primera también a US2. Ninguna historia empieza mientras sigan abiertas (`AGENTS.md`); su respuesta se aplica en `shared/calendar.ts` (duda 1, plan D-10) y en `DASHBOARD_ROLES` (duda 2, plan D-6). Preparación y Base común no dependen de ellas.
- **Dependencia de SPEC-001:** `requireSession`, `createAuthService` y la sesión de la interfaz ya están en `develop` (#15 y #17).
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Rama: `feat/004-dashboard-definicion`.

- [x] **T001 [integración]** Crear el módulo `dashboard` vacío en las dos aplicaciones: `apps/api/src/modules/dashboard/index.ts` y `apps/web/src/modules/dashboard/index.ts`, con su prueba de humo, y añadir a `eslint.config.test.ts` los casos de `dashboard` (otro módulo no puede importar sus archivos internos, sí su `index.ts`; `dashboard` tampoco puede importar los internos de `sales`) (plan §3)
  Hecho cuando: las pruebas de las reglas de lint pasan con los casos nuevos, y `npm run lint` y `npm run typecheck` pasan.

## Fase 2 — Base común

Rama: `feat/004-dashboard-definicion`.

- [x] **T002 [contrato]** Añadir a `packages/contracts/src/datetime.ts` `formatDate` y `formatMonth` (plan §6.1, D-5; RF-2, RF-9, RF-10)
  Hecho cuando: las pruebas comprueban que `2026-10-24` se muestra «24/10/2026» y `2027-01-05` «05/01/2027», y que `2026-10` se muestra «Octubre de 2026», `2027-01` «Enero de 2027» y `2026-12` «Diciembre de 2026», con cualquier zona horaria en el proceso de pruebas.
- [x] **T003 [contrato]** Escribir `packages/contracts/src/dashboard.ts` con `DASHBOARD_ROLES`, `DASHBOARD_MESSAGES`, `DASHBOARD_TOP_PRODUCTS`, `boliviaDateSchema`, `boliviaMonthSchema`, `paymentMethodTotalSchema`, `topProductSchema`, `periodSummarySchema`, `todaySummarySchema`, `dayTotalSchema` y `monthSummarySchema`, y exportarlo desde `index.ts` (plan §6.1, §6.2, D-6; RF-1 a RF-10). Depende de: T001
  Hecho cuando: las pruebas validan las respuestas de los ejemplos de §6.2 del plan (con y sin ventas, y la del mes) y el `403` con `apiErrorSchema`; rechazan `byPaymentMethod` en otro orden o con un solo medio, más de 5 productos, un promedio `null` con ventas o un número sin ventas, una fecha `2026-02-30`, un mes `2026-13`, un `asOf` sin zona horaria y un mes sin días o con 32; y `npm run typecheck` pasa.
- [x] **T004 [api] [P]** Escribir `apps/api/src/shared/calendar.ts` con `boliviaDate`, `startOfBoliviaDay`, `boliviaDayRange` y `boliviaMonthRange` (plan §5.1, D-4, D-10; RF-2, RF-6, RF-9, RF-10). Depende de: T001
  Hecho cuando: las pruebas unitarias, con cualquier `TZ` en el proceso, comprueban que `2026-10-25T03:59:59.999Z` es el `2026-10-24` y `2026-10-25T04:00:00.000Z` el `2026-10-25`; que el día empieza a las 04:00Z y termina en `now + 1 ms`; que el mes de `2026-10-24T15:00Z` empieza el `2026-10-01T04:00Z` con los días `2026-10-01` a `2026-10-24`; que el 1 de un mes tiene un solo día; que el 31/10 a las 23:59 de Bolivia sigue en octubre; y que febrero de 2028 llega al 29.
- [x] **T005 [web] [P]** Escribir `modules/dashboard/api/dashboard-client.ts`: interfaz `DashboardClient` (`today`, `month`) y su cliente HTTP real sobre `apiFetch` (plan §6.2; RF-2, RF-9). Depende de: T003
  Hecho cuando: las pruebas comprueban la ruta y el método de cada operación, que las respuestas `200` se validan con `todaySummarySchema` y `monthSummarySchema` y que un `ApiFetchError` (`403`, `NETWORK_ERROR`) se propaga.
- [x] **T006 [web] [P]** Escribir `modules/dashboard/api/DashboardClientProvider.tsx` y `useDashboardClient`: el cliente en uso por contexto, que el proveedor siempre recibe; `index.ts` los exporta con `httpDashboardClient`, y `main.tsx` provee el cliente real, también en desarrollo (plan D-8). Depende de: T005
  Hecho cuando: una prueba de componente comprueba que `useDashboardClient` devuelve el cliente del proveedor y falla con un error claro fuera de él, y el build de producción usa el cliente real.
- [x] **T007 [web] [P]** Escribir `modules/dashboard/dev/`: `fixtures.ts` (resúmenes de hoy y del mes, con y sin ventas, ya calculados), `dashboard-demo-client.ts` (implementa `DashboardClient` con esos datos y `asOf` de cada pedido) y `ScenarioPicker.tsx` con los escenarios con ventas, sin ventas, sin conexión, sin permiso y lento; añadir `dashboard` a `scenarios.ts` y, en desarrollo y con `?escenarios=dashboard`, proveer en `main.tsx` el cliente simulado y montar su selector (plan D-8; RF-1 a RF-10). Depende de: T006
  Hecho cuando: las pruebas validan con los esquemas del contrato todos los datos del cliente simulado; comprueban que «sin conexión» falla con `NETWORK_ERROR`, «sin permiso» con `403 FORBIDDEN` y el mensaje del contrato, y «lento» responde después de 1,5 s; que `requestedScenarios` reconoce `dashboard` solo y combinado con `acceso`, `menu` y `ventas`; y que el build de producción no contiene nada de `dev/` del dashboard.
- [x] **T008 [web] [P]** Añadir a `routes.tsx` la ruta `/resumen` con `homeLink: 'Resumen de ventas'` y `roles: DASHBOARD_ROLES`, con una página `DashboardPage` provisional exportada desde `modules/dashboard/index.ts` (plan §3, D-6, D-9; RF-1). Depende de: T003
  Hecho cuando: una prueba de componente navega a la ruta con una sesión de dueño y comprueba su `homeLink` y que sus `roles` son `DASHBOARD_ROLES`, y que con una sesión de cajero `canView` no la permite.

## Fase 3 — US1: ver el resumen de hoy (P1)

Rama: `feat/004-dashboard-us1`. Empieza cuando se fusionen el PR de definición de 004 y `feat/003-ventas-us1`, y se respondan las dudas abiertas de `spec.md`.

- [ ] **T009 [api] [P] [US1]** Escribir en `dashboard.summary.ts` `summarizeSales`: total, número de ventas, promedio redondeado, importes por medio de pago y productos más vendidos; y `apps/api/test/test-sales.ts` para construir ventas de prueba (plan §5.2, §8.4; RF-3, RF-4, RF-5, RF-8, RNF-2). Depende de: T003
  Hecho cuando: las pruebas unitarias cubren el ejemplo de §4 del plan; un período sin ventas (`null`, ceros y sin productos); los promedios 4550/3 → 1517 y 75/2 → 38; `cash` y `qr` siempre en ese orden y sumando el total; productos ordenados por unidades, importe y nombre (`compareMenuNames`), como máximo 5; un producto renombrado contado una vez con el nombre de su venta de mayor número; dos productos con el mismo nombre separados; un precio cambiado sumando cada venta con su precio; y 6000 ventas de 30 líneas de 99 unidades a 100000 centavos con el total exacto.
- [ ] **T010 [api] [P] [US1]** Escribir en `dashboard.service.ts` el resumen de hoy (`today`) con `listSales` inyectada y el reloj (plan §5.4, D-1; RF-2, RF-6, RF-8). Depende de: T004, T009
  Hecho cuando: las pruebas, con un reloj falso y una función de ventas falsa, comprueban que se pide el rango de `boliviaDayRange`, que la respuesta cumple `todaySummarySchema` con la `date` de Bolivia y `asOf` del reloj, y que tras la medianoche de Bolivia el resumen es el del día nuevo.
- [ ] **T011 [api] [P] [US1]** Escribir `dashboard.routes.ts` con `dashboardPlugin` y `GET /api/dashboard/today` con `requireSession` y la comprobación de `DASHBOARD_ROLES`; exportar `dashboardPlugin` desde `modules/dashboard/index.ts` (plan §5.4, §6.2, D-6; RF-1, RF-8). Depende de: T010
  Hecho cuando: las pruebas con `app.inject`, PGlite y una función de ventas falsa cubren `200` con sesión de dueño, `403 FORBIDDEN` con el mensaje del contrato para el cajero sin llamar a la función de ventas, `401` sin sesión, y que la ruta no acepta `POST`.
- [ ] **T012 [web] [P] [US1]** Escribir `state/useDashboardSummaries.ts` con el resumen de hoy: carga al montar, «Actualizar», `loading` sin borrar los datos anteriores, sin conexión o con un error inesperado conservando los datos y `403` sin datos (plan §5.5, §6.3; RF-1, RF-6, RF-7). Depende de: T007
  Hecho cuando: las pruebas del hook, con el cliente simulado, cubren la carga inicial, «Actualizar» con los datos anteriores visibles mientras carga, el escenario sin conexión tras una carga correcta, un `500 INTERNAL_ERROR` («Ocurrió un error. Inténtalo de nuevo») con los datos conservados, el de sin permiso y que no hay recargas automáticas.
- [ ] **T013 [web] [P] [US1]** Escribir `components/counts.ts` y `components/PeriodSummaryView.tsx`: total con `formatPrice`, «N venta(s)», promedio o «—», los dos medios de pago con `formatPaymentMethod` y los productos más vendidos con clave `productId`, o el aviso de período sin ventas que recibe (plan §5.5; RF-3, RF-4, RF-5, RNF-1). Depende de: T007
  Hecho cuando: las pruebas de componente muestran tal como llegan los resúmenes de `fixtures.ts`: «Bs 45,50», «2 ventas», «Bs 22,75», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», «Café americano · 3 unidades · Bs 37,50», «Empanada · 1 unidad · Bs 8,00»; el resumen vacío con «Bs 0,00», «0 ventas», «—» y el aviso; y dos productos con el mismo nombre en dos filas.
- [ ] **T014 [web] [P] [US1]** Escribir `TodaySummarySection.tsx` y `DashboardPage.tsx`: «Resumen de ventas», «Hoy · [fecha]» con `formatDate`, «Datos al …» con `formatDateTime`, «Actualizar», «Cargando…», «Todavía no hay ventas hoy», el aviso sin conexión y el mensaje de `403` sin cifras (plan §5.5, D-7; RF-1, RF-2, RF-5, RF-6, RF-7, RNF-4). Depende de: T008, T012, T013
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren cada escenario de `dev/`, «Actualizar» deshabilitado mientras carga, «Actualizar» con Tab e Intro, y que la página no hace cuentas (muestra los valores de los fixtures tal cual).
- [ ] **T015 [integración] [US1]** Registrar `dashboardPlugin` en `app.ts` con `listRegisteredSales` de `modules/sales/index.ts` y la sesión de SPEC-001, y comprobar que la aplicación usa el cliente real del dashboard sin `?escenarios=dashboard` (plan D-1; RF-1, RF-2, RF-8). Depende de: T011, T014, SPEC-003 T015, SPEC-003 T020, SPEC-002 T018
  Hecho cuando: una prueba de integración con `buildApp` registra dos ventas con `POST /api/sales` en días distintos (reloj falso) y `GET /api/dashboard/today` cuenta solo la de hoy, sin modificar ninguna venta; la interfaz en `vite preview` muestra el resumen de hoy contra la API de E2E; la pantalla inicial muestra «Resumen de ventas» al dueño y no al cajero; y `npm test` sigue pasando.
- [ ] **T016 [integración] [US1]** Escribir `e2e/dashboard-us1-resumen-hoy.spec.ts` con los 6 pasos de §8.2 del plan (RF-1 a RF-8, RNF-4). Depende de: T015, SPEC-002 T023
  Hecho cuando: `npm run test:e2e` pasa con la prueba de US1 contra la API real de E2E.

## Fase 4 — US2: ver el resumen del mes en curso (P2)

Rama: `feat/004-dashboard-us2`.

- [ ] **T017 [api] [P] [US2]** Escribir en `dashboard.summary.ts` `salesByDay` (plan §5.3; RF-10, RNF-2). Depende de: T009
  Hecho cuando: las pruebas unitarias comprueban un día por fecha de la lista, en orden, con ceros en los días sin ventas; que una venta a las 23:59 y otra a las 00:00 de Bolivia caen en días distintos; y que las filas suman el total y el número de ventas del mes.
- [ ] **T018 [api] [P] [US2]** Añadir el resumen del mes (`month`) a `dashboard.service.ts` y `GET /api/dashboard/month` a `dashboard.routes.ts` (plan §5.4, §6.2; RF-1, RF-9, RF-10). Depende de: T011, T017
  Hecho cuando: las pruebas comprueban que se pide el rango de `boliviaMonthRange`, que la respuesta cumple `monthSummarySchema` con el `month` y los días del 1 a hoy, y que la ruta responde `200` al dueño, `403` al cajero y `401` sin sesión.
- [ ] **T019 [web] [P] [US2]** Pedir el resumen del mes en `useDashboardSummaries` en paralelo con el de hoy y escribir `MonthSummarySection.tsx` y `DailySalesTable.tsx`: «[Mes] de [año]» con `formatMonth`, «Datos al …», `PeriodSummaryView` con «Todavía no hay ventas este mes» y una fila por día con `formatDate` (plan §5.5; RF-6, RF-7, RF-9, RF-10). Depende de: T014
  Hecho cuando: las pruebas de componente, con el cliente simulado, muestran «Octubre de 2026» con sus cifras y sus días tal como llegan («01/10/2026 · Bs 8,00 · 1 venta», «02/10/2026 · Bs 0,00 · 0 ventas»), el mes vacío con su aviso, la sección del mes después de la de hoy, y que «Actualizar» y sin conexión se aplican a los dos resúmenes.
- [ ] **T020 [integración] [US2]** Escribir `e2e/dashboard-us2-resumen-mes.spec.ts` con los 3 pasos de §8.2 del plan, contra la API real de E2E (RF-9, RF-10). Depende de: T016, T018, T019
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1 y US2.

## Fase 5 — Pulido

Rama: `feat/004-dashboard-pulido`.

- [ ] **T021 [api]** Escribir `modules/sales/sales-seed.cli.ts` (`npm run seed:sales -w @kofi/api`): carga en la base de `DATABASE_URL` las ventas de prueba del mes en curso con `nextSaleNumber` e `insertSale`, y se niega a correr con `NODE_ENV=production` (plan D-11; RNF-3). Depende de: T020
  Hecho cuando: una prueba de integración con PGlite carga 6000 ventas repartidas en los días del mes que cumplen `saleSchema` y suman lo esperado, y otra comprueba que con `NODE_ENV=production` no escribe nada.
- [ ] **T022 [integración]** Desplegar en Render con el Blueprint apuntando a esta rama y su base de Neon de comprobación (`docs/architecture.md` §6.5), cargar los 200 productos con `seed:menu` (SPEC-002 T034) y las 6000 ventas con `seed:sales`, y medir RNF-3 y el criterio de 10 segundos como indica el plan (§8.3). Requiere a una persona con acceso a Render y a Neon. Depende de: T021, SPEC-002 T034
  Hecho cuando: al menos 19 de cada 20 aperturas de «Resumen de ventas» y 19 de cada 20 «Actualizar» muestran los resúmenes en menos de 2 segundos, el dueño ve el total de hoy en menos de 10 segundos desde la pantalla inicial, y los resultados quedan anotados en la descripción del PR de pulido.
- [ ] **T023 [integración]** Actualizar `README.md` con el estado del módulo Dashboard: quién ve el resumen de ventas, cómo llegar a él y qué muestra de hoy y del mes (RF-1 a RF-10). Depende de: T022
  Hecho cuando: el README describe esos tres puntos.

## Cobertura de RF

| RF | Tareas |
| --- | --- |
| RF-1 | T003, T007, T008, T011, T012, T014, T015, T016, T018 |
| RF-2 | T002, T003, T004, T005, T010, T014, T015, T016 |
| RF-3 | T003, T009, T013, T016 |
| RF-4 | T003, T009, T013, T016 |
| RF-5 | T003, T009, T013, T014, T016 |
| RF-6 | T003, T004, T010, T012, T014, T016, T019 |
| RF-7 | T007, T012, T014, T016, T019 |
| RF-8 | T009, T010, T011, T015, T016 |
| RF-9 | T002, T003, T004, T005, T018, T019, T020 |
| RF-10 | T002, T003, T004, T017, T018, T019, T020 |
| RNF-1 | T013, T014, T016, T019, T020 (textos en español comparados tal como los define `spec.md`) |
| RNF-2 | T009, T017 |
| RNF-3 | T021, T022 |
| RNF-4 | T014, T016 |
