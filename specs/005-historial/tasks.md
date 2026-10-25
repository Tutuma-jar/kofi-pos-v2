# Tareas — SPEC-005 Historial y reportes

Estado: aprobadas y analizadas (modo delegado, sin bloqueantes) · Fecha: 2026-10-25 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[contrato]`, `[api]`, `[web]` e `[integración]`. Las tareas que tocan la raíz del monorepo, la E2E o el despliegue usan `[integración]`.
- **`[P]`:** se puede hacer en paralelo con las tareas del otro frente de su fase. En Base común, las tareas `[api]` y `[web]` avanzan en paralelo una vez escrito el contrato. En las fases de historia, ninguna tarea `[web]` depende de una `[api]` ni al revés: las dos dependen solo de Preparación y Base común (y de las de su mismo frente en historias anteriores). Dentro de un mismo frente, las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Preparación y Base común en `feat/005-historial-definicion`, como en SPEC-001 a SPEC-004; cada historia en `feat/005-historial-usN`; Pulido en `feat/005-historial-pulido`.
- **Dependencia de SPEC-003** (plan, encabezado y D-1): Preparación y Base común no usan nada de sus historias. Las historias del Historial necesitan de la historia 1 de Ventas, que **todavía no está en `develop`**, la exportación de `listRegisteredSales` y `salesPlugin` (SPEC-003 T015) y su registro en `app.ts` (SPEC-003 T020). Por eso **las historias del Historial empiezan cuando se fusionen el PR de definición de 005 y `feat/003-ventas-us1`**. Dentro de cada historia, solo las tareas `[integración]` usan esas piezas; las demás trabajan con ventas falsas o con el cliente simulado.
- **Dependencia de SPEC-004:** el contrato (`dashboard.ts`, `formatDate`, `formatMonth`) y `shared/calendar.ts` ya están en `develop` (#20). `apps/api/test/test-sales.ts` es de SPEC-004 T009: T009 de esta especificación lo reutiliza si ya está en `develop` o lo crea con la forma de SPEC-004 §8.4 (plan §3). El script `seed:sales` de Pulido es de SPEC-004 T021 (plan D-11).
- **Dependencias de SPEC-001 y SPEC-002:** `requireSession`, `createAuthService`, la sesión de la interfaz, los enlaces `homeLink` de la pantalla inicial y la ruta de pruebas `POST /api/__test/menu` ya están en `develop`.
- **Dudas abiertas:** dos, con decisión provisional (plan, encabezado). Ninguna afecta a Preparación ni a Base común: si se responden de otra forma, cambian `HISTORY_ROLES` (T003, duda 1) y la validación de fechas del servicio (T010 y T024, duda 2). **Ninguna historia empieza con ellas abiertas** (`AGENTS.md`): la duda 1 afecta a las tres historias (RF-1 se aplica a todas las rutas del Historial) y la 2, a US1 y US3.
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Rama: `feat/005-historial-definicion`.

- [ ] **T001 [integración]** Crear el módulo `history` vacío en las dos aplicaciones: `apps/api/src/modules/history/index.ts` y `apps/web/src/modules/history/index.ts`, con su prueba de humo, y añadir a `eslint.config.test.ts` los casos de `history` (otro módulo no puede importar sus archivos internos, sí su `index.ts`; `history` tampoco puede importar los internos de `sales` ni de `dashboard`) (plan §3)
  Hecho cuando: las pruebas de las reglas de lint pasan con los casos nuevos, y `npm run lint` y `npm run typecheck` pasan.

## Fase 2 — Base común

Rama: `feat/005-historial-definicion`.

- [ ] **T002 [contrato]** Añadir `formatTime` a `packages/contracts/src/datetime.ts` y `formatRole` a `auth.ts` (plan §6.1, D-5; RF-3, RF-8). Depende de: T001
  Hecho cuando: las pruebas comprueban que `2026-10-24T14:30:00.000Z` se muestra «10:30», `2026-10-25T03:59:00.000Z` «23:59» y `2026-10-25T04:00:00.000Z` «00:00», con cualquier zona horaria en el proceso de pruebas; y que `owner` se muestra «Dueño» y `cashier` «Cajero».
- [ ] **T003 [contrato]** Escribir `packages/contracts/src/history.ts` con `HISTORY_ROLES`, `HISTORY_MESSAGES`, `saleNotFoundMessage`, `SALE_NUMBER_MAX`, `parseSaleNumber`, `listedSaleSchema`, `dayHistorySchema`, `monthHistorySchema`, `historySaleResponseSchema`, `historyDayQuerySchema` e `historyMonthQuerySchema`; exportar `byPaymentMethodSchema` desde `dashboard.ts` y `history.ts` desde `index.ts` (plan §6.1, §6.2, D-3, D-6, D-8; RF-1 a RF-13). Depende de: T002
  Hecho cuando: las pruebas validan las respuestas de los ejemplos de §6.2 del plan y sus errores `400`, `403` y `404` con `apiErrorSchema`; rechazan un día con `salesCount` distinto del número de ventas, una venta de la lista con `lines`, un `date` posterior a `today`, un `nextDate` no nulo con `date = today` o nulo con `date < today`, lo mismo para el mes, `byPaymentMethod` en otro orden, un mes sin días o con 32 y un `asOf` sin zona horaria; `parseSaleNumber` devuelve `'7'` para `' 007 '`, `'123'` para `'00000000000000000000123'` y el texto completo para un número de 20 cifras, y `null` para `''`, `'0'`, `'000'`, `'-3'`, `'2,5'`, `'1e3'` y `'abc'`; `saleNotFoundMessage('99')` es «No existe la venta N.º 99»; y `npm run typecheck` pasa.
- [ ] **T004 [api] [P]** Añadir a `apps/api/src/shared/calendar.ts` `addDays`, `addMonths`, `daysOfMonth`, `boliviaDayBounds` y `boliviaMonthBounds` (plan §5.1, D-4; RF-2, RF-11, RF-13). Depende de: T001
  Hecho cuando: las pruebas unitarias, con cualquier `TZ` en el proceso, comprueban que `addDays` pasa del `2026-12-31` al `2027-01-01`, del `2028-02-28` al `2028-02-29` y del `2026-03-01` al `2026-02-28` hacia atrás; que `addMonths` pasa de `2026-12` a `2027-01` y de `2026-01` a `2025-12` hacia atrás; que `daysOfMonth` da 31 días en octubre, 30 en septiembre, 29 en febrero de 2028 y 28 en febrero de 2026; que el día pasado `2026-10-24` va de `2026-10-24T04:00Z` a `2026-10-25T04:00Z` y el de hoy termina en `now + 1 ms`; que un mes pasado tiene todos sus días y termina a las 00:00 de Bolivia del día 1 siguiente, y el mes en curso va del 1 a hoy y termina en `now + 1 ms`; y que las funciones de SPEC-004 siguen pasando sus pruebas.
- [ ] **T005 [web] [P]** Escribir `modules/history/api/history-client.ts`: interfaz `HistoryClient` (`day(date?)`, `month(month?)`, `sale(number)`) y su cliente HTTP real sobre `apiFetch` (plan §6.2; RF-2, RF-8, RF-11). Depende de: T003
  Hecho cuando: las pruebas comprueban la ruta, los parámetros de consulta (sin parámetro cuando no hay fecha o mes) y el método de cada operación, que las respuestas `200` se validan con `dayHistorySchema`, `monthHistorySchema` e `historySaleResponseSchema`, y que un `ApiFetchError` (`400`, `403`, `404`, `NETWORK_ERROR`) se propaga.
- [ ] **T006 [web] [P]** Escribir `modules/history/api/HistoryClientProvider.tsx` y `useHistoryClient`: el cliente en uso por contexto, que el proveedor siempre recibe; `index.ts` los exporta con `httpHistoryClient`, y `main.tsx` provee el cliente real, también en desarrollo (plan D-9). Depende de: T005
  Hecho cuando: una prueba de componente comprueba que `useHistoryClient` devuelve el cliente del proveedor y falla con un error claro fuera de él, y el build de producción usa el cliente real.
- [ ] **T007 [web] [P]** Escribir `modules/history/dev/`: `fixtures.ts` (días 23, 24 y 25/10/2026 con hoy el 25, septiembre y octubre de 2026 y el detalle de sus ventas, todo ya calculado), `history-demo-client.ts` (implementa `HistoryClient` con esos datos, `asOf` de cada pedido, días y meses sin datos vacíos con su navegación, `400` para fechas o meses futuros o inválidos y `404` para números sin venta) y `ScenarioPicker.tsx` con los escenarios «Con ventas», «Sin ventas», «Sin conexión», «Con error», «Sin permiso» y «Lento»; añadir `historial` a `scenarios.ts` y, en desarrollo y con `?escenarios=historial`, proveer en `main.tsx` el cliente simulado y montar su selector (plan D-9; RF-1 a RF-13). Depende de: T006
  Hecho cuando: las pruebas validan con los esquemas del contrato todos los datos del cliente simulado; comprueban que «Sin conexión» falla con `NETWORK_ERROR`, «Con error» con `500 INTERNAL_ERROR` y su mensaje, «Sin permiso» con `403 FORBIDDEN` y el mensaje del contrato en las tres operaciones, y «Lento» responde después de 1,5 s; que un día futuro, un mes futuro y un número sin venta responden su `400` o `404` con los mensajes del contrato; que `requestedScenarios` reconoce `historial` solo y combinado con `acceso`, `menu`, `ventas` y `dashboard`; y que el build de producción no contiene nada de `dev/` del historial.
- [ ] **T008 [web] [P]** Añadir a `routes.tsx` las rutas `/ventas` (con `homeLink: 'Historial de ventas'`), `/ventas/mes` y `/ventas/:numero`, las tres con `roles: HISTORY_ROLES`, con páginas provisionales `DayHistoryPage`, `MonthHistoryPage` y `SaleDetailPage` exportadas desde `modules/history/index.ts` (plan §3, D-6, D-7; RF-1). Depende de: T003
  Hecho cuando: las pruebas de rutas navegan a las tres rutas con una sesión de dueño y muestran su página; comprueban que solo `/ventas` tiene `homeLink`, que las tres tienen `roles: HISTORY_ROLES`, que `canView` no las permite a un cajero, que `/ventas/nueva` sigue mostrando «Nueva venta» y que `/ventas/7` muestra la página del detalle.

## Fase 3 — US1: consultar las ventas de un día (P1)

Rama: `feat/005-historial-us1`. Empieza cuando se fusionen el PR de definición de 005 y `feat/003-ventas-us1`, y con las dudas 1 y 2 de `spec.md` respondidas.

- [ ] **T009 [api] [P] [US1]** Escribir en `history.report.ts` `periodTotals` y `listedSales`, y reutilizar o crear `apps/api/test/test-sales.ts` (plan §3, §5.2, §8.4; RF-3, RF-4, RF-7, RNF-2). Depende de: T003
  Hecho cuando: las pruebas unitarias cubren el ejemplo de §4 del plan; un período sin ventas (ceros y los dos medios de pago); `cash` y `qr` siempre en ese orden y sumando el total y el número de ventas; la lista ordenada por número descendente y sin líneas; los datos de cada venta tal como llegan (nombre y rol del momento, `userId` nulo); y 6000 ventas de 30 líneas de 99 unidades a 100000 centavos con el total exacto.
- [ ] **T010 [api] [P] [US1]** Escribir en `history.service.ts` el día (`day`) con `listSales` inyectada y el reloj (plan §5.3, D-1, D-4, D-10; RF-2, RF-3, RF-5, RF-7). Depende de: T004, T009
  Hecho cuando: las pruebas, con un reloj falso y una función de ventas falsa, comprueban que sin fecha se consulta hoy en Bolivia; que se pide el rango de `boliviaDayBounds`; que la respuesta cumple `dayHistorySchema` con `today`, `previousDate`, `nextDate` (nulo hoy) y `asOf` del reloj; que una fecha futura responde `400` «No se pueden consultar fechas futuras» y una inválida («2026-02-30», «ayer») `400` «La fecha no es válida», sin llamar a la función de ventas; y que tras la medianoche de Bolivia hoy es el día nuevo.
- [ ] **T011 [api] [P] [US1]** Escribir `history.routes.ts` con `historyPlugin`, la comprobación de `requireSession` y `HISTORY_ROLES` para todas sus rutas y `GET /api/history/day`; exportar `historyPlugin` desde `modules/history/index.ts` (plan §5.4, §6.2, D-6; RF-1, RF-2, RF-7). Depende de: T010
  Hecho cuando: las pruebas con `app.inject`, PGlite y una función de ventas falsa cubren `200` con sesión de dueño con y sin `date`; `403 FORBIDDEN` con «No tienes permiso para ver el historial de ventas» con sesión de cajero, también con una fecha inválida, sin llamar a la función de ventas; `401` sin sesión; `400` con los dos mensajes de fecha; y que la ruta no acepta `POST`.
- [ ] **T012 [web] [P] [US1]** Escribir `state/useHistoryQuery.ts`: carga al montar y al cambiar la clave, «Actualizar», `loading` sin borrar los datos anteriores, sin conexión o con error inesperado conservando los datos, y rechazos `400`, `403` y `404` borrando los datos con el mensaje de la API (plan §5.5; RF-5, RF-6). Depende de: T007
  Hecho cuando: las pruebas del hook, con el cliente simulado, cubren la carga inicial, el cambio de clave, «Actualizar» con los datos anteriores visibles mientras carga, «Sin conexión» y «Con error» tras una carga correcta con los datos conservados, una fecha futura y «Sin permiso» sin datos y con su mensaje, y que no hay recargas automáticas.
- [ ] **T013 [web] [P] [US1]** Escribir `components/counts.ts`, `PeriodTotals.tsx` y `SalesList.tsx`: total con `formatPrice`, «N venta(s)», los dos medios de pago con `formatPaymentMethod`, y una fila por venta «N.º [número] · [hora] · [nombre] · [rol] · [medio] · [total]» con `formatTime` y `formatRole`, con clave `number` (plan §5.5; RF-3, RF-4, RNF-1). Depende de: T007
  Hecho cuando: las pruebas de componente muestran tal como llegan los datos de `fixtures.ts`: «Bs 45,50», «2 ventas», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», «N.º 3 · 10:30 · Luis Mamani · Dueño · QR · Bs 20,50» antes de «N.º 2 · 09:15 · Ana Quispe · Cajero · Efectivo · Bs 25,00»; y el día vacío con «Bs 0,00», «0 ventas» y los dos medios en cero.
- [ ] **T014 [web] [P] [US1]** Escribir `QueryStatus.tsx` («Datos al …» solo si la respuesta tiene `asOf`) y `DayHistoryPage.tsx`: «Ventas del [fecha]» con `formatDate`, «Día anterior», «Día siguiente» (deshabilitado si `nextDate` es nulo), campo de fecha con `max = today`, la fecha en `?fecha=`, `PeriodTotals`, `SalesList` o «No hay ventas registradas este día», «Datos al …», «Actualizar», «Cargando…», los avisos sin conexión o con error y los rechazos (plan §5.5, D-7; RF-1, RF-2, RF-3, RF-5, RF-6, RNF-4). Depende de: T008, T012, T013
  Hecho cuando: las pruebas de componente, con el cliente simulado, cubren cada escenario de `dev/`; que «Día anterior» y «Día siguiente» cambian `?fecha=` a `previousDate` y `nextDate`; que elegir una fecha en el campo la pone en la URL; que una URL con fecha futura muestra «No se pueden consultar fechas futuras» sin ventas; que un fallo de conexión tras cambiar de día sigue mostrando el día anterior con su título y su «Datos al …»; que «Actualizar» está deshabilitado mientras carga; que todo se alcanza con Tab y se elige con Intro; y que la página no hace cuentas (muestra los valores de los fixtures tal cual).
- [ ] **T015 [integración] [US1]** Registrar `historyPlugin` en `app.ts` con `listRegisteredSales` de `modules/sales/index.ts` y la sesión de SPEC-001, y comprobar que la aplicación usa el cliente real del historial sin `?escenarios=historial` (plan D-1; RF-1, RF-3, RF-7). Depende de: T011, T014, SPEC-003 T015, SPEC-003 T020
  Hecho cuando: una prueba de integración con `buildApp` registra ventas con `POST /api/sales` en dos días distintos (reloj falso) y `GET /api/history/day` de cada día devuelve solo las suyas, sin modificar ninguna venta; la interfaz en `vite preview` muestra las ventas de un día contra la API de E2E; la pantalla inicial muestra «Historial de ventas» al dueño y no al cajero; y `npm test` sigue pasando.
- [ ] **T016 [integración] [US1]** Escribir `e2e/history-us1-ventas-dia.spec.ts` con los 9 pasos de §8.2 del plan (RF-1 a RF-7, RNF-4). Depende de: T015
  Hecho cuando: `npm run test:e2e` pasa con la prueba de US1 contra la API real de E2E.

## Fase 4 — US2: ver el detalle de una venta (P2)

Rama: `feat/005-historial-us2`.

- [ ] **T017 [api] [P] [US2]** Añadir `findSaleByNumber(db, number)` a `modules/sales/sales.repository.ts`, con el mismo `toSale` que `findSaleByDraftId` (plan §4, §5.3, D-1; RF-7, RF-8, RF-9). Depende de: T001
  Hecho cuando: una prueba de integración con PGlite inserta ventas con `insertSale` y comprueba que `findSaleByNumber` devuelve la del número pedido, con sus líneas en orden y cumpliendo `saleSchema`, y `null` para un número sin venta.
- [ ] **T018 [api] [P] [US2]** Añadir la venta (`sale`) a `history.service.ts` con `findSale` inyectada, y `GET /api/history/sales/:number` a `history.routes.ts` (plan §5.3, §5.4, §6.2, D-1, D-8; RF-7, RF-8, RF-9). Depende de: T011
  Hecho cuando: las pruebas, con una función falsa, comprueban que la respuesta cumple `historySaleResponseSchema` con la venta tal como llega y su `date` de Bolivia (una venta de las 23:59 y otra de las 00:00); que `003` y ` 3 ` buscan el número 3; que `0`, `-3`, `2,5` y `abc` responden `400` «Escribe un número de venta válido»; que un número sin venta responde `404` «No existe la venta N.º 99»; que `2147483648` y un número de 20 cifras responden `404` sin llamar a la función; y que la ruta responde `403` al cajero y `401` sin sesión.
- [ ] **T019 [web] [P] [US2]** Escribir `components/SaleSearch.tsx` («Buscar venta por número» y «Buscar», con `parseSaleNumber`) y añadirlo a `DayHistoryPage` (plan §5.5, D-8; RF-9, RNF-4). Depende de: T014
  Hecho cuando: las pruebas de componente comprueban que « 007 » lleva a `/ventas/7`; que vacío, «0», «-3», «2,5» y «abc» muestran «Escribe un número de venta válido» sin navegar; que «Buscar» se elige con Intro desde el campo; y que la búsqueda aparece en las ventas de un día.
- [ ] **T020 [web] [P] [US2]** Escribir `SaleDetailView.tsx` y `SaleDetailPage.tsx`: «Venta N.º [número]», fecha y hora con `formatDateTime`, «Registrada por [nombre] · [rol]», «Medio de pago: [medio]», las líneas en orden «[producto] · [categoría] · [precio] × [cantidad] · [subtotal]», el total, «Volver» a `/ventas?fecha=date`, `SaleSearch`, `QueryStatus` sin «Datos al …» y el `404` con su mensaje; y hacer que cada fila de `SalesList` enlace a `/ventas/[número]` (plan §5.5; RF-5, RF-6, RF-8, RF-9, RF-10, RNF-4). Depende de: T019
  Hecho cuando: las pruebas de componente, con el cliente simulado, muestran tal cual el detalle de los fixtures con sus líneas en orden; «Volver» lleva al día de la venta; un número sin venta muestra «No existe la venta N.º 99»; los escenarios «Sin conexión», «Con error», «Sin permiso» y «Lento» se ven como en el día; una fila de la lista abre su detalle; y todo se alcanza con Tab y se elige con Intro.
- [ ] **T021 [integración] [US2]** Exportar `findSaleByNumber` desde `modules/sales/index.ts` y pasarlo a `historyPlugin` en `app.ts` (plan D-1; RF-7, RF-8). Depende de: T015, T017, T018, T020
  Hecho cuando: una prueba de integración con `buildApp` registra una venta con `POST /api/sales`, cambia el precio de un producto y elimina la cuenta que la registró, y `GET /api/history/sales/:number` devuelve la venta con los precios, el nombre y el rol del registro; y `npm test` sigue pasando.
- [ ] **T022 [integración] [US2]** Escribir `e2e/history-us2-detalle-venta.spec.ts` con los 6 pasos de §8.2 del plan (RF-5, RF-7 a RF-10, RNF-4). Depende de: T016, T021
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1 y US2.

## Fase 5 — US3: consultar las cifras de un mes (P3)

Rama: `feat/005-historial-us3`.

- [ ] **T023 [api] [P] [US3]** Escribir en `history.report.ts` `salesByDay` (plan §5.2; RF-13, RNF-2). Depende de: T009
  Hecho cuando: las pruebas unitarias comprueban un día por fecha de la lista, en orden, con ceros en los días sin ventas; que una venta a las 23:59 y otra a las 00:00 de Bolivia caen en días distintos; y que las filas suman el total y el número de ventas del mes.
- [ ] **T024 [api] [P] [US3]** Añadir el mes (`month`) a `history.service.ts` y `GET /api/history/month` a `history.routes.ts` (plan §5.3, §5.4, §6.2, D-4, D-10; RF-7, RF-11, RF-12, RF-13). Depende de: T010, T011, T023
  Hecho cuando: las pruebas comprueban que sin mes se consulta el mes en curso; que se pide el rango de `boliviaMonthBounds`; que la respuesta cumple `monthHistorySchema` con `currentMonth`, `previousMonth`, `nextMonth` (nulo en el mes en curso), `asOf` y los días (todo el mes pasado, del 1 a hoy el en curso); que una venta del último día del mes anterior a las 23:59 no cuenta; que un mes futuro responde `400` «No se pueden consultar meses futuros» y uno inválido («2026-13», «octubre») `400` «El mes no es válido», sin llamar a la función de ventas; y que la ruta responde `403` al cajero y `401` sin sesión.
- [ ] **T025 [web] [P] [US3]** Escribir `MonthDaysTable.tsx` y `MonthHistoryPage.tsx`: «[Mes] de [año]» con `formatMonth`, «Mes anterior», «Mes siguiente» (deshabilitado si `nextMonth` es nulo), campo de mes con `max = currentMonth`, el mes en `?mes=`, `PeriodTotals`, «No hay ventas registradas este mes» si no tiene ventas, una fila por día (también en un mes sin ventas) «[fecha] · [total] · [ventas]» que enlaza a `/ventas?fecha=`, «Ver por día», `SaleSearch` y `QueryStatus`; y añadir «Ver por mes» a `DayHistoryPage` (plan §5.5, D-7; RF-5, RF-6, RF-11, RF-12, RF-13, RNF-4). Depende de: T020
  Hecho cuando: las pruebas de componente, con el cliente simulado, muestran tal cual «Octubre de 2026» con sus cifras y sus días («24/10/2026 · Bs 45,50 · 2 ventas», «01/10/2026 · Bs 0,00 · 0 ventas»); el mes vacío con su aviso y sus filas en cero; la navegación por `?mes=`; una fila que lleva a su día; «Ver por mes» y «Ver por día»; un mes futuro en la URL con su mensaje y sin cifras; los escenarios sin conexión, con error, sin permiso y lento; y todo con Tab e Intro.
- [ ] **T026 [integración] [US3]** Escribir `e2e/history-us3-cifras-mes.spec.ts` con los 7 pasos de §8.2 del plan, contra la API real de E2E (RF-11, RF-12, RF-13, RNF-4). Depende de: T022, T024, T025
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1, US2 y US3.

## Fase 6 — Pulido

Rama: `feat/005-historial-pulido`.

- [ ] **T027 [api]** Hacer que `seed:sales` (SPEC-004 T021) pueda cargar 6000 ventas en un mes con 400 de ellas en un mismo día; si `seed:sales` aún no está en `develop`, crearlo como indica SPEC-004 D-11 (plan D-11; RNF-3). Depende de: T026
  Hecho cuando: una prueba de integración con PGlite carga 6000 ventas del mes, 400 en un día, que cumplen `saleSchema`, y otra comprueba que con `NODE_ENV=production` no escribe nada.
- [ ] **T028 [integración]** Desplegar en Render con el Blueprint apuntando a esta rama y su base de Neon de comprobación (`docs/architecture.md` §6.5), cargar los 200 productos con `seed:menu` (SPEC-002 T034) y las ventas con `seed:sales`, y medir RNF-3 y los criterios de 15 segundos como indica el plan (§8.3). Requiere a una persona con acceso a Render y a Neon. Depende de: T027, SPEC-002 T034
  Hecho cuando: al menos 19 de cada 20 aperturas del día de 400 ventas, del mes de 6000 y del detalle de una venta tardan menos de 2 segundos, el dueño ve el total de un día anterior y abre una venta por su número en menos de 15 segundos desde la pantalla inicial, y los resultados quedan anotados en la descripción del PR de pulido.
- [ ] **T029 [integración]** Actualizar `README.md` con el estado del módulo Historial: quién lo usa, cómo llegar a él y qué muestra de un día, de una venta y de un mes (RF-1 a RF-13). Depende de: T028
  Hecho cuando: el README describe esos tres puntos.

## Cobertura de RF

| RF | Tareas |
| --- | --- |
| RF-1 | T003, T007, T008, T011, T014, T015, T016 |
| RF-2 | T003, T004, T005, T010, T011, T014, T016 |
| RF-3 | T002, T009, T010, T013, T014, T015, T016 |
| RF-4 | T003, T009, T013, T016 |
| RF-5 | T010, T012, T014, T016, T020, T022, T025 |
| RF-6 | T007, T012, T014, T016, T020, T025 |
| RF-7 | T009, T010, T011, T015, T017, T018, T021, T022, T024 |
| RF-8 | T002, T003, T005, T017, T018, T020, T021, T022 |
| RF-9 | T003, T017, T018, T019, T020, T022 |
| RF-10 | T020, T022 |
| RF-11 | T003, T004, T005, T024, T025, T026 |
| RF-12 | T003, T024, T025, T026 |
| RF-13 | T003, T004, T023, T024, T025, T026 |
| RNF-1 | T013, T014, T016, T020, T025 (textos en español comparados tal como los define `spec.md`) |
| RNF-2 | T009, T023 |
| RNF-3 | T027, T028 |
| RNF-4 | T014, T016, T019, T020, T022, T025, T026 |
