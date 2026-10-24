# Plan — SPEC-003 Ventas

Estado: aprobado (modo delegado) · Fecha: 2026-10-24 · Especificación: [`spec.md`](spec.md)

Añade el módulo `sales` a las dos aplicaciones y al contrato, sobre el monorepo, las herramientas y las decisiones globales de [SPEC-001](../001-acceso/plan.md) y [SPEC-002](../002-menu/plan.md). No crea paquetes ni cambia el despliegue.

**Dependencias de SPEC-001 y SPEC-002.**

- De **SPEC-001** usa `requireSession`, `createAuthService` y la sesión de la interfaz (`SessionProvider`, `RequireSession`, `AuthenticatedLayout`). Todo eso **ya está en `develop`** (#15 y #17).
- De **SPEC-002** usa piezas que son de sus historias y **todavía no están en `develop`** (solo está su definición, #12): `getCurrentMenu(db)` (002 T016, US1), la pantalla inicial que muestra los enlaces `homeLink` (002 T018, US1) y la ruta de pruebas `POST /api/__test/menu` de la API de E2E (002 T023, US1). La migración `002_menu.sql`, los repositorios del menú y el contrato `menu.ts` sí están en `develop`.

Por eso:

- La Preparación y la Base común de este plan **no dependen** de las historias de 002: contrato, migración, repositorio, cliente de la interfaz, cliente simulado y ruta provisional. El servicio de ventas recibe el menú vigente como una función inyectada (D-1), que las pruebas reemplazan por una falsa.
- Las historias de Ventas empiezan cuando se fusionen el PR de definición de 003 **y** la historia 1 de Menú (`feat/002-menu-us1`), que trae `getCurrentMenu`, los enlaces de la pantalla inicial y la ruta de pruebas del menú. Las tareas que las usan lo indican como «SPEC-002 T0NN». Ventas no usa `GET /api/menu` (002 T031, US3): el cálculo de la venta en preparación devuelve también los productos para vender (D-2).

## 1. Versión de la constitución

Se planifica con la **versión 2.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-24).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: se usan las de SPEC-001 (§7.1 de su plan). El identificador de cada venta en preparación sale de `crypto.randomUUID()` del navegador y el formato de fechas, de `Intl.DateTimeFormat`, que vienen con los navegadores y con Node 24 (D-5, D-7). |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF (§3 a §8), y entre todas cubren RF-1 a RF-14 (tabla de cobertura, §8.5). |
| 3. Lógica separada de la interfaz | Sí | Subtotales, total, avisos de cambios del menú, límites y número de venta se calculan en la API (`sales.pricing.ts`, `sales.service.ts`). La interfaz envía qué productos y cuántas unidades eligió la persona, y muestra los importes y los mensajes que devuelve la API; los formatea con `formatPrice` y `formatDateTime` del contrato, que no calculan importes (D-3). El cliente simulado de `dev/` multiplica precio por cantidad para que las pantallas se puedan recorrer sin la API, pero no llega al build de producción (`docs/architecture.md` §4.5) y sus cifras no son oficiales (D-10). El contrato vive en `packages/contracts/src/sales.ts`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.5), que se escribe antes del código de su tarea. |
| 5. Persistencia segura | Sí | Solo la capa `shared/database` de la API toca la base. Registrar una venta (número, venta y líneas) es una sola transacción (RF-9). La base garantiza además que el total es la suma de las líneas, que el subtotal es precio por cantidad, que los números no se repiten y que una venta registrada no cambia (§4, D-4). La venta en preparación se guarda en el navegador, sin importes oficiales ni datos de la sesión (D-8). Esta especificación no añade secretos. |
| 6. Idioma | Sí | Código e identificadores en inglés (`sales`, `saleLines`, `totalCents`, medios de pago `cash` y `qr`). Los mensajes al usuario están en español y los devuelve la API. Importes en bolivianos (centavos enteros, `docs/architecture.md` §6.7) y fechas en hora de Bolivia (`formatDateTime`, D-7). |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
packages/contracts/src/
├── index.ts                     exporta también datetime.ts y sales.ts
├── errors.ts                    nuevo código: MENU_CHANGED
├── datetime.ts                  BOLIVIA_TIME_ZONE y formatDateTime (D-7)
└── sales.ts                     contrato del módulo (§6)
apps/api/src/
├── app.ts                       registra salesPlugin con getCurrentMenu del menú (US1)
├── shared/database/migrations/
│   └── 003_sales.sql            sale_counter, sales, sale_lines y disparadores (§4)
└── modules/sales/
    ├── index.ts                 superficie pública: salesPlugin, listRegisteredSales      RF-11
    ├── sales.routes.ts          POST /api/sales/quote y POST /api/sales, requireSession    RF-1, RF-6, RF-8
    ├── sales.service.ts         calcular la venta en preparación y registrarla              RF-2–RF-11
    ├── sales.pricing.ts         precios, subtotales, total y avisos (funciones puras)       RF-4, RF-5, RF-7
    └── sales.repository.ts      número, venta con sus líneas, búsquedas                     RF-6, RF-8, RF-10, RF-11
apps/web/src/
├── main.tsx                     provee el cliente de ventas; con ?escenarios=ventas, el simulado y su selector
├── scenarios.ts                 lee también ?escenarios=ventas
├── routes.tsx                   /ventas/nueva («Nueva venta», los dos roles); onSessionEnd (US2)
└── modules/
    ├── auth/components/SessionProvider.tsx   avisa del fin de la sesión por cierre o cambio de cuenta (US2)  RF-13
    └── sales/
        ├── index.ts             superficie pública: NewSalePage, discardStoredSaleDraft, cliente y proveedor
        ├── api/
        │   ├── sales-client.ts          interfaz SalesClient y cliente HTTP real
        │   └── SalesClientProvider.tsx  cliente en uso (real o simulado) por contexto
        ├── state/
        │   ├── useSaleDraft.ts          venta en preparación: cambios, cálculo y registro    RF-3–RF-9
        │   └── draft-store.ts           guarda la venta en preparación en el navegador       RF-12, RF-13
        ├── components/
        │   ├── ProductPicker.tsx        productos para vender, por categoría                 RF-2, RF-3
        │   ├── SaleDraftLines.tsx       líneas con «+», «−» y «Quitar», total y avisos       RF-3–RF-5
        │   ├── PaymentMethodPicker.tsx  «Efectivo» o «QR», sin valor por defecto             RF-6
        │   ├── SaleConfirmation.tsx     «Venta N.º … registrada · … · …»                    RF-6
        │   └── DiscardSaleDialog.tsx    confirmación de «Descartar venta»                    RF-14
        ├── pages/
        │   └── NewSalePage.tsx          /ventas/nueva                                         RF-1–RF-9, RF-12
        └── dev/
            ├── fixtures.ts
            ├── sales-demo-client.ts
            └── ScenarioPicker.tsx
