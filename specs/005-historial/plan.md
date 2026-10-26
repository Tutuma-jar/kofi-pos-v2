# Plan — SPEC-005 Historial y reportes

Estado: aprobado (modo delegado) · Fecha: 2026-10-25 · Especificación: [`spec.md`](spec.md)

Añade el módulo `history` a las dos aplicaciones y al contrato, sobre el monorepo, las herramientas y las decisiones globales de [SPEC-001](../001-acceso/plan.md) a [SPEC-004](../004-dashboard/plan.md). No crea tablas ni paquetes, ni cambia el despliegue.

**Dependencias de SPEC-001 a SPEC-004.**

- De **SPEC-001** usa `requireSession`, `createAuthService` y la sesión de la interfaz (`SessionProvider`, `RequireSession`, `AuthenticatedLayout`). Todo eso **ya está en `develop`**.
- De **SPEC-002** usa, en las pruebas de punta a punta, la pantalla inicial con los enlaces `homeLink` y la ruta de pruebas `POST /api/__test/menu`, que **ya están en `develop`** (#21).
- De **SPEC-003** usa `saleSchema`, `saleResponseSchema`, `formatPaymentMethod` y `formatDateTime` del contrato (ya en `develop`, #19) y `listRegisteredSales(db, { from?, to? })` (plan de 003, §6.3), que está en `apps/api/src/modules/sales/sales.repository.ts`. Su exportación desde `modules/sales/index.ts` es de la historia 1 de Ventas (003 T015), y el registro de ventas por la API (`POST /api/sales`, `salesPlugin` en `app.ts`) llegó con 003 T015 y T020. **Estas piezas están fusionadas en `develop` mediante el PR #26 (US1 de Ventas).**
- De **SPEC-004** usa `boliviaDateSchema`, `boliviaMonthSchema`, `paymentMethodTotalSchema` y `dayTotalSchema` del contrato, `formatDate` y `formatMonth`, y `apps/api/src/shared/calendar.ts`, todo ya en `develop` (#20). No usa nada de las historias de 004.

Por eso:

- La Preparación y la Base común de este plan **no dependen** de las historias de 003 ni de 004: contrato, días y meses de Bolivia en la API, cliente de la interfaz, cliente simulado y rutas provisionales. El servicio del Historial recibe las ventas registradas como funciones inyectadas (D-1, como SPEC-003 D-1 y SPEC-004 D-1), que las pruebas reemplazan por falsas.
- Los prerrequisitos de las historias del Historial están fusionados: definición de 005 (PR #25) y US1 de Ventas (PR #26). Dentro de cada historia, solo las tareas `[integración]` usan esas piezas; las demás trabajan con ventas falsas o con el cliente simulado. Las tareas que las usan lo indican como «SPEC-003 T0NN».
- Las dos dudas de `spec.md` quedaron respondidas el 2026-10-25 con las decisiones provisionales: solo el dueño usa el Historial (`HISTORY_ROLES`, D-6) y no hay límite hacia atrás (D-10). Los cambios están en §11.

## 1. Versión de la constitución

Se planificó con la versión 2.0.0 y se revisa para implementar con la **versión 3.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-25). Los seis principios siguen cumpliéndose.

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: se usan las de SPEC-001 (§7.1 de su plan). Los días y los meses se calculan con `Intl.DateTimeFormat` y `Date.UTC`, que vienen con Node 24 (D-4). Sin bibliotecas de gráficos ni de selección de fechas: el campo de fecha es `<input type="date">` y el de mes, `<input type="month">` (D-7). |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF (§3 a §8), y entre todas cubren RF-1 a RF-13 (tabla de cobertura, §8.5). |
| 3. Lógica separada de la interfaz | Sí | Totales, números de ventas, importes por medio de pago, ventas por día, qué día es hoy y cuál es el mes en curso, el día y el mes anterior y siguiente, el día de una venta y el momento de los datos los calcula la API (`history.report.ts`, `history.service.ts`, `shared/calendar.ts`). La interfaz los muestra con `formatPrice`, `formatDate`, `formatMonth`, `formatDateTime`, `formatTime`, `formatPaymentMethod` y `formatRole` del contrato, que no calculan nada (D-4, D-5). El cliente simulado de `dev/` devuelve cifras fijas ya calculadas y no llega al build (D-9). El contrato vive en `packages/contracts/src/history.ts`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.5), que se escribe antes del código de su tarea. |
| 5. Persistencia segura | Sí | El Historial solo lee: no escribe en la base ni crea tablas. Lee las ventas con `listRegisteredSales` y `findSaleByNumber` del módulo `sales`, que usan la capa `shared/database` (D-1). Esta especificación no añade secretos. |
| 6. Idioma | Sí | Código e identificadores en inglés (`history`, `listedSale`, `previousDate`, `salesCount`). Los textos para la persona están en español. Importes en bolivianos (centavos enteros, `docs/architecture.md` §6.7) y días, meses y horas en hora de Bolivia (`shared/calendar.ts` y las funciones de formato del contrato). |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
packages/contracts/src/
├── index.ts                     exporta también history.ts
├── auth.ts                      formatRole: «Dueño», «Cajero» (D-5)
├── datetime.ts                  formatTime: «14:05» (D-5)
├── dashboard.ts                 exporta byPaymentMethodSchema, que ya existía sin exportar (D-3)
└── history.ts                   contrato del módulo (§6)
apps/api/src/
├── app.ts                       registra historyPlugin con listRegisteredSales (US1) y findSaleByNumber (US2)
├── shared/
│   └── calendar.ts              añade addDays, addMonths, daysOfMonth, boliviaDayBounds, boliviaMonthBounds (D-4)
├── modules/sales/
│   ├── sales.repository.ts      añade findSaleByNumber (US2; D-1)                          RF-8, RF-9
│   └── index.ts                 exporta findSaleByNumber (US2, integración)
└── modules/history/
    ├── index.ts                 superficie pública: historyPlugin
    ├── history.routes.ts        GET /api/history/day, /month, /sales/:number; requireSession y rol  RF-1, RF-2, RF-9, RF-11
    ├── history.service.ts       validar fecha, mes y número; rango; ventas; navegación; asOf       RF-2, RF-3, RF-5, RF-7–RF-9, RF-11–RF-13
    └── history.report.ts        totales, medios de pago, ventas por día, filas de la lista (puras)  RF-3, RF-4, RF-12, RF-13
apps/api/test/
└── test-sales.ts                ventas de prueba que cumplen saleSchema (SPEC-004 §8.4), fuera del build
apps/web/src/
├── main.tsx                     provee el cliente del historial; con ?escenarios=historial, el simulado
├── scenarios.ts                 lee también ?escenarios=historial
├── routes.tsx                   /ventas («Historial de ventas»), /ventas/mes y /ventas/:numero, con HISTORY_ROLES
└── modules/history/
    ├── index.ts                 superficie pública: páginas, cliente y proveedor
    ├── api/
    │   ├── history-client.ts            interfaz HistoryClient y cliente HTTP real
    │   └── HistoryClientProvider.tsx    cliente en uso (real o simulado) por contexto
    ├── state/
    │   └── useHistoryQuery.ts           carga, «Actualizar», «Cargando…», sin conexión, rechazos       RF-5, RF-6
    ├── components/
    │   ├── counts.ts                    «1 venta», «2 ventas»
    │   ├── SaleSearch.tsx               «Buscar venta por número»                                  RF-9
    │   ├── QueryStatus.tsx              «Actualizar», «Cargando…», «Datos al …» si hay asOf, avisos   RF-5, RF-6
    │   ├── PeriodTotals.tsx             total, ventas y los dos medios de pago                     RF-4, RF-12
    │   ├── SalesList.tsx                filas de las ventas de un día, cada una con enlace al detalle RF-3, RF-10
    │   ├── SaleDetailView.tsx           datos y líneas de una venta                                RF-8
    │   └── MonthDaysTable.tsx           una fila por día, cada una con enlace al día               RF-13
    ├── pages/
    │   ├── DayHistoryPage.tsx           /ventas?fecha=: día, navegación, cifras y lista            RF-1–RF-6
    │   ├── SaleDetailPage.tsx           /ventas/:numero: detalle y «Volver»                       RF-8, RF-9
    │   └── MonthHistoryPage.tsx         /ventas/mes?mes=: mes, navegación, cifras y días            RF-11–RF-13
    └── dev/
        ├── fixtures.ts
        ├── history-demo-client.ts
        └── ScenarioPicker.tsx
e2e/
├── history-us1-ventas-dia.spec.ts
├── history-us2-detalle-venta.spec.ts
└── history-us3-cifras-mes.spec.ts
```

- Todas las rutas del módulo quedan bajo `/api/history` (`docs/architecture.md` §6.1) y son de solo lectura (`GET`).
- `apps/api/src/modules/history` tiene un archivo por capa (`routes`, `service`, `report`), así que no lleva subcarpetas (`docs/architecture.md` §4.3).
- `history` no importa nada interno de `sales` ni de `dashboard`: en la API recibe `listRegisteredSales` y `findSaleByNumber` desde `app.ts`, que los importa de `modules/sales/index.ts` (D-1); en la interfaz no usa los módulos `sales` ni `dashboard`.
- `apps/web/src/modules/history` tiene más de dos componentes y tres páginas, en sus subcarpetas por tipo (`docs/architecture.md` §4.3).
- `apps/api/test/test-sales.ts` lo define SPEC-004 (T009). Si cuando empiece US1 de 005 ya está en `develop`, se reutiliza; si no, lo crea la primera tarea `[api]` de US1 con la forma de SPEC-004 §8.4, y la otra rama lo integra con `git pull`.

## 4. Modelo de datos

**Sin tablas ni migraciones nuevas.** El Historial lee las ventas registradas de SPEC-003 (`sales` y `sale_lines`, plan de 003 §4):

- Las de un día o un mes, con `listRegisteredSales(db, { from, to })`, que las entrega con el formato de `saleSchema`, ordenadas por número. El índice `sales_registered_at_idx` sirve a esas consultas por rango.
- Una venta por su número, con `findSaleByNumber(db, number)`, que se añade a `sales.repository.ts` en US2 (D-1). La restricción `UNIQUE` de `sales.number` ya crea el índice que usa.

`sales.number` es `integer` (`003_sales.sql`): el mayor número posible es 2 147 483 647 (D-8).

Ejemplo de entrada (ventas de `listRegisteredSales` para el 24/10/2026 en Bolivia, de 04:00 UTC del 24 a 04:00 UTC del 25):

```text
number  registeredAt (UTC)         registeredBy             totalCents  paymentMethod  lines
2       2026-10-24T13:15:00.000Z   Ana Quispe · cashier     2500        cash           Café americano ×2 1250 → 2500
3       2026-10-24T14:30:00.000Z   Luis Mamani · owner      2050        qr             Empanada ×1 800 → 800; Café americano ×1 1250 → 1250
```

Día que calcula la API (con el reloj en 2026-10-25 11:00 de Bolivia):

```text
date 2026-10-24 · today 2026-10-25 · previousDate 2026-10-23 · nextDate 2026-10-25
totalCents 4550 · salesCount 2 · byPaymentMethod cash 2500 (1) · qr 2050 (1)
sales  N.º 3 14:30Z Luis Mamani owner qr 2050 · N.º 2 13:15Z Ana Quispe cashier cash 2500   (sin líneas)
```

## 5. Algoritmos relevantes

### 5.1 Días y meses de Bolivia (`shared/calendar.ts`; RF-2, RF-11, RF-13; D-4)

Se añaden a las funciones de SPEC-004 (`boliviaDate`, `startOfBoliviaDay`, `boliviaDayRange`, `boliviaMonthRange`), sin cambiarlas:

```text
addDays(date, n):                           # 'YYYY-MM-DD' ± n días, aritmética de calendario sin zona
  d ← Date.UTC(año, mes − 1, día + n);  return d en 'YYYY-MM-DD' (getUTC…)

addMonths(month, n):                        # 'YYYY-MM' ± n meses
  d ← Date.UTC(año, mes − 1 + n, 1);  return d en 'YYYY-MM'

daysOfMonth(month):                         # todas las fechas del mes, del 1 al último
  [`${month}-01`, …, addDays(`${addMonths(month, 1)}-01`, −1)]

boliviaDayBounds(date, now):                # un día hasta hoy; date ≤ boliviaDate(now)
  from ← startOfBoliviaDay(date)
  to   ← min(startOfBoliviaDay(addDays(date, 1)), now + 1 ms)       # hoy: hasta el momento de la consulta
  return { from, to }

boliviaMonthBounds(month, now):             # un mes hasta el mes en curso
  today ← boliviaDate(now)
  days  ← [d en daysOfMonth(month) con d ≤ today]                    # mes en curso: del 1 a hoy
  from  ← startOfBoliviaDay(`${month}-01`)
  to    ← min(startOfBoliviaDay(`${addMonths(month, 1)}-01`), now + 1 ms)
  return { days, from, to }
```

- `to` es exclusivo, como en `listRegisteredSales`: para un día pasado es las 00:00 del día siguiente, y para hoy, `now + 1 ms`, igual que `boliviaDayRange` (SPEC-004 §5.1).
- Las fechas `YYYY-MM-DD` se comparan como texto: el orden alfabético es el cronológico.
- `addDays` y `addMonths` operan sobre fechas de calendario, sin zona horaria: `Date.UTC` solo hace la aritmética (fin de mes, años bisiestos). La zona de Bolivia entra solo en `boliviaDate` y `startOfBoliviaDay`.

### 5.2 Cifras (`history.report.ts`; RF-3, RF-4, RF-7, RF-12, RF-13, RNF-2)

Funciones puras sobre las ventas tal como se registraron (`Sale[]`):

```text
periodTotals(sales):
  totalCents ← Σ sale.totalCents;  salesCount ← |sales|
  byPaymentMethod ← para method en PAYMENT_METHODS (cash, qr):
                      { paymentMethod, totalCents: Σ de las ventas con method, salesCount: cuántas }
  return { totalCents, salesCount, byPaymentMethod }

listedSales(sales):                         # filas de la lista de un día (RF-3)
  return sales ordenadas por number desc, cada una sin `lines`

salesByDay(sales, days):                    # days: los de boliviaMonthBounds
  por día d de days: { date: d, totalCents: Σ de las ventas con boliviaDate(registeredAt) = d, salesCount }
  return en el orden de days                # del más antiguo al más reciente; los días sin ventas en 0
```

- Todo es aritmética de enteros: ninguna suma pierde centavos (RNF-2).
- Como cada venta tiene un solo medio de pago y cae en un solo día, las sumas por medio de pago y por día suman el total y el número de ventas (RF-4, RF-13).
- Se usan los datos de cada venta tal como llegan de `listRegisteredSales` (RF-7).

### 5.3 Servicio (`history.service.ts`; RF-2, RF-3, RF-5, RF-8, RF-9, RF-11–RF-13)

```text
day(dateParam?):                            # US1
  now ← clock.now();  today ← boliviaDate(now)
  date ← dateParam ?? today
  si date no es una fecha válida (boliviaDateSchema) → 400 VALIDATION_ERROR «La fecha no es válida»
  si date > today → 400 VALIDATION_ERROR «No se pueden consultar fechas futuras»
  { from, to } ← boliviaDayBounds(date, now)
  sales ← listSales(db, { from, to })       # listRegisteredSales, inyectada (D-1)
  return { date, today, previousDate: addDays(date, −1), nextDate: date < today ? addDays(date, 1) : null,
           asOf: now, ...periodTotals(sales), sales: listedSales(sales) }

month(monthParam?):                         # US3
  now ← clock.now();  currentMonth ← boliviaDate(now)[0..7]
  month ← monthParam ?? currentMonth
  si month no es un mes válido (boliviaMonthSchema) → 400 VALIDATION_ERROR «El mes no es válido»
  si month > currentMonth → 400 VALIDATION_ERROR «No se pueden consultar meses futuros»
  { days, from, to } ← boliviaMonthBounds(month, now)
  sales ← listSales(db, { from, to })
  return { month, currentMonth, previousMonth: addMonths(month, −1),
           nextMonth: month < currentMonth ? addMonths(month, 1) : null,
           asOf: now, ...periodTotals(sales), days: salesByDay(sales, days) }

sale(numberParam):                          # US2
  number ← parseSaleNumber(numberParam)     # contrato (D-8): sin espacios ni ceros a la izquierda
  si number es null → 400 VALIDATION_ERROR «Escribe un número de venta válido»
  si number > SALE_NUMBER_MAX → 404 NOT_FOUND «No existe la venta N.º {number}»   # sin consultar la base
  sale ← findSale(db, Number(number))       # findSaleByNumber, inyectada (D-1)
  si sale es null → 404 NOT_FOUND «No existe la venta N.º {number}»
  return { sale, date: boliviaDate(sale.registeredAt) }
```

- El servicio solo lee: no modifica ninguna venta (RF-7).
- Las validaciones de fecha y de mes usan los mismos esquemas del contrato que la interfaz, pero con el mensaje propio del Historial (D-10).
- `findSaleByNumber(db, number)` en `sales.repository.ts`: `SELECT_SALES WHERE s.number = $1`, con el mismo `toSale` que `findSaleByDraftId`.

### 5.4 Rutas (`history.routes.ts`; RF-1, RF-7)

```text
historyPlugin(app, { db, clock, production, listSales, findSale }):
  preHandler de todas las rutas: requireSession (SPEC-001); si sessionUser.role ∉ HISTORY_ROLES
                                 → 403 FORBIDDEN «No tienes permiso para ver el historial de ventas»
  GET /api/history/day?date=YYYY-MM-DD      → 200 dayHistorySchema.parse(service.day(query.date))
  GET /api/history/month?month=YYYY-MM      → 200 monthHistorySchema.parse(service.month(query.month))
  GET /api/history/sales/:number            → 200 historySaleResponseSchema.parse(service.sale(params.number))
```

- La comprobación del rol va antes de cualquier validación de parámetros y antes de llamar a `listSales` o `findSale`: un cajero no recibe ni datos ni pistas sobre ellos (RF-1).
- Una ruta por consulta, para que cada historia se integre y se pruebe sola (D-2). `day` y `sales/:number` llegan en sus historias, pero el plugin y la comprobación del rol son de US1.
- Un parámetro de consulta repetido o desconocido no cambia la respuesta: se usa `date` o `month` y se ignora el resto.

### 5.5 Pantallas en la interfaz (RF-1–RF-6, RF-8–RF-13)

```text
useHistoryQuery(load, key):                 # key: la fecha, el mes o el número de la URL
  estado: { data | null, loading, notice: mensaje | null, rejection: mensaje | null }
  al montar, al cambiar key o con «Actualizar»:
    loading ← true                          # «Cargando…», «Actualizar» deshabilitado; data anterior visible
    ok                   → data ← respuesta; notice ← null; rejection ← null
    NETWORK_ERROR o 500  → notice ← mensaje de ApiFetchError; se conserva data          # RF-6
    400, 403 o 404       → rejection ← mensaje de la API; data ← null                   # RF-1, RF-2, RF-9, RF-11
    401                  → lo maneja SessionProvider (SPEC-001)
    loading ← false

DayHistoryPage (/ventas?fecha=YYYY-MM-DD):  # sin fecha, la API responde hoy
  data ← useHistoryQuery(() => client.day(fecha), fecha)
  «Ventas del {formatDate(data.date)}», PeriodTotals, «Datos al {formatDateTime(asOf)}», SalesList o «No hay ventas registradas este día»
  «Día anterior» → ?fecha=data.previousDate;  «Día siguiente» → ?fecha=data.nextDate (deshabilitado si es null)
  campo de fecha: max = data.today; al elegir → ?fecha=valor
  SaleSearch; «Ver por mes» → /ventas/mes (US3)

SaleDetailPage (/ventas/:numero):
  data ← useHistoryQuery(() => client.sale(numero), numero)
  «Venta N.º {number}», SaleDetailView, «Volver» → /ventas?fecha=data.date; SaleSearch; QueryStatus sin «Datos al …» (el detalle no tiene asOf)

MonthHistoryPage (/ventas/mes?mes=YYYY-MM): # sin mes, la API responde el mes en curso
  «{formatMonth(month)}», PeriodTotals, «Datos al …», «No hay ventas registradas este mes» si no hay ventas, y MonthDaysTable siempre (con los días en cero)
  «Mes anterior» / «Mes siguiente» con previousMonth / nextMonth; campo de mes con max = data.currentMonth
  «Ver por día» → /ventas;  cada fila → /ventas?fecha=día;  SaleSearch

SaleSearch:
  valor ← parseSaleNumber(texto)            # contrato (D-8)
  null → «Escribe un número de venta válido», sin navegar;  si no → /ventas/{valor}
```

- La fecha, el mes y el número viven en la URL: recargar o volver atrás muestra la misma consulta (RF-5, D-7).
- Un rechazo (`400`, `403`, `404`) borra los datos anteriores y muestra el mensaje de la API: no se muestran ventas de un día, un mes o una venta que no se pueden consultar (RF-1, RF-2, RF-9, RF-11). Sin conexión o con un error inesperado se conservan los datos anteriores con su propio título y su «Datos al …» (RF-6).
- Ninguna pantalla calcula fechas: el día y el mes anterior y siguiente, el máximo de los campos y el día de una venta llegan de la API (D-4).
- `counts.ts` elige singular o plural («1 venta»): es texto, no una cifra. Cada fila usa `number` o `date` como clave.
- No hay actualización automática (RF-5).

## 6. Contrato de la API

Ubicación: **`packages/contracts/src/history.ts`** (constantes, funciones, esquemas de Zod y tipos), con `formatTime` en **`datetime.ts`**, `formatRole` en **`auth.ts`** y la exportación de `byPaymentMethodSchema` en **`dashboard.ts`**. Es la única fuente del contrato: la API valida sus respuestas con estos esquemas y la interfaz los usa para tipar y validar su cliente y su cliente simulado.

### 6.1 Constantes, funciones y tipos

| Nombre | Valor / forma | RF |
| --- | --- | --- |
| `HISTORY_ROLES` | `['owner']`: los roles que pueden usar el Historial (D-6; respuesta de la persona a la duda 1) | RF-1 |
| `HISTORY_MESSAGES` | `forbidden` «No tienes permiso para ver el historial de ventas», `invalidDate` «La fecha no es válida», `futureDate` «No se pueden consultar fechas futuras», `invalidMonth` «El mes no es válido», `futureMonth` «No se pueden consultar meses futuros», `invalidSaleNumber` «Escribe un número de venta válido», `emptyDay` «No hay ventas registradas este día», `emptyMonth` «No hay ventas registradas este mes» | RF-1–RF-3, RF-9, RF-11, RF-12 |
| `saleNotFoundMessage(number)` | `'7'` → «No existe la venta N.º 7» | RF-9 |
| `SALE_NUMBER_MAX` | `2147483647`, el mayor `integer` de PostgreSQL (D-8) | RF-9 |
| `parseSaleNumber(text)` | Quita los espacios alrededor; si quedan solo dígitos y no todos son ceros, devuelve el número sin ceros a la izquierda como texto (`' 007 '` → `'7'`, `'00000000000000000000123'` → `'123'`); si no, `null` (`''`, `'0'`, `'-3'`, `'2,5'`, `'abc'`) | RF-9 |
| `formatTime(iso)` | `'2026-10-24T14:30:00.000Z'` → «10:30», en hora de Bolivia (D-5) | RF-3 |
| `formatRole(role)` | `'owner'` → «Dueño», `'cashier'` → «Cajero» (D-5) | RF-3, RF-8 |
| `byPaymentMethodSchema` | Ya existía en `dashboard.ts` sin exportar: tupla `[cash, qr]` de `paymentMethodTotalSchema`, en ese orden (D-3) | RF-4, RF-12 |
| `listedSaleSchema` | `saleSchema` sin `lines`: `{ id, number, registeredAt, registeredBy, totalCents, paymentMethod }` | RF-3 |
| `dayHistorySchema` | `{ date, today, previousDate: boliviaDate, nextDate: boliviaDate \| null, asOf: ISO 8601 con zona, totalCents: int ≥ 0, salesCount: int ≥ 0, byPaymentMethod, sales: ListedSale[] }`; `salesCount` es igual a `sales.length`, `date ≤ today` y `nextDate` es `null` si y solo si `date = today` | RF-2–RF-5 |
| `monthHistorySchema` | `{ month, currentMonth, previousMonth: boliviaMonth, nextMonth: boliviaMonth \| null, asOf, totalCents, salesCount, byPaymentMethod, days: DayTotal[] (1–31) }`; `month ≤ currentMonth` y `nextMonth` es `null` si y solo si `month = currentMonth` | RF-11–RF-13 |
| `historySaleResponseSchema` | `{ sale: saleSchema, date: boliviaDate }`: la venta tal como se registró y su día en Bolivia, para «Volver» | RF-8 |
| `historyDayQuerySchema` | `{ date?: string }` | RF-2 |
| `historyMonthQuerySchema` | `{ month?: string }` | RF-11 |

### 6.2 Rutas

Las tres usan `requireSession` (SPEC-001) y pueden responder sus tres `401` (`SESSION_MISSING`, `SESSION_EXPIRED`, `SESSION_TERMINATED`). Solo los roles de `HISTORY_ROLES` pueden usarlas; a los demás responden **`403 FORBIDDEN`** con `HISTORY_MESSAGES.forbidden` (`docs/architecture.md` §6.2), antes de validar nada.

| Ruta | Historia | Respuesta correcta | Errores propios | RF |
| --- | --- | --- | --- | --- |
| `GET /api/history/day?date=YYYY-MM-DD` (`date` opcional: hoy) | US1 | `200 dayHistorySchema` | `400 VALIDATION_ERROR` (`invalidDate`, `futureDate`); `403 FORBIDDEN` | RF-1–RF-7 |
| `GET /api/history/sales/:number` | US2 | `200 historySaleResponseSchema` | `400 VALIDATION_ERROR` (`invalidSaleNumber`); `404 NOT_FOUND` (`saleNotFoundMessage`); `403 FORBIDDEN` | RF-7–RF-9 |
| `GET /api/history/month?month=YYYY-MM` (`month` opcional: el mes en curso) | US3 | `200 monthHistorySchema` | `400 VALIDATION_ERROR` (`invalidMonth`, `futureMonth`); `403 FORBIDDEN` | RF-7, RF-11–RF-13 |

Ejemplos (con el reloj en 2026-10-25 11:00 de Bolivia):

```json
GET /api/history/day?date=2026-10-24
200 { "date": "2026-10-24", "today": "2026-10-25", "previousDate": "2026-10-23", "nextDate": "2026-10-25",
      "asOf": "2026-10-25T15:00:00.000Z", "totalCents": 4550, "salesCount": 2,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 2500, "salesCount": 1 },
                           { "paymentMethod": "qr", "totalCents": 2050, "salesCount": 1 } ],
      "sales": [ { "id": "…", "number": 3, "registeredAt": "2026-10-24T14:30:00.000Z",
                   "registeredBy": { "userId": "…", "displayName": "Luis Mamani", "role": "owner" },
                   "totalCents": 2050, "paymentMethod": "qr" },
                 { "id": "…", "number": 2, "registeredAt": "2026-10-24T13:15:00.000Z",
                   "registeredBy": { "userId": null, "displayName": "Ana Quispe", "role": "cashier" },
                   "totalCents": 2500, "paymentMethod": "cash" } ] }

