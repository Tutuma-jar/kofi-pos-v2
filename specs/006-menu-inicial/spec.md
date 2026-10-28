# SPEC-006 — Menú inicial

Estado: revisada · Fecha: 2026-10-28

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-002 — Menú](../002-menu/spec.md): usa sus conceptos de categoría, producto y menú vigente, y sus reglas de «Datos de una categoría», «Datos de un producto» y «Comparación de nombres».

## 1. Contexto y objetivo

Kofi es una cafetería pequeña de Bolivia (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). SPEC-002 permite que el dueño arme el menú desde el sistema, pero el menú empieza vacío y hasta hoy solo se cargaron productos de prueba en las bases de comprobación. Kofi todavía no tiene su base oficial.

Objetivo: que la base oficial de Kofi empiece con el menú oficial de la cafetería, y solo con él, cargado de una vez y sin errores de tipeo, para que el local pueda vender desde el primer día. Después de la carga, el dueño mantiene el menú como siempre, desde «Administrar menú» (SPEC-002).

### Menú oficial

Todas las categorías y todos los productos se cargan activos.

| Categoría | Producto | Precio |
| --- | --- | --- |
| Cafés | Espresso | Bs 10,00 |
| Cafés | Americano | Bs 13,00 |
| Cafés | Cortado | Bs 14,00 |
| Cafés | Café con leche | Bs 15,00 |
| Cafés | Café filtrado de los Yungas | Bs 16,00 |
| Cafés | Cappuccino | Bs 18,00 |
| Cafés | Café latte | Bs 18,00 |
| Cafés | Mocaccino | Bs 22,00 |
| Otras bebidas calientes | Té | Bs 8,00 |
| Otras bebidas calientes | Mate de coca | Bs 8,00 |
| Otras bebidas calientes | Api morado | Bs 8,00 |
| Otras bebidas calientes | Chocolate caliente | Bs 16,00 |
| Otras bebidas calientes | Chai latte | Bs 18,00 |
| Bebidas frías | Agua mineral | Bs 6,00 |
| Bebidas frías | Gaseosa personal | Bs 8,00 |
| Bebidas frías | Mocochinchi | Bs 8,00 |
| Bebidas frías | Café helado | Bs 18,00 |
| Bebidas frías | Frappé de café | Bs 24,00 |
| Bebidas frías | Frappé de moca | Bs 26,00 |
| Jugos y licuados | Limonada | Bs 10,00 |
| Jugos y licuados | Jugo de naranja | Bs 14,00 |
| Jugos y licuados | Jugo de papaya | Bs 14,00 |
| Jugos y licuados | Licuado de plátano con leche | Bs 15,00 |
| Jugos y licuados | Licuado de frutilla con leche | Bs 16,00 |
| Salados | Cuñapé | Bs 4,00 |
| Salados | Empanada de queso | Bs 7,00 |
| Salados | Salteña de pollo | Bs 11,00 |
| Salados | Salteña de carne | Bs 11,00 |
| Salados | Croissant de jamón y queso | Bs 18,00 |
| Salados | Sándwich de jamón y queso | Bs 22,00 |
| Repostería | Alfajor de maicena | Bs 6,00 |
| Repostería | Croissant | Bs 10,00 |
| Repostería | Muffin de vainilla | Bs 10,00 |
| Repostería | Brownie | Bs 12,00 |
| Repostería | Rollo de canela | Bs 12,00 |
| Repostería | Torta de chocolate (porción) | Bs 18,00 |
| Repostería | Cheesecake de maracuyá | Bs 22,00 |

En total, 6 categorías y 37 productos.

## 2. Usuarios

| Usuario | Qué hace con el menú inicial |
| --- | --- |
| **Persona que prepara el sistema** | Una persona del equipo con acceso a la configuración de la base oficial. Ejecuta la carga una sola vez, a mano y desde su computadora, después de crear la base nueva. El sistema no la identifica con una cuenta de dueño o cajero: puede ejecutar la carga quien tenga en su computadora la configuración de acceso a la base. |
| **Dueño** | No ejecuta la carga. Encuentra el menú oficial en «Administrar menú» y lo mantiene desde ahí (SPEC-002). |
| **Cajero** | No ejecuta la carga. Encuentra el menú oficial en «Ver menú» y en las ventas (SPEC-002 y SPEC-003). |

## 3. Historias de usuario, priorizadas

### HU-1 — Empezar la base oficial con el menú de Kofi (P1)

Como **persona que prepara el sistema**, quiero **cargar el menú oficial de Kofi en la base nueva con una sola orden** para **que el local pueda vender desde el primer día sin que el dueño escriba 37 productos a mano ni se cuele un dato de prueba**.

**Prueba independiente:** sobre una base nueva, sin categorías ni productos, se ejecuta la carga: termina con «Menú oficial cargado: 6 categorías y 37 productos». Con una sesión de dueño, «Administrar menú» muestra exactamente las categorías y los productos de «Menú oficial», activos y con sus precios; «Ver menú» muestra los mismos. Al ejecutar la carga por segunda vez, se rechaza con el mensaje de base no vacía y el menú queda igual. Sobre una base con los productos de prueba, se rechaza igual y no cambia nada.