e2e/
├── sales-us1-registrar-venta.spec.ts
└── sales-us2-conservar-venta.spec.ts
apps/api/test/
└── e2e-server.ts                ruta de prueba GET /api/__test/sales (US1)
```

- Todas las rutas del módulo quedan bajo `/api/sales` (`docs/architecture.md` §6.1). Los dos roles pueden usarlas: no hay `403` en este módulo (spec, «Usuarios»).
- `apps/api/src/modules/sales` tiene un archivo por capa (`routes`, `service`, `pricing`, `repository`), así que no lleva subcarpetas (`docs/architecture.md` §4.3).
- `sales` no importa nada interno de `menu`: en la API recibe `getCurrentMenu` desde `app.ts`, que lo importa de `modules/menu/index.ts` (D-1); en la interfaz no usa el módulo `menu` (D-2).
- `SessionProvider` sigue en `auth`, pero no conoce a `sales`: recibe `onSessionEnd` desde `routes.tsx`, igual que la pantalla inicial recibe sus enlaces (D-9, SPEC-002 D-8).

## 4. Modelo de datos

Migración `apps/api/src/shared/database/migrations/003_sales.sql`:

**`sale_counter`** (RF-6, RF-10) — una sola fila con el último número usado.

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `boolean` | PK, `DEFAULT true`, `CHECK (id)`: solo puede existir una fila |
| `last_number` | `integer` | `NOT NULL DEFAULT 0`, `CHECK (last_number >= 0)` |

La migración inserta la fila con `last_number = 0`.

**`sales`** (RF-6, RF-8, RF-10, RF-11)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `number` | `integer` | `NOT NULL UNIQUE`, `CHECK (number >= 1)` |
| `draft_id` | `uuid` | `NOT NULL UNIQUE`: la venta en preparación de la que salió (RF-8, D-5) |
| `registered_at` | `timestamptz` | `NOT NULL`. Hora de `clock.ts` al registrar |
| `registered_by_user_id` | `uuid` | FK → `users`, `ON DELETE SET NULL` (RF-11) |
| `registered_by_name` | `text` | `NOT NULL`, `CHECK (char_length BETWEEN 1 AND 40)`: nombre visible al registrar |
| `registered_by_role` | `text` | `NOT NULL`, `CHECK (IN ('owner', 'cashier'))`: rol al registrar |
| `total_cents` | `integer` | `NOT NULL`, `CHECK (total_cents >= 1)` |
| `payment_method` | `text` | `NOT NULL`, `CHECK (IN ('cash', 'qr'))`: efectivo o QR (D-13) |

Índice sobre `registered_at` para las consultas por fecha del Dashboard y el Historial.

**`sale_lines`** (RF-6, RF-7, RF-11)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `sale_id` | `uuid` | FK → `sales`, `ON DELETE RESTRICT` |
| `position` | `smallint` | `CHECK (position BETWEEN 1 AND 30)`. PK `(sale_id, position)`: orden de la venta en preparación |
| `product_id` | `uuid` | FK → `products`, `ON DELETE RESTRICT`. `UNIQUE (sale_id, product_id)`: un producto, una línea |
| `product_name` | `text` | `NOT NULL`, 1–40 caracteres: nombre al registrar |
| `category_name` | `text` | `NOT NULL`, 1–30 caracteres: categoría al registrar |
| `unit_price_cents` | `integer` | `CHECK (BETWEEN 1 AND 100000)` |
| `quantity` | `integer` | `CHECK (BETWEEN 1 AND 99)` |
| `subtotal_cents` | `integer` | `CHECK (subtotal_cents = unit_price_cents * quantity)` |

El total máximo posible es 30 × 99 × 100000 = 297 000 000 centavos, que cabe en `integer` (hasta 2 147 483 647).

**Disparadores** (RF-9, RF-11, RNF-2; D-4)

- `sales_check_lines`: disparador de restricción **diferido** (`CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED`) sobre `INSERT` en `sales` y en `sale_lines`. Al confirmar la transacción comprueba que la venta tiene de 1 a 30 líneas y que `total_cents` es la suma de sus `subtotal_cents`; si no, lanza `KS001`.
- `sales_immutable` (`BEFORE UPDATE OR DELETE ON sales`): lanza `KS002`, salvo en la única actualización permitida, la que hace `ON DELETE SET NULL` al eliminar una cuenta: `registered_by_user_id` pasa a `NULL` y nada más cambia.
- `sale_lines_immutable` (`BEFORE UPDATE OR DELETE ON sale_lines`): lanza `KS002`.

Ejemplo:

```text
sale_counter
id    last_number
true  2

sales
id        number  draft_id  registered_at           registered_by_user_id  registered_by_name  registered_by_role  total_cents  payment_method
9b1c…-a0  1       4f2e…-11  2026-10-24 18:05:12+00  7d3a…-c9               Ana                 cashier             3300         cash
e07d…-5b  2       c8a9…-02  2026-10-24 18:09:40+00  NULL                   Luis                cashier             1250         qr     ← cuenta eliminada

