# Plan — SPEC-004 Dashboard

Estado: aprobado (modo delegado) · Fecha: 2026-10-24 · Especificación: [`spec.md`](spec.md)

Añade el módulo `dashboard` a las dos aplicaciones y al contrato, sobre el monorepo, las herramientas y las decisiones globales de [SPEC-001](../001-acceso/plan.md), [SPEC-002](../002-menu/plan.md) y [SPEC-003](../003-ventas/plan.md). No crea tablas, paquetes ni cambia el despliegue.

**Dependencias de SPEC-001, SPEC-002 y SPEC-003.**

- De **SPEC-001** usa `requireSession`, `createAuthService` y la sesión de la interfaz (`SessionProvider`, `RequireSession`, `AuthenticatedLayout`). Todo eso **ya está en `develop`** (#15 y #17).
- De **SPEC-002** usa `compareMenuNames` del contrato (ya en `develop`, #12) y, en las historias, piezas de su historia 1 que **todavía no están en `develop`**: la pantalla inicial que muestra los enlaces `homeLink` (002 T018) y la ruta de pruebas `POST /api/__test/menu` (002 T023).
- De **SPEC-003** usa `saleSchema`, `PAYMENT_METHODS` y `formatDateTime` del contrato (ya en `develop`, #19) y `listRegisteredSales(db, { from?, to? })` (plan de 003, §6.3). La función está en `apps/api/src/modules/sales/sales.repository.ts`, pero su exportación desde `modules/sales/index.ts` es de la historia 1 de Ventas (003 T015), y el registro de ventas por la API (`POST /api/sales`, `salesPlugin` en `app.ts`) llega con 003 T015 y T020. Nada de eso está en `develop`.

Por eso:

- La Preparación y la Base común de este plan **no dependen** de las historias de 002 ni de 003: contrato, calendario de Bolivia en la API, cliente de la interfaz, cliente simulado y ruta provisional. El servicio del Dashboard recibe las ventas registradas como una función inyectada (D-1, como SPEC-003 D-1), que las pruebas reemplazan por una falsa.
- Las historias del Dashboard empiezan cuando se fusionen el PR de definición de 004 **y** la historia 1 de Ventas (`feat/003-ventas-us1`), que a su vez necesita `feat/002-menu-us1`. Dentro de cada historia, solo las tareas `[integración]` usan esas piezas; las demás trabajan con ventas falsas o con el cliente simulado. Las tareas que las usan lo indican como «SPEC-003 T0NN» o «SPEC-002 T0NN».
- Las dos dudas de `spec.md` quedaron respondidas el 2026-10-24: la jornada es el día calendario de Bolivia (D-10) y el cajero ve el resumen de hoy, pero no el del mes (D-6). Los cambios están en §12.

## 1. Versión de la constitución

Se planifica con la **versión 2.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-24).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: se usan las de SPEC-001 (§7.1 de su plan). Los días y los meses de Bolivia se calculan con `Intl.DateTimeFormat`, que viene con Node 24 y los navegadores (D-4). Sin bibliotecas de gráficos: la especificación deja los gráficos fuera. |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF (§3 a §8), y entre todas cubren RF-1 a RF-10 (tabla de cobertura, §8.5). |
| 3. Lógica separada de la interfaz | Sí | Totales, números de ventas, venta promedio, importes por medio de pago, productos más vendidos, ventas por día, el día y el mes en curso y el momento de los datos los calcula la API (`dashboard.summary.ts`, `dashboard.service.ts`, `shared/calendar.ts`). La interfaz los muestra con `formatPrice`, `formatDate`, `formatMonth` y `formatDateTime` del contrato, que no calculan nada (D-3). El cliente simulado de `dev/` devuelve resúmenes fijos ya calculados, sin hacer cuentas, y no llega al build (D-8). El contrato vive en `packages/contracts/src/dashboard.ts`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.5), que se escribe antes del código de su tarea. |
| 5. Persistencia segura | Sí | El Dashboard solo lee: no escribe en la base ni crea tablas. Lee las ventas con `listRegisteredSales` del módulo `sales`, que usa la capa `shared/database` (D-1). Esta especificación no añade secretos. |
| 6. Idioma | Sí | Código e identificadores en inglés (`dashboard`, `totalCents`, `salesCount`, `averageTicketCents`, `topProducts`). Los textos para la persona están en español. Importes en bolivianos (centavos enteros, `docs/architecture.md` §6.7) y días, meses y horas en hora de Bolivia (`shared/calendar.ts`, `formatDate`, `formatMonth`, `formatDateTime`). |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
packages/contracts/src/
├── index.ts                     exporta también dashboard.ts
├── datetime.ts                  formatDate y formatMonth (D-5)
└── dashboard.ts                 contrato del módulo (§6)
apps/api/src/
├── app.ts                       registra dashboardPlugin con listRegisteredSales de ventas (US1)
├── shared/
│   └── calendar.ts              días y meses de Bolivia: fecha de un instante, rangos (D-4)  RF-2, RF-9, RF-10
└── modules/dashboard/
    ├── index.ts                 superficie pública: dashboardPlugin
    ├── dashboard.routes.ts      GET /api/dashboard/today y /month, requireSession y rol    RF-1, RF-9
    ├── dashboard.service.ts     período, ventas del período y momento de los datos         RF-2, RF-6, RF-8, RF-9
    └── dashboard.summary.ts     totales, promedio, medios de pago, productos, días (puras)  RF-3–RF-5, RF-10
apps/api/test/
└── test-sales.ts                ventas de prueba que cumplen saleSchema, fuera del build (§8.4)
apps/web/src/
├── main.tsx                     provee el cliente del dashboard; con ?escenarios=dashboard, el simulado
├── scenarios.ts                 lee también ?escenarios=dashboard
├── routes.tsx                   /resumen («Resumen de ventas», los dos roles)
└── modules/dashboard/
    ├── index.ts                 superficie pública: DashboardPage, cliente y proveedor
    ├── api/
    │   ├── dashboard-client.ts          interfaz DashboardClient y cliente HTTP real
    │   └── DashboardClientProvider.tsx  cliente en uso (real o simulado) por contexto
    ├── state/
    │   └── useDashboardSummaries.ts     carga, «Actualizar», «Cargando…», sin conexión, 403  RF-1, RF-6, RF-7, RF-9
    ├── components/
    │   ├── counts.ts                    «1 venta», «2 ventas», «1 unidad», «3 unidades»
    │   ├── PeriodSummaryView.tsx        totales, medios de pago y productos más vendidos     RF-3–RF-5
    │   ├── TodaySummarySection.tsx      «Hoy · 24/10/2026» y «Datos al …»                    RF-2, RF-6
    │   ├── MonthSummarySection.tsx      «Octubre de 2026» y «Datos al …»                     RF-9
    │   └── DailySalesTable.tsx          ventas por día                                       RF-10
    ├── pages/
    │   └── DashboardPage.tsx            /resumen: resúmenes, «Actualizar», avisos            RF-1, RF-6, RF-7
    └── dev/
        ├── fixtures.ts
        ├── dashboard-demo-client.ts
        └── ScenarioPicker.tsx
e2e/
├── dashboard-us1-resumen-hoy.spec.ts
└── dashboard-us2-resumen-mes.spec.ts
apps/api/src/modules/sales/
└── sales-seed.cli.ts            Pulido: carga 6000 ventas del mes en una base de comprobación (D-11)
```

- Todas las rutas del módulo quedan bajo `/api/dashboard` (`docs/architecture.md` §6.1) y son de solo lectura (`GET`).
- `apps/api/src/modules/dashboard` tiene un archivo por capa (`routes`, `service`, `summary`), así que no lleva subcarpetas (`docs/architecture.md` §4.3).
- `dashboard` no importa nada interno de `sales`: en la API recibe `listRegisteredSales` desde `app.ts`, que lo importa de `modules/sales/index.ts` (D-1); en la interfaz no usa el módulo `sales`.
- `shared/calendar.ts` va en `shared/` y no en el módulo, porque el Historial (005) también necesitará los días y los meses de Bolivia (D-4).

## 4. Modelo de datos

**Sin tablas ni migraciones nuevas.** El Dashboard lee las ventas registradas de SPEC-003 (`sales` y `sale_lines`, plan de 003 §4) a través de `listRegisteredSales`, que las entrega con el formato de `saleSchema`. El índice sobre `sales.registered_at` que creó 003 sirve a sus consultas por rango.

Ejemplo de entrada (ventas de `listRegisteredSales` para el 24/10/2026 en Bolivia, de 04:00 UTC del 24 a 04:00 UTC del 25):

```text
number  registeredAt (UTC)         totalCents  paymentMethod  lines
1       2026-10-24T13:15:00.000Z   2500        cash           Café americano ×2 (c4e1…) 1250 → 2500
2       2026-10-24T14:30:00.000Z   2050        qr             Empanada ×1 (a3f0…) 800 → 800; Café americano ×1 (c4e1…) 1250 → 1250
```

Resumen que calcula la API:

```text
date 2026-10-24 · totalCents 4550 · salesCount 2 · averageTicketCents 2275
byPaymentMethod  cash 2500 (1) · qr 2050 (1)
topProducts      Café americano 3 u. 3750 · Empanada 1 u. 800
```

## 5. Algoritmos relevantes

### 5.1 Días y meses de Bolivia (`shared/calendar.ts`; RF-2, RF-6, RF-9, RF-10; D-4)

```text
boliviaDate(instant):                       # 'YYYY-MM-DD' del instante en America/La_Paz
  Intl.DateTimeFormat('en-CA', { timeZone: BOLIVIA_TIME_ZONE, year, month, day }).format(instant)

startOfBoliviaDay(date):                    # instante de las 00:00 de esa fecha en Bolivia
  offset ← desfase de America/La_Paz a las 12:00 UTC de esa fecha       # Intl, timeZoneName 'longOffset' → «GMT-04:00»
  return new Date(`${date}T00:00:00${offset}`)

boliviaDayRange(now):
  date ← boliviaDate(now)
  return { date, from: startOfBoliviaDay(date), to: now + 1 ms }       # hasta el momento de la consulta

boliviaMonthRange(now):
  date ← boliviaDate(now);  month ← date[0..7]
  days ← [`${month}-01`, …, date]                                       # del día 1 a hoy
  return { month, days, from: startOfBoliviaDay(`${month}-01`), to: now + 1 ms }
```

- `to` es `now + 1 ms` porque `listRegisteredSales` excluye `to`: así entran todas las ventas hasta el instante de la consulta, que es el «momento de los datos» (RF-6), y ninguna posterior.
- El desfase se obtiene con `Intl` y no se escribe fijo: Bolivia hoy no cambia de hora (`docs/business-rules.md`), pero así la regla no depende de esa suposición. Con Node 24, `Intl` lleva la base de zonas horarias completa.
- La hora sale solo de `clock.ts` (`docs/architecture.md` §6.4), nunca de la computadora que consulta (RF-6).

### 5.2 Resumen de un período (`dashboard.summary.ts`; RF-3 a RF-5, RF-8, RNF-2)

Funciones puras sobre las ventas tal como se registraron (`Sale[]`):

```text
summarizeSales(sales):
  totalCents ← Σ sale.totalCents;  salesCount ← |sales|
  averageTicketCents ← salesCount = 0 ? null : roundHalfUp(totalCents, salesCount)
  byPaymentMethod ← para method en PAYMENT_METHODS (cash, qr):
                      { paymentMethod, totalCents: Σ de las ventas con method, salesCount: cuántas }
  topProducts ← topProducts(sales)
  return { totalCents, salesCount, averageTicketCents, byPaymentMethod, topProducts }

roundHalfUp(total, count):                  # al centavo más cercano, medio centavo hacia arriba; enteros
  floor((2 × total + count) / (2 × count))  # 4550/3 → 1517; 75/2 → 38

topProducts(sales):
  por productId: quantity ← Σ line.quantity; totalCents ← Σ line.subtotalCents
                 productName ← el de la línea de la venta con mayor number (la más reciente)
  ordenar: quantity desc, totalCents desc, compareMenuNames(productName) asc, productId asc
  return los 5 primeros (DASHBOARD_TOP_PRODUCTS)
```

- Todo es aritmética de enteros: ninguna suma pierde centavos (RNF-2). La única división es la del promedio, con su regla de redondeo.
- Se agrupa por `productId`, no por nombre: un producto renombrado cuenta una vez, y dos productos con el mismo nombre visible siguen separados (RF-5). El último criterio, `productId`, solo hace estable el orden cuando dos productos distintos tienen el mismo nombre.
- Como cada venta tiene un solo medio de pago, las sumas por medio de pago suman el total y el número de ventas (RF-4).

### 5.3 Ventas por día (`dashboard.summary.ts`; RF-10)

```text
salesByDay(sales, days):                    # days: del día 1 a hoy (boliviaMonthRange)
  por día d de days: { date: d, totalCents: Σ de las ventas con boliviaDate(registeredAt) = d, salesCount }
  return en el orden de days                # del más antiguo al más reciente; los días sin ventas en 0
```

Cada venta del mes cae en exactamente un día de `days`, así que las filas suman el total y el número de ventas del mes.

### 5.4 Servicio y rutas (RF-1, RF-2, RF-6, RF-8, RF-9)

```text
GET /api/dashboard/today:                   # US1, dueño y cajero
  requireSession (SPEC-001)
  now ← clock.now();  { date, from, to } ← boliviaDayRange(now)
  sales ← listSales(db, { from, to })       # listRegisteredSales de ventas, inyectada (D-1)
  return 200 { date, asOf: now, ...summarizeSales(sales) }

GET /api/dashboard/month:                   # US2, solo DASHBOARD_MONTH_ROLES
  requireSession (SPEC-001); si sessionUser.role ∉ DASHBOARD_MONTH_ROLES → 403 FORBIDDEN «No tienes permiso para ver el resumen del mes»
  now ← clock.now();  { month, days, from, to } ← boliviaMonthRange(now)
  sales ← listSales(db, { from, to })
  return 200 { month, asOf: now, ...summarizeSales(sales), days: salesByDay(sales, days) }
```

- Las rutas solo leen: no modifican ninguna venta (RF-8).
- Una ruta por resumen, para que cada historia se integre y se pruebe sola (D-2).

### 5.5 Pantalla en la interfaz (RF-1, RF-6, RF-7, RF-9)

```text
estado: { today: TodaySummary | null, month: MonthSummary | null, loading, error: mensaje | null, monthError: mensaje 403 | null }

abrir DashboardPage, recargar o «Actualizar»:
  withMonth ← sessionUser.role ∈ DASHBOARD_MONTH_ROLES           # el cajero no pide el mes (RF-9)
  loading ← true                            # «Cargando…», «Actualizar» deshabilitado; los resúmenes anteriores siguen visibles
  [today, month] ← en paralelo client.today() y, si withMonth, client.month()     # month llega con US2
  ok              → today, month ← respuestas; error ← null
  NETWORK_ERROR o 500 → error ← mensaje de ApiFetchError; se conservan today y month               # RF-7
  403 FORBIDDEN en month → monthError ← mensaje de la API; month ← null; today se muestra             # RF-9
  401             → lo maneja SessionProvider (SPEC-001)
  loading ← false
```

- Cada sección muestra su título (`formatDate(date)` con «Hoy · …», `formatMonth(month)`), los datos de `PeriodSummaryView` y «Datos al» con `formatDateTime(asOf)` (RF-6).
- `PeriodSummaryView` recibe el resumen y lo muestra tal como llega: importes con `formatPrice`, «—» si `averageTicketCents` es `null`, los dos medios de pago con `formatPaymentMethod` y los productos más vendidos, o el aviso del período sin ventas que le pasa su sección (RF-3 a RF-5, RF-9). Usa `productId` como clave de cada producto (RF-5).
- `counts.ts` elige singular o plural («1 venta», «3 unidades»): es texto, no una cifra.
- No hay actualización automática (RF-6).

## 6. Contrato de la API

Ubicación: **`packages/contracts/src/dashboard.ts`** (constantes, esquemas de Zod y tipos) y **`packages/contracts/src/datetime.ts`** (`formatDate`, `formatMonth`). Es la única fuente del contrato: la API valida sus respuestas en las pruebas con estos esquemas y la interfaz los usa para tipar y validar su cliente y su cliente simulado.

### 6.1 Constantes, funciones y tipos

| Nombre | Valor / forma | RF |
| --- | --- | --- |
| `DASHBOARD_MONTH_ROLES` | `['owner']`: los roles que pueden ver el resumen del mes (D-6). El de hoy lo ven los dos roles | RF-9 |
| `DASHBOARD_MESSAGES` | `forbiddenMonth` «No tienes permiso para ver el resumen del mes», `emptyToday` «Todavía no hay ventas hoy», `emptyMonth` «Todavía no hay ventas este mes» | RF-5, RF-9 |
| `DASHBOARD_TOP_PRODUCTS` | `5` | RF-5 |
| `formatDate` | `'2026-10-24'` → «24/10/2026» (solo reordena el texto, sin zona horaria) | RF-2, RF-10 |
| `formatMonth` | `'2026-10'` → «Octubre de 2026» | RF-9 |
| `boliviaDateSchema` | texto `YYYY-MM-DD` válido (`z.iso.date()`) | RF-2, RF-10 |
| `boliviaMonthSchema` | texto `YYYY-MM`, mes de `01` a `12` | RF-9 |
| `paymentMethodTotalSchema` | `{ paymentMethod: PaymentMethod, totalCents: int ≥ 0, salesCount: int ≥ 0 }` | RF-4 |
| `topProductSchema` | `{ productId: uuid, productName: string, quantity: int ≥ 1, totalCents: int ≥ 1 }` | RF-5 |
| `periodSummarySchema` | `{ asOf: string ISO 8601 con zona, totalCents: int ≥ 0, salesCount: int ≥ 0, averageTicketCents: int ≥ 0 \| null, byPaymentMethod: [cash, qr] (tupla, en ese orden), topProducts: TopProduct[] (≤ 5) }`; `averageTicketCents` es `null` si y solo si `salesCount` es 0 | RF-3–RF-6 |
| `todaySummarySchema` | `periodSummarySchema` más `{ date: boliviaDate }` | RF-2–RF-6 |
| `dayTotalSchema` | `{ date: boliviaDate, totalCents: int ≥ 0, salesCount: int ≥ 0 }` | RF-10 |
| `monthSummarySchema` | `periodSummarySchema` más `{ month: boliviaMonth, days: DayTotal[] (1–31) }` | RF-9, RF-10 |

### 6.2 Rutas

Las dos usan `requireSession` (SPEC-001) y pueden responder sus tres `401` (`SESSION_MISSING`, `SESSION_EXPIRED`, `SESSION_TERMINATED`). El resumen de hoy lo pueden pedir el dueño y el cajero. El del mes, solo los roles de `DASHBOARD_MONTH_ROLES`; a los demás responde **`403 FORBIDDEN`** con `DASHBOARD_MESSAGES.forbiddenMonth` (`docs/architecture.md` §6.2).

| Ruta | Historia | Respuesta correcta | Errores propios | RF |
| --- | --- | --- | --- | --- |
| `GET /api/dashboard/today` | US1 | `200 todaySummarySchema` | — | RF-1–RF-8 |
| `GET /api/dashboard/month` | US2 | `200 monthSummarySchema` | `403 FORBIDDEN` (cajero) | RF-3–RF-10 |

Ejemplos (con el reloj en 2026-10-24 11:00 de Bolivia):

```json
GET /api/dashboard/today
200 { "date": "2026-10-24", "asOf": "2026-10-24T15:00:00.000Z",
      "totalCents": 4550, "salesCount": 2, "averageTicketCents": 2275,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 2500, "salesCount": 1 },
                           { "paymentMethod": "qr", "totalCents": 2050, "salesCount": 1 } ],
      "topProducts": [ { "productId": "c4e1…-07", "productName": "Café americano", "quantity": 3, "totalCents": 3750 },
                       { "productId": "a3f0…-5d", "productName": "Empanada", "quantity": 1, "totalCents": 800 } ] }

