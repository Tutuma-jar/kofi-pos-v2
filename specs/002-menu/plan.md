# Plan — SPEC-002 Menú

Estado: aprobado (modo delegado) · Fecha: 2026-10-24 · Especificación: [`spec.md`](spec.md)

Añade el módulo `menu` a las dos aplicaciones y al contrato, sobre el monorepo, las herramientas y las decisiones globales que dejó [SPEC-001](../001-acceso/plan.md). No crea paquetes ni cambia el despliegue.

**Dependencia de SPEC-001.** Las rutas y pantallas del menú necesitan la sesión de Acceso: `requireSession` en la API (001, T022), `SessionProvider`, `useSession` y `RequireSession` en la interfaz (001, T027), la pantalla inicial y su layout (001, T029) y una `buildApp` que reciba la base de datos (001, T030). Todo eso es de la historia 1 de Acceso, que **ya está en `develop`** (#15, fusionado el 2026-10-24, junto con la historia 2 en #17). Por eso:

- La Preparación y la Base común de este plan **no dependen** de esas piezas: contrato, migración, repositorios, cliente de la interfaz, cliente simulado y rutas provisionales. Se integraron con ellas al traer `develop` (T037).
- Las historias de Menú empiezan cuando se fusione el PR de definición de 002: la dependencia de SPEC-001 ya está cumplida.

## 1. Versión de la constitución

Se planifica con la **versión 2.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-24).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: se usan las de SPEC-001 (§7.1 de su plan). La comparación y el orden de los nombres usan `Intl.Collator` y `String.prototype.normalize`, que vienen con Node 24 y los navegadores (D-4). |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF (§3 a §8), y entre todas cubren RF-1 a RF-15 (tabla de cobertura, §8.5). |
| 3. Lógica separada de la interfaz | Sí | Validación, nombres repetidos, reglas de activación, orden y menú vigente se resuelven en la API. La interfaz envía lo escrito tal cual, muestra los mensajes de la API por campo y solo limita el largo con las constantes del contrato (RF-3, RF-6). Los precios viajan como centavos enteros y se muestran con `formatPrice` del contrato, una función de presentación que no suma ni calcula importes (D-2). El contrato vive en `packages/contracts/src/menu.ts`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.5), que se escribe antes del código de su tarea. |
| 5. Persistencia segura | Sí | Solo la capa `shared/database` de la API toca la base. Cada cambio del menú es una transacción (RF-7). La regla «ningún producto activo en una categoría inactiva» y los nombres únicos los garantiza también la base, con disparadores que bloquean la fila de la categoría e índices únicos, aunque dos sesiones guarden a la vez (RF-8, D-5). Esta especificación no añade secretos. |
| 6. Idioma | Sí | Código e identificadores en inglés (`menu`, `categories`, `products`, `priceCents`). Los mensajes al usuario están en español y los devuelve la API. Los precios están en bolivianos (BOB). Esta especificación no muestra fechas. |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
packages/contracts/src/
├── index.ts                     exporta también menu.ts
├── errors.ts                    nuevos códigos: FORBIDDEN, NOT_FOUND, CATEGORY_HAS_ACTIVE_PRODUCTS, CATEGORY_INACTIVE
└── menu.ts                      contrato del módulo (§6)
apps/api/src/
├── app.ts                       registra menuPlugin (US1)
├── shared/database/migrations/
│   └── 002_menu.sql             categories, products y disparadores (§4)
└── modules/menu/
    ├── index.ts                 superficie pública: menuPlugin, getCurrentMenu          RF-15
    ├── menu.routes.ts           rutas /api/menu/*, requireSession y requireOwner        RF-1, RF-7
    ├── categories.service.ts    crear, renombrar, desactivar y reactivar               RF-3, RF-10, RF-11
    ├── products.service.ts      crear, editar, desactivar y reactivar                  RF-4–RF-6, RF-8, RF-9, RF-11
    ├── menu.views.ts            administración y menú vigente, ordenados               RF-2, RF-14, RF-15
    ├── categories.repository.ts                                                        RF-3, RF-10, RF-12
    └── products.repository.ts                                                          RF-4, RF-5, RF-9, RF-12
apps/web/src/
├── main.tsx                     provee el cliente del menú; con ?escenarios=menu, el simulado y su selector (desarrollo)
├── scenarios.ts                 lee ?escenarios=acceso,menu (D-10)
├── routes.tsx                   /menu y /menu/administrar, con roles y enlace de la pantalla inicial
├── shared/http/api-fetch.ts     admite PUT
└── modules/
    ├── auth/pages/HomePage.tsx  muestra los enlaces que recibe, según el rol, y un aviso   RF-1, RF-13
    └── menu/
        ├── index.ts             superficie pública: MenuAdminPage, MenuPage
        ├── api/
        │   ├── menu-client.ts           interfaz MenuClient y cliente HTTP real
        │   └── MenuClientProvider.tsx   cliente en uso (real o simulado) por contexto
        ├── components/
        │   ├── MenuAdminList.tsx        categorías y productos con estado y acciones      RF-2, RF-9, RF-10
        │   ├── CategoryForm.tsx         crear y renombrar                                 RF-3, RNF-4
        │   ├── ProductForm.tsx          crear y editar                                    RF-4–RF-6, RNF-4
        │   ├── SaveStatus.tsx           «Cambios guardados» y falta de conexión           RF-7
        │   └── CurrentMenuList.tsx      menú vigente de solo lectura                      RF-14
        ├── pages/
        │   ├── MenuAdminPage.tsx        /menu/administrar (dueño)                         RF-1, RF-2
        │   └── MenuPage.tsx             /menu (dueño y cajero)                            RF-13, RF-14
        └── dev/
            ├── fixtures.ts
            ├── menu-demo-client.ts
            └── ScenarioPicker.tsx
e2e/
├── menu-us1-armar-menu.spec.ts
├── menu-us2-desactivar.spec.ts
└── menu-us3-consultar.spec.ts
apps/api/test/
└── seed-menu.ts                 carga 200 productos de prueba para medir RNF-3 (Pulido)
```

- Todas las rutas del módulo quedan bajo `/api/menu` (`docs/architecture.md` §6.1).
- `HomePage` sigue en `auth`, pero deja de saber qué enlaces muestra: los recibe desde `routes.tsx` (D-8). El plan de SPEC-001 preveía moverla a `shared/` cuando otro módulo la ampliara; con este cambio no hace falta, porque `auth` no importa nada de `menu`.
- Los formularios se abren dentro de la página de administración, sin rutas propias: así la pantalla de regreso de SPEC-001 (RF-11) es siempre `/menu/administrar`.
- `apps/api/src/modules/menu` tiene dos archivos de cada capa como máximo (`routes`, `service`, `repository`, `views`), así que no lleva subcarpetas (`docs/architecture.md` §4.3).

## 4. Modelo de datos

Migración `apps/api/src/shared/database/migrations/002_menu.sql`:

**`categories`** (RF-2, RF-3, RF-10 a RF-12)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | Normalizado (§5.1). `CHECK (char_length(name) BETWEEN 1 AND 30)` |
| `name_key` | `text` | `UNIQUE`. Clave de comparación de «Comparación de nombres» (§5.1), calculada por la API |
| `active` | `boolean` | `NOT NULL DEFAULT true` |
| `created_at`, `updated_at` | `timestamptz` | `DEFAULT now()` |

**`products`** (RF-2, RF-4 a RF-6, RF-9, RF-12, RF-15)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | Normalizado. `CHECK (char_length(name) BETWEEN 1 AND 40)` |
| `name_key` | `text` | `UNIQUE`: único en todo el menú, activos o inactivos (RF-12) |
| `category_id` | `uuid` | `NOT NULL`, FK → `categories`, `ON DELETE RESTRICT`, con índice |
| `price_cents` | `integer` | Precio en centavos de boliviano. `CHECK (price_cents BETWEEN 1 AND 100000)` (Bs 0,01 a Bs 1000,00) |
| `active` | `boolean` | `NOT NULL DEFAULT true` |
| `created_at`, `updated_at` | `timestamptz` | `DEFAULT now()` |

**Disparadores** (RF-8, RF-10, RF-11; D-5)

- `products_require_active_category` (`BEFORE INSERT OR UPDATE ON products`): si `NEW.active`, lee la categoría con `SELECT active … FOR SHARE` y, si está inactiva, lanza el error `KM001`.
- `categories_keep_active_products` (`BEFORE UPDATE ON categories`): si la categoría pasa de activa a inactiva y tiene productos activos, lanza el error `KM002`.

No hay `DELETE` en ninguna ruta, y `ON DELETE RESTRICT` impide borrar una categoría con productos (RF-12).

Ejemplo:

```text
categories
id          name                name_key            active
1a7e…-c2    Bebidas calientes   bebidas calientes   true
5d30…-9f    Jugos               jugos               true
88b2…-41    Temporada           temporada           false

products
id          name               name_key           category_id  price_cents  active
c4e1…-07    Café americano     cafe americano     1a7e…-c2     1250         true
f09a…-3b    Jugo de piña       jugo de piña       5d30…-9f     1500         true
2b6d…-e8    Api con pastel     api con pastel     88b2…-41     1800         false   ← inactivo, en categoría inactiva
```

## 5. Algoritmos relevantes

### 5.1 Nombres (Datos de una categoría y de un producto, «Comparación de nombres»)

Funciones puras del contrato, que usa la API:

```text
normalizeMenuName(raw):
  s ← raw.normalize('NFC')                     # «é» compuesta o con acento aparte, igual
  return trim(s) con cada racha de espacios reducida a uno

menuNameKey(name):                             # clave de comparación (columna name_key)
  s ← lowercase(normalizeMenuName(name), 'es')
  s ← s.replace('ñ', MARCA)                    # la «ñ» se protege: es otra letra
  s ← quitar las marcas diacríticas de s.normalize('NFD')   # tildes y diéresis
  return s.replace(MARCA, 'ñ')

compareMenuNames(a, b):                        # orden alfabético
  Intl.Collator('es', { sensitivity: 'base' }).compare(a, b)   # ñ después de n; ignora mayúsculas y tildes
```

Caracteres admitidos tras normalizar: `^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ0-9 .,'()&/-]+$` (D-3). Como `name_key` es única, dos nombres nunca empatan en el orden.

### 5.2 Precios (Datos de un producto, RF-6, RNF-2)

```text
parsePrice(input):                             # texto escrito → centavos enteros, sin coma flotante
  s ← trim(input)
  if s = ''                                        → «Escribe el precio»
  if s no cumple ^-?[0-9]+([.,][0-9]{1,2})?$       → «Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)»
  (signo, entero, decimales) ← partes de s
  if signo = '-' o entero y decimales son todos ceros → «El precio debe ser mayor que 0»
  if entero > 1000 o (entero = 1000 y decimales ≠ 0)  → «El precio no puede superar Bs 1000,00»
  return entero × 100 + decimales completados a 2 cifras

formatPrice(cents):       "Bs " + floor(cents / 100) + "," + (cents mod 100 con 2 cifras)   # «Bs 12,50», «Bs 1000,00»
formatPriceInput(cents):  igual, sin «Bs »                                                   # para precargar el formulario
```

«1.000» no cumple la expresión (tres decimales) y «1 000» tampoco (espacio intermedio), así que los dos reciben el mensaje de formato, como piden los casos límite. La comparación con 1000 se hace sobre la cadena del entero sin ceros a la izquierda, para que un número muy largo no pierda precisión.

### 5.3 Crear o editar un producto (RF-4, RF-5, RF-6, RF-8)

```text
saveProduct(input, productId?):
  fields ← {}
  name     ← productNameSchema.safeParse(input.name)       o fields.name
  price    ← priceSchema.safeParse(input.price)            o fields.price
  catId    ← categoryIdSchema.safeParse(input.categoryId)  o fields.categoryId
  transaction:
    if productId: current ← SELECT … FROM products WHERE id = productId FOR UPDATE
                  if current is null: fail 404 NOT_FOUND «No se encontró el producto»
    if catId válido:
      cat ← SELECT id, active FROM categories WHERE id = catId FOR SHARE
      mismaCategoría ← productId y catId = current.category_id
      if cat is null o (no cat.active y no mismaCategoría):          # RF-5: puede quedarse en la suya
        fields.categoryId ← «Elige una categoría activa»
    if name válido y existe otro producto con name_key = menuNameKey(name) (id ≠ productId):
      fields.name ← «Ya existe un producto con ese nombre»
    if fields no está vacío: fail 400 VALIDATION_ERROR con fields    # todos los datos que fallan a la vez
    INSERT o UPDATE products (name, name_key, category_id, price_cents)
  on unique_violation(name_key):  fail 400 VALIDATION_ERROR { name: «Ya existe un producto con ese nombre» }
  on KM001:                       fail 400 VALIDATION_ERROR { categoryId: «Elige una categoría activa» }
```

Las dos últimas líneas cubren la carrera con otra sesión que guardó entre la comprobación y la escritura (RF-8): la base tiene la última palabra. Un producto nuevo se crea activo; editar no cambia `active`. Si dos sesiones editan el mismo producto, gana el último `UPDATE` (RF-8).

Las categorías siguen el mismo esquema (`saveCategory`): `categoryNameSchema`, nombre repetido según `name_key` excluyendo la propia categoría (renombrar «bebidas» como «Bebidas» se acepta, RF-3) y `unique_violation` → `fields.name`.

### 5.4 Activar y desactivar (RF-9, RF-10, RF-11)

```text
deactivateProduct(id):  transaction: p ← SELECT … FOR UPDATE (o 404); UPDATE active = false
reactivateProduct(id):  transaction:
                          p   ← SELECT … FROM products WHERE id FOR UPDATE (o 404)
                          cat ← SELECT name, active FROM categories WHERE id = p.category_id FOR SHARE
                          if no cat.active: fail 409 CATEGORY_INACTIVE
                                «Reactiva la categoría “<cat.name>” o mueve el producto a otra antes de reactivarlo»
                          UPDATE active = true

deactivateCategory(id): transaction:
                          c ← SELECT … FROM categories WHERE id FOR UPDATE (o 404)
                          n ← COUNT products WHERE category_id = id AND active
                          if n > 0: fail 409 CATEGORY_HAS_ACTIVE_PRODUCTS
                                «Esta categoría tiene N productos activos. Desactívalos o muévelos a otra categoría antes»
                                («1 producto activo» si N = 1)
                          UPDATE active = false          # KM002 si otra sesión activó uno entre medio → el mismo 409
reactivateCategory(id): transaction: c ← … FOR UPDATE (o 404); UPDATE active = true   # sus productos no cambian
```

Desactivar algo ya inactivo, o reactivar algo ya activo, responde `200` sin cambios: dos navegadores pueden pulsar lo mismo (RF-8).

**Por qué no hay carreras (RF-8).** Toda escritura que deja un producto activo (crear, mover, reactivar) toma `FOR SHARE` sobre la fila de su categoría, y desactivar una categoría toma `FOR UPDATE` sobre esa misma fila. PostgreSQL hace esperar a la segunda transacción hasta que termine la primera, y después la segunda vuelve a leer la fila (en `READ COMMITTED`, cada sentencia de un disparador ve lo ya confirmado). La que llega segunda encuentra el estado nuevo y se rechaza: `KM001` si la categoría ya está inactiva, `KM002` si ya tiene un producto activo.

### 5.5 Vistas del menú (RF-2, RF-14, RF-15)

```text
getAdminMenu():   categorías (todas) + productos (todos), agrupados por categoría;
                  categorías y productos ordenados con compareMenuNames
getCurrentMenu(): SELECT p.id, p.name, p.price_cents, c.id, c.name
                  FROM products p JOIN categories c ON c.id = p.category_id
                  WHERE p.active AND c.active
                  agrupado y ordenado igual; las categorías sin productos activos no aparecen
```

El orden se hace en la API con `Intl.Collator('es')` y no con `ORDER BY`, porque el resultado de `ORDER BY` depende de la collation con la que se creó cada base (Neon, PGlite), y la especificación pide la «ñ» después de la «n» (D-4). Con un menú de hasta 200 productos (RNF-3), ordenar en memoria es inmediato.

`getCurrentMenu(db)` se exporta en `modules/menu/index.ts`: es lo que usará Ventas (RF-15).

### 5.6 Permisos (RF-1)

```text
rutas de /api/menu:     preHandler requireSession (SPEC-001): sin sesión válida → 401 de SPEC-001, nada se ejecuta
rutas de administración: además requireOwner:
                         si la cuenta de la sesión no es owner → 403 FORBIDDEN «No tienes permiso para administrar el menú»
GET /api/menu:          solo requireSession (dueño y cajero, RF-13)
```

`requireOwner` vive en `menu.routes.ts` y lee la cuenta que `requireSession` deja en la petición (SPEC-001, T022).

### 5.7 Interfaz (RF-1, RF-2, RF-7, RF-13, RF-14)

```text
HomePage(links):        muestra cada enlace cuyo roles incluye el rol de la sesión     # RF-1, RF-13
                        si location.state.notice → lo muestra (aviso de permiso)

MenuAdminPage al abrir: r ← client.getAdminMenu()
                        403 FORBIDDEN → ir a / con { notice: mensaje de la API }       # RF-1
                        sin categorías → «Todavía no hay categorías. Crea la primera»   # RF-2
                        sin categorías activas → ProductForm deshabilitado con
                                                 «Crea o reactiva una categoría antes de añadir productos»  # RF-4

al guardar (cualquier formulario o acción):
  ok              → «Cambios guardados»; recargar getAdminMenu(); cerrar el formulario   # RF-7
  VALIDATION_ERROR→ mostrar fields junto a cada campo; conservar lo escrito              # RF-3, RF-6
  409             → mostrar el mensaje de la API junto a la categoría o el producto      # RF-9, RF-10
  NETWORK_ERROR   → «No hay conexión. Los cambios no se guardaron»; conservar lo escrito # RF-7
  401             → lo maneja SessionProvider (SPEC-001): nada se guardó

MenuPage al abrir o recargar: client.getCurrentMenu(); vacío → «El menú todavía no tiene productos disponibles»  # RF-14
```

- Los campos de nombre tienen `maxLength` igual a `CATEGORY_NAME_MAX_LENGTH` (30) o `PRODUCT_NAME_MAX_LENGTH` (40) del contrato (RF-3, RF-6).
- El selector de categoría de `ProductForm` ofrece las activas y, al editar un producto de una categoría inactiva, también la suya, marcada «Inactiva» (RF-4, RF-5).
- El precio se muestra con `formatPrice` y el formulario de edición se precarga con `formatPriceInput` (RNF-2).
- `MenuPage` no se actualiza sola: recargar la página vuelve a pedir el menú (RF-14).

## 6. Contrato de la API

Ubicación: **`packages/contracts/src/menu.ts`** (esquemas de Zod, tipos derivados y funciones de nombres y precios) y los códigos nuevos en **`packages/contracts/src/errors.ts`**. Es la única fuente del contrato: la API valida con estos esquemas y la interfaz los usa para tipar su cliente y su cliente simulado.

### 6.1 Constantes, funciones y tipos

| Nombre | Valor / forma | RF |
| --- | --- | --- |
| `CATEGORY_NAME_MAX_LENGTH` | `30` | RF-3 |
| `PRODUCT_NAME_MAX_LENGTH` | `40` | RF-6 |
| `PRICE_MAX_CENTS` | `100000` | RF-6 |
| `normalizeMenuName`, `menuNameKey`, `compareMenuNames` | §5.1 | RF-2, RF-3, RF-6 |
| `formatPrice`, `formatPriceInput` | §5.2 | RNF-2 |
| `categoryNameSchema` | `string` → normalizado; mensajes: «Escribe el nombre de la categoría», «El nombre solo puede tener letras, números, espacios y los signos . , - ' ( ) & /», «El nombre de la categoría tiene como máximo 30 caracteres» (este último no llega a verse en la interfaz, que impide escribir más; textos registrados en «Aclaraciones» de `spec.md`) | RF-3 |
| `productNameSchema` | Igual, con «Escribe el nombre del producto» y «El nombre del producto tiene como máximo 40 caracteres» | RF-6 |
| `categoryIdSchema` | `string`: vacío → «Elige una categoría»; no es un uuid → «Elige una categoría activa» | RF-6 |
| `priceSchema` | `string` → centavos (`parsePrice`, §5.2), con los cuatro mensajes de RF-6 | RF-6 |
| `categoryInputSchema` | `{ name: categoryNameSchema }` | RF-3 |
| `productInputSchema` | `{ name: productNameSchema, categoryId: categoryIdSchema, price: priceSchema }` → `{ name, categoryId, priceCents }` | RF-4–RF-6 |
| `Category` | `{ id: uuid, name: string, active: boolean }` | RF-2 |
| `AdminProduct` | `{ id: uuid, name: string, categoryId: uuid, priceCents: int 1–100000, active: boolean }` | RF-2 |
| `MenuProduct` | `{ id: uuid, name: string, priceCents: int 1–100000 }` | RF-14, RF-15 |

### 6.2 Rutas

Todas usan `requireSession` (SPEC-001) y pueden responder sus tres `401` (`SESSION_MISSING`, `SESSION_EXPIRED`, `SESSION_TERMINATED`). Las marcadas **dueño** usan además `requireOwner` y responden **`403 FORBIDDEN`** «No tienes permiso para administrar el menú» a un cajero (RF-1). Los identificadores de la ruta que no son uuid o no existen responden **`404 NOT_FOUND`** «No se encontró la categoría» o «No se encontró el producto».

| Ruta | Rol | Entrada | Respuesta correcta | Errores propios | RF |
| --- | --- | --- | --- | --- | --- |
| `GET /api/menu/admin` | dueño | — | `200 adminMenuResponseSchema`: `{ categories: [{ id, name, active, products: AdminProduct[] }] }`, ordenado (§5.5) | — | RF-1, RF-2 |
| `POST /api/menu/categories` | dueño | `categoryInputSchema` | `201 { category: Category }` | `400 VALIDATION_ERROR` (`fields.name`) | RF-3 |
| `PUT /api/menu/categories/:id` | dueño | `categoryInputSchema` | `200 { category: Category }` | `400`, `404` | RF-3, RF-11 |
| `POST /api/menu/categories/:id/deactivate` | dueño | — | `200 { category: Category }` | `404`, `409 CATEGORY_HAS_ACTIVE_PRODUCTS` | RF-10 |
| `POST /api/menu/categories/:id/reactivate` | dueño | — | `200 { category: Category }` | `404` | RF-10 |
| `POST /api/menu/products` | dueño | `productInputSchema` | `201 { product: AdminProduct }` | `400 VALIDATION_ERROR` (`fields.name`, `categoryId`, `price`) | RF-4, RF-6 |
| `PUT /api/menu/products/:id` | dueño | `productInputSchema` | `200 { product: AdminProduct }` | `400`, `404` | RF-5, RF-6, RF-8 |
| `POST /api/menu/products/:id/deactivate` | dueño | — | `200 { product: AdminProduct }` | `404` | RF-9 |
| `POST /api/menu/products/:id/reactivate` | dueño | — | `200 { product: AdminProduct }` | `404`, `409 CATEGORY_INACTIVE` | RF-9 |
| `GET /api/menu` | dueño y cajero | — | `200 currentMenuResponseSchema`: `{ categories: [{ id, name, products: MenuProduct[] }] }`, solo el menú vigente, ordenado | — | RF-13, RF-14, RF-15 |

`400 VALIDATION_ERROR` lleva `message: "Revisa los datos"` (como en SPEC-001) y en `fields` **todos** los datos que fallan, con los mensajes de RF-3 y RF-6, incluidos los que dependen de la base (nombre repetido, categoría inactiva) (§5.3). Los textos de `409` se arman en la API con los datos de la base (N productos, nombre de la categoría).

Ejemplos:

```json
POST /api/menu/products   { "name": "  café   americano ", "categoryId": "1a7e…-c2", "price": "12,5" }
201                       { "product": { "id": "c4e1…-07", "name": "café americano", "categoryId": "1a7e…-c2", "priceCents": 1250, "active": true } }

POST /api/menu/products   { "name": "CAFÉ AMERICANO", "categoryId": "", "price": "12,505" }
400                       { "error": { "code": "VALIDATION_ERROR", "message": "Revisa los datos", "fields": {
                              "name": "Ya existe un producto con ese nombre",
                              "categoryId": "Elige una categoría",
                              "price": "Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)" } } }

POST /api/menu/categories/1a7e…-c2/deactivate
409                       { "error": { "code": "CATEGORY_HAS_ACTIVE_PRODUCTS", "message": "Esta categoría tiene 3 productos activos. Desactívalos o muévelos a otra categoría antes" } }

GET /api/menu             (sesión de cajero)
200                       { "categories": [ { "id": "1a7e…-c2", "name": "Bebidas calientes", "products": [ { "id": "c4e1…-07", "name": "Café americano", "priceCents": 1250 } ] } ] }
```

### 6.3 Errores sin esquema propio

- **Sin conexión (RF-7):** como en SPEC-001, `api-fetch.ts` convierte el error de red en `NETWORK_ERROR`. Las pantallas del menú muestran su propio texto, «No hay conexión. Los cambios no se guardaron», porque RF-7 lo pide distinto del de Acceso.
- **Error inesperado:** `500 INTERNAL_ERROR`, como en SPEC-001.

## 7. Decisiones técnicas

Todas son **decisiones delegadas** (modo delegado, `AGENTS.md`): quedan aprobadas al fusionar el PR de definición.

| # | Decisión | Por qué | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **El menú se integra en el monorepo de SPEC-001 sin dependencias nuevas**, y sus historias usan la sesión de Acceso (`feat/001-acceso-us1`, ya en `develop` desde #15) | Las rutas necesitan `requireSession` y las pantallas, la sesión de la interfaz; duplicarlas o simularlas en producción dejaría dos versiones de Acceso | Empezar las historias con un `requireSession` provisional: habría que reescribirlo y podría dejar rutas sin proteger | RF-1 |
| D-2 | **Precios en centavos enteros** (`integer` en la base, `priceCents` en el contrato) y **`formatPrice` en el contrato** | Los enteros son exactos (RNF-2) y servirán a Ventas para sumar sin errores de redondeo. Una sola función de formato, compartida, evita que la API y la interfaz muestren un mismo precio de dos formas. Formatear no es calcular un importe (principio 3) | `numeric(7,2)`: `pg` lo devuelve como texto y cada capa tendría que convertirlo. `number` con decimales: 0,1 + 0,2 no da 0,3. Que la API devuelva el texto formateado: Ventas y Dashboard tendrían que pedir cada formato a la API | RF-6, RNF-2 |
| D-3 | **Letras admitidas:** a–z, A–Z, vocales con tilde aguda, «ü» y «ñ», en mayúscula y minúscula. Los nombres se normalizan a NFC antes de validarlos | Es la lectura literal de «letras (con tildes, diéresis y «ñ»)» de la especificación. NFC hace que una «é» escrita con el acento aparte valga lo mismo que la compuesta | `\p{L}` (cualquier letra Unicode): admitiría alfabetos y signos que la especificación no menciona | RF-3, RF-6 |
| D-4 | **Comparación con `name_key` calculada en la API** (`menuNameKey`) y **orden con `Intl.Collator('es', { sensitivity: 'base' })`** | La extensión `unaccent` no está garantizada en PGlite, y el orden de `ORDER BY` depende de la collation de cada base. `Intl` viene con Node 24 (ICU completo) y ordena la «ñ» después de la «n» | `unaccent` y una collation ICU en la base: dependen de cómo se creó la base en Neon y no se pueden probar igual con PGlite | RF-2, RF-3, RF-6, RF-14 |
| D-5 | **Disparadores con `FOR SHARE`** que impiden un producto activo en una categoría inactiva, e **índices únicos** sobre `name_key`. El servicio comprueba primero para dar los mensajes, y traduce a esos mensajes los errores de la base | La base garantiza las reglas aunque dos sesiones guarden a la vez (RF-8, principio 5). PGlite tiene una sola conexión y no puede reproducir dos transacciones simultáneas, pero sí comprobar que el disparador rechaza el cambio | Solo comprobaciones en el servicio: una carrera entre dos navegadores podría dejar el menú inválido. `SERIALIZABLE` con reintentos: más complejo para el mismo resultado | RF-8, RF-10, RF-11 |
| D-6 | **Todos los errores de datos en un solo `400 VALIDATION_ERROR`**, también el nombre repetido y la categoría inactiva, con un mensaje por campo | RF-6 pide indicar **cada** dato que falla. Si el nombre repetido llegara como un error aparte, el dueño corregiría el precio y solo entonces vería el nombre | Un código por regla (`NAME_TAKEN`, `CATEGORY_INACTIVE`…), cada uno en su respuesta: obliga a varios intentos | RF-3, RF-6 |
| D-7 | **Rutas de acción** (`POST …/deactivate` y `…/reactivate`) y **`PUT`** para editar, con todos los datos del formulario. `api-fetch.ts` pasa a admitir `PUT` | Cada acción tiene sus reglas y mensajes (RF-9, RF-10). El formulario siempre envía todos sus campos, así que `PUT` describe bien la edición | `PATCH` con `active` en el cuerpo: mezcla editar con activar y complica los mensajes. Todo con `POST`: oculta qué ruta modifica y cuál crea | RF-5, RF-9, RF-10 |
| D-8 | **La pantalla inicial recibe sus enlaces de `routes.tsx`:** cada ruta protegida puede declarar `homeLink` (su texto) y `HomePage` muestra los que su rol puede ver. También muestra un aviso que llegue en `location.state.notice` | `auth` no conoce los módulos siguientes: Ventas y Reportes añadirán sus enlaces sin tocar `HomePage`. La lista `roles` ya existe (`docs/architecture.md` §6.6) | Escribir los enlaces dentro de `HomePage`: cada módulo tendría que modificar `auth`. Moverla a `shared/`, como preveía el plan de SPEC-001: `shared/` dependería del módulo `auth` | RF-1, RF-13 |
| D-9 | **El rechazo al cajero lo decide la API:** `MenuAdminPage` pide la administración y, ante `403`, vuelve a `/` con el mensaje de la API. La ruta declara `roles: ['owner']` solo para no mostrar el enlace y para el regreso de SPEC-001 | Los permisos reales viven en la API (`docs/architecture.md` §6.6, principio 3) y el texto es el que la API devuelve | Bloquear la ruta en la interfaz con un texto propio: duplicaría el mensaje y no protegería nada | RF-1 |
| D-10 | **`MenuClientProvider`:** la interfaz obtiene el cliente del menú de un contexto de React, que siempre recibe el cliente (sin valor por defecto). Como en SPEC-001 (DD-17), `main.tsx` provee el cliente real también en desarrollo; el cliente simulado del menú y su selector se activan solo en desarrollo con `?escenarios=menu`, combinable con el de Acceso (`?escenarios=acceso,menu`) para recorrer las pantallas sin la API. Cambiar de escenario vuelve a montar las rutas | Las páginas y las pruebas usan el mismo código con cualquiera de los dos clientes (`docs/architecture.md` §4.5), y el desarrollo normal prueba la integración real, como fija SPEC-001 | Importar el cliente real dentro de cada componente: las pruebas tendrían que interceptar `fetch`. Un cliente por defecto en el contexto: una página fuera del proveedor usaría la API sin que se note. El cliente simulado por defecto en desarrollo (primera versión de este plan): contradice DD-17 de SPEC-001 e impide probar la integración normal | RF-2, RF-14 |
| D-11 | **Escenarios de desarrollo del menú:** el cliente simulado guarda el menú en memoria, valida las entradas con los esquemas del contrato y aplica solo dos comprobaciones de coherencia, para que las pantallas no muestren estados imposibles: no desactiva una categoría con productos activos ni reactiva un producto de una categoría inactiva. El resto de los errores se fuerzan con escenarios («Menú vacío», «Menú cargado», «Nombre repetido», «Categoría con productos activos», «Sin permiso», «Sin conexión») | Permite trabajar la interfaz sin la API. Las reglas oficiales viven solo en la API (principio 3); el cliente simulado no llega al build de producción | Reimplementar todas las reglas en el cliente simulado (nombres repetidos, orden de mensajes, carreras): duplicaría la lógica de la API en la interfaz. Ninguna comprobación: las pantallas mostrarían productos activos en categorías inactivas | RF-1–RF-10, RF-14 |
| D-12 | **Medición de RNF-3 con 200 productos** cargados por `apps/api/test/seed-menu.ts` en la base de un despliegue de comprobación (`docs/architecture.md` §6.5), nunca en la de producción | RNF-3 fija el tamaño del menú; un script repetible evita cargarlos a mano | Medir con el menú real: todavía no existe (duda abierta de `spec.md`) | RNF-3 |

**D-16 — Decisión delegada (2026-10-25, corrección T044):** adelantar a US2 el mismo `testTimeout: 15_000` de Vitest de API ya aprobado en US3 y Pulido. Tras integrar `develop`, el run `40169699691` agotó los 5 segundos en la prueba criptográfica de la ventana de bloqueo y los otros 760 casos pasaron. Se conservan las aserciones, el aislamiento entre archivos y la criptografía real. Se descartan desactivar el aislamiento, simular verificaciones o reintentar hasta obtener verde: la petición es dar margen a la ejecución del test. Esta configuración no cambia el código de aplicación ni sus límites de rendimiento.

### 7.1 Dependencias

Ninguna nueva. Se usan las de [`specs/001-acceso/plan.md`](../001-acceso/plan.md#71-dependencias-por-paquete) §7.1.

## 8. Estrategia de tests

### 8.1 Niveles

Los de SPEC-001 (§8.1 de su plan):

| Nivel | Herramienta | Qué cubre | Dónde |
| --- | --- | --- | --- |
| Unitario | Vitest | Funciones y esquemas del contrato: nombres, comparación, orden, precios y formato | `packages/contracts/src/menu.test.ts` |
| Integración de la API | Vitest + `app.inject` + PGlite | Migración y disparadores, repositorios, servicios y rutas completas con la base real en memoria | `*.integration.test.ts` en `apps/api/src/modules/menu/` y `shared/database/` |
| Componentes de la interfaz | Vitest + Testing Library + `menu-demo-client` | Lista, formularios, mensajes, permisos y consulta | `*.test.tsx` junto a cada componente |
| Punta a punta | Playwright contra `vite preview` y `e2e-server.ts` | Cada historia completa, con las cuentas de prueba de SPEC-001 | `e2e/` |

### 8.2 Punta a punta por historia

**US1 — Armar el menú** (`e2e/menu-us1-armar-menu.spec.ts`)

1. Ingresar como cajero → la pantalla inicial no muestra «Administrar menú»; abrir `/menu/administrar` → se vuelve a `/` con «No tienes permiso para administrar el menú» (RF-1).
2. Ingresar como dueño → «Administrar menú» → «Todavía no hay categorías. Crea la primera» (RF-1, RF-2).
3. Crear «Bebidas calientes» y, en ella, «Café americano» a «12,5» → «Cambios guardados» y «Bs 12,50» en la lista (RF-3, RF-4, RF-7).
4. Crear «CAFÉ AMERICANO» con precio «0» y sin categoría → los tres mensajes a la vez y lo escrito se conserva (RF-6).
5. Crear «Jugos», editar el café: precio «13» y categoría «Jugos» → la lista lo muestra en «Jugos» con «Bs 13,00» tras recargar (RF-5, RF-2).
6. Cortar la red y guardar → «No hay conexión. Los cambios no se guardaron» y lo escrito se conserva (RF-7).

**US2 — Sacar del menú lo que no se ofrece** (`e2e/menu-us2-desactivar.spec.ts`)

1. Con un menú cargado, desactivar «Bebidas calientes» con productos activos → «Esta categoría tiene 1 producto activo…» (RF-10).
2. Desactivar su producto → «Inactivo»; desactivar la categoría → «Inactiva» (RF-9, RF-10).
3. Reactivar el producto → «Reactiva la categoría “Bebidas calientes”…» (RF-9).
4. El formulario de producto nuevo no ofrece «Bebidas calientes» (RF-11).
5. Reactivar la categoría y el producto → vuelve con su nombre, categoría y precio (RF-9, RF-10).

**US3 — Consultar el menú vigente** (`e2e/menu-us3-consultar.spec.ts`)

1. Como cajero, sin productos → «Ver menú» → «El menú todavía no tiene productos disponibles» (RF-13, RF-14).
2. Con un menú que tiene un producto inactivo y una categoría sin productos activos → solo se ven los productos vigentes, con «Bs», y ningún botón de edición (RF-14).
3. El dueño cambia un precio en otro contexto del navegador → el cajero recarga y ve el precio nuevo (RF-14).

La API de E2E carga los menús de cada prueba con los servicios del módulo, mediante una ruta que solo existe en `e2e-server.ts` (`POST /api/__test/menu`, como las de SPEC-001), y que `app.ts` nunca registra.

### 8.3 Requisitos no funcionales

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Las pruebas de componentes y E2E comparan los textos en español tal como los define la especificación |
| RNF-2 | Unitarias de `parsePrice` y `formatPrice` («12,5» → 1250 → «Bs 12,50»; «0,1» y «0,2» exactos; «1000» → «Bs 1000,00»); integración: el precio guardado se lee idéntico |
| RNF-3 | Medición manual en Pulido (D-12): con 200 productos cargados por `seed-menu.ts` en la base de comprobación y el servicio ya reactivado, 20 aperturas de la administración, 20 de la consulta y 20 guardados. Al menos 19 de cada 20 deben tardar menos de 2 segundos. El resultado se anota en el PR de pulido |
| RNF-4 | Componentes: cada formulario se completa, elige la categoría y se guarda solo con el teclado |
| Criterio de 30 s | Medición manual en Pulido, junto con RNF-3: una persona crea un producto en una categoría existente en menos de 30 segundos |

### 8.4 Datos

- Cada prueba de integración crea su propia base PGlite con las migraciones aplicadas (`createTestDatabase`).
- Las cuentas de E2E son las de SPEC-001 (`e2e/fixtures.ts`); los menús de prueba se cargan por prueba.
- Las carreras de RF-8 se prueban de forma determinista: se cambia el estado entre la comprobación del servicio y la escritura (o directamente en la base) y se comprueba que el disparador o el índice rechazan el cambio con el mensaje correcto (D-5).

### 8.5 Cobertura por RF

| RF | Contrato / integración de la API | Componentes de la interfaz | E2E |
| --- | --- | --- | --- |
| RF-1 | sin sesión → `401` de SPEC-001; cajero → `403 FORBIDDEN` en cada ruta de administración sin cambios | `HomePage` sin el enlace para el cajero; `MenuAdminPage` ante `403` vuelve a `/` con el aviso | US1-1 |
| RF-2 | `GET /admin`: todas las categorías y productos, orden con «ñ», tildes y mayúsculas | `MenuAdminList`: etiquetas, «Sin productos», menú vacío | US1-2, US1-5 |
| RF-3 | crear y renombrar; vacío, caracteres, largo, repetido (también inactiva), mismo nombre con otras mayúsculas | `CategoryForm`: `maxLength`, mensajes de la API | US1-3 |
| RF-4 | crear activo; categoría inactiva rechazada | `ProductForm`: solo categorías activas; sin categorías activas, aviso | US1-3 |
| RF-5 | editar nombre, precio y categoría; no cambia `active`; editar en su categoría inactiva | `ProductForm`: precarga con `formatPriceInput`; su categoría inactiva en el selector | US1-5 |
| RF-6 | `priceSchema` y esquemas de nombre (unitarias); todos los campos en un solo `400`; nombre repetido entre categorías e inactivos | `ProductForm`: mensaje por campo, lo escrito se conserva | US1-4 |
| RF-7 | un error a mitad de la transacción no deja nada guardado | `SaveStatus`: «Cambios guardados» y sin conexión | US1-3, US1-6 |
| RF-8 | último `UPDATE` gana; `KM001`, `KM002` y `unique_violation` traducidos a sus mensajes | — | — |
| RF-9 | desactivar y reactivar; `409 CATEGORY_INACTIVE` con el nombre | `MenuAdminList`: acciones y mensaje | US2-2, US2-3, US2-5 |
| RF-10 | sin productos activos → inactiva; con N → `409` («1 producto activo»); reactivar no cambia los productos | `MenuAdminList`: acciones y mensaje | US2-1, US2-2, US2-5 |
| RF-11 | crear o mover a categoría inactiva → `400`; renombrar una inactiva | `ProductForm` sin la categoría inactiva | US2-4 |
| RF-12 | inactivos cuentan como repetidos; no hay rutas `DELETE`; `ON DELETE RESTRICT` | `MenuAdminList` sin opción de eliminar | — |
| RF-13 | `GET /api/menu` con sesión de cajero y de dueño | `HomePage` con «Ver menú» para los dos roles | US3-1 |
| RF-14 | solo vigentes; categorías sin productos activos fuera; orden | `CurrentMenuList` sin acciones; menú vacío | US3-1 a US3-3 |
| RF-15 | `getCurrentMenu(db)`: nombre, categoría y precio vigente de cada producto vendible | — | — |

## 9. Decisiones globales en `docs/architecture.md`

Afectan a todo el proyecto. En modo delegado se aplican en este mismo PR y se indican en «Observaciones».

1. **Importes (§6.7, nuevo; D-2):** los importes en BOB se guardan y viajan como centavos enteros, y se muestran con `formatPrice` de `packages/contracts` («Bs 12,50», sin separador de miles).
2. **Permisos por rol (§6.2; D-9):** una ruta de la API restringida por rol responde `403 FORBIDDEN` con el mensaje del módulo, y la interfaz muestra ese mensaje.
3. **Enlaces de la pantalla inicial (§6.6; D-8):** cada ruta protegida puede declarar `homeLink`, y la pantalla inicial muestra los enlaces que el rol de la sesión puede ver.

## 10. Cambios tras el análisis de consistencia

Correcciones del 2026-10-24 a los hallazgos menores del análisis (ninguno bloqueante):

| Hallazgo | Corrección | Dónde |
| --- | --- | --- |
| 1 | `MenuClientProvider` siempre recibe el cliente; `main.tsx` provee el simulado en desarrollo hasta T023 y el real en producción | §7 (D-10); `tasks.md` T011, T012, T023 |
| 2 | T023 depende también de SPEC-001 T030 | `tasks.md` |
| 3 | Desactivar y reactivar también confirman con «Cambios guardados» o avisan de la falta de conexión (RF-7) | `tasks.md` T028 |
| 4 | Los textos de largo máximo en la API y de «No se encontró…» quedan registrados en «Aclaraciones» de `spec.md` | §6.1; `spec.md` |

## 11. Cambios tras la verificación

Correcciones del 2026-10-24 a los «Cambios requeridos» de la primera verificación:

| Cambio requerido | Corrección | Dónde |
| --- | --- | --- |
| Conflictos con `develop` (SPEC-001 US1 y US2 fusionadas) | Merge de `origin/develop`; `main.tsx` y `routes.tsx` conservan el montaje de SPEC-001 y añaden el proveedor y las rutas del menú | T037 |
| D-10 contradecía DD-17 de SPEC-001 | Cliente real también en desarrollo; el simulado del menú, solo con `?escenarios=menu`. D-11 describe las dos comprobaciones de coherencia del cliente simulado | §3, §7 (D-10, D-11); T038 |
| Textos que decían que `feat/001-acceso-us1` no estaba en `develop` | Dependencia marcada como cumplida | Encabezado, §7 (D-1); `tasks.md`; T039 |