sale_lines
sale_id   position  product_id  product_name    category_name      unit_price_cents  quantity  subtotal_cents
9b1c…-a0  1         c4e1…-07    Café americano  Bebidas calientes  1250              2         2500
9b1c…-a0  2         a3f0…-5d    Empanada        Salados            800               1         800
e07d…-5b  1         c4e1…-07    Café americano  Bebidas calientes  1250              1         1250
```

## 5. Algoritmos relevantes

### 5.1 Calcular la venta en preparación (RF-4, RF-5, RF-7)

Funciones puras de `sales.pricing.ts`. Una **línea de borrador** (`SaleDraftLine`) es lo que envía la interfaz: `productId`, `productName` y `unitPriceCents` tal como se mostraban, y `quantity`. Una línea recién agregada no tiene `unitPriceCents`, porque todavía no se calculó.

```text
priceDraft(draftLines, currentMenu):
  vendibles ← mapa productId → { name, categoryName, priceCents } del menú vigente
  lines ← []; notices ← []
  for d in draftLines (en orden):
    p ← vendibles[d.productId]
    if p no existe:
      if d.unitPriceCents no existe: notices += «“d.productName” ya no está en el menú»         # recién agregada
      else:                          notices += «Se quitó “d.productName”: ya no está en el menú»
      continue                                                                                   # la línea sale
    if d.unitPriceCents existe y ≠ p.priceCents:
      notices += «Cambió el precio de “d.productName”: ahora cuesta formatPrice(p.priceCents)»
    lines += { productId, productName: p.name, categoryName: p.categoryName,
               quantity: d.quantity, unitPriceCents: p.priceCents,
               subtotalCents: p.priceCents × d.quantity }                                        # enteros, exacto (RNF-2)
  totalCents ← Σ lines.subtotalCents
  menuChanged ← notices no está vacío                                                            # solo cambios de precio o retiros
  return { lines, totalCents, notices, menuChanged }
```

Un cambio de nombre o de categoría no produce aviso: la línea toma los datos nuevos (RF-5). El orden de los avisos es el de las líneas.

### 5.2 Cambiar la venta en preparación (RF-2 a RF-5, RF-9)

```text
POST /api/sales/quote { lines }:
  validate(saleQuoteRequestSchema)       # 1–99 unidades, hasta 30 líneas, sin productos repetidos
    fallo de límites → 400 VALIDATION_ERROR { fields.lines: mensaje de RF-3 }
  menu   ← currentMenu(db)               # getCurrentMenu de SPEC-002 (D-1)
  priced ← priceDraft(lines, menu)
  return 200 { lines: priced.lines, totalCents, notices, menu }      # menu: los productos para vender (D-2)
```

La interfaz arma la lista deseada (agregar, «+», «−», «Quitar») y la envía; la API valida, calcula y responde. Así la interfaz nunca calcula un importe, y un cambio que no cumple los límites no cambia nada (RF-3). Abrir o recargar «Nueva venta» envía la venta en preparación conservada, o una vacía, y recibe con ella los productos para vender (RF-2, RF-12).

### 5.3 Registrar la venta (RF-6 a RF-11)

```text
POST /api/sales { draftId, paymentMethod, lines }:           # cada línea con unitPriceCents (lo que se mostraba)
  validate(registerSaleRequestSchema)                        # vacía → 400 { fields.lines: «Agrega al menos un producto» }
                                                             # sin medio → 400 { fields.paymentMethod: «Elige el medio de pago» }
  user ← request.sessionUser                                 # requireSession (SPEC-001)
  previa ← findSaleByDraftId(db, draftId)
  if previa:                                                 # RF-8: reintento o doble clic, sin mirar el menú
    if previa.registeredBy.userId ≠ user.id: fail 400 VALIDATION_ERROR { fields.draftId }
    return 200 { sale: previa }
  menu   ← currentMenu(db)
  priced ← priceDraft(lines, menu)
  if priced.menuChanged: fail 409 MENU_CHANGED «El menú cambió. Revisa la venta antes de registrarla»
  try:
    sale ← db.transaction(tx →
      number ← UPDATE sale_counter SET last_number = last_number + 1 RETURNING last_number   # bloquea la fila
      insertSale(tx, { number, draftId, registeredAt: clock.now(), user, paymentMethod, priced })   # venta y líneas
    )
    return 201 { sale }
  on unique_violation(sales_draft_id_key):                   # el otro clic ganó entre la búsqueda y el INSERT
    return 200 { sale: findSaleByDraftId(db, draftId) }
```

- **Número sin saltos (RF-10).** El `UPDATE` de `sale_counter` bloquea su única fila hasta el fin de la transacción: dos registros a la vez se ordenan, y si uno falla, su `ROLLBACK` deshace también el número. Para un local con una o dos personas, registrar de a una venta no demora a nadie.
- **Precio vigente (RF-7).** Se lee justo antes de la transacción y se compara con lo que se mostraba. Si el dueño guarda un precio nuevo en ese mismo instante, la venta queda con el precio que estaba vigente al leerlo, que es el que se cobró; leerlo dentro de la transacción no cambiaría nada, porque Ventas no bloquea el menú (en `READ COMMITTED`, cada lectura ve lo ya confirmado).
- **Ante `409 MENU_CHANGED`**, la interfaz vuelve a pedir el cálculo (§5.2) con las mismas líneas, muestra el mensaje y los avisos de cada línea, y deja que la persona registre de nuevo (RF-7).
- **Medio de pago (RF-6, RF-8).** Se guarda el de la petición. Un reintento con el mismo `draftId` devuelve la venta ya registrada con su medio de pago, aunque la petición traiga otro.
- **Quién (RF-11).** Se guardan `user.id`, `user.displayName` y `user.role` de la sesión; si después la cuenta se elimina, `registered_by_user_id` pasa a `NULL` y el nombre y el rol quedan.

### 5.4 Venta en preparación en la interfaz (RF-3 a RF-9, RF-12 a RF-14)

```text
estado: { draftId, lines (las del último cálculo), totalCents, notices, menu, paymentMethod (null al empezar),
          busy, error, confirmation }

abrir NewSalePage:    guardada ← draftStore.load(user.id)           # otra cuenta → se descarta (RF-13)
                      draftId ← guardada?.draftId ?? crypto.randomUUID()
                      calcular(guardada?.lines ?? [])
agregar(producto):    si ya está: su cantidad + 1; si no: al final { productId, productName, quantity: 1 }
«+» / «−» / «Quitar»: la cantidad ± 1 o sin la línea                  # «−» deshabilitado con cantidad 1
calcular(deseadas):   busy; r ← client.quote({ lines: deseadas })
                      ok              → lines, totalCents, notices, menu ← r; draftStore.save(user.id, draftId, r.lines)
                      VALIDATION_ERROR → mostrar fields.lines; nada cambia                    # RF-3
                      NETWORK_ERROR    → «No hay conexión. Inténtalo de nuevo»; nada cambia   # RF-9
