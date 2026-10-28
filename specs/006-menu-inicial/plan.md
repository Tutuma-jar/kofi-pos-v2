# Plan — SPEC-006 Menú inicial

Estado: aprobado · Fecha: 2026-10-28 · Especificación: [`spec.md`](spec.md)

Añade al módulo `menu` de la API un comando que carga el menú oficial de Kofi en una base nueva. Reutiliza los servicios, las reglas y la migración de [SPEC-002](../002-menu/plan.md), que ya están en `develop`. No toca la interfaz, el contrato, las migraciones ni el despliegue.

## 1. Versión de la constitución

Se planifica con la **versión 3.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-25).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: TypeScript en Node 24, `pg` para la base real y PGlite en las pruebas, como en SPEC-001 y SPEC-002. |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF, y entre todas cubren RF-1 a RF-4 (§8.4). Una prueba compara el menú del código con la tabla «Menú oficial» de `spec.md`, de modo que ninguno de los dos puede cambiar sin el otro (D-6). |
| 3. Lógica separada de la interfaz | Sí | La carga vive solo en la API y no la usa la interfaz. Los precios se validan y se convierten a centavos con `priceSchema` del contrato, dentro de `saveProduct` (D-3). |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.4), escrito antes del código de su tarea. |
| 5. Persistencia segura | Sí | La carga escribe solo con los servicios del módulo `menu`, que usan `shared/database`. La preparación de la base y la carga completa forman una sola transacción (RF-4, D-4). La dirección de la base se lee de `DATABASE_URL`, que no se versiona, y nunca se imprime (RF-4, D-7). |
| 6. Idioma | Sí | Código e identificadores en inglés (`OFFICIAL_MENU`, `loadOfficialMenu`); nombres de productos y mensajes en español; precios en bolivianos (BOB). La carga no muestra fechas. |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
apps/api/
├── package.json                                 script load:menu (D-1)
├── test/e2e-server.ts                           ruta de pruebas POST /api/__test/official-menu (D-8)
└── src/modules/menu/
    ├── index.ts                                 exporta también loadOfficialMenu
    ├── official-menu.data.ts                    OFFICIAL_MENU: el menú oficial (RF-1, D-2)
    ├── official-menu.data.test.ts               reglas de SPEC-002 y tabla de spec.md (RF-1, D-6)
    ├── official-menu.service.ts                 loadOfficialMenu (RF-2, RF-3, RF-4)
    ├── official-menu.service.integration.test.ts
    ├── official-menu.cli.ts                     runOfficialMenuLoad y punto de entrada (RF-2, RF-3, RF-4)
    └── official-menu.cli.integration.test.ts
