# Tareas — SPEC-007 Ventas de demostración

Estado: aprobadas y analizadas (sin hallazgos tras la corrección); Base común implementada · Fecha: 2026-10-28 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[api]` e `[integración]`. No hay tareas `[contrato]` ni `[web]`: la especificación no cambia `packages/contracts` ni la interfaz (plan §3 y §6). Las tareas que tocan la E2E, `AGENTS.md` o una base real usan `[integración]`.
- **`[P]`:** solo las dos tareas de Base común, que no comparten archivos. Con un solo frente de código (`[api]`), las tareas de la historia se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Base común en `feat/007-ventas-demo-definicion`; la historia en `feat/007-ventas-demo-us1`; Pulido en `feat/007-ventas-demo-pulido`.
- **Dependencias de otras especificaciones:** `insertSalesBatch`, `reserveSaleNumbers`, `listRegisteredSales`, `createSalesService`, `003_sales.sql` (SPEC-003); `getAdminMenu`, `saveCategory`, `saveProduct` y `OFFICIAL_MENU` (SPEC-002 y SPEC-006); `createAccountsService` (SPEC-001); `shared/calendar.ts` y `migrate` ya están en `develop`. No depende de `loadOfficialMenu`, que está en `feat/006-menu-inicial-us1` (plan §8.1, §10).
- **Dudas abiertas:** ninguna.
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Sin tareas: el módulo `sales` de la API, sus migraciones, las herramientas de prueba y las reglas de lint de los módulos ya existen desde SPEC-001 a SPEC-005 (plan §3).

## Fase 2 — Base común

Rama: `feat/007-ventas-demo-definicion`.

- [x] **T001 [api] [P]** Exportar `OFFICIAL_MENU` y su tipo `OfficialCategory` desde `apps/api/src/modules/menu/index.ts`, en una línea aparte, y escribir `apps/api/test/official-menu-fixture.ts` con `loadOfficialMenuFixture(db)`, que da de alta `OFFICIAL_MENU` con `saveCategory` y `saveProduct` (plan §3, §8.1, §10, D-4)
  Hecho cuando: `modules/menu/index.test.ts` comprueba que `OFFICIAL_MENU` se exporta desde el `index.ts`; una prueba de integración comprueba que, en una base migrada vacía, `loadOfficialMenuFixture` deja en `getAdminMenu` las 6 categorías y los 37 productos activos; y `npm run typecheck` y `npm run lint` pasan.
- [x] **T002 [api] [P]** Escribir `apps/api/src/modules/sales/demo-sales.random.ts` con `createRandom(seed, stream, attempt)`: mulberry32 sobre un hash de los tres datos, con `next()` en [0, 1), `int(min, max)` inclusivo, `pick(items)` y `weighted(items, weight)` (plan §5.2, §5.3, D-5)
  Hecho cuando: `demo-sales.random.test.ts` comprueba que la misma semilla, flujo e intento dan la misma secuencia de 1000 valores; que cambiar el flujo o el intento da otra; que `next()` queda en [0, 1); que `int(30, 80)` devuelve solo enteros de 30 a 80 y, en 10 000 tiradas, todos ellos; y que `weighted` respeta los pesos con una tolerancia de 2 puntos en 10 000 tiradas.

## Fase 3 — US1: llenar una base con tres meses de ventas variadas (P1)

Rama: `feat/007-ventas-demo-us1`.

- [x] **T003 [api] [US1]** Escribir en `demo-sales.calendar.ts` `demoPeriod(now)` y `planDemoCalendar(period, seed)`, y en `demo-sales.rules.ts` `checkDemoCalendar(calendar)`, que devuelve la lista de reglas incumplidas (plan §4, §5.1, §5.2, D-5, D-6; RF-1, RF-4, RNF-4). Depende de: T002
  Hecho cuando: `demo-sales.calendar.test.ts` comprueba los períodos del 28/10/2026 (28/07 a 27/10), 31/12/2026 (30/09 a 30/12), 01/11/2026 (01/08 a 31/10), 31/05/2027 (28/02 a 30/05) y 31/05/2028 (29/02 a 30/05), con `now` en hora de Bolivia y con `TZ` del proceso en otra zona; que, para 200 semillas, el calendario deja sin ventas de 2 a 4 domingos, al menos uno en cada mes completo y nunca dos seguidos, da de 30 a 80 ventas a los demás días, a viernes y sábados al menos un 20 % más de promedio que de lunes a jueves, y ninguna venta hoy; que la misma semilla da el mismo calendario y el mismo `total`; y `demo-sales.rules.test.ts` comprueba que `checkDemoCalendar` detecta, con calendarios armados a mano, cada una de esas reglas incumplida.
- [x] **T004 [api] [US1]** Añadir a `demo-sales.rules.ts` `checkDemoSales(sales, context)` con las reglas de horas y contenido: horario del local, segundos distintos, horas pico, reparto de tipos ±5 puntos, cantidades, bebida en el 80 % de las ventas de 2 a 5 productos, una venta simple y una combinada cada día, los 37 productos, los 10 más vendidos, salteñas antes de las 12:00 y repostería desde las 14:00, productos sin repetir en una venta, subtotales y totales (plan §5.3, D-6; RF-4, RF-5). Depende de: T003
  Hecho cuando: `demo-sales.rules.test.ts` comprueba, con ventas armadas a mano, que un conjunto que cumple todo no devuelve fallos y que cada regla incumplida (por ejemplo, una venta a las 20:30:00, dos en el mismo segundo, «Mocochinchi» sin vender, 72 % de salteñas antes de las 12:00 contra 69 %, un subtotal que no es precio por cantidad) devuelve su fallo.
- [x] **T005 [api] [US1]** Completar `checkDemoSales` con las reglas de pago, cuentas y número: 55 % a 65 % en efectivo, los dos medios cada día, más QR desde Bs 60,00, 70 % a 85 % de cajero con los dos roles, un solo rol, cada cuenta al menos una vez y números consecutivos en orden de fecha y hora (plan §5.3, D-6; RF-6, RF-7, RF-8). Depende de: T004
  Hecho cuando: `demo-sales.rules.test.ts` comprueba, con ventas armadas a mano, cada una de esas reglas cumplida e incumplida (por ejemplo, 66 % en efectivo, un día sin QR, una cuenta de cajero sin ventas, un número repetido o una venta posterior con número menor).
- [x] **T006 [api] [US1]** Escribir `demo-sales.generator.ts` con `generateDemoSales(calendar, seed, products, accounts, firstNumber)` según plan §5.3: horas con peso en las horas pico, tipos de venta, productos con pesos por hora, cantidades, pago, cuenta, cobertura de productos y cuentas, numeración y reintento hasta 50 veces mientras `checkDemoSales` encuentre fallos (plan §5.3, D-5, D-6, D-11; RF-4 a RF-8, RNF-2). Depende de: T005
  Hecho cuando: `demo-sales.generator.test.ts`, con los 37 productos oficiales a sus precios y cuentas de dueño y cajero, comprueba para 200 semillas, con aserciones propias y no con `checkDemoSales`, las reglas de RF-4 a RF-8; que lo consigue en el primer intento en al menos el 95 % de las semillas; que ninguna de 1000 semillas agota los 50 intentos; que con una sola cuenta de cajero todas las ventas son suyas; que con dos cuentas de cajero las dos registran ventas; que cada línea lleva el nombre, la categoría y el precio recibidos; que la misma semilla da las mismas ventas salvo `draftId`; y que, si `checkDemoSales` falla siempre, lanza `DemoSalesGenerationError`.
- [x] **T007 [api] [US1]** Escribir en `demo-sales.service.ts` `checkBase(tx)` e `inspectDemoSales(db, { seed, now? })`: toma `now` de `SELECT now()` si no se le pasa, migra, comprueba la base en el orden de RF-2 y calcula el calendario dentro de una transacción que siempre se deshace (plan §5.4, §5.5, D-2, D-3, D-4; RF-1, RF-2). Depende de: T006
  Hecho cuando: `demo-sales.service.integration.test.ts` comprueba que, con el menú oficial (`loadOfficialMenuFixture`), sin ventas y con cuentas, devuelve el calendario del período de `now` y la base queda igual (ventas, `sale_counter`, menú y cuentas); que sin `now` usa la hora de PostgreSQL; que rechaza sin cambios, en este orden de prioridad, una base con una venta (`DemoSalesHasSalesError`), con el menú vacío, con «Mocochinchi» inactivo, con «Cuñapé» renombrado, con «Brownie» en «Salados» y con «Repostería» inactiva (`DemoSalesMenuError` con los productos en el orden de `OFFICIAL_MENU`), y sin cuentas (`DemoSalesNoAccountsError`); y que con productos extra y el precio de «Americano» cambiado no rechaza.
- [x] **T008 [api] [US1]** Escribir en `demo-sales.service.ts` `loadDemoSales(db, { seed, now })`: en una sola transacción, `pg_advisory_xact_lock`, `migrate`, `SELECT … FROM sale_counter FOR UPDATE`, `checkBase`, `planDemoCalendar`, `reserveSaleNumbers`, `generateDemoSales` e `insertSalesBatch` en lotes de 250 (plan §5.5, D-2, D-10; RF-3, RF-5, RF-7, RF-8, RF-9, RF-10, RNF-2). Depende de: T007
  Hecho cuando: las pruebas de integración comprueban que carga el `total` de `inspectDemoSales` con la misma semilla y `now`, con `last_number` igual a ese total; que `listRegisteredSales` devuelve las ventas con los nombres, categorías y precios vigentes y el nombre visible y rol de las cuentas; que el menú y las cuentas no cambian; que la siguiente venta de `createSalesService(…).register` toma el número siguiente; que una venta registrada o «Mocochinchi» desactivado después de la inspección hacen rechazar sin cambios, y un precio cambiado se carga con el nuevo; que un `Database` que falla en un lote intermedio deja la base sin ventas y con `last_number = 0`; que dos cargas a la vez (`Promise.all`) terminan con una carga y un `DemoSalesHasSalesError`; que una carga y una venta de «Nueva venta» a la vez completan solo una de las dos: o la carga se rechaza con `DemoSalesHasSalesError` y queda la venta N.º 1, o la venta toma el número siguiente al de la última venta de demostración (RF-10; observación del verificador de la definición); y, registrando las sentencias de la transacción, que el bloqueo consultivo va antes de `migrate`, y el `FOR UPDATE` del contador antes de la comprobación de ventas.
- [x] **T009 [api] [US1]** Escribir `demo-sales.cli.ts` con `runDemoSalesLoad({ env, createDatabase, ask, write, seed })`, sus siete mensajes y el punto de entrada (`import.meta.main`) con `process.env`, `createPgDatabase`, `node:readline/promises` y una semilla de `randomInt`; añadir a `apps/api/package.json` el script `load:demo-sales` (`node --env-file-if-exists=.env src/modules/sales/demo-sales.cli.ts`) (plan §5.6, D-1, D-7, D-8, D-11; RF-1, RF-2, RF-3, RF-10, RNF-1). Depende de: T008
  Hecho cuando: `demo-sales.cli.integration.test.ts`, con PGlite como `createDatabase` y un `ask` simulado, comprueba que con «CARGAR» y con «  CARGAR  » devuelve 0, escribe la pregunta de RF-3 con [n] y fechas como «27/10/2026» y después «Ventas de demostración cargadas: [n] ventas del … al …» con el mismo [n]; que con «cargar», «sí», vacío y entrada cerrada devuelve 1, escribe «Carga cancelada. No se cambió nada» y la base queda sin ventas; que cada rechazo de RF-2 escribe su mensaje sin preguntar; que sin `DATABASE_URL`, con una inválida, con un error que contiene la dirección de la base y con un `DemoSalesGenerationError` escribe solo el mensaje de RF-10, sin la dirección y sin cambiar la base; que no pide cuenta ni sesión; y que siempre cierra la base que abrió; y `npm run build` incluye `dist/modules/sales/demo-sales.cli.js`.
- [x] **T010 [integración] [US1]** Añadir a `apps/api/test/e2e-server.ts` la ruta `POST /api/__test/demo-sales`, que vacía ventas y menú como `POST /api/__test/menu`, llama a `loadOfficialMenuFixture` y a `loadDemoSales` con `now` del reloj falso y una semilla fija, y escribir `e2e/ventas-demo-us1-cargar.spec.ts` (plan §8.2, D-9; RF-8, RF-9). Depende de: T009
  Hecho cuando: la E2E, con el reloj falso en el 28/10/2026 a las 11:00, comprueba con una sesión de dueño que «Historial de ventas» muestra el 28/10/2026 sin ventas; que «Día anterior» muestra el 27/10/2026 con 30 a 80 ventas, horas entre 07:30 y 20:29, «Efectivo» y «QR» y cuentas de dueño y cajero; que el detalle de una venta muestra líneas del menú oficial con su categoría y precio; que «Ver por mes» en septiembre de 2026 muestra 30 filas con al menos una «Bs 0,00 · 0 ventas»; y, con una sesión de cajero, que «Nueva venta» registra una venta con el número siguiente al de la última venta de demostración; y `npm run test:e2e` pasa completo.

## Fase 4 — Pulido

Rama: `feat/007-ventas-demo-pulido`.

- [x] **T011 [integración]** Añadir a «Comandos» de `AGENTS.md` la fila «Cargar ventas de demostración en una base con el menú oficial» con `npm run load:demo-sales -w @kofi/api` y una nota propia (plan §9). Depende de: T010
  Hecho cuando: la fila está en la tabla y su nota explica que la ejecuta a mano la persona que prepara el sistema, que lee la base de `DATABASE_URL`, que solo carga en una base con el menú oficial completo y activo y sin ventas, que pide escribir «CARGAR» y que las ventas cargadas no se pueden borrar; y `npm run format:check` pasa.
- [ ] **T012 [integración]** Comprobar el comando contra PostgreSQL real en dos bases de Neon de comprobación con el menú oficial y sin ventas: en la primera, la persona lo ejecuta desde su computadora, responde «CARGAR», cronometra la carga, lo repite para ver el rechazo y revisa el Historial; en la segunda, lanza dos cargas a la vez y responde «CARGAR» en las dos. Anotar los resultados en el PR de pulido (plan §8.3; RNF-3, RF-2, RF-10). Requiere a una persona con acceso a Neon. Depende de: T011
  Hecho cuando: el PR de pulido registra que, en la primera base, la carga terminó en menos de 3 minutos después de «CARGAR» con el mensaje de RF-3, la segunda ejecución escribió el mensaje de base con ventas sin cambios y el Historial mostró ventas del día anterior y un mes completo; y que, en la segunda base, una carga escribió el mensaje de carga y la otra el de base con ventas, con un solo juego de ventas en la base.

## Cobertura

| RF / RNF | Tareas |
| --- | --- |
| RF-1 | T003, T007, T009 |
| RF-2 | T007, T009, T012 |
| RF-3 | T008, T009 |
| RF-4 | T003, T004, T006 |
| RF-5 | T004, T006, T008 |
| RF-6 | T005, T006 |
| RF-7 | T005, T006, T008 |
| RF-8 | T005, T006, T008, T010 |
| RF-9 | T008, T010 |
| RF-10 | T008, T009, T012 |
| RNF-1 | T009 |
| RNF-2 | T006, T008 |
| RNF-3 | T012 |
| RNF-4 | T003 |

## Cambios tras el análisis de consistencia

La persona pidió corregir los tres hallazgos menores (2026-10-28; plan §11). T006 añade la prueba de 1000 semillas sin agotar los intentos, y T009 la del mensaje de RF-10 ante un `DemoSalesGenerationError` (D-11). Los demás cambios son del plan.
