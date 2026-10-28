# Plan — SPEC-007 Ventas de demostración

Estado: aprobado · Fecha: 2026-10-28 · Especificación: [`spec.md`](spec.md)

Añade al módulo `sales` de la API un comando que llena una base con el menú oficial y sin ventas con tres meses de ventas pasadas. Reutiliza el repositorio de ventas de [SPEC-003](../003-ventas/plan.md) (`insertSalesBatch`, `reserveSaleNumbers`), el menú oficial de [SPEC-006](../006-menu-inicial/plan.md) (`OFFICIAL_MENU`) y el calendario de Bolivia de SPEC-004 y SPEC-005, que ya están en `develop`. No toca la interfaz, el contrato, las migraciones ni el despliegue.

## 1. Versión de la constitución

Se planifica con la **versión 3.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-25).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | Sin dependencias nuevas: TypeScript en Node 24, `pg` para la base real y PGlite en las pruebas. El generador pseudoaleatorio con semilla y la confirmación por terminal usan solo código propio y `node:readline/promises` (D-5, D-7). |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF, y entre todas cubren RF-1 a RF-10 (§8.4). La excepción a «Datos de una venta registrada» de SPEC-003 quedó registrada en esa especificación durante la revisión de QA. |
| 3. Lógica separada de la interfaz | Sí | La carga vive solo en la API y no la usa la interfaz. Los subtotales y totales los calcula la API en centavos enteros (§6.7 de la arquitectura), y los comprueba también el disparador diferido de `003_sales.sql`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.4), escrito antes del código de su tarea. |
| 5. Persistencia segura | Sí | La carga escribe solo con el repositorio de `sales` y `shared/database`. Las ventas, sus líneas y el contador se escriben en una sola transacción, y la comprobación previa a la confirmación se deshace siempre (RF-10, D-2). La dirección de la base se lee de `DATABASE_URL`, que no se versiona, y nunca se imprime (D-8). |
| 6. Idioma | Sí | Código e identificadores en inglés (`loadDemoSales`, `planDemoCalendar`); mensajes en español; importes en bolivianos (centavos enteros); días y horas en hora de Bolivia con `shared/calendar.ts` (RF-1, D-3). |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Según [`docs/architecture.md`](../../docs/architecture.md#3-estructura). Solo se crea lo que esta especificación necesita.

```
apps/api/
├── package.json                                   script load:demo-sales (D-1)
├── test/
│   ├── e2e-server.ts                              ruta de pruebas POST /api/__test/demo-sales (D-9)
│   └── official-menu-fixture.ts                   carga OFFICIAL_MENU con saveCategory/saveProduct (§8.1)
└── src/modules/
    ├── menu/index.ts                              exporta también OFFICIAL_MENU (D-4)
    └── sales/
        ├── demo-sales.random.ts                   generador pseudoaleatorio con semilla (D-5)
        ├── demo-sales.random.test.ts
        ├── demo-sales.calendar.ts                 período, domingos sin ventas y ventas por día (RF-1, RF-4)
        ├── demo-sales.calendar.test.ts
        ├── demo-sales.generator.ts                horas, productos, cantidades, pago y cuenta (RF-4 a RF-8)
        ├── demo-sales.generator.test.ts
        ├── demo-sales.rules.ts                    checkDemoCalendar y checkDemoSales: las reglas de RF-4 a RF-8 (D-6)
        ├── demo-sales.rules.test.ts
        ├── demo-sales.service.ts                  inspectDemoSales y loadDemoSales (RF-2, RF-3, RF-8 a RF-10)
        ├── demo-sales.service.integration.test.ts
        ├── demo-sales.cli.ts                      runDemoSalesLoad y punto de entrada (RF-1, RF-3, RF-10)
        └── demo-sales.cli.integration.test.ts
e2e/
└── ventas-demo-us1-cargar.spec.ts                 punta a punta de HU-1 (§8.2)
AGENTS.md                                          fila de npm run load:demo-sales en «Comandos» (Pulido)
```

- **Sin cambios** en `apps/web`, `packages/contracts`, las migraciones, `render.yaml`. `docs/architecture.md` recibe una línea en §6.4 si la persona la aprueba (§9).
- Los archivos siguen `<entidad>.<capa>` (§4.3 de la arquitectura). `demo-sales` tiene más de tres capas, pero ninguna capa repite tres archivos, así que no lleva subcarpeta.
- El comando no forma parte de `npm start`: no se ejecuta al desplegar ni al arrancar la API (spec, «Fuera de alcance»).
- `seed:sales` (`sales-seed.cli.ts`) no se toca: carga ventas de prueba con 200 productos para medir SPEC-004 y SPEC-005, se niega en producción y no sigue las reglas de esta especificación (D-1).

## 4. Modelo de datos

Sin tablas ni columnas nuevas: la carga escribe en `sales`, `sale_lines` y `sale_counter` de `003_sales.sql`, con sus disparadores (líneas que cuadran con el total, ventas inmutables). Lee `categories` y `products` (SPEC-002) y `users` (SPEC-001).

En memoria, el generador produce el `NewSale` del repositorio de ventas, sin cambios:

```ts
// Venta N.º 1832 del 14/09/2026 a las 09:42:17, en hora de Bolivia (ejemplo)
const sale: NewSale = {
  number: 1832,
  draftId: '5b1d…',                       // randomUUID(): cada venta necesita uno (UNIQUE)
  registeredAt: new Date('2026-09-14T13:42:17.000Z'),
  registeredBy: { userId: 'c0a8…', displayName: 'Ana Quispe', role: 'cashier' },
  paymentMethod: 'cash',
  lines: [
    { productId: '…', productName: 'Americano', categoryName: 'Cafés',
      unitPriceCents: 1300, quantity: 2, subtotalCents: 2600 },
    { productId: '…', productName: 'Salteña de pollo', categoryName: 'Salados',
      unitPriceCents: 1100, quantity: 2, subtotalCents: 2200 },
  ],
  totalCents: 4800,
};
```

Tras la carga, `sale_counter.last_number` es el número de la última venta de demostración, así que la siguiente venta de «Nueva venta» recibe el siguiente (RF-8).

El calendario de la demostración, también en memoria:

```ts
interface DemoCalendar {
  from: string;                           // '2026-07-28' (YYYY-MM-DD, hora de Bolivia)
  to: string;                             // '2026-10-27' (ayer)
  days: { date: string; salesCount: number }[];   // 0 en los domingos sin ventas
  total: number;                          // [n] de RF-3
}
```

## 5. Algoritmos relevantes

### 5.1 Período (RF-1, RF-4)

```
demoPeriod(now):                            // now = hora de PostgreSQL (D-3)
  today = boliviaDate(now); to = addDays(today, -1)
  month = addMonths(today[0..7], -3)
  day = min(día de today, último día de month)          // 31/12 → 30/09
  devolver { from: `${month}-${day}`, to }
```

### 5.2 Calendario: ventas por día (RF-4)

```
planDemoCalendar(period, seed):
  repetir con intento = 0, 1, 2…:
    rng = createRandom(seed, 'calendar', intento)
    domingos = domingos del período
    cerrados = uno al azar en cada mes completo del período, sin que dos sean seguidos;
               se agregan al azar hasta llegar a un total al azar entre 2 y 4, sin que dos sean seguidos
    para cada día del período:
      si está en cerrados → 0
      si viernes o sábado → entero al azar en [50, 80]
      si no → entero al azar en [30, 62]                  // promedio 46 contra 65: +41 %
    si checkDemoCalendar(calendario) no encuentra fallos → devolver
```

`total` es la suma de los días. Con la misma semilla y el mismo período, el calendario sale igual, así que la carga confirmada carga el mismo [n] que anunció (RF-3, D-5).

### 5.3 Contenido de las ventas (RF-4 a RF-8)

```
generateDemoSales(calendar, seed, menu, accounts, firstNumber):
  repetir con intento = 0, 1, 2… hasta 50:
    rng = createRandom(seed, 'content', intento)
    ventas = []
    para cada día con ventas:
      segundos = salesCount segundos distintos entre 07:30:00 y 20:29:59,
                 con peso 2,5 en las horas pico y 1 en el resto (RF-4, RF-8)
      forzados = una venta de un solo producto y otra de varios; una en efectivo y otra con QR (RF-5, RF-6)
      para cada segundo, en orden:
        tipo = forzado o al azar: 40 % uno × 1, 20 % uno × 2–6, 35 % de 2 a 5, 5 % de 6 a 12
        productos = sin repetir, con pesos por producto y por hora:
          Americano, Cappuccino, Café latte y las salteñas, peso alto;
          salteñas ×1 antes de las 12:00, ×0,3 de 12:00 a 13:59, ×0,05 desde las 14:00;
          Repostería ×1 desde las 14:00, ×0,4 antes;
          en las de 2 a 5, el primero es una bebida con probabilidad 0,9
        cantidades: 1 (70 %), 2 (20 %), 3–6 (10 %); hasta 12 en las de 6 a 12
        líneas con nombre, categoría y precio del menú leído en la transacción (RF-5)
        total = suma de subtotales
        pago = QR con probabilidad 0,6 si total ≥ 6000 centavos, 0,33 si no
        rol = cajero con probabilidad 0,78 si hay los dos roles; cuenta al azar dentro del rol
    cubrir productos y cuentas que no salieron, cambiando un producto o una cuenta en ventas al azar
    numerar en orden de registered_at desde firstNumber (RF-8)
    si checkDemoSales(ventas, …) no encuentra fallos → devolver ventas
  lanzar DemoSalesGenerationError                         // no debería ocurrir (§8.1)
```

Los pesos dejan margen sobre cada umbral de la especificación: por ejemplo, con estas horas, antes de las 12:00 cae alrededor del 87 % de las salteñas (se pide el 70 %) y desde las 14:00 alrededor del 73 % de la repostería (se pide el 60 %). Aun así, `checkDemoSales` comprueba cada regla antes de cargar (D-6).

### 5.4 Comprobar la base (RF-2)

```
checkBase(tx):
  si existe alguna fila en sales → DemoSalesHasSalesError
  menú = getAdminMenu(tx)
  faltantes = productos de OFFICIAL_MENU, en su orden, cuyo producto (por menuNameKey) no existe,
              está inactivo, está en una categoría que no es la oficial (por menuNameKey) o en una inactiva
  si hay faltantes → DemoSalesMenuError(faltantes)
  cuentas = createAccountsService(tx).list()
  si no hay ninguna → DemoSalesNoAccountsError
  devolver { productos oficiales con id, nombre, categoría y precio vigentes; cuentas }
```

### 5.5 Inspeccionar y cargar (RF-2, RF-3, RF-8 a RF-10)

```
inspectDemoSales(db, { seed, now? }):           // antes de la confirmación: nunca cambia nada
  db.transaction(tx =>
    now = now ?? (SELECT now())                 // D-3
    migrate(batch); checkBase(tx)
    calendar = planDemoCalendar(demoPeriod(now), seed)
    lanzar Rollback({ calendar, now })          // D-2: la transacción se deshace siempre
  ) → devolver { calendar, now }

loadDemoSales(db, { seed, now }):               // después de «CARGAR»
  db.transaction(tx =>
    tx.query("SELECT pg_advisory_xact_lock(hashtext('kofi:demo-sales'))")
    migrate(batch)
    // Ordena esta carga con otra carga y con «Nueva venta», que incrementa la misma fila (RF-10).
    tx.query('SELECT last_number FROM sale_counter FOR UPDATE')
    { productos, cuentas } = checkBase(tx)       // RF-3: vuelve a comprobar en el momento de cargar
    calendar = planDemoCalendar(demoPeriod(now), seed)
    first = reserveSaleNumbers(tx, calendar.total)
    ventas = generateDemoSales(calendar, seed, productos, cuentas, first)
    insertSalesBatch(tx, ventas) en lotes de 250
    devolver { count: calendar.total, from, to }
  )
```

`now` es el de la inspección: el período anunciado y el cargado son el mismo aunque pase la medianoche mientras se espera la respuesta (spec, «Casos límite»).

Cualquier error deshace la transacción completa: ventas, líneas y contador (RF-10). Si «Nueva venta» registró una venta antes de la carga, `checkBase` la ve y rechaza; si la carga llegó primero, el registro espera el bloqueo del contador y después toma `last_number + 1`.

### 5.6 Comando (RF-1, RF-3, RF-10)

```
runDemoSalesLoad({ env, createDatabase, ask, write, seed = randomInt(2^31) }):
  intentar leer DATABASE_URL con loadEnv(env); si falla → write(failed); devolver 1
  db = createDatabase(url)
  intentar:
    { calendar, now } = inspectDemoSales(db, { seed })
    respuesta = ask(confirm(calendar))           // vacía si se cierra la entrada (Ctrl+C, EOF)
    si respuesta.trim() !== 'CARGAR' → write(cancelled); devolver 1
    r = loadDemoSales(db, { seed, now })
    write(loaded(r)); devolver 0
  si DemoSalesHasSalesError → write(hasSales); devolver 1
  si DemoSalesMenuError(f) → write(menu(f)); devolver 1
  si DemoSalesNoAccountsError → write(noAccounts); devolver 1
  cualquier otro error, también DemoSalesGenerationError → write(failed); devolver 1
                                                            // nunca el error original (D-8, D-11)
  al final: db.close()
```

| Clave | Mensaje (spec) |
| --- | --- |
| `confirm` | «Se cargarán [n] ventas de demostración del [desde] al [hasta]. Las ventas registradas no se pueden borrar. Escribe CARGAR para continuar» (RF-3) |
| `loaded` | «Ventas de demostración cargadas: [n] ventas del [desde] al [hasta]» (RF-3) |
| `cancelled` | «Carga cancelada. No se cambió nada» (RF-3) |
| `hasSales` | «La base ya tiene ventas registradas. Las ventas de demostración solo se cargan en una base sin ventas» (RF-2) |
| `menu` | «La base no tiene el menú oficial completo y activo. Faltan o están inactivos: [productos]» (RF-2) |
| `noAccounts` | «La base no tiene cuentas de dueño ni de cajero que registren las ventas» (RF-2) |
| `failed` | «No se pudieron cargar las ventas de demostración. Comprueba la configuración y la conexión a la base» (RF-10) |

Las fechas se escriben con `formatDate` de `packages/contracts` («27/10/2026») y [n] sin separador de miles, como los importes (§6.7 de la arquitectura).

**Cancelación durante la carga (RF-10).** Si la persona cancela el comando después de «CARGAR», el proceso termina sin confirmar la transacción y PostgreSQL la deshace al cerrarse la conexión, como en SPEC-006. Las pruebas lo representan con un fallo a mitad de la carga (§8.4).

## 6. Contrato de la API

**Sin cambios en `packages/contracts`.** La carga no expone rutas de la API ni la usa la interfaz: es un comando que ejecuta a mano la persona que prepara el sistema (spec, «Usuarios»). Usa del contrato lo que ya existe: `menuNameKey`, `formatDate` y los tipos `Role` y `PaymentMethod`.

Los mensajes de §5.6 viven en `demo-sales.cli.ts`, como los de `accounts.cli.ts` y `sales-seed.cli.ts`, porque solo se muestran en la terminal.

La ruta `POST /api/__test/demo-sales` del servidor de E2E no es contrato: solo existe en `apps/api/test/e2e-server.ts`, que nunca se despliega (D-9).

## 7. Decisiones técnicas

| # | Decisión | Motivo | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **Comando nuevo `npm run load:demo-sales -w @kofi/api`** (`node --env-file-if-exists=.env src/modules/sales/demo-sales.cli.ts`), en el módulo `sales` | Escribe ventas, así que pertenece a `sales`, y puede ejecutarse en la base oficial (spec, «Aclaraciones»): es código del producto. Sigue el patrón de `accounts` y `seed:sales`, que están en `develop` | Ampliar `seed:sales`: se niega en producción, exige 200 productos de prueba y su reparto es mecánico; cambiarlo rompería las mediciones de SPEC-004 y SPEC-005 | RF-1 |
| D-2 | **Dos transacciones: inspección siempre deshecha y carga.** La inspección migra, comprueba y calcula [n], y termina con `ROLLBACK`; la carga repite todo con bloqueos | Pedir «CARGAR» con una transacción abierta mantendría bloqueado el contador de ventas y frenaría «Nueva venta» mientras la persona lee. Deshacer la inspección garantiza que nada cambie antes de confirmar (RF-3), y repetir la comprobación cubre los cambios mientras se espera | Una sola transacción abierta durante la pregunta; o comprobar sin transacción, que no podría migrar una base sin cambiarla | RF-2, RF-3 |
| D-3 | **«Hoy» sale de PostgreSQL** (`SELECT now()`), una vez, en la inspección; las pruebas pasan `now` | RF-1 exige la hora del sistema donde se guardan las ventas, no la de la computadora que ejecuta el comando; `clock.ts` del proceso sería la de la computadora. Usar el `now` de la inspección mantiene el período anunciado aunque pase la medianoche | `systemClock`: un reloj atrasado en la computadora cambiaría el período | RF-1, RF-4 |
| D-4 | **`menu/index.ts` exporta `OFFICIAL_MENU`**, y la carga busca cada producto oficial con `menuNameKey` en `getAdminMenu` | Es la misma fuente que la carga del menú oficial, comprobada contra la tabla de SPEC-006, y respeta que un módulo solo importe del `index.ts` de otro (§4.2 de la arquitectura) | Copiar la lista en `sales`: dos copias del menú oficial que pueden divergir | RF-2, RF-5 |
| D-5 | **Generador pseudoaleatorio propio con semilla** (`createRandom(seed, stream, attempt)`, mulberry32 sobre un hash de los tres datos), con flujos separados para el calendario y el contenido | La misma semilla da el mismo [n] en la inspección y en la carga, y las pruebas son repetibles. Separar los flujos hace que [n] no dependa de los precios ni de las cuentas, que pueden cambiar entre la pregunta y la carga | `Math.random()`: no se puede repetir ni probar; una dependencia como `seedrandom`: no hace falta para 20 líneas | RF-3, RF-4 a RF-7 |
| D-6 | **`checkDemoSales` comprueba cada regla de RF-4 a RF-8 sobre el resultado** y el generador reintenta con otro intento de la misma semilla si alguna falla (hasta 50) | Las reglas son estadísticas (porcentajes, promedios, los 10 más vendidos): un generador al azar las cumple casi siempre, pero no siempre. Comprobar antes de cargar garantiza que nunca se carga una demostración que no cumple la especificación | Confiar en los pesos: una semilla desafortunada cargaría ventas fuera de la especificación que no se pueden borrar | RF-4 a RF-8 |
| D-11 | **Si el generador agota sus 50 intentos, la carga no se completa y el comando muestra el mensaje de RF-10**, sin cambiar nada. La prueba del generador comprueba que no ocurre con 1000 semillas | RF-10 cubre cualquier carga que «no se puede completar»; sus causas son ejemplos. Es un caso que las pruebas descartan en la práctica, y un mensaje propio sería un texto que la especificación no fija | Un mensaje nuevo para este caso: cambiaría la especificación por un caso que no debería verse; reintentar sin límite: el comando podría no terminar | RF-10 |
| D-7 | **Confirmación con `node:readline/promises`**: si la entrada se cierra (Ctrl+C antes de responder o una entrada que no es terminal), la respuesta es vacía y se cancela | No necesita dependencias y funciona igual en las terminales de Windows. Una entrada cerrada nunca carga | Un argumento `--yes`: permitiría cargar sin leer el aviso, en contra del resguardo que pidió la persona | RF-3 |
| D-8 | **El comando recibe sus dependencias** (`env`, `createDatabase`, `ask`, `write`, `seed`) y solo imprime los mensajes de §5.6, nunca el error original | Se prueba sin base real ni proceso aparte, como `runAccounts` de `accounts.cli.ts`. Los errores de `pg` y de `loadEnv` pueden incluir la dirección de la base | Imprimir `error.message` | RF-3, RF-10 |
| D-9 | **La prueba de punta a punta carga con una ruta del servidor de E2E**, que reemplaza el menú por `OFFICIAL_MENU` y llama a `loadDemoSales` sobre PGlite con el reloj falso y una semilla fija | La CI no tiene PostgreSQL; así se comprueba en el Historial el resultado de la carga real. El comando contra PostgreSQL se ejecuta en Pulido (§8.3) | Lanzar el comando en la E2E: necesitaría PostgreSQL en la CI | RF-9 |
| D-10 | **Inserción con `insertSalesBatch` en lotes de 250**, después de reservar todos los números con `reserveSaleNumbers` | Unas 4500 ventas y 9000 líneas llegan a Neon en unas 20 sentencias, dentro de los 3 minutos de RNF-3; es el camino que ya usa `seed:sales` y respeta los disparadores de `003_sales.sql` | `insertSale` de una en una: miles de idas y vueltas a la base | RF-8, RF-10, RNF-3 |

### 7.1 Dependencias

Ninguna nueva.

## 8. Estrategia de tests

### 8.1 Niveles

| Nivel | Archivo | Qué comprueba |
| --- | --- | --- |
| Unitaria | `demo-sales.random.test.ts` | Misma semilla, misma secuencia; flujos e intentos distintos, secuencias distintas |
| Unitaria | `demo-sales.calendar.test.ts` | Período (28/10, 31/12, 01/11, 31/05 y años bisiestos); domingos sin ventas; ventas por día; misma semilla, mismo [n] |
| Unitaria | `demo-sales.rules.test.ts` | Cada regla de `checkDemoSales` detecta su incumplimiento con datos armados a mano |
| Unitaria | `demo-sales.generator.test.ts` | Para 200 semillas, el resultado cumple RF-4 a RF-8 con aserciones propias (no con `checkDemoSales`) y lo consigue en el primer intento en al menos el 95 % de las semillas; para 1000 semillas, ninguna agota los 50 intentos (D-11) |
| Integración (PGlite) | `demo-sales.service.integration.test.ts` | Inspección sin cambios; carga; rechazos de RF-2; nueva comprobación al cargar; fallo a mitad; dos cargas a la vez; carga y «Nueva venta» a la vez; número siguiente |
| Integración (PGlite) | `demo-sales.cli.integration.test.ts` | Mensajes y código de salida de cada caso, con `ask` simulado; ningún mensaje contiene la dirección de la base |
| Punta a punta | `e2e/ventas-demo-us1-cargar.spec.ts` | HU-1 en el navegador (§8.2) |

`apps/api/test/official-menu-fixture.ts` carga `OFFICIAL_MENU` con `saveCategory` y `saveProduct` en las pruebas, sin depender de la carga del menú oficial de SPEC-006.

### 8.2 Punta a punta por historia

**HU-1** (`e2e/ventas-demo-us1-cargar.spec.ts`): con el reloj falso en el 28/10/2026 a las 11:00, la prueba llama a `POST /api/__test/demo-sales`, que deja el menú oficial y carga con una semilla fija.

1. Con una sesión de dueño, «Historial de ventas» muestra «Ventas del 28/10/2026» sin ventas.
2. «Día anterior» muestra el 27/10/2026 con entre 30 y 80 ventas, horas entre 07:30 y 20:29, «Efectivo» y «QR», y cuentas de dueño y cajero de prueba.
3. El detalle de una venta muestra líneas del menú oficial con su categoría y su precio («Americano · Cafés · Bs 13,00 × …»).
4. «Ver por mes» en septiembre de 2026 muestra 30 filas, con al menos una «Bs 0,00 · 0 ventas».
5. Con una sesión de cajero, «Nueva venta» registra una venta y la confirmación muestra el número siguiente al de la última venta de demostración (RF-8).

### 8.3 Requisitos no funcionales y comprobación real

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Los mensajes en español están fijados en las pruebas del comando |
| RNF-2 | La integración comprueba que cada `subtotalCents` es `unitPriceCents × quantity`, cada `totalCents` la suma, y que el disparador de `003_sales.sql` acepta la carga |
| RNF-3 | En Pulido, la persona ejecuta `npm run load:demo-sales -w @kofi/api` contra una base de Neon de comprobación con el menú oficial y sin ventas, desde su computadora, y cronometra que termine en menos de 3 minutos después de escribir «CARGAR». Repite el comando para comprobar el rechazo de RF-2. El resultado se anota en el PR de pulido |
| RNF-4 | Unitaria: ningún día pasa de 80 ventas ni ningún mes de 2480, por debajo de los 400 y 6000 de SPEC-005 |

**Concurrencia en PostgreSQL real (RF-10).** En Pulido, sobre otra base de comprobación con el menú oficial y sin ventas, la persona lanza dos cargas a la vez con un solo comando de Node y responde «CARGAR» en las dos; una debe cargar y la otra mostrar el mensaje de base con ventas. El resultado se anota en el PR de pulido.

### 8.4 Cobertura por RF

| RF | Pruebas |
| --- | --- |
| RF-1 | Comando: se ejecuta sin cuenta ni sesión. Integración: la inspección toma `now` de `SELECT now()` cuando no se le pasa; con `now` de prueba en otra zona horaria del proceso (`TZ`), el período no cambia |
| RF-2 | Integración: rechazo sin cambios con una venta, con el menú vacío, con «Mocochinchi» inactivo, con «Cuñapé» renombrado, con una categoría oficial inactiva y sin cuentas, en ese orden de prioridad; con productos extra y un precio cambiado, carga. Comando: cada mensaje, salida 1 |
| RF-3 | Comando: «CARGAR» y «  CARGAR  » cargan; «cargar», «sí», vacío y entrada cerrada cancelan sin cambios; el [n] anunciado es el cargado. Integración: una venta o un producto desactivado entre la inspección y la carga, rechazo sin cambios; un precio cambiado, las líneas llevan el nuevo |
| RF-4 | Unitaria: período, horario, domingos sin ventas (2 a 4, uno por mes completo, nunca seguidos), 30 a 80 por día, viernes y sábados +20 %, horas pico |
| RF-5 | Unitaria: reparto de tipos ±5 puntos, cantidades, bebida en el 80 %, cada día con una venta simple y una combinada, los 37 productos, los 10 más vendidos, salteñas y repostería por hora, subtotales y totales. Integración: nombres, categorías y precios del menú vigente |
| RF-6 | Unitaria: 55 % a 65 % en efectivo, los dos medios cada día, más QR desde Bs 60,00 |
| RF-7 | Unitaria: 70 % a 85 % cajero con los dos roles; un solo rol; cada cuenta al menos una vez. Integración: nombre visible y rol de cada cuenta al cargar |
| RF-8 | Unitaria: números consecutivos en orden de fecha, segundos distintos. Integración: la siguiente venta de `createSalesService(…).register` toma el número siguiente. E2E de §8.2 |
| RF-9 | Integración: `listRegisteredSales` y el resumen del día de SPEC-005 incluyen las ventas cargadas; el menú y las cuentas no cambian. E2E de §8.2 |
| RF-10 | Integración: un fallo en un lote intermedio deja sin ventas y con `last_number = 0`; dos cargas a la vez (`Promise.all`): una carga y la otra se rechaza; orden de las sentencias (bloqueo consultivo, migración, `FOR UPDATE` del contador, comprobación). Comando: `DATABASE_URL` ausente o inválida y un error que contiene la dirección muestran solo el mensaje de RF-10. Pulido: concurrencia en PostgreSQL real (§8.3) |

## 9. Decisiones globales en `docs/architecture.md`

Aprobada por la persona y aplicada en este PR: se añade a §6.4 «Datos»:

> - Un comando que la persona ejecuta desde su computadora contra una base (por ejemplo, `load:demo-sales`) toma «ahora» de PostgreSQL (`SELECT now()`), no del reloj de la computadora. Adoptado en SPEC-007 (D-3).

Pulido añade la fila de `npm run load:demo-sales` a «Comandos» de `AGENTS.md`, con su nota: la ejecuta a mano la persona que prepara el sistema y pide la confirmación «CARGAR», fuera de las comprobaciones automáticas.

## 10. Observaciones para la otra persona

`apps/api/src/modules/menu/index.ts` también lo cambia la rama `feat/006-menu-inicial-us1` (exporta `loadOfficialMenu`). La exportación de `OFFICIAL_MENU` de D-4 va en una línea aparte; si se fusiona después, el conflicto se resuelve conservando las dos líneas.

## 11. Cambios tras el análisis de consistencia

La persona pidió corregir los tres hallazgos menores del análisis (2026-10-28).

| # | Hallazgo | Cambio |
| --- | --- | --- |
| 1 | §5.2 llamaba «reglas de calendario de `checkDemoSales`» a lo que `tasks.md` (T003) escribe como `checkDemoCalendar` | §3 y §5.2 usan `checkDemoCalendar` |
| 2 | D-1, D-8 y §6 citaban como patrones `load:menu`, `official-menu.cli.ts` y `runOfficialMenuLoad`, que no están en `develop` | Citan `accounts.cli.ts` (`runAccounts`) y `sales-seed.cli.ts`, que sí están |
| 3 | Agotar los intentos del generador mostraba el mensaje de RF-10 sin que el plan lo decidiera | D-11 lo decide; §5.6, §8.1 y `tasks.md` (T006, T009) lo prueban |