*Producto mínimo útil:* por sí sola, esta historia deja la base oficial lista para vender.

## 4. Requisitos funcionales

### HU-1 — Empezar la base oficial con el menú de Kofi

**RF-1. Contenido del menú oficial** (HU-1)

- El sistema deberá tener como menú oficial exactamente las 6 categorías y los 37 productos de «Menú oficial», cada producto en su categoría y con su precio.
- El sistema deberá cumplir en cada categoría y cada producto del menú oficial las reglas de «Datos de una categoría», «Datos de un producto» y «Comparación de nombres» de SPEC-002.

**RF-2. Carga en una base nueva** (HU-1)

- Cuando la persona que prepara el sistema ejecuta la carga sobre una base sin ninguna categoría ni ningún producto, el sistema deberá crear todas las categorías y todos los productos del menú oficial, activos, con los nombres y los precios de «Menú oficial».
- Cuando la base está recién creada y el sistema todavía no está preparado en ella, el sistema deberá prepararla y después cargar el menú oficial, con el mismo resultado que en una base ya preparada.
- El sistema deberá ejecutar la carga sin pedir ni usar una cuenta de dueño o cajero: solo puede hacerlo quien tenga la configuración de acceso a la base.
- Cuando la carga termina, el sistema deberá mostrar «Menú oficial cargado: 6 categorías y 37 productos».
- El sistema deberá dejar el menú cargado igual que si el dueño lo hubiera creado desde «Administrar menú»: se ve en la administración y en la consulta, forma parte del menú vigente que se entrega a otros módulos (SPEC-002, RF-15) y el dueño puede editarlo, desactivarlo y reactivarlo como cualquier otro.

**RF-3. Solo en una base sin menú** (HU-1)

- Si al ejecutar la carga la base tiene al menos una categoría o un producto, activo o inactivo, entonces el sistema deberá rechazar la carga sin crear, cambiar ni eliminar nada y mostrar «La base ya tiene categorías o productos. El menú oficial solo se carga en una base nueva».
- El sistema deberá no eliminar ni reemplazar nunca categorías o productos existentes.
- Si dos cargas se ejecutan a la vez sobre la misma base vacía, entonces el sistema deberá completar solo una y rechazar la otra con el mensaje de este RF.

**RF-4. Carga completa o nada** (HU-1)

- El sistema deberá cargar el menú oficial completo o no cargar nada: nunca queda una parte del menú oficial en la base.
- Si la carga no se puede completar (por ejemplo, por falta de conexión o por una configuración de acceso incorrecta), entonces el sistema deberá dejar la base exactamente como estaba antes de ejecutarla, sin eliminar nada, y mostrar «No se pudo cargar el menú oficial. Comprueba la configuración y la conexión a la base».
- Si la persona cancela la carga antes de que termine, entonces el sistema deberá dejar la base exactamente como estaba antes de ejecutarla.
- El sistema deberá no mostrar nunca, en ningún mensaje, la dirección de la base, contraseñas ni otros datos de configuración.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los mensajes para la persona están en español.
- **RNF-2. Importes exactos.** Los precios quedan guardados exactamente como en «Menú oficial», con dos decimales (SPEC-002, RNF-2).
- **RNF-3. Rapidez.** La carga sobre una base nueva termina en menos de 1 minuto desde la computadora de la persona que prepara el sistema.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Ejecutar la carga dos veces sobre la misma base | La segunda se rechaza sin cambios (RF-3). |
| Base con los 200 productos de prueba | Se rechaza sin cambios (RF-3). |
| Base con una sola categoría, sin productos | Se rechaza sin cambios (RF-3). |
| Base con categorías y productos todos inactivos | Se rechaza sin cambios: los inactivos cuentan (RF-3). |
| Base nueva que ya tiene las cuentas del dueño y del cajero | Se carga: las cuentas no son parte del menú (RF-2). |
| Base recién creada, sin el sistema preparado | Se prepara y se carga el menú oficial (RF-2). |
| Base de comprobación nueva y vacía | Se carga igual que la oficial; sirve para probar la carga (RF-2). |
| Configuración de acceso incorrecta o ausente | No se toca ninguna base y se muestra el mensaje de error (RF-4). |
| Se pierde la conexión a mitad de la carga | La base queda exactamente como estaba (RF-4). |
| La persona cancela la carga a mitad | La base queda exactamente como estaba (RF-4). |
| Dos personas ejecutan la carga a la vez | Solo una se completa; la otra se rechaza (RF-3). |
| El dueño cambia el precio de un producto oficial después de la carga | Se aplica como cualquier cambio del menú (RF-2; SPEC-002, RF-5). |

## 7. Fuera de alcance