GET /api/history/day                       (hoy, sin ventas)
200 { "date": "2026-10-25", "today": "2026-10-25", "previousDate": "2026-10-24", "nextDate": null,
      "asOf": "2026-10-25T15:00:00.000Z", "totalCents": 0, "salesCount": 0,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 0, "salesCount": 0 },
                           { "paymentMethod": "qr", "totalCents": 0, "salesCount": 0 } ],
      "sales": [] }

GET /api/history/day?date=2026-10-26
400 { "error": { "code": "VALIDATION_ERROR", "message": "No se pueden consultar fechas futuras" } }

GET /api/history/sales/003
200 { "date": "2026-10-24",
      "sale": { "id": "…", "number": 3, "registeredAt": "2026-10-24T14:30:00.000Z",
                "registeredBy": { "userId": "…", "displayName": "Luis Mamani", "role": "owner" },
                "lines": [ { "productId": "…", "productName": "Empanada", "categoryName": "Salados",
                             "quantity": 1, "unitPriceCents": 800, "subtotalCents": 800 },
                           { "productId": "…", "productName": "Café americano", "categoryName": "Bebidas calientes",
                             "quantity": 1, "unitPriceCents": 1250, "subtotalCents": 1250 } ],
                "totalCents": 2050, "paymentMethod": "qr" } }