elegir medio de pago: paymentMethod ← 'cash' | 'qr'; draftStore.save(…)                     # RF-6, RF-12
registrar:            deshabilitado sin líneas o sin paymentMethod (RF-6)
                      busy (sin cambios mientras tanto, RF-8); s ← client.register({ draftId, paymentMethod, lines })
                      ok           → confirmation ← s; draftStore.clear(); draftId nuevo; lines ← []; paymentMethod ← null
                      MENU_CHANGED → mostrar el mensaje; calcular(lines)                      # RF-7
                      NETWORK_ERROR→ «No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces»
                                     se conservan draftId y lines: el reintento usa el mismo draftId (RF-8)
descartar:            DiscardSaleDialog → draftStore.clear(); draftId nuevo; lines ← []      # RF-14
```

- `busy` deshabilita todas las acciones hasta la respuesta, para que cada cambio se muestre calculado antes del siguiente (RF-4). Los avisos se muestran hasta el siguiente cálculo o registro (RF-5).
- La confirmación vive solo en el estado de la página: desaparece al agregar un producto, al salir o al recargar (RF-6).
- **Historia 1:** `draftStore` es un almacén en memoria de la página. **Historia 2:** se sustituye por el de `localStorage` (D-8), con la misma interfaz.

### 5.5 Conservar la venta en preparación (RF-12, RF-13; D-8, D-9)

```text
draftStore (localStorage, clave kofi:sales:draft):
  guarda { userId, draftId, paymentMethod, lines: [{ productId, productName, quantity, unitPriceCents }] }  # sin totales
  load(userId):  d ← leer; si d.userId ≠ userId: borrar y devolver null; si no, d
  save / clear:  escribir o borrar; las demás pestañas reciben el evento storage y vuelven a leer   # RF-12
  si localStorage no está disponible o tiene datos inválidos: se comporta como vacío

fin de la sesión (SessionProvider):
  logout()                          → onSessionEnd('logout')      → discardStoredSaleDraft()   # RF-13
  401 SESSION_TERMINATED            → onSessionEnd('terminated')  → discardStoredSaleDraft()   # RF-13
  401 SESSION_EXPIRED               → nada: la misma cuenta la recupera al volver (load)       # RF-13
```

Al recuperar una venta guardada, `calcular` la envía con los precios que se mostraban, así que la API avisa de los cambios del menú ocurridos mientras tanto (RF-12).

### 5.6 Fechas (Datos de una venta registrada; D-7)

```text
formatDateTime(iso):   # contrato, en hora de Bolivia
  partes ← Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit',
                                          year: 'numeric', hour: '2-digit', minute: '2-digit',
                                          hourCycle: 'h23' }).formatToParts(new Date(iso))
  return día/mes/año hora:minutos                          # «24/10/2026 14:05»
```

Se arma con `formatToParts` para no depender de los separadores que cada navegador usa en `es-BO`.

## 6. Contrato de la API

Ubicación: **`packages/contracts/src/sales.ts`** (esquemas de Zod y tipos), **`packages/contracts/src/datetime.ts`** (`formatDateTime`) y el código nuevo en **`packages/contracts/src/errors.ts`**. Es la única fuente del contrato: la API valida con estos esquemas y la interfaz los usa para tipar su cliente y su cliente simulado.

### 6.1 Constantes, funciones y tipos

| Nombre | Valor / forma | RF |
| --- | --- | --- |
| `SALE_MAX_LINES` | `30` | RF-3 |
| `SALE_MAX_QUANTITY` | `99` | RF-3 |
| `SALE_MESSAGES` | Textos de la API: `maxQuantity` «Una venta puede tener como máximo 99 unidades de cada producto», `maxLines` «Una venta puede tener como máximo 30 productos distintos», `empty` «Agrega al menos un producto», `menuChanged` «El menú cambió. Revisa la venta antes de registrarla», `draftTaken` «Esta venta ya se registró desde otra cuenta»; y dos que solo se ven si se esquiva la interfaz: `invalidLine` «Revisa los productos de la venta» (cantidad menor que 1, precio o identificador inválidos, producto repetido) e `invalidSale` «Revisa los datos de la venta» (`draftId` inválido) | RF-3, RF-6–RF-8 |
| `PAYMENT_METHODS` | `['cash', 'qr']` (D-13) | RF-6 |
| `paymentMethodSchema` | `enum` de `PAYMENT_METHODS`; falta o valor desconocido → `SALE_MESSAGES.paymentMethod` «Elige el medio de pago» | RF-6 |
| `formatPaymentMethod` | `'cash'` → «Efectivo», `'qr'` → «QR» | RF-6 |
| `BOLIVIA_TIME_ZONE` | `'America/La_Paz'` | Datos de una venta registrada |
| `formatDateTime` | §5.6 | RF-6 |
| `saleDraftLineSchema` | `{ productId: uuid, productName: string 1–40, quantity: int 1–99 (maxQuantity), unitPriceCents?: int 1–100000 }` | RF-3, RF-5 |
| `saleQuoteRequestSchema` | `{ lines: saleDraftLine[] }`, como máximo 30 (maxLines) y sin `productId` repetidos | RF-3, RF-4 |
| `registerSaleRequestSchema` | `{ draftId: uuid, paymentMethod: PaymentMethod, lines: saleDraftLine[] }` con `unitPriceCents` obligatorio, de 1 (empty) a 30 líneas y sin repetidos | RF-6–RF-8 |
| `saleLineSchema` | `{ productId: uuid, productName: string, categoryName: string, quantity: int 1–99, unitPriceCents: int 1–100000, subtotalCents: int ≥ 1 }` | RF-4, RF-11 |
| `saleQuoteSchema` | `{ lines: SaleLine[] (≤ 30), totalCents: int ≥ 0, notices: string[], menu: CurrentMenuResponse['categories'] }` | RF-2, RF-4, RF-5 |
| `saleSchema` | `{ id: uuid, number: int ≥ 1, registeredAt: string ISO 8601 con zona, registeredBy: { userId: uuid \| null, displayName: string, role: Role }, lines: SaleLine[] (1–30), totalCents: int ≥ 1, paymentMethod: PaymentMethod }` | RF-6, RF-11 |
| `saleResponseSchema` | `{ sale: Sale }` | RF-6, RF-8 |

`menu` reutiliza el esquema `currentMenuResponseSchema` de `menu.ts` (SPEC-002): es el menú vigente, agrupado y ordenado como lo entrega `getCurrentMenu`.

### 6.2 Rutas

Las dos usan `requireSession` (SPEC-001) y pueden responder sus tres `401` (`SESSION_MISSING`, `SESSION_EXPIRED`, `SESSION_TERMINATED`). Las pueden usar el dueño y el cajero (RF-1).

| Ruta | Entrada | Respuesta correcta | Errores propios | RF |
| --- | --- | --- | --- | --- |
| `POST /api/sales/quote` | `saleQuoteRequestSchema` | `200 saleQuoteSchema`: líneas calculadas, total, avisos y productos para vender | `400 VALIDATION_ERROR` (`fields.lines`: límites de RF-3) | RF-2–RF-5, RF-12 |
| `POST /api/sales` | `registerSaleRequestSchema` | `201 saleResponseSchema` si se registró ahora; `200 saleResponseSchema` si esa venta en preparación ya estaba registrada | `400 VALIDATION_ERROR` (`fields.lines`: vacía o límites; `fields.paymentMethod`: sin medio de pago; `fields.draftId`: registrada desde otra cuenta), `409 MENU_CHANGED` | RF-6–RF-11 |

`400 VALIDATION_ERROR` lleva `message: "Revisa los datos"`, como en SPEC-001 y SPEC-002; todos los fallos de las líneas se informan en `fields.lines` con un solo mensaje, el primero de RF-3 o RF-6 que se incumpla. El texto de `fields.draftId` es «Esta venta ya se registró desde otra cuenta»: solo aparece si se esquiva la interfaz.

Ejemplos:

```json
POST /api/sales/quote   { "lines": [
                          { "productId": "c4e1…-07", "productName": "Café americano", "quantity": 2, "unitPriceCents": 1200 },
                          { "productId": "a3f0…-5d", "productName": "Empanada", "quantity": 1 } ] }