- Crear la base oficial, sus cuentas de dueño y cajero, o desplegar el sistema: lo hace la persona que prepara el sistema con lo que ya existe.
- Ejecutar la carga automáticamente al desplegar o al arrancar el sistema.
- Ejecutar la carga desde la interfaz o con una sesión de dueño.
- Completar un menú a medias, eliminar o reemplazar el menú existente, o borrar los datos de prueba de una base.
- Actualizar el menú oficial en una base que ya lo tiene: los cambios posteriores se hacen desde «Administrar menú».
- Importar o exportar el menú desde otros formatos (por ejemplo, una hoja de cálculo).
- Descripción, foto, ingredientes, variantes o extras de los productos (SPEC-002, «Fuera de alcance»).

## 8. Criterios de finalización

- Tras una sola ejecución sobre una base nueva, «Ver menú» muestra exactamente 6 categorías y 37 productos, con los nombres y los precios de «Menú oficial», y ningún producto de prueba.
- El 100 % de las ejecuciones sobre una base con alguna categoría o algún producto terminan sin ningún cambio en la base.
- Ninguna ejecución interrumpida deja una parte del menú oficial en la base.
- La carga termina en menos de 1 minuto.
- Un cajero puede vender cualquiera de los 37 productos justo después de la carga, sin pasos adicionales.

## 9. Dudas abiertas

Ninguna.

## 10. Aclaraciones

### 2026-10-28

- **P:** ¿El menú oficial se carga desde la interfaz o con una especificación nueva que añada una carga? → **R:** Una especificación nueva (SPEC-006, «menu-inicial») con una carga que deja el menú oficial en una base vacía. (Aplicado en «Contexto y objetivo» y HU-1.)
- **P:** ¿De qué tamaño es el menú? → **R:** Mediano: 6 categorías y unos 35 productos, propios de una cafetería pequeña boliviana. (Aplicado en «Menú oficial».)
- **P:** ¿Se confirman las categorías, los productos y los precios propuestos? → **R:** Sí, tal cual. (Aplicado en «Menú oficial» y RF-1; cierra la duda abierta de SPEC-002 §9.)
- **P:** ¿Qué hace la carga si la base ya tiene alguna categoría o producto? → **R:** En la base oficial solo debe estar el menú oficial, sin nada de las pruebas. (Aplicado en RF-3.)
- **P:** ¿Cómo se garantiza que la base oficial tenga solo el menú oficial? → **R:** La base oficial se crea nueva; la carga solo funciona sin categorías ni productos y, si encuentra alguno, se niega sin tocar nada. Nunca se borra nada. (Aplicado en RF-3, «Casos límite» y «Fuera de alcance».)
- **P:** ¿Quién ejecuta la carga y cuándo? → **R:** La persona que prepara el sistema, a mano y una sola vez, desde su computadora contra la base nueva; después el dueño mantiene el menú desde «Administrar menú». (Aplicado en «Usuarios», RF-2 y «Fuera de alcance».)

**Revisión de QA.**

- **P:** (Hallazgo 1) «Base nueva» no decía si incluye una base recién creada en la que el sistema aún no está preparado. ¿La carga funciona en ella? → **R:** Sí: la prepara y después carga el menú oficial. (Aplicado en RF-2 y «Casos límite».)
- **P:** (Hallazgo 2) No se decía cómo se reconoce a la persona que prepara el sistema. ¿Quién puede ejecutar la carga? → **R:** Quien tenga en su computadora la configuración de acceso a la base, sin cuenta de dueño ni de cajero. (Aplicado en «Usuarios», RF-2 y «Casos límite».)
- **P:** (Hallazgos 3 y 5) RF-4 podía leerse como una orden de eliminar y no cubría la cancelación. ¿Cómo queda la base si la carga falla o se cancela? → **R:** Exactamente como estaba antes de ejecutarla, sin eliminar nada. (Aplicado en RF-4 y «Casos límite».)
- **P:** (Hallazgo 4) SPEC-002 mantenía, sin mencionar esta especificación, la decisión de que el menú no se precarga. ¿Cómo se concilia? → **R:** SPEC-002 registra en sus «Aclaraciones» que la carga del menú oficial en una base nueva la cubre SPEC-006. (Aplicado en `specs/002-menu/spec.md`, «Aclaraciones».)
- **P:** (Hallazgo 6) Un caso límite citaba una decisión técnica del plan de SPEC-002 y una herramienta de prueba. ¿Se mantiene? → **R:** Se quita: RF-3 ya cubre cualquier base con productos. (Aplicado en «Casos límite».)

**Implementación de T001.**

- **P:** La tabla «Menú oficial» tiene 37 productos (8, 5, 6, 5, 6 y 7), pero la especificación decía 36. ¿Qué se corrige? → **R:** Se mantiene la tabla confirmada y el total pasa a 37 productos, también en el mensaje de carga. (Aplicado en «Menú oficial», HU-1, RF-1, RF-2 y «Criterios de finalización»; también en `plan.md` y `tasks.md`.)