GET /api/history/sales/99
404 { "error": { "code": "NOT_FOUND", "message": "No existe la venta N.º 99" } }

GET /api/history/month?month=2026-09
200 { "month": "2026-09", "currentMonth": "2026-10", "previousMonth": "2026-08", "nextMonth": "2026-10",
      "asOf": "2026-10-25T15:00:00.000Z", "totalCents": 1250, "salesCount": 1,
      "byPaymentMethod": [ { "paymentMethod": "cash", "totalCents": 1250, "salesCount": 1 },
                           { "paymentMethod": "qr", "totalCents": 0, "salesCount": 0 } ],
      "days": [ { "date": "2026-09-01", "totalCents": 0, "salesCount": 0 }, …,
                { "date": "2026-09-30", "totalCents": 1250, "salesCount": 1 } ] }

GET /api/history/month?month=2026-13
400 { "error": { "code": "VALIDATION_ERROR", "message": "El mes no es válido" } }

GET /api/history/day                       (sesión de cajero)
403 { "error": { "code": "FORBIDDEN", "message": "No tienes permiso para ver el historial de ventas" } }
```

### 6.3 Errores sin esquema propio

- **Sin conexión (RF-6):** como en SPEC-001, `api-fetch.ts` convierte el error de red en `NETWORK_ERROR`, y la pantalla muestra `NETWORK_ERROR_MESSAGE`, «No hay conexión. Inténtalo de nuevo».
- **Error inesperado (RF-6):** `500 INTERNAL_ERROR`, como en SPEC-001; `api-fetch.ts` lo entrega con «Ocurrió un error. Inténtalo de nuevo», y la pantalla lo muestra y conserva la consulta anterior.

## 7. Decisiones técnicas

Todas son **decisiones delegadas** (modo delegado, `AGENTS.md`): quedan aprobadas al fusionar el PR de definición.

| # | Decisión | Por qué | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **Las ventas llegan al Historial como funciones inyectadas:** `historyPlugin` y el servicio reciben `listSales: (db, { from?, to? }) => Promise<Sale[]>` y `findSale: (db, number: number) => Promise<Sale \| null>`, y `app.ts` les pasa `listRegisteredSales` y `findSaleByNumber` de `modules/sales/index.ts`. `findSaleByNumber` se añade a `sales.repository.ts` en US2, junto a `findSaleByDraftId`, y se exporta en la integración de US2. Las pruebas pasan funciones falsas con ventas de `apps/api/test/test-sales.ts` | La exportación de `listRegisteredSales` llegó con la historia 1 de Ventas (PR #26), ya fusionada; la Base común y la API de las historias se prueban sin ella, y `history` no conoce las tablas de ventas (`docs/architecture.md` §4.2, SPEC-003 D-1, SPEC-004 D-1). La búsqueda por número es una lectura de una venta y pertenece a `sales`, que es el dueño de esas tablas | Leer `sales` y `sale_lines` con SQL desde `history`: rompería la frontera entre módulos y duplicaría `toSale`. Buscar la venta con `listRegisteredSales` sin rango y filtrar: lee todas las ventas para devolver una | RF-3, RF-7–RF-9, RF-12 |
| D-2 | **Una ruta por consulta:** `GET /api/history/day` (US1), `GET /api/history/sales/:number` (US2) y `GET /api/history/month` (US3), con la fecha y el mes como parámetros de consulta opcionales | Cada historia se integra y se prueba sola, y el contrato completo se escribe en la Base común. Sin parámetro, la API decide hoy y el mes en curso (RF-2, RF-11) | Una sola ruta con un rango libre `from`/`to`: la interfaz tendría que calcular los límites del día y del mes, que son reglas de la API (principio 3) | RF-2, RF-8, RF-11 |
| D-3 | **La API calcula las cifras en memoria** con funciones puras propias del Historial (`history.report.ts`: `periodTotals`, `listedSales`, `salesByDay`), y el contrato reutiliza `byPaymentMethodSchema`, `paymentMethodTotalSchema` y `dayTotalSchema` de `dashboard.ts` (exportando `byPaymentMethodSchema`, que ya existía) | Las cifras son las mismas que las del Dashboard, y el contrato las describe una vez. Las funciones de cálculo de 004 (`dashboard.summary.ts`) ya están fusionadas (PR #29), pero `history` no puede importar archivos internos de `dashboard`; las del Historial son unas pocas sumas, se prueban sin base y no hacen esperar a 005 por 004. Con 6000 ventas al mes (RNF-3), sumar en memoria tarda milisegundos; el costo está en leerlas, y se mide en Pulido (D-11) | Recibir `summarizeSales` del `index.ts` de `dashboard`: haría depender las historias de 005 de las de 004, y entrega también promedio y productos, que el Historial no muestra. Llevar las sumas a `shared/`: cambiaría el plan de 004 desde 005. Sumar con SQL en una función nueva de `sales`: reparte la regla entre dos módulos; queda como plan B si Pulido no cumple RNF-3 | RF-3, RF-4, RF-7, RF-12, RF-13, RNF-2, RNF-3 |
| D-4 | **`shared/calendar.ts` crece con `addDays`, `addMonths`, `daysOfMonth`, `boliviaDayBounds` y `boliviaMonthBounds`**, y la API devuelve hecho todo lo que la interfaz necesita para navegar: `today`, `previousDate`, `nextDate`, `currentMonth`, `previousMonth`, `nextMonth` y el día de una venta (`date`) | Los límites de un día o un mes cualquiera son la misma regla que SPEC-004 puso en `shared/calendar.ts` (`docs/architecture.md` §6.8), y la interfaz no decide fechas. Con los datos de navegación en la respuesta, «Día siguiente» y «Mes siguiente» dependen del hoy de cuando se obtuvieron los datos (RF-2, RF-11), y la interfaz no hace aritmética de fechas | Calcular el día anterior y siguiente en la interfaz con `Date`: depende de la zona de la computadora y contradice §6.8. Un desfase fijo `-04:00`: depende de que Bolivia nunca cambie de hora | RF-2, RF-8, RF-11, RF-13 |
| D-5 | **`formatTime` en `datetime.ts`** («10:30», en hora de Bolivia, con `formatToParts` como `formatDateTime`) y **`formatRole` en `auth.ts`** («Dueño», «Cajero») | La lista de un día muestra solo la hora (spec, «Datos de una venta en el Historial»), y el rol del momento del registro necesita su nombre en español; una sola forma de mostrarlos, como `formatPrice` y `formatPaymentMethod`. `formatRole` va en `auth.ts` porque el rol es de Acceso | Recortar el texto de `formatDateTime`: depende de su formato exacto. Escribir «Dueño»/«Cajero» en el Historial: una tercera copia de la etiqueta, además de la de `AuthenticatedLayout` | RF-3, RF-8 |
| D-6 | **`HISTORY_ROLES` en el contrato** (`['owner']`), usado por la API para rechazar con `403` todas las rutas del módulo y por `routes.tsx` como `roles` de las tres rutas del Historial, para no mostrar «Historial de ventas» al cajero | Respuesta de la persona a la duda 1 de `spec.md`: solo el dueño usa el Historial. Si algún día se da al cajero, cambia esta lista (y, si solo ve una parte, el servicio filtra esa parte), sin tocar el resto. Una sola lista para la API y la interfaz, como `DASHBOARD_MONTH_ROLES` (SPEC-004 D-6). Los permisos reales los aplica la API (`docs/architecture.md` §6.6) | Escribir `['owner']` en la interfaz y en la API por separado: dos lugares que pueden quedar distintos | RF-1 |
| D-7 | **Rutas `/ventas` (día, `?fecha=YYYY-MM-DD`), `/ventas/mes` (`?mes=YYYY-MM`) y `/ventas/:numero` (detalle)**, con `homeLink: 'Historial de ventas'` solo en `/ventas` y `roles: HISTORY_ROLES` en las tres. La consulta vive en la URL; los campos son `<input type="date">` y `<input type="month">` con `max` de la API | `/ventas` quedó reservada para el Historial (SPEC-003 D-11). Con la consulta en la URL, recargar y volver atrás conservan lo consultado (RF-5) y cada consulta se puede abrir directamente en las pruebas. `react-router` prefiere las rutas fijas (`/ventas/nueva`, `/ventas/mes`) a `/ventas/:numero`. Los campos nativos no traen dependencias y se usan con teclado (RNF-4) | Guardar el día o la venta solo en el estado de la página: se pierde al recargar. Un selector de fechas propio o de una biblioteca: más código o una dependencia nueva | RF-1, RF-2, RF-5, RF-8, RF-11, RNF-4 |
| D-8 | **`parseSaleNumber` en el contrato**, usado por `SaleSearch` (para no buscar con un texto inválido) y por la API (para validar `:number`); los números mayores que `SALE_NUMBER_MAX` responden `404` sin consultar la base, y el mensaje usa el número ya normalizado | Una sola regla de qué es un número válido para la interfaz y la API, como los esquemas de Zod (`docs/architecture.md` §4.4). El número se trata como texto hasta compararlo con el máximo, así que uno de 20 cifras no pierde precisión ni rompe la consulta (spec, «Casos límite») | Validar con `z.coerce.number()`: acepta `'2.5'` y `'1e3'` y pierde precisión con 20 cifras. Responder `400` por encima del máximo: la especificación dice que es un número válido sin venta (RF-9) | RF-9 |
| D-9 | **`HistoryClientProvider` y escenarios de desarrollo:** como en SPEC-002 a SPEC-004, la interfaz obtiene el cliente de un contexto; `main.tsx` provee el real, también en desarrollo, y el simulado con su selector solo con `?escenarios=historial`, combinable (`?escenarios=acceso,historial`). El cliente simulado devuelve **cifras fijas ya calculadas** de `fixtures.ts` (ventas de los días 23, 24 y 25/10/2026, con hoy el 25, y de septiembre y octubre de 2026), validadas con el contrato, con `asOf` de cada pedido; para un día o un mes sin datos en los fixtures responde vacío, y calcula su navegación (día o mes anterior y siguiente) con una función de `dev/` que nunca llega al build. Sus escenarios son «Con ventas», «Sin ventas», «Sin conexión», «Con error» (`500 INTERNAL_ERROR`), «Sin permiso» (`403 FORBIDDEN` con `HISTORY_MESSAGES.forbidden` en todas las operaciones) y «Lento» (responde a los 1,5 s); en todos, una fecha o un mes futuros responden su `400`, y un número sin venta, su `404` | Permite trabajar la interfaz sin la API (`docs/architecture.md` §4.5) y recorrer todos los estados de RF-1 a RF-13. Las cifras oficiales no se calculan en `dev/`: son fijas. La navegación del cliente simulado solo existe para poder moverse por días en desarrollo | Calcular las cifras en el cliente simulado a partir de ventas falsas: duplicaría la lógica de la API. Un fixture por cada día posible: imposible sin calcular | RF-1–RF-13 |
| D-10 | **Validación de fechas y meses en el servicio**, con los esquemas del contrato (`boliviaDateSchema`, `boliviaMonthSchema`) y los mensajes propios del Historial (`400 VALIDATION_ERROR` con `message` «La fecha no es válida», «No se pueden consultar fechas futuras», «El mes no es válido» o «No se pueden consultar meses futuros»), sin límite hacia atrás | La especificación pide esos mensajes (RF-2, RF-11), que la interfaz muestra tal cual (`docs/architecture.md` §6.3), en lugar del genérico «Revisa los datos» de `validate`. Sin límite hacia atrás, por la respuesta de la persona a la duda 2; si algún día se fija uno, se añade aquí una comprobación más | Usar `validate` con `fields`: la página tendría que traducir el campo a un mensaje. Inventar un límite hacia atrás | RF-2, RF-11 |
| D-11 | **Medición de RNF-3** en un despliegue de comprobación con 6000 ventas en un mes y 400 en uno de sus días, cargadas con el script de ventas de prueba de SPEC-004 (`seed:sales`, SPEC-004 T021), y los 200 productos de `seed:menu` (SPEC-002 T034). Si al llegar a Pulido `seed:sales` no está en `develop`, la tarea de Pulido lo crea como indica SPEC-004 D-11 y lo amplía para cargar 400 ventas en un día | RNF-3 fija el volumen. Las ventas con fechas pasadas solo se pueden crear desde el módulo `sales` (SPEC-004 D-11), y reutilizar su script evita un segundo cargador | Registrar las ventas por `POST /api/sales`: quedarían todas con la hora actual. Medir con PGlite: no representa a Neon | RNF-3 |
| D-12 | **La lista de un día viaja completa y sin líneas** (`listedSaleSchema`), y el detalle se pide aparte | La lista muestra todas las ventas del día (RF-3, sin paginar) y no necesita las líneas; 400 ventas sin líneas son unas decenas de kilobytes. El detalle sale de una consulta por número, que sirve también a la búsqueda (RF-9) | Enviar las ventas con sus líneas para abrir el detalle sin pedirlo: hasta 30 líneas por venta en cada carga del día. Paginar: la especificación pide la lista completa | RF-3, RF-8, RNF-3 |

### 7.1 Dependencias

Ninguna nueva. Se usan las de [`specs/001-acceso/plan.md`](../001-acceso/plan.md#71-dependencias-por-paquete) §7.1.

## 8. Estrategia de tests

### 8.1 Niveles

Los de SPEC-001 a SPEC-004:

| Nivel | Herramienta | Qué cubre | Dónde |
| --- | --- | --- | --- |
| Unitario | Vitest | Esquemas y funciones del contrato (`history.ts`, `formatTime`, `formatRole`); las funciones nuevas de `shared/calendar.ts`; `periodTotals`, `listedSales` y `salesByDay` | `packages/contracts/src/history.test.ts`, `datetime.test.ts`, `auth.test.ts`; `apps/api/src/shared/calendar.test.ts`; `apps/api/src/modules/history/history.report.test.ts` |
| Integración de la API | Vitest + `app.inject` + PGlite | Servicio y rutas con sesiones reales de SPEC-001, reloj falso y funciones de ventas falsas; `findSaleByNumber` con la base; en la integración, con las funciones reales de `sales` | `*.integration.test.ts` en `apps/api/src/modules/history/` y `modules/sales/` |
| Componentes de la interfaz | Vitest + Testing Library + `history-demo-client` | Páginas, navegación, cifras, lista, detalle, búsqueda, días del mes, carga, actualización, sin conexión, rechazos | `*.test.tsx` junto a cada componente y página, y `state/*.test.ts` |
| Punta a punta | Playwright contra `vite preview` y `e2e-server.ts` | Cada historia completa, con las cuentas de SPEC-001, el menú de la ruta de pruebas de SPEC-002 y ventas registradas con `POST /api/sales` de SPEC-003, moviendo el reloj de la API de pruebas | `e2e/` |

### 8.2 Punta a punta por historia

El reloj de la API de E2E empieza el 24/10/2026 a las 08:00 de Bolivia (`e2e-server.ts`) y solo avanza (`POST /api/__test/clock`); al avanzar más de 12 horas, la sesión vence y la prueba vuelve a ingresar. El menú se carga con la ruta de pruebas de SPEC-002 (Café americano Bs 12,50 en «Bebidas calientes»; Empanada Bs 8,00 en «Salados») y las ventas se registran con la interfaz de «Nueva venta» o con `POST /api/sales`.

**US1 — Consultar las ventas de un día** (`e2e/history-us1-ventas-dia.spec.ts`)

1. El cajero registra el 24/10 a las 08:30 «Café americano × 1» en efectivo (N.º 1). Se avanza el reloj al 25/10 09:15 y el cajero registra «Café americano × 2» en efectivo (N.º 2); a las 10:30, el dueño registra «Empanada × 1» y «Café americano × 1» con QR (N.º 3). Se avanza al 26/10 11:00 (RF-3).
2. El cajero no ve «Historial de ventas» en la pantalla inicial, y `GET /api/history/day` con su sesión responde `403` con «No tienes permiso para ver el historial de ventas» (RF-1).
3. El dueño abre «Historial de ventas» → «Ventas del 26/10/2026», «Bs 0,00», «0 ventas», «Efectivo: Bs 0,00 · 0 ventas», «QR: Bs 0,00 · 0 ventas», «No hay ventas registradas este día», y «Día siguiente» deshabilitado (RF-1 a RF-4).
4. «Día anterior» → «Ventas del 25/10/2026», «Bs 45,50», «2 ventas», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», «Datos al 26/10/2026 11:00» y, en ese orden, «N.º 3 · 10:30 · [dueño] · Dueño · QR · Bs 20,50» y «N.º 2 · 09:15 · [cajero] · Cajero · Efectivo · Bs 25,00» (RF-2 a RF-5).
5. Se elige el 24/10/2026 en el campo de fecha → solo «N.º 1»; se recarga la pantalla → sigue en el 24/10/2026; se vuelve atrás con el navegador → el 25/10/2026 (RF-2, RF-5).
6. Se abre `/ventas?fecha=2026-10-27` → «No se pueden consultar fechas futuras», sin ventas; `/ventas?fecha=2026-02-30` → «La fecha no es válida» (RF-2).
7. En el 25/10, se corta la red y se elige «Actualizar» → «No hay conexión. Inténtalo de nuevo» y sigue visible «Ventas del 25/10/2026» con sus cifras (RF-6).
8. Se avanza el reloj al 26/10 23:58, el dueño vuelve a ingresar y abre «Historial de ventas» (26/10); se avanza a las 00:05 del 27/10 sin actualizar la pantalla → «Día siguiente» sigue deshabilitado; tras «Actualizar», se puede elegir (RF-2, RF-5).
9. Se llega a «Historial de ventas», «Día anterior», el campo de fecha y «Actualizar» con Tab y se eligen con Intro (RNF-4).

**US2 — Ver el detalle de una venta** (`e2e/history-us2-detalle-venta.spec.ts`)

1. Con las ventas del paso 1 de US1, el dueño cambia el precio de «Café americano» a Bs 13,00 y se elimina la cuenta del cajero (`POST /api/__test/accounts/:username`, SPEC-001) (RF-7).
2. El dueño abre «Historial de ventas», escribe «3» en «Buscar venta por número» y elige «Buscar» → «Venta N.º 3», «25/10/2026 10:30», «Registrada por [dueño] · Dueño», «Medio de pago: QR», «Empanada · Salados · Bs 8,00 × 1 · Bs 8,00», «Café americano · Bebidas calientes · Bs 12,50 × 1 · Bs 12,50», en ese orden, y «Bs 20,50» (RF-8, RF-9).
3. Busca « 002 » → «Venta N.º 2», «Registrada por [cajero] · Cajero», con el precio de Bs 12,50, aunque su cuenta se eliminó (RF-7, RF-9).
4. Busca «99» → «No existe la venta N.º 99»; «abc» y «0» → «Escribe un número de venta válido» (RF-9).
5. En la venta N.º 2 elige «Volver» → «Ventas del 25/10/2026»; elige la fila «N.º 3» → su detalle; se recarga → sigue en «Venta N.º 3» (RF-5, RF-8, RF-10).
6. Se llega a la búsqueda, a una fila de la lista y a «Volver» con Tab y se eligen con Intro (RNF-4).

**US3 — Consultar las cifras de un mes** (`e2e/history-us3-cifras-mes.spec.ts`)

1. El cajero registra el 24/10 a las 09:00 una venta de Bs 8,00 en efectivo; se avanza el reloj al 31/10 23:59 y registra una de Bs 25,00 con QR; se avanza al 01/11 00:00:30 y registra una de Bs 12,50 en efectivo; se avanza al 05/11 10:00 (RF-12, RF-13).
2. El dueño abre «Historial de ventas» y elige «Ver por mes» → «Noviembre de 2026», «Bs 12,50», «1 venta», una fila por día del 01/11/2026 al 05/11/2026, y «Mes siguiente» deshabilitado (RF-11 a RF-13).
3. «Mes anterior» → «Octubre de 2026», «Bs 33,00», «2 ventas», «Efectivo: Bs 8,00 · 1 venta», «QR: Bs 25,00 · 1 venta» y 31 filas: «24/10/2026 · Bs 8,00 · 1 venta», «31/10/2026 · Bs 25,00 · 1 venta» y las demás con «Bs 0,00 · 0 ventas» (RF-12, RF-13).
4. Elige la fila del 31/10/2026 → «Ventas del 31/10/2026» con su venta; vuelve a «Ver por mes» y elige «Ver por día» → «Ventas del 05/11/2026» (RF-11, RF-13).
5. Se abre `/ventas/mes?mes=2026-12` → «No se pueden consultar meses futuros»; `/ventas/mes?mes=2026-13` → «El mes no es válido» (RF-11).
6. Se elige septiembre de 2026 en el campo de mes → «Septiembre de 2026» con «No hay ventas registradas este mes», cifras en cero y 30 filas (RF-11, RF-12).
7. Se llega a «Ver por mes», «Mes anterior», el campo de mes y una fila con Tab y se eligen con Intro (RNF-4).

### 8.3 Requisitos no funcionales

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Las pruebas de componentes y E2E comparan los textos en español tal como los define la especificación |
| RNF-2 | Unitarias de `periodTotals` y `salesByDay`: sumas por medio de pago y por día iguales al total; 6000 ventas de 30 líneas de 99 unidades a Bs 1000,00 dan el total exacto (1 782 000 000 000 centavos, dentro de `Number.MAX_SAFE_INTEGER`) |
| RNF-3 | Medición automatizada de la interfaz completa en Render y Neon de comprobación (T028), conservando las muestras reales y los commits desplegados: con 6000 ventas en un mes, 400 de ellas en un día, y el servicio reactivado, 20 aperturas de ese día, 20 de ese mes y 20 detalles; al menos 19 de cada 20 por debajo de 2 s. El resultado se anota en el PR de pulido |
| RNF-4 | Componentes y E2E: cada opción del Historial se alcanza con Tab y se elige con Intro |
| Criterios de 15 s | Pendientes de comprobación humana (T028-H); no se ejecutan recorridos manuales en este desarrollo ni se acredita una ejecución automatizada como prueba humana |

### 8.4 Datos

- `apps/api/test/test-sales.ts` (SPEC-004 §8.4) construye ventas que cumplen `saleSchema` para las pruebas de las cifras y del servicio. Solo lo importan las pruebas, fuera del build de producción.
- Las pruebas de las funciones nuevas de `shared/calendar.ts` cubren: 23:59:59.999 y 00:00 de Bolivia; el último día de meses de 30 y 31 días; febrero de 2028 (29 días) y de 2026 (28); el paso de diciembre a enero en `addDays` y `addMonths`; un día pasado (hasta las 00:00 del siguiente) y hoy (hasta `now + 1 ms`); y el resultado con cualquier `TZ` en el proceso de pruebas.
- Las pruebas de integración de las rutas crean su base PGlite con las migraciones y las cuentas de SPEC-001 (`createTestDatabase`), y funciones de ventas falsas que registran con qué argumentos las llamaron.

### 8.5 Cobertura por RF

| RF | Contrato / API | Componentes de la interfaz | E2E |
| --- | --- | --- | --- |
| RF-1 | `HISTORY_ROLES`; dueño → `200`; cajero → `403` con el mensaje en las tres rutas, sin llamar a las funciones de ventas; sin sesión → `401` de SPEC-001 | rutas con `homeLink` solo en `/ventas` y `roles: HISTORY_ROLES`; escenario «Sin permiso» muestra el mensaje sin datos | US1-2, US1-3 |
| RF-2 | `day`: hoy sin parámetro, `previousDate`/`nextDate`, `400` por fecha inválida y futura; `boliviaDayBounds`, `addDays` | «Ventas del …», «Día anterior», «Día siguiente» deshabilitado con `nextDate` nulo, campo con `max` | US1-3 a US1-6, US1-8 |
| RF-3 | `listedSales`: orden por número descendente, sin líneas; solo las ventas del rango | `SalesList` con «N.º 3 · 10:30 · … · Dueño · QR · Bs 20,50» y `formatTime`, `formatRole`; «No hay ventas registradas este día» | US1-3, US1-4, US1-5 |
| RF-4 | `periodTotals`: `cash` y `qr` en ese orden, sumas iguales al total; `salesCount = sales.length` en el esquema | `PeriodTotals` con «Bs 0,00», «0 ventas» y los dos medios | US1-3, US1-4 |
| RF-5 | `asOf` = `clock.now()` | «Datos al …», «Actualizar», «Cargando…» con la consulta anterior visible; recarga y atrás conservan la URL; sin actualización automática | US1-4, US1-5, US1-8, US2-5 |
| RF-6 | — | escenarios «Sin conexión» y «Con error» tras una carga conservan la consulta con su título y su «Datos al …» | US1-7 |
| RF-7 | las cifras y el detalle usan los datos de cada venta tal como llegan; las rutas son `GET` y no modifican la base | — | US2-1, US2-3 |
| RF-8 | `sale`: `historySaleResponseSchema` con `date` de Bolivia; `findSaleByNumber` | `SaleDetailView` con líneas en orden, «Registrada por …», «Medio de pago: …»; «Volver» a `/ventas?fecha=date` | US2-2, US2-5 |
| RF-9 | `parseSaleNumber`; `400` por número inválido; `404` sin venta y por encima de `SALE_NUMBER_MAX` sin consultar | `SaleSearch` en las tres páginas: no navega con un texto inválido, normaliza « 007 » | US2-2 a US2-4 |
| RF-10 | — | cada fila de `SalesList` enlaza a `/ventas/:numero` | US2-5 |
| RF-11 | `month`: mes en curso sin parámetro, `previousMonth`/`nextMonth`, `400` por mes inválido y futuro; `addMonths` | «[Mes] de [año]», «Mes anterior», «Mes siguiente» deshabilitado, campo con `max`, «Ver por mes», «Ver por día» | US3-2, US3-4, US3-5, US3-6 |
| RF-12 | `month` con `periodTotals` de las ventas del mes; `boliviaMonthBounds` | `PeriodTotals` del mes; «No hay ventas registradas este mes» | US3-2, US3-3, US3-6 |
| RF-13 | `salesByDay` y `daysOfMonth`: un día por fecha (todo el mes pasado, hasta hoy el en curso), en orden, con ceros y sumas iguales al mes | `MonthDaysTable` con «01/10/2026 · Bs 8,00 · 1 venta»; cada fila enlaza a su día | US3-2, US3-3, US3-4 |

## 9. Decisiones globales en `docs/architecture.md`

Afectan a todo el proyecto. En modo delegado se aplican en este mismo PR y se indican en «Observaciones».

1. **Navegación por fechas (§6.8; D-4):** la interfaz no hace aritmética de fechas; cuando necesita el día o el mes anterior o siguiente, o el día de un instante, los recibe de la API, calculados con `shared/calendar.ts`.
2. **Horas y roles (§6.8; D-5):** una hora sin fecha se muestra con `formatTime` («14:05») de `packages/contracts`, y el nombre de un rol con `formatRole` («Dueño», «Cajero»).

## 10. Cambios tras el análisis de consistencia

Correcciones del 2026-10-25 a los hallazgos menores del análisis (ninguno bloqueante):

| Hallazgo | Corrección | Dónde |
| --- | --- | --- |
| 1 | `QueryStatus` muestra «Datos al …» solo cuando la respuesta tiene `asOf`: el detalle de una venta no lo tiene (RF-5) | §3, §5.5; `tasks.md` T014, T020 |
| 2 | Un mes sin ventas muestra el aviso y además todas sus filas por día en cero (RF-13) | §5.5; `tasks.md` T025 |
| 3 | El paso de la medianoche de la E2E de US1 vuelve a ingresar antes de acercarse a la medianoche, para que la sesión no venza | §8.2 (US1-8) |
| 4 | La duda 1 afecta a las tres historias; la 2, a US1 y US3 | `tasks.md`, «Cómo leer estas tareas» |

## 11. Cambios tras las respuestas a las dudas abiertas

El 2026-10-25 la persona respondió las dos dudas de `spec.md` con las decisiones provisionales: solo el dueño usa el Historial y no hay límite hacia atrás. El contrato y el código de la Base común ya las aplicaban, así que no hacen falta tareas de corrección; solo cambian los textos que las llamaban provisionales.

| Cambio | Dónde |
| --- | --- |
| `HISTORY_ROLES` (`['owner']`) pasa de provisional a respuesta de la persona | encabezado, §6.1, D-6; `packages/contracts/src/history.ts` (comentario y nombre de su prueba) |
| Sin límite hacia atrás, confirmado | encabezado, D-10 |
| Las historias ya no esperan respuestas a dudas abiertas | `tasks.md`, «Cómo leer estas tareas» y fase 3 |

## 12. Revisión delegada para la implementación (2026-10-26)

- **Decisión delegada:** reutilizar las dependencias fusionadas: PR #25 (definición), #26 (Ventas US1), #29 (Dashboard US1 y `test-sales.ts`) y #33 (`seed:sales`). Motivo: sus implementaciones ya están en `origin/develop`; se descarta mantener dependencias como pendientes.
- **Decisión delegada:** T028 automatiza las mediciones sobre la interfaz completa del entorno de comprobación, con muestras reales, sin modificar cuentas ni datos existentes. T028-H conserva pendientes los criterios humanos de 15 segundos y la acreditación desde la computadora del local de RNF-3. Motivo: instrucción de la persona; se descarta presentar automatización como prueba humana. La documentación depende del desarrollo integrado, y la verificación final informa los criterios pendientes como impedimento para acreditar el cierre completo.

- **Decisión delegada (T010):** interpretar el desfase de `Intl` también cuando contiene segundos y convertirlo a milisegundos al obtener las 00:00. Motivo: las fechas antiguas válidas como 1900-01-01 deben poder consultarse (RF-2, D-10); se descarta un desfase fijo moderno o limitar las fechas a las posteriores a la primera venta. Prueba de regresión del servicio y pruebas existentes del calendario.