200                     { "lines": [
                          { "productId": "c4e1…-07", "productName": "Café americano", "categoryName": "Bebidas calientes",
                            "quantity": 2, "unitPriceCents": 1250, "subtotalCents": 2500 },
                          { "productId": "a3f0…-5d", "productName": "Empanada", "categoryName": "Salados",
                            "quantity": 1, "unitPriceCents": 800, "subtotalCents": 800 } ],
                          "totalCents": 3300,
                          "notices": [ "Cambió el precio de “Café americano”: ahora cuesta Bs 12,50" ],
                          "menu": [ { "id": "1a7e…-c2", "name": "Bebidas calientes", "products": [ { "id": "c4e1…-07", "name": "Café americano", "priceCents": 1250 } ] },
                                    { "id": "77b0…-e4", "name": "Salados", "products": [ { "id": "a3f0…-5d", "name": "Empanada", "priceCents": 800 } ] } ] }

POST /api/sales/quote   { "lines": [ { "productId": "c4e1…-07", "productName": "Café americano", "quantity": 100, "unitPriceCents": 1250 } ] }
400                     { "error": { "code": "VALIDATION_ERROR", "message": "Revisa los datos",
                          "fields": { "lines": "Una venta puede tener como máximo 99 unidades de cada producto" } } }

POST /api/sales         { "draftId": "4f2e…-11", "paymentMethod": "cash", "lines": [
                          { "productId": "c4e1…-07", "productName": "Café americano", "quantity": 2, "unitPriceCents": 1250 },
                          { "productId": "a3f0…-5d", "productName": "Empanada", "quantity": 1, "unitPriceCents": 800 } ] }
201                     { "sale": { "id": "9b1c…-a0", "number": 1, "registeredAt": "2026-10-24T18:05:12.000Z",
                          "registeredBy": { "userId": "7d3a…-c9", "displayName": "Ana", "role": "cashier" },
                          "lines": [ … las dos líneas calculadas … ], "totalCents": 3300, "paymentMethod": "cash" } }

POST /api/sales         { "draftId": "c8a9…-02", "lines": [ … ] }          (sin paymentMethod)
400                     { "error": { "code": "VALIDATION_ERROR", "message": "Revisa los datos",
                          "fields": { "paymentMethod": "Elige el medio de pago" } } }

POST /api/sales         (el mismo cuerpo otra vez)
200                     { "sale": { "id": "9b1c…-a0", "number": 1, … } }