e2e/
└── menu-inicial-us1-cargar.spec.ts              punta a punta de HU-1 (§8.2)
AGENTS.md                                        fila de npm run load:menu en «Comandos» (Pulido)
```

- **Sin cambios** en `apps/web`, `packages/contracts`, las migraciones, `render.yaml` ni `docs/architecture.md`.
- Los archivos siguen la convención `<entidad>.<capa>` de la API (§4.3 de la arquitectura). La capa `cli` ya existe en otros módulos (`accounts.cli.ts`, `sales-seed.cli.ts`); `data` es nueva y solo guarda la constante del menú.
- El comando no forma parte de `npm start`: no se ejecuta al desplegar ni al arrancar la API (spec, «Fuera de alcance»).

## 4. Modelo de datos

Sin tablas ni columnas nuevas: la carga escribe en `categories` y `products` de `002_menu.sql`, con sus disparadores e índices únicos.

El menú oficial vive en el código, con la misma forma que el fixture de menú de las pruebas de punta a punta (`apps/api/test/e2e-server.ts`): el precio se escribe como en la interfaz y lo valida `priceSchema` (D-2).

```ts
// official-menu.data.ts (RF-1)
export const OFFICIAL_MENU = [
  {
    name: 'Cafés',
    products: [
      { name: 'Espresso', price: '10,00' },
      { name: 'Americano', price: '13,00' },
      // …
    ],
  },
  // Otras bebidas calientes, Bebidas frías, Jugos y licuados, Salados, Repostería
] as const satisfies readonly OfficialCategory[];
```

Tras la carga, por ejemplo:

| Tabla | Fila |
| --- | --- |
| `categories` | `name = 'Cafés'`, `name_key = 'cafes'`, `active = true` |
| `products` | `name = 'Café con leche'`, `name_key = 'cafe con leche'`, `category_id` = la de «Cafés», `price_cents = 1500`, `active = true` |

## 5. Algoritmos relevantes

### 5.1 Cargar el menú oficial (RF-2, RF-3, RF-4)

```
loadOfficialMenu(db, menu = OFFICIAL_MENU):
  db.transaction(tx =>
    // Los servicios participan en esta transacción, como en seed-menu.ts.
    batch = { ...db, ...tx, transaction: work => work(tx) }
    // Dos cargas a la vez esperan una a la otra, aun sobre una base sin tablas (RF-3, D-5).
    tx.query("SELECT pg_advisory_xact_lock(hashtext('kofi:official-menu'))")
    // Base recién creada: la prepara dentro de la misma transacción (RF-2, RF-4, D-4).
    migrate(batch)
    // Nadie crea categorías ni productos mientras se comprueba y se carga (RF-3, D-5).
    tx.query('LOCK TABLE categories, products IN SHARE ROW EXCLUSIVE MODE')
    si existe alguna fila en categories o en products:
      lanzar OfficialMenuNotEmptyError                       // RF-3: nada cambia
    para cada categoría de menu:
      c = saveCategory(batch, { name })
      para cada producto: saveProduct(batch, { name, price, categoryId: c.id })
    devolver { categories: cantidad, products: cantidad }    // 6 y 36
  )
```

Cualquier error, incluido el rechazo de RF-3, deshace la transacción completa: migraciones, categorías y productos (RF-4).

### 5.2 Comando (RF-2, RF-3, RF-4)

```
runOfficialMenuLoad({ env, createDatabase, write }):
  intentar leer DATABASE_URL con loadEnv(env); si falla → write(failed); devolver 1
  db = createDatabase(url)
  intentar:
    { categories, products } = loadOfficialMenu(db)
    write(`Menú oficial cargado: ${categories} categorías y ${products} productos`); devolver 0
  si OfficialMenuNotEmptyError → write(notEmpty); devolver 1
  cualquier otro error → write(failed); devolver 1          // nunca el error original (D-7)
  al final: db.close()