GET /api/dashboard/today          (sin ventas hoy)
200 { "date": "2026-10-24", "asOf": "2026-10-24T15:00:00.000Z",
      "totalCents": 0, "salesCount": 0, "averageTicketCents": null,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 0, "salesCount": 0 },
                           { "paymentMethod": "qr", "totalCents": 0, "salesCount": 0 } ],
      "topProducts": [] }

GET /api/dashboard/month
200 { "month": "2026-10", "asOf": "2026-10-24T15:00:00.000Z",
      "totalCents": 4550, "salesCount": 3, "averageTicketCents": 1517,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 2050, "salesCount": 2 },
                           { "paymentMethod": "qr", "totalCents": 2500, "salesCount": 1 } ],
      "topProducts": [ … ],
      "days": [ { "date": "2026-10-01", "totalCents": 800, "salesCount": 1 },
                { "date": "2026-10-02", "totalCents": 0, "salesCount": 0 },
                …
                { "date": "2026-10-24", "totalCents": 1250, "salesCount": 1 } ] }

GET /api/dashboard/month          (sesión de cajero)
403 { "error": { "code": "FORBIDDEN", "message": "No tienes permiso para ver el resumen del mes" } }
```

### 6.3 Errores sin esquema propio

- **Sin conexión (RF-7):** como en SPEC-001, `api-fetch.ts` convierte el error de red en `NETWORK_ERROR`, y la pantalla muestra `NETWORK_ERROR_MESSAGE`, «No hay conexión. Inténtalo de nuevo».
- **Error inesperado (RF-7):** `500 INTERNAL_ERROR`, como en SPEC-001; `api-fetch.ts` lo entrega con «Ocurrió un error. Inténtalo de nuevo», y la pantalla muestra ese mensaje y conserva los resúmenes anteriores, igual que sin conexión.

## 7. Decisiones técnicas

Todas son **decisiones delegadas** (modo delegado, `AGENTS.md`): quedan aprobadas al fusionar el PR de definición.

| # | Decisión | Por qué | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **Las ventas registradas llegan al Dashboard como una función inyectada:** `dashboardPlugin` y el servicio reciben `listSales: (db: Database, range: { from?: Date; to?: Date }) => Promise<Sale[]>`, y `app.ts` les pasa `listRegisteredSales` de `modules/sales/index.ts` (SPEC-003 §6.3, T015). Las pruebas pasan una función falsa con ventas de `apps/api/test/test-sales.ts` | La exportación es de la historia 1 de Ventas y aún no está en `develop`; así la Base común y la API de las historias se prueban sin ella, y `dashboard` no conoce las tablas de ventas (`docs/architecture.md` §4.2, SPEC-003 D-1) | Leer `sales` y `sale_lines` con SQL desde `dashboard`: rompería la frontera entre módulos y duplicaría cómo se lee una venta. Esperar a 003 US1 para empezar la Base común: frena 004 sin motivo | RF-2, RF-8, RF-9 |
| D-2 | **Una ruta por resumen:** `GET /api/dashboard/today` (US1) y `GET /api/dashboard/month` (US2), cada una con su `asOf` | Cada historia se integra y se prueba completa sin la otra, y el contrato de las dos se escribe entero en la Base común sin que US1 tenga que calcular el mes. La interfaz las pide en paralelo | Una sola ruta con hoy y el mes: US1 tendría que entregar también el mes, o el contrato cambiaría en US2 | RF-2, RF-6, RF-9 |
| D-3 | **La API calcula todo el resumen en memoria** a partir de `listRegisteredSales` del período: sumas, promedio, medios de pago, productos y días (`dashboard.summary.ts`, funciones puras) | Cumple el principio 3 y la frontera entre módulos con lo que Ventas ya entrega. Con hasta 6000 ventas al mes (RNF-3) son unas decenas de miles de líneas, que se suman en milisegundos; el costo está en leerlas, y se mide en Pulido (D-11). Las funciones puras se prueban sin base | Agregar con SQL (`SUM`, `GROUP BY`) en una función nueva de `sales`: más rápido con muchos datos, pero cambia el módulo de 003 y reparte la regla del resumen entre dos módulos. Queda como plan B si la medición de Pulido no cumple RNF-3 | RF-3–RF-5, RF-8, RF-10, RNF-2, RNF-3 |
| D-4 | **`shared/calendar.ts` en la API** calcula la fecha de Bolivia de un instante y los rangos del día y del mes con `Intl` (desfase de `America/La_Paz` con `timeZoneName: 'longOffset'`), a partir de `clock.now()` | Los límites de día y mes son una regla de negocio y van en la API (principio 3); no dependen de la zona de la computadora (RF-6) ni de la zona horaria de PostgreSQL. Va en `shared/` porque el Historial (005) los necesitará | Calcular el día en la interfaz con la hora de la computadora: contradice RF-6. `AT TIME ZONE 'America/La_Paz'` en SQL: no se puede usar sin SQL propio del Dashboard (D-1) y PGlite y Neon deben tener la misma base de zonas. Un desfase fijo `-04:00`: depende de que Bolivia nunca cambie de hora | RF-2, RF-6, RF-9, RF-10 |
| D-5 | **`formatDate` y `formatMonth` en el contrato**, junto a `formatDateTime`: reordenan el texto `YYYY-MM-DD` («24/10/2026») y nombran el mes («Octubre de 2026»), sin zona horaria | Las fechas y los meses ya llegan calculados en Bolivia por la API; formatear no es calcular. Una sola forma de mostrarlos para Dashboard e Historial, como `formatPrice` y `formatDateTime` | `Intl.DateTimeFormat` con `month: 'long'` en la interfaz: el texto depende del navegador («octubre de 2026», «oct. 2026») | RF-2, RF-9, RF-10 |
| D-6 | **`DASHBOARD_MONTH_ROLES` en el contrato** (`['owner']`), usado por la API para rechazar el mes con `403` y por la interfaz para no pedirlo ni mostrar su sección; el resumen de hoy no tiene restricción de rol | Respuesta de la persona a la duda 2 de `spec.md`: el cajero ve el resumen de hoy para cerrar su caja, y el del mes es del dueño. Una sola lista para la API y la interfaz, que no pueden quedar distintas. Los permisos reales los sigue aplicando la API (`docs/architecture.md` §6.6) | Escribir `['owner']` en la interfaz y en la API por separado, como en SPEC-002: dos lugares que pueden quedar distintos. Una ruta propia para el mes en la interfaz: obligaría a ir y volver para ver las dos cifras | RF-1, RF-9 |
| D-7 | **El rechazo por rol se muestra en la propia pantalla:** `DashboardPage` no pide el mes con una sesión de cajero; si aun así recibe un `403` del mes (por ejemplo, porque cambió el rol de la cuenta), muestra el mensaje de la API en lugar de esa sección, sin cifras del mes, y mantiene el resumen de hoy | Cumple `docs/architecture.md` §6.2 (la interfaz muestra el mensaje del módulo) sin depender del aviso de la pantalla inicial de SPEC-002 (D-9 de ese plan) | Volver a `/` con el aviso, como `MenuAdminPage`: el cajero perdería también el resumen de hoy | RF-9 |
| D-8 | **`DashboardClientProvider` y escenarios de desarrollo:** como en SPEC-002 (D-10, D-11) y SPEC-003 (D-10), la interfaz obtiene el cliente de un contexto; `main.tsx` provee el real, también en desarrollo, y el simulado con su selector solo con `?escenarios=dashboard`, combinable (`?escenarios=acceso,dashboard`). El cliente simulado devuelve **resúmenes fijos ya calculados** (`fixtures.ts`), validados con el contrato, y pone en `asOf` la hora de cada pedido; escenarios «Con ventas», «Sin ventas», «Sin conexión», «Con error» (`500 INTERNAL_ERROR` con «Ocurrió un error. Inténtalo de nuevo», como la API), «Sin permiso» (`403 FORBIDDEN` con `forbiddenMonth` solo en el mes) y «Lento» (responde a los 1,5 s, para ver «Cargando…») | Permite trabajar la interfaz sin la API (`docs/architecture.md` §4.5) y recorrer todos los estados de RF-1, RF-5 a RF-7. Sin cuentas en la interfaz, ni siquiera en `dev/` (principio 3) | Calcular los resúmenes en el cliente simulado a partir de ventas falsas: duplicaría la lógica de la API | RF-1–RF-10 |
| D-9 | **Ruta `/resumen`** con `homeLink: 'Resumen de ventas'` y los dos roles (los de por defecto) | Sigue `docs/architecture.md` §6.6 con el nombre que ve la persona; `/ventas` queda para el Historial (SPEC-003 D-11) | `/dashboard`: un nombre en inglés en la barra de direcciones | RF-1 |
| D-10 | **La jornada es el día calendario de Bolivia**, de 00:00 a 23:59, y toda la regla vive en `boliviaDayRange` y `boliviaDate` | Respuesta de la persona a la duda 1 de `spec.md`: Kofi cierra antes de la medianoche (`docs/business-rules.md`). Si algún día la jornada pasara de la medianoche, cambiarían solo esas dos funciones y sus pruebas (con una hora de corte), no el resumen ni el contrato | Una hora de corte configurable: no hace falta con la respuesta de la persona | RF-2, RF-10 |
| D-11 | **Medición de RNF-3** en un despliegue de comprobación con 6000 ventas del mes en curso cargadas por un script de desarrollo del módulo `sales` (`sales-seed.cli.ts`, `npm run seed:sales -w @kofi/api`, que usa `nextSaleNumber` e `insertSale` con fechas del mes y nunca corre en producción), con los 200 productos de `seed:menu` (SPEC-002 T034) | RNF-3 fija el volumen; las ventas solo se pueden crear con fechas pasadas desde dentro del módulo `sales`, que es el dueño de esas tablas | Registrar 6000 ventas por `POST /api/sales`: todas quedarían con la hora actual, sin días distintos en el mes. Medir con PGlite en las pruebas: no representa a Neon | RNF-3 |

### 7.1 Dependencias

**Decisión delegada de T032 (2026-10-26):** conservar íntegro el primer informe de la medición y registrar por separado la aceptación expresa del exceso manual de §8 de la especificación. RNF-3 no se flexibiliza. En las muestras del cajero aparecieron demoras repetidas de varios segundos compatibles con una pérdida de primer plano; es una hipótesis, porque el primer informe no registraba el foco. Se añade control del foco y la visibilidad antes y durante cada muestra, trayendo la página al frente fuera del intervalo cronometrado y rechazando la serie si pierde el foco. Motivo: medir el uso visible de la pantalla y evitar atribuir a la API una espera de pintado de una ventana oculta. Alternativa descartada: borrar muestras lentas, ajustar duraciones o darlas por válidas sin comprobar el entorno. Solo se repiten las series automáticas del cajero; las cifras originales y los recorridos humanos se conservan en su evidencia, sin automatizarlos ni repetirlos para forzar un aprobado.

El archivo generado `evidence/measurement-attempt-1.json` se excluye de Prettier de forma específica para conservar exactamente los bytes del informe original; no se excluye ningún código ni otra evidencia. Motivo: trazabilidad del primer intento y de sus muestras. Alternativa descartada: reformatear el original, que cambiaría su huella aunque los valores siguieran siendo equivalentes.

**Decisión delegada de T031 (2026-10-26):** al comprobar el intento de medición se detectó que la API exponía Dashboard, pero el bundle público de la web no contenía sus secciones de hoy y del mes. El Blueprint todavía configuraba la rama anterior de Ventas. Se corrigen ambas ramas de `render.yaml` a la de Pulido de Dashboard y el medidor comprueba el bundle público antes de abrir Chromium, sin sesión ni credenciales. Motivo: evitar pedir otro ingreso cuando web y API no corresponden a la historia desplegada. Alternativa descartada: repetir el recorrido o atribuir el fallo al usuario. No hay informe válido de ese intento y T022 sigue pendiente.

**Decisión delegada de T030 (2026-10-26):** añadir `npm run measure:dashboard`, sin dependencias nuevas, siguiendo los medidores de las especificaciones anteriores. Abre Chromium visible para el ingreso manual de cada rol, mide veinte aperturas y veinte actualizaciones por rol tras un calentamiento excluido y guarda todas las muestras sin credenciales en la carpeta Git. Comprueba el volumen real del menú (al menos 200) y 6000 ventas del mes desde la sesión de dueño. Los recorridos de 10 segundos los hace la persona: inicia el cronómetro desde el inicio y confirma manualmente que ha identificado el total de hoy. No se automatiza su navegación ni su confirmación. Motivo: producir evidencia reproducible de T022 con la computadora del local. Alternativa descartada: medir solo peticiones HTTP o simular la lectura humana, que no acreditan los criterios de finalización. Los SHA desplegados se documentan por separado del SHA local del medidor.

**Decisión delegada de T029 (2026-10-26):** tras observar la latencia de la preparación sobre Neon, `--complete` reserva un bloque correlativo de números bajo el bloqueo ya adquirido y envía lotes de 250 ventas con JSON parametrizado a la capa de datos de Ventas. Los lotes pertenecen a una sola transacción y los disparadores existentes siguen validando líneas e importes. El modo estricto y el registro normal no cambian. Motivo: reducir viajes de red durante la preparación de RNF-3. Alternativa descartada: confirmar cada lote, porque una interrupción dejaría una carga parcial. La primera transacción lenta se interrumpió antes del commit y se comprobó que la base conservaba sus 44 ventas y 202 productos.

**Decisión delegada de T021 (2026-10-26):** la carga de comprobación requiere una base sin ventas, exactamente 200 productos vigentes y una cuenta existente (prefiere cajero). En una sola transacción bloquea el contador, impide repetir o ejecutar dos cargas a la vez y genera 6000 ventas repartidas del día 1 a hoy, sin fechas futuras, alternando efectivo y QR y cantidades de 1 a 3. Motivo: reproducir el volumen de RNF-3 sin borrar ni duplicar datos y con importes calculados desde el menú de prueba. Alternativa descartada: añadir ventas a una base con datos previos, porque el volumen y los resultados dejarían de ser reproducibles. No cambia el contrato ni las reglas de ventas reales.

Ninguna nueva. Se usan las de [`specs/001-acceso/plan.md`](../001-acceso/plan.md#71-dependencias-por-paquete) §7.1.

**Corrección delegada para T022 (T028, 2026-10-26):** la persona indica «hazlo sobre esa misma» después de comprobar 202 productos vigentes y 44 ventas en su base configurada. Se conserva el modo inicial estricto y se añade `seed:sales -- --complete`: requiere al menos 200 productos vigentes, cuenta las ventas del mes hasta el momento de la carga y añade solo las necesarias para llegar a 6000. No modifica ni elimina productos, ventas ni cuentas existentes; con 6000 no escribe y con más de 6000 rechaza la carga. Usa el mismo bloqueo del contador y la misma transacción que el modo estricto. Motivo: preparar el volumen de RNF-3 en la base indicada expresamente por la persona. Alternativa descartada: borrar los datos o reducir el menú a 200, porque no hace falta para medir el Dashboard y perdería datos existentes. La evidencia de T022 registrará el volumen real de productos (202 en la inspección), sin afirmar que son exactamente 200. No cambia el contrato ni la lógica de las ventas reales.

## 8. Estrategia de tests

### 8.1 Niveles

Los de SPEC-001 a SPEC-003:

| Nivel | Herramienta | Qué cubre | Dónde |
| --- | --- | --- | --- |
| Unitario | Vitest | Esquemas del contrato, `formatDate` y `formatMonth`; `shared/calendar.ts`; `summarizeSales` y `salesByDay` | `packages/contracts/src/dashboard.test.ts`, `datetime.test.ts`; `apps/api/src/shared/calendar.test.ts`; `apps/api/src/modules/dashboard/dashboard.summary.test.ts` |
| Integración de la API | Vitest + `app.inject` + PGlite | Servicio y rutas con sesiones reales de SPEC-001, reloj falso y una función de ventas falsa; en la integración, con `listRegisteredSales` real | `*.integration.test.ts` en `apps/api/src/modules/dashboard/` |
| Componentes de la interfaz | Vitest + Testing Library + `dashboard-demo-client` | Secciones, totales, medios de pago, productos, días, carga, actualización, sin conexión y sin permiso | `*.test.tsx` junto a cada componente y `state/*.test.ts` |
| Punta a punta | Playwright contra `vite preview` y `e2e-server.ts` | Cada historia completa, con las cuentas de SPEC-001, el menú de la ruta de pruebas de SPEC-002 y ventas registradas con `POST /api/sales` de SPEC-003, moviendo el reloj de la API de pruebas | `e2e/` |

### 8.2 Punta a punta por historia

El reloj de la API de E2E empieza el 24/10/2026 a las 08:00 de Bolivia (`e2e-server.ts`) y solo avanza (`POST /api/__test/clock`); al avanzar más de 12 horas, la sesión vence y la prueba vuelve a ingresar.

**US1 — Ver el resumen de hoy** (`e2e/dashboard-us1-resumen-hoy.spec.ts`)

1. Con un menú cargado (Café americano Bs 12,50; Empanada Bs 8,00), el cajero registra el 24/10 una venta de un café en efectivo (Bs 12,50). Se avanza el reloj al 25/10 09:15 y el cajero registra «Café americano × 2» en efectivo; a las 10:30, «Empanada × 1» y «Café americano × 1» con QR (RF-2).
2. El cajero abre «Resumen de ventas» desde la pantalla inicial → ve «Hoy · 25/10/2026» con «Bs 45,50» y «2 ventas» (RF-1, RF-2).
3. A las 11:00, el dueño abre «Resumen de ventas» desde la pantalla inicial → «Hoy · 25/10/2026», «Bs 45,50», «2 ventas», «Bs 22,75», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», «Café americano · 3 unidades · Bs 37,50», «Empanada · 1 unidad · Bs 8,00» y «Datos al 25/10/2026 11:00»; la venta del 24/10 no cuenta (RF-1 a RF-6).
4. El cajero registra otra venta; el resumen no cambia hasta «Actualizar», y entonces la incluye (RF-6).
5. Se corta la red y se elige «Actualizar» → «No hay conexión. Inténtalo de nuevo» y siguen visibles las cifras anteriores (RF-7).
6. Se avanza el reloj al 26/10 y el dueño vuelve a entrar → «Hoy · 26/10/2026» con «Bs 0,00», «0 ventas», «—» y «Todavía no hay ventas hoy» (RF-3, RF-5, RF-6).

**US2 — Ver el resumen del mes en curso** (`e2e/dashboard-us2-resumen-mes.spec.ts`)

1. Con el menú cargado, el cajero registra el 24/10 una venta de Bs 8,00 en efectivo; se avanza el reloj al 26/10 y registra una de Bs 25,00 con QR y otra de Bs 12,50 en efectivo.
2. El dueño abre «Resumen de ventas» → «Octubre de 2026» con «Bs 45,50», «3 ventas», «Bs 15,17», «Efectivo: Bs 20,50 · 2 ventas», «QR: Bs 25,00 · 1 venta», sus productos más vendidos y una fila por día del 01/10/2026 al 26/10/2026: el 24/10 con «Bs 8,00 · 1 venta», el 26/10 con «Bs 37,50 · 2 ventas» y los demás con «Bs 0,00 · 0 ventas» (RF-9, RF-10).
3. El cajero abre «Resumen de ventas» → ve el resumen de hoy y no «Octubre de 2026»; `GET /api/dashboard/month` con su sesión responde `403` con «No tienes permiso para ver el resumen del mes» (RF-9).
4. Se avanza el reloj al 01/11/2026 y el dueño vuelve a entrar → «Noviembre de 2026» con «0 ventas», «Todavía no hay ventas este mes» y una sola fila, «01/11/2026 · Bs 0,00 · 0 ventas» (RF-9, RF-10).

Las ventas se registran por la interfaz de «Nueva venta» o con peticiones a `POST /api/sales` con la sesión del cajero, y el menú con la ruta de pruebas de SPEC-002 (`POST /api/__test/menu`, 002 T023).

### 8.3 Requisitos no funcionales

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Las pruebas de componentes y E2E comparan los textos en español tal como los define la especificación |
| RNF-2 | Unitarias de `summarizeSales` y `salesByDay`: sumas por medio de pago y por día iguales al total; 6000 ventas de 30 líneas de 99 unidades a Bs 1000,00 dan el total exacto (1 782 000 000 000 centavos, dentro de `Number.MAX_SAFE_INTEGER`); promedios 4550/3 → 1517 y 75/2 → 38 |
| RNF-3 | Medición manual en Pulido (D-11): con 6000 ventas en el mes y el servicio reactivado, 20 aperturas de «Resumen de ventas» y 20 «Actualizar»; al menos 19 de cada 20 por debajo de 2 s. El resultado se anota en el PR de pulido |
| RNF-4 | Componentes y E2E: se llega a «Resumen de ventas» y a «Actualizar» con Tab y se eligen con Intro |
| Criterio de 10 s | Medición manual en Pulido, junto con RNF-3. Se conserva el tiempo real; el exceso manual puede aceptarse expresamente según spec §8, sin flexibilizar RNF-3 |

### 8.4 Datos

- `apps/api/test/test-sales.ts`, junto a `test-database.ts` y fuera del build de producción (`tsconfig.build.json` solo incluye `src/`), construye ventas que cumplen `saleSchema` (número, `registeredAt`, líneas, total, medio de pago) para las pruebas del resumen y del servicio. Solo lo importan las pruebas.
- Las pruebas de `shared/calendar.ts` cubren los bordes: 23:59:59.999 y 00:00 de Bolivia (03:59:59.999Z y 04:00Z), el último día de un mes de 30 y de 31 días, febrero de un año bisiesto, y el resultado con cualquier zona horaria en el proceso de pruebas (`TZ`).
- Las pruebas de integración de las rutas crean su base PGlite con las migraciones y las cuentas de SPEC-001 (`createTestDatabase`), y una función de ventas falsa que registra con qué rango la llamaron.

### 8.5 Cobertura por RF

| RF | Contrato / API | Componentes de la interfaz | E2E |
| --- | --- | --- | --- |
| RF-1 | dueño y cajero → `200` en `today`; sin sesión → `401` de SPEC-001 | ruta `/resumen` con `homeLink` y los dos roles | US1-2, US1-3 |
| RF-2 | `boliviaDayRange`: `from` a las 00:00 de Bolivia y `to` = ahora + 1 ms; `date` de Bolivia | «Hoy · 24/10/2026» con `formatDate` | US1-1, US1-3 |
| RF-3 | `summarizeSales`: total, número, promedio con redondeo y `null` sin ventas | `PeriodSummaryView`: «Bs 0,00», «0 ventas», «—» | US1-3, US1-6 |
| RF-4 | `byPaymentMethod`: siempre `cash` y `qr`, en ese orden, que suman el total | «Efectivo: … · 1 venta», «QR: …» con `formatPaymentMethod` | US1-3 |
| RF-5 | `topProducts`: orden, desempates, máximo 5, nombre de la venta más reciente, mismo nombre visible separado | lista de productos con clave `productId`; «Todavía no hay ventas hoy» | US1-3, US1-6 |
| RF-6 | `asOf` = `clock.now()`; tras la medianoche, el día nuevo | «Datos al …», «Actualizar», «Cargando…» con las cifras anteriores visibles, sin actualización automática | US1-3, US1-4, US1-6 |
| RF-7 | — | escenarios «Sin conexión» y «Con error» tras una carga conservan las cifras y muestran su aviso | US1-5 |
| RF-8 | `summarizeSales` usa los datos de cada venta tal como llegan (precio y nombre del momento); las rutas son `GET` y no modifican la base | — | US1-3 |
| RF-9 | `boliviaMonthRange` y `GET /api/dashboard/month`; ventas del mes anterior fuera; `DASHBOARD_MONTH_ROLES`: cajero → `403` con el mensaje y sin llamar a `listSales` | «Octubre de 2026» con `formatMonth`; «Todavía no hay ventas este mes»; el cajero no pide el mes ni ve su sección; escenario «Sin permiso» muestra el mensaje en lugar del mes | US2-2, US2-3, US2-4 |
| RF-10 | `salesByDay`: un día por fecha del 1 a hoy, en orden, con ceros y sumas iguales al mes | `DailySalesTable` con «01/10/2026 · Bs 8,00 · 1 venta» | US2-2, US2-3 |

## 9. Decisiones globales en `docs/architecture.md`

Afectan a todo el proyecto. En modo delegado se aplican en este mismo PR y se indican en «Observaciones».

1. **Días y meses de Bolivia (§6.8; D-4):** los límites del día y del mes en hora de Bolivia los calcula `apps/api/src/shared/calendar.ts` a partir de `clock.ts`; la interfaz nunca los decide con la hora de la computadora.
2. **Fechas sin hora y meses (§6.8; D-5):** viajan como `YYYY-MM-DD` y `YYYY-MM` ya en hora de Bolivia, y se muestran con `formatDate` («24/10/2026») y `formatMonth` («Octubre de 2026») de `packages/contracts`.

## 10. Cambios tras el análisis de consistencia

Correcciones del 2026-10-24 a los hallazgos menores del análisis (ninguno bloqueante):

| Hallazgo | Corrección | Dónde |
| --- | --- | --- |
| 1 | El error inesperado al obtener los resúmenes traza a RF-7, que ahora lo pide | `spec.md` RF-7; §5.5, §6.3; `tasks.md` T012 |
| 2 | Las ventas de prueba van en `apps/api/test/test-sales.ts`, fuera del build de producción | §3, §8.4, D-1; `tasks.md` T009 |

## 11. Cambios tras la verificación

El verificador pidió dos cambios el 2026-10-24 sobre `03ce03f`:

| Cambio | Dónde |
| --- | --- |
| El cliente simulado tiene el escenario «Con error» (`500 INTERNAL_ERROR`), para recorrer todos los estados de RF-7 | D-8; `tasks.md` T024 |
| §3 incluye `apps/api/test/test-sales.ts`, como ya decía §10 | §3 |

## 12. Cambios tras las respuestas a las dudas abiertas

El 2026-10-24 la persona respondió siguiendo las recomendaciones: la jornada de Kofi no pasa de la medianoche, y el cajero ve el resumen de hoy pero no el del mes. `spec.md` cambió «Usuarios», HU-1, HU-2, RF-1 y RF-9. En este plan:

| Cambio | Dónde |
| --- | --- |
| `DASHBOARD_MONTH_ROLES` (`['owner']`) y `DASHBOARD_MESSAGES.forbiddenMonth` reemplazan a `DASHBOARD_ROLES` y `forbidden` | §6.1, D-6 |
| `GET /api/dashboard/today` sin restricción de rol; `GET /api/dashboard/month` responde `403` al cajero | §5.4, §6.2 |
| La ruta `/resumen` es de los dos roles; la pantalla no pide el mes con una sesión de cajero | §3, §5.5, D-7, D-9 |
| El escenario «Sin permiso» del cliente simulado rechaza solo el mes | D-8; `tasks.md` T027 |
| La jornada es el día calendario, confirmado | D-10 |
| E2E y cobertura de RF-1, RF-7 y RF-9 | §8.2, §8.5 |

Como la Base común ya estaba implementada, `tasks.md` añade sus tareas de corrección (T025 a T027).