POST /api/sales         (el precio del café cambió a Bs 13,00 antes del primer intento)
409                     { "error": { "code": "MENU_CHANGED", "message": "El menú cambió. Revisa la venta antes de registrarla" } }
```

### 6.3 Superficie para otros módulos (RF-11)

`modules/sales/index.ts` de la API exporta `listRegisteredSales(db, { from?, to? })`: las ventas registradas con `registeredAt` en `[from, to)`, ordenadas por número, con todos los datos de `saleSchema`. Es lo que usarán el Dashboard (004) y el Historial (005), que definirán sus propias rutas.

### 6.4 Errores sin esquema propio

- **Sin conexión (RF-9):** como en SPEC-001, `api-fetch.ts` convierte el error de red en `NETWORK_ERROR`. Las pantallas de Ventas muestran su propio texto al registrar, «No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces», y el de `NETWORK_ERROR_MESSAGE` en los demás cambios.
- **Error inesperado:** `500 INTERNAL_ERROR`, como en SPEC-001. Un `KS001` o `KS002` de la base solo puede salir de un error de programación y llega así.

## 7. Decisiones técnicas

Todas son **decisiones delegadas** (modo delegado, `AGENTS.md`): quedan aprobadas al fusionar el PR de definición.

| # | Decisión | Por qué | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **El menú vigente llega a Ventas como una función inyectada:** `salesPlugin` y el servicio reciben `currentMenu: (db: Database) => Promise<CurrentMenu>`, donde `CurrentMenu` es `CurrentMenuResponse['categories']` del contrato, y `app.ts` les pasa `getCurrentMenu` de `modules/menu/index.ts` (SPEC-002 RF-15, T016), que SPEC-002 fija como `getCurrentMenu(db)`. Si su tipo de retorno difiere, T020 lo adapta en `app.ts`. Las pruebas pasan una función falsa con un menú fijo | `getCurrentMenu` es de la historia 1 de Menú y aún no está en `develop`; así la Base común y la API de las historias se prueban sin ella, y `sales` no conoce cómo guarda el menú sus datos (`docs/architecture.md` §4.2) | Leer `products` y `categories` desde `sales`: duplicaría la regla del menú vigente y rompería la frontera entre módulos. Esperar a 002 US1 para empezar la Base común: frena 003 sin motivo | RF-2, RF-5, RF-7 |
| D-2 | **`POST /api/sales/quote` devuelve también los productos para vender** (`menu`), con el mismo menú con el que calculó las líneas | Un solo pedido por cambio da a la vez el total y la lista actualizada (RF-5 pide actualizarla), siempre coherentes entre sí; y la interfaz de Ventas no depende de `GET /api/menu`, que es de la historia 3 de Menú | Usar `GET /api/menu` (SPEC-002 T031) además del cálculo: dos pedidos por cambio, que pueden ver menús distintos, y una dependencia de la última historia de 002 | RF-2, RF-4, RF-5 |
| D-3 | **La interfaz envía la lista deseada y la API la calcula entera** cada vez (`quote`), sin guardar nada en la base hasta registrar | Cumple el principio 3 sin estado en el servidor: la API valida límites, calcula subtotales y total y detecta cambios de precio comparando con `unitPriceCents` mostrado. Con hasta 30 líneas y 200 productos, calcular todo es inmediato (RNF-3) | Guardar la venta en preparación en la base y cambiarla línea a línea: tablas y rutas de más, y habría que borrarla al cerrar sesión desde el módulo `auth` | RF-3–RF-5, RF-7 |
| D-4 | **Integridad en la base:** `CHECK` de subtotal, disparador diferido que compara el total con la suma de las líneas, disparadores que impiden modificar o borrar ventas y líneas, y contador de una fila para el número | El principio 5 pide atomicidad y RF-11 que una venta registrada no cambie; la base lo garantiza aunque un error de programación lo intente. El contador bloqueado da números sin saltos (RF-10), que una secuencia de PostgreSQL no garantiza | Una `SEQUENCE`: deja huecos cuando una transacción falla. `max(number) + 1`: dos transacciones a la vez leen el mismo máximo | RF-6, RF-9–RF-11, RNF-2 |
| D-5 | **Un registro por venta en preparación:** la interfaz crea un `draftId` (`crypto.randomUUID()`) al empezar cada venta en preparación y lo envía al registrar; `sales.draft_id` es única. Un reintento con el mismo `draftId` devuelve la venta ya registrada (`200`), sin volver a mirar el menú | Cubre el doble clic y el reintento tras perder la respuesta (RF-8). Comprobar antes del menú evita rechazar con `409` una venta que ya existe (spec, hallazgo 9 de la revisión) | Deshabilitar el botón: no cubre la respuesta perdida. Detectar duplicados por contenido y hora: dos ventas iguales seguidas son normales en una cafetería | RF-8 |
| D-6 | **`409 MENU_CHANGED` sin datos extra:** ante el rechazo, la interfaz vuelve a llamar a `quote` con las mismas líneas para obtener los avisos y la lista nueva | Mantiene el formato común de errores (`errors.ts`) sin campos propios de un módulo; el caso es raro y un pedido más no se nota | Incluir el cálculo nuevo dentro del error: obliga a ampliar `apiErrorSchema` para un solo caso | RF-7 |
| D-7 | **Fechas como ISO 8601 en UTC** en el contrato (`registeredAt`) y **`formatDateTime` en el contrato**, en hora de Bolivia (`America/La_Paz`) | Igual que `formatPrice` para los importes (SPEC-002 D-2): una sola forma de mostrar fechas para Ventas, Dashboard e Historial, que no depende de la zona horaria de la computadora. Formatear no es calcular | Que la API envíe el texto ya formateado: el Dashboard y el Historial necesitan la fecha para agrupar y filtrar | RF-6, RF-11 |
| D-8 | **La venta en preparación se guarda en `localStorage`** (`kofi:sales:draft`), con la cuenta (`userId`), el `draftId` y las líneas tal como se mostraron, sin totales; las pestañas se sincronizan con el evento `storage` | Conserva la venta al recargar, al cerrar el navegador y al vencer la sesión (RF-12, RF-13), es independiente por navegador (RF-10) y compartida entre sus pestañas. No guarda nada oficial: al recuperarla, la API vuelve a calcularla | `sessionStorage`: se pierde al cerrar la pestaña y no se comparte entre pestañas. Guardarla en la base por cuenta: la compartirían dos navegadores de la misma cuenta, contra RF-10 | RF-10, RF-12, RF-13 |
| D-9 | **`SessionProvider` recibe `onSessionEnd(reason)`** desde `routes.tsx` y lo llama al cerrar sesión (`'logout'`) y ante `SESSION_TERMINATED` (`'terminated'`), no al vencer; `routes.tsx` le pasa `discardStoredSaleDraft` de `modules/sales/index.ts` | `auth` no conoce a `sales`, y otros módulos podrán añadir lo suyo en `routes.tsx` sin tocar `auth`, como con `homeLink` (SPEC-002 D-8) | Que `sales` detecte el cierre leyendo la sesión: no distingue un cierre de un vencimiento. Un registro global en `shared/`: efectos al importar un módulo, difíciles de probar | RF-13 |
| D-10 | **`SalesClientProvider` y escenarios de desarrollo:** como en SPEC-002 (D-10, D-11), la interfaz obtiene el cliente de un contexto que siempre lo recibe; `main.tsx` provee el real, también en desarrollo, y el simulado con su selector solo con `?escenarios=ventas`, combinable (`?escenarios=acceso,menu,ventas`). El cliente simulado tiene un menú en memoria, multiplica precio por cantidad para responder `quote`, numera las ventas y valida con los esquemas del contrato; los escenarios son «Menú cargado», «Menú vacío», «Cambió un precio», «Producto retirado», «Sin conexión» y «Respuesta perdida» | Permite trabajar la interfaz sin la API (`docs/architecture.md` §4.5) y recorrer los avisos de RF-5 y RF-7. Las cifras oficiales solo las calcula la API; el cliente simulado no llega al build | Respuestas fijas por escenario sin cálculo: no se podría armar una venta en la pantalla. Reimplementar las reglas completas de la API: duplicaría su lógica | RF-2–RF-9 |
| D-11 | **Ruta `/ventas/nueva`** con `homeLink: 'Nueva venta'` y los dos roles | Sigue `docs/architecture.md` §6.6; deja `/ventas` libre para el Historial | `/venta` o `/ventas`: se confundiría con la consulta de ventas de 005 | RF-1 |
| D-13 | **Medio de pago con códigos estables en inglés** (`'cash'`, `'qr'`) en la base y el contrato, y **`formatPaymentMethod` en el contrato** para mostrarlos («Efectivo», «QR»). Es obligatorio en `POST /api/sales` y no tiene valor por defecto; la interfaz lo guarda con la venta en preparación | Como los roles (`owner`, `cashier`) y los códigos de error: los datos no dependen del texto que se muestra, y Dashboard e Historial agruparán por código. Un `CHECK` en la base impide otros valores. Sin valor por defecto, una venta por QR nunca queda como efectivo por olvido (spec, «Aclaraciones») | Guardar el texto «Efectivo»/«QR»: cambiar un texto obligaría a migrar datos. Una tabla de medios de pago: hoy son dos fijos y la especificación no pide administrarlos | RF-6, RF-7, RF-11, RF-12 |
| D-12 | **Medición de RNF-3** en un despliegue de comprobación con los 200 productos de `seed-menu.ts` (SPEC-002 T034), nunca en producción | RNF-3 fija el tamaño del menú y el script ya existirá; mide abrir, cambiar y registrar | Medir con el menú real: todavía no existe (duda abierta de SPEC-002) | RNF-3 |

### 7.1 Dependencias

Ninguna nueva. Se usan las de [`specs/001-acceso/plan.md`](../001-acceso/plan.md#71-dependencias-por-paquete) §7.1.

## 8. Estrategia de tests

### 8.1 Niveles

Los de SPEC-001 y SPEC-002:

| Nivel | Herramienta | Qué cubre | Dónde |
| --- | --- | --- | --- |
| Unitario | Vitest | Esquemas del contrato y `formatDateTime`; `priceDraft` | `packages/contracts/src/sales.test.ts`, `datetime.test.ts`; `apps/api/src/modules/sales/sales.pricing.test.ts` |
| Integración de la API | Vitest + `app.inject` + PGlite | Migración y disparadores, repositorio, servicio y rutas con la base real en memoria y un menú vigente falso | `*.integration.test.ts` en `apps/api/src/modules/sales/` y `shared/database/` |
| Componentes de la interfaz | Vitest + Testing Library + `sales-demo-client` | Productos, líneas, avisos, registro, confirmación, conservación y descarte | `*.test.tsx` junto a cada componente y `state/*.test.ts` |
| Punta a punta | Playwright contra `vite preview` y `e2e-server.ts` | Cada historia completa, con las cuentas de SPEC-001 y el menú cargado con la ruta de pruebas de SPEC-002 | `e2e/` |

### 8.2 Punta a punta por historia

**US1 — Registrar una venta pagada** (`e2e/sales-us1-registrar-venta.spec.ts`)

1. Con un menú cargado (Café americano Bs 12,50; Empanada Bs 8,00), ingresar como cajero → «Nueva venta» → se ven las categorías y los productos con su precio (RF-1, RF-2).
2. Elegir dos veces el café y una la empanada → «Café americano × 2 · Bs 25,00», «Empanada × 1 · Bs 8,00» y «Bs 33,00»; «−» deshabilitado en la empanada (RF-3, RF-4).
3. «Registrar venta» deshabilitado sin medio de pago; elegir «Efectivo» y «Registrar venta» con doble clic → «Venta N.º 1 registrada · Bs 33,00 · Efectivo · [fecha y hora del reloj de la API de pruebas]» y venta vacía, sin medio de pago elegido; la API de pruebas tiene una sola venta, con el cajero, las dos líneas, el total y `cash` (RF-6, RF-8, RF-11).
4. Agregar el café; el dueño cambia su precio a Bs 13,00 (petición con su sesión) → elegir «QR» y «Registrar venta» → «El menú cambió…» y «Cambió el precio de “Café americano”: ahora cuesta Bs 13,00»; registrar de nuevo → venta N.º 2 por Bs 13,00 con «QR»; la venta N.º 1 sigue en Bs 12,50 y con `cash` (RF-5, RF-6, RF-7, RF-11).
5. Cortar la red y agregar un producto → «No hay conexión. Inténtalo de nuevo» y la venta sin cambios (RF-9).

**US2 — No perder la venta en preparación** (`e2e/sales-us2-conservar-venta.spec.ts`)

1. Armar una venta de dos productos y elegir «QR», recargar, ir a la pantalla inicial y volver → las mismas líneas y «QR» elegido; una segunda pestaña muestra la misma venta (RF-12).
2. Adelantar el reloj de la API 12 horas, agregar un producto → ingreso con el aviso de SPEC-001; volver a entrar con la misma cuenta → «Nueva venta» con la venta conservada (RF-13).
3. Cerrar sesión y volver a entrar → «Nueva venta» vacía (RF-13).
4. Armar una venta, adelantar el reloj 12 horas para que venza la sesión y entrar con otra cuenta → «Nueva venta» vacía; volver a entrar con la primera cuenta → también vacía, porque se descartó (RF-13).
5. «Descartar venta» → «Volver» la conserva; «Descartar» la vacía y no registra nada (RF-14).

La API de E2E carga el menú con la ruta de SPEC-002 (`POST /api/__test/menu`, 002 T023) y expone `GET /api/__test/sales`, que devuelve `listRegisteredSales`; las dos solo existen en `e2e-server.ts`.

### 8.3 Requisitos no funcionales

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Las pruebas de componentes y E2E comparan los textos en español tal como los define la especificación |
| RNF-2 | Unitarias de `priceDraft` (30 líneas de 99 unidades a 100000 → 297000000 exactos); integración: el disparador rechaza un total distinto de la suma y un subtotal distinto de precio por cantidad |
| RNF-3 | Medición manual en Pulido (D-12): con 200 productos y el servicio reactivado, 20 aperturas de «Nueva venta», 20 cambios y 20 registros; al menos 19 de cada 20 aperturas y registros por debajo de 2 s y 19 de cada 20 cambios por debajo de 1 s. El resultado se anota en el PR de pulido |
| RNF-4 | Componentes: se arma y se registra una venta solo con teclado (Tab, Intro y barra espaciadora) |
| Criterio de 30 s | Medición manual en Pulido, junto con RNF-3 |

### 8.4 Datos

- Cada prueba de integración crea su propia base PGlite con las migraciones aplicadas (`createTestDatabase`). Las de la base insertan categorías y productos con SQL, porque las líneas exigen productos existentes; las del servicio y las rutas usan un menú vigente falso (D-1).
- Las carreras se prueban de forma determinista (como SPEC-002 D-5): se inserta una venta con el mismo `draftId` entre la búsqueda y el `INSERT` y se comprueba que la respuesta es la venta existente; y se comprueba que un fallo dentro de la transacción no consume número.

### 8.5 Cobertura por RF

| RF | Contrato / integración de la API | Componentes de la interfaz | E2E |
| --- | --- | --- | --- |
| RF-1 | sin sesión → `401` de SPEC-001 en las dos rutas, sin ventas nuevas; dueño y cajero registran | ruta `/ventas/nueva` con `homeLink` y los dos roles | US1-1 |
| RF-2 | `quote` devuelve el menú vigente ordenado; menú vacío → `menu: []` | `ProductPicker`: categorías, precios y aviso de menú vacío | US1-1 |
| RF-3 | límites 99 y 30 con sus mensajes; repetidos rechazados | agregar, sumar, «−» deshabilitado en 1, «Quitar», mensaje de límite | US1-2 |
| RF-4 | `priceDraft`: subtotales y total; venta vacía → `Bs 0,00` | `SaleDraftLines` muestra lo calculado; acciones deshabilitadas mientras calcula | US1-2 |
| RF-5 | avisos de precio, retiro y producto recién agregado no disponible; nombre nuevo sin aviso | avisos visibles hasta el siguiente cambio | US1-4 |
| RF-6 | `201` con número, fecha, cuenta, líneas, total y medio de pago; vacía o sin medio de pago → `400` | `PaymentMethodPicker` sin valor por defecto; `SaleConfirmation` con `formatPaymentMethod` y `formatDateTime`; registrar deshabilitado sin líneas o sin medio de pago | US1-3, US1-4 |
| RF-7 | `409 MENU_CHANGED` sin registrar; con nombre nuevo se registra | mensaje y nuevo cálculo tras el `409` | US1-4 |
| RF-8 | mismo `draftId` → `200` con la misma venta, aunque el menú cambie; carrera simulada | acciones deshabilitadas mientras registra; reintento con el mismo `draftId` | US1-3 |
| RF-9 | un fallo a mitad no deja venta ni consume número; `KS001` | mensajes sin conexión al cambiar y al registrar | US1-5 |
| RF-10 | números 1, 2, 3 consecutivos; un fallo no deja hueco | — | — |
| RF-11 | `listRegisteredSales`; la venta no cambia tras cambiar el menú; eliminar la cuenta deja nombre y rol; `KS002` | — | US1-3, US1-4 |
| RF-12 | — | `draft-store`: recarga con líneas y medio de pago, otra pestaña (`storage`), datos inválidos | US2-1 |
| RF-13 | — | `draft-store` con otra cuenta; `SessionProvider` llama a `onSessionEnd` al cerrar y ante `SESSION_TERMINATED`, no al vencer | US2-2 a US2-4 |
| RF-14 | — | `DiscardSaleDialog`: «Volver» y «Descartar» | US2-5 |

## 9. Decisiones globales en `docs/architecture.md`

Afectan a todo el proyecto. En modo delegado se aplican en este mismo PR y se indican en «Observaciones».

1. **Fechas y horas (§6.8, nuevo; D-7):** la API toma la hora de `clock.ts` y la guarda como `timestamptz`; en el contrato viaja como texto ISO 8601 en UTC, y se muestra con `formatDateTime` de `packages/contracts`, en hora de Bolivia («24/10/2026 14:05»).
2. **Trabajo sin guardar al terminar la sesión (§6.2; D-9):** `SessionProvider` recibe `onSessionEnd` desde `routes.tsx` y lo llama al cerrar sesión y cuando la sesión termina por un cambio de la cuenta, no al vencer; cada módulo decide ahí qué descarta.
3. **Datos de otro módulo en la API (§4.2; D-1):** un módulo puede recibir como función, desde `app.ts`, lo que exporta el `index.ts` de otro, para probarse sin él y no depender de cuándo se implementa.

## 10. Cambios tras el análisis de consistencia

Correcciones del 2026-10-24 a los hallazgos menores del análisis (ninguno bloqueante):

| Hallazgo | Corrección | Dónde |
| --- | --- | --- |
| 1 | La venta en preparación de otra cuenta se descarta al abrir «Nueva venta» | `spec.md` RF-13 (el plan ya lo hacía así, §5.5) |
| 2 | `currentMenu` recibe la `Database` y se lee antes de la transacción del registro, como fija SPEC-002 (`getCurrentMenu(db)`) | §5.3, D-1 |
| 3 | T021 depende también de la edición del menú (SPEC-002 T017) | `tasks.md` |
| 4 | La prueba de HU-2 sale a la pantalla inicial, no a «Ver menú» (SPEC-002 US3) | `spec.md` HU-2, §8.2 |
| 5 | RNF-1 en la cobertura de `tasks.md` | `tasks.md` |

## 11. Cambios tras las respuestas a las dudas abiertas

El 2026-10-24 la persona respondió que Kofi cobra en efectivo y con QR y que no emite factura. `spec.md` añadió el medio de pago a cada venta registrada (RF-6, RF-7, RF-11, RF-12). En este plan:

| Cambio | Dónde |
| --- | --- |
| Columna `sales.payment_method` (`'cash'` o `'qr'`) | §4 |
| `paymentMethod` en el registro, en la venta y en la venta en preparación guardada | §5.3 a §5.5 |
| `PAYMENT_METHODS`, `paymentMethodSchema`, `formatPaymentMethod` y el texto «Elige el medio de pago»; `paymentMethod` en `registerSaleRequestSchema` y `saleSchema`, con su `400` | §6.1, §6.2 |
| `PaymentMethodPicker.tsx` | §3 |
| D-13 | §7 |
| E2E y cobertura de RF-6 y RF-12 | §8.2, §8.5 |

Como la Base común ya estaba implementada, `tasks.md` añade sus tareas de corrección (T028 a T031). La migración `003_sales.sql` se corrige en su sitio: todavía no está en `develop` ni en ninguna base.