```

| Clave | Mensaje (spec) |
| --- | --- |
| `loaded` | «Menú oficial cargado: 6 categorías y 36 productos» (RF-2) |
| `notEmpty` | «La base ya tiene categorías o productos. El menú oficial solo se carga en una base nueva» (RF-3) |
| `failed` | «No se pudo cargar el menú oficial. Comprueba la configuración y la conexión a la base» (RF-4) |

**Cancelación (RF-4).** Si la persona cancela el comando, el proceso termina sin confirmar la transacción y PostgreSQL la deshace al cerrarse la conexión: la base queda como estaba. Las pruebas lo representan con un fallo a mitad de la carga (§8.4).

## 6. Contrato de la API

**Sin cambios en `packages/contracts`.** La carga no expone rutas de la API ni la usa la interfaz: es un comando que ejecuta a mano la persona que prepara el sistema (spec, «Usuarios»). Usa del contrato lo que ya existe: `categoryNameSchema`, `productNameSchema`, `priceSchema`, `menuNameKey` y `formatPrice`.

Los mensajes de §5.2 viven en `official-menu.cli.ts`, como los de `accounts.cli.ts` y `sales-seed.cli.ts`, porque solo se muestran en la terminal.

La ruta `POST /api/__test/official-menu` del servidor de E2E no es contrato: solo existe en `apps/api/test/e2e-server.ts`, que nunca se despliega (D-8).

## 7. Decisiones técnicas

| # | Decisión | Motivo | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **Comando `npm run load:menu -w @kofi/api`** (`node --env-file-if-exists=.env src/modules/menu/official-menu.cli.ts`), en `src/` del módulo `menu` | Se ejecuta contra la base oficial, así que es código del producto y no de pruebas (`test/seed-menu.ts` solo carga datos de prueba). Sigue el patrón de `accounts` y `seed:sales`, y `tsc` lo compila con el resto de la API | Ruta HTTP o pantalla: la especificación deja fuera la carga desde la interfaz o con una sesión | RF-2 |
| D-2 | **El menú oficial es una constante de TypeScript** (`OFFICIAL_MENU`), con el precio como texto («10,00») | Lo validan los mismos esquemas que lo que escribe el dueño, y se lee igual que la tabla de la especificación | Migración `004` con `INSERT`: se aplicaría sola en todas las bases, también en las de pruebas y comprobación y al arrancar la API, en contra de la carga manual y única de la especificación, y saltaría los servicios | RF-1 |
| D-3 | **Se carga con `saveCategory` y `saveProduct`** dentro de una única transacción, con el patrón `batch` de `apps/api/test/seed-menu.ts` | Aplica las reglas de SPEC-002 (nombres, precios, categoría activa) sin duplicarlas | `INSERT` directos: tendrían que recalcular `name_key` y los centavos, y podrían divergir de SPEC-002 | RF-1, RF-2 |
| D-4 | **Las migraciones pendientes se aplican dentro de la misma transacción que la carga** | Una base recién creada queda preparada (RF-2) y, si algo falla o se cancela, queda exactamente como estaba, sin tablas a medias (RF-4). PostgreSQL permite DDL en transacciones, y `migrate` acepta el `batch` porque solo usa `exec`, `query` y `transaction` | Migrar antes en su propia transacción: un fallo posterior dejaría la base cambiada | RF-2, RF-4 |
| D-5 | **Dos bloqueos al empezar:** `pg_advisory_xact_lock` antes de migrar y `LOCK TABLE categories, products IN SHARE ROW EXCLUSIVE MODE` antes de comprobar | El primero ordena dos cargas simultáneas aun antes de que existan las tablas; la segunda ve el menú de la primera y se rechaza con el mensaje de RF-3. El segundo impide que el dueño cree algo entre la comprobación y la carga, sin bloquear lecturas. PGlite admite los dos (comprobado al planificar) | Comprobar sin bloqueo: la segunda carga fallaría por nombre repetido con el mensaje genérico de RF-4 | RF-3 |
| D-6 | **Una prueba compara `OFFICIAL_MENU` con la tabla «Menú oficial» de `spec.md`** (categoría, producto y precio con `formatPrice`) | La tabla es la fuente aprobada por la persona; si cambia una sin la otra, la prueba falla (principio 2) | Repetir la lista dentro de la prueba: dos copias que pueden divergir de la especificación | RF-1 |
| D-7 | **El comando recibe sus dependencias** (`env`, `createDatabase`, `write`) y solo imprime los tres mensajes de §5.2, nunca el error original | Se prueba sin base real ni proceso aparte, como `runAccounts`. Los errores de `pg` y de `loadEnv` pueden incluir la dirección de la base | Imprimir `error.message`: podría mostrar la dirección o el usuario de la base | RF-2, RF-3, RF-4 |
| D-8 | **La prueba de punta a punta carga el menú con una ruta del servidor de E2E**, que vacía el menú y llama a `loadOfficialMenu` sobre PGlite | La CI no tiene PostgreSQL; así se comprueba en el navegador el resultado de la carga real. El comando contra PostgreSQL se ejecuta en Pulido contra una base de comprobación (§8.3) | Lanzar el comando en la E2E: necesitaría una base PostgreSQL en la CI | RF-2 |

### 7.1 Dependencias

Ninguna nueva.

## 8. Estrategia de tests

### 8.1 Niveles

| Nivel | Archivo | Qué comprueba |
| --- | --- | --- |
| Unitaria | `official-menu.data.test.ts` | 6 categorías y 36 productos; cada nombre cumple `categoryNameSchema` o `productNameSchema` y cada precio `priceSchema`; sin nombres repetidos según `menuNameKey`; coincidencia exacta con la tabla de `spec.md` (D-6) |
| Integración (PGlite) | `official-menu.service.integration.test.ts` | Carga en base migrada y en base sin tablas; rechazos de RF-3 sin cambios; dos cargas a la vez; fallo a mitad sin cambios |
| Integración (PGlite) | `official-menu.cli.integration.test.ts` | Mensajes y código de salida de cada caso; ningún mensaje contiene la dirección de la base |
| Punta a punta | `e2e/menu-inicial-us1-cargar.spec.ts` | HU-1 en el navegador (§8.2) |

### 8.2 Punta a punta por historia

**HU-1** (`e2e/menu-inicial-us1-cargar.spec.ts`): la prueba llama a `POST /api/__test/official-menu`.

1. Con una sesión de cajero, «Ver menú» muestra las 6 categorías y los 36 productos con sus precios en el formato «Bs 10,00», y ninguno de prueba.
2. Con una sesión de dueño, «Administrar menú» los muestra activos; al cambiar el precio de «Americano» a 14, «Ver menú» muestra «Bs 14,00» (RF-2).

### 8.3 Requisitos no funcionales y comprobación real

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Los tres mensajes en español están fijados en las pruebas del comando |
| RNF-2 | La integración compara `priceCents` de cada producto con la tabla (por ejemplo, 1500 para «Bs 15,00») |
| RNF-3 | En Pulido, la persona ejecuta `npm run load:menu -w @kofi/api` contra una base de Neon de comprobación nueva y vacía, desde su computadora, y cronometra que termine en menos de 1 minuto. Repite el comando para comprobar el rechazo de RF-3. El resultado se anota en el PR de pulido |

La carga en la base oficial de producción la hace la persona que prepara el sistema cuando cree esa base; no forma parte de las tareas.

### 8.4 Cobertura por RF

| RF | Pruebas |
| --- | --- |
| RF-1 | Unitaria: reglas de SPEC-002, nombres únicos, 6 y 36, coincidencia con `spec.md` |
| RF-2 | Integración: tras cargar en una base migrada sin menú, `getAdminMenu` coincide con `OFFICIAL_MENU` (todo activo) y `getCurrentMenu` tiene 36 productos; en una base sin tablas (`createEmptyTestDatabase`) migra y carga; con cuentas ya creadas, carga. Comando: «Menú oficial cargado: 6 categorías y 36 productos», salida 0. E2E de §8.2 |
| RF-3 | Integración: rechazo sin cambios con una sola categoría, con productos inactivos, con los 200 productos de `seedMenu` y al cargar dos veces; dos cargas simultáneas (`Promise.all`): una carga y la otra se rechaza. Comando: mensaje de RF-3, salida 1 |
| RF-4 | Integración: un fallo en un producto intermedio deja `getAdminMenu` vacío; sobre una base sin tablas, tampoco quedan tablas ni `schema_migrations`. Comando: `DATABASE_URL` ausente o inválida y un error de conexión que contiene la dirección muestran solo el mensaje de RF-4, salida 1 |

## 9. Decisiones globales en `docs/architecture.md`

Ninguna. Pulido añade la fila de `npm run load:menu` a «Comandos» de `AGENTS.md`, con una nota propia: la ejecuta a mano la persona que prepara el sistema, fuera de las comprobaciones automáticas.
