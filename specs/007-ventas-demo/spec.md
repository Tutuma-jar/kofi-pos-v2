# SPEC-007 — Ventas de demostración

Estado: revisada · Fecha: 2026-10-28

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de:

- [SPEC-006 — Menú inicial](../006-menu-inicial/spec.md): las ventas se arman solo con los productos de su «Menú oficial».
- [SPEC-002 — Menú](../002-menu/spec.md): conceptos de categoría, producto y menú vigente, y su regla de «Comparación de nombres».
- [SPEC-001 — Acceso](../001-acceso/spec.md): cuentas, nombre visible y rol de quien registra una venta.
- [SPEC-003 — Ventas](../003-ventas/spec.md): «Datos de una venta registrada» y las ventas registradas que se entregan a otros módulos (RF-11).
- [SPEC-005 — Historial y reportes](../005-historial/spec.md) y [SPEC-004 — Dashboard](../004-dashboard/spec.md): muestran las ventas cargadas. Los días y los meses se entienden como en SPEC-004 («Conceptos»).

## 1. Contexto y objetivo

Kofi es una cafetería pequeña de Bolivia (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). El Historial (SPEC-005) permite revisar las ventas de cualquier día, el detalle de cualquier venta y las cifras de cualquier mes, pero en una base nueva, con el menú oficial recién cargado (SPEC-006), no hay ninguna venta: todos los días y todos los meses aparecen en cero y no hay nada que mostrar.

Objetivo: poder llenar una base que tiene el menú oficial, y todavía ninguna venta, con tres meses de ventas pasadas variadas y creíbles, armadas con los productos del menú oficial, para mostrar el Historial (y el Dashboard) con datos parecidos a los de un local en marcha: días con más y menos ventas, días sin ventas, ventas de un solo producto y ventas combinadas, pagos en efectivo y con QR, y registradas por las cuentas de la base.

Las ventas de demostración son ventas registradas como cualquier otra (SPEC-003): no se pueden borrar, y el Historial y el Dashboard no las distinguen de las reales. Por eso la carga solo funciona en una base sin ventas y pide una confirmación escrita antes de cargar.

### Conceptos

| Concepto | Definición |
| --- | --- |
| **Ventas de demostración** | Las ventas registradas que crea la carga de esta especificación. Cumplen las reglas de «Datos de una venta registrada» de SPEC-003, salvo tres que se aplican de otro modo, como registra esa especificación en sus «Aclaraciones»: su fecha y hora es una del período de demostración, no la del momento de la carga (RF-4); quién la registró es una cuenta de la base, sin sesión (RF-7); y sus productos llevan el nombre, la categoría y el precio del menú vigente al cargar (RF-5). |
| **Período de demostración** | Desde el mismo día del mes, tres meses antes de hoy, hasta ayer, en hora de Bolivia. Si ese día no existe en aquel mes, empieza el último día de ese mes. Ejemplo: si hoy es 28/10/2026, va del 28/07/2026 al 27/10/2026. Hoy queda siempre sin ventas de demostración. |
| **Menú oficial completo y activo** | La base tiene cada uno de los 37 productos de «Menú oficial» de SPEC-006, activo, en una categoría activa con el nombre de su categoría oficial; nombres comparados según «Comparación de nombres» de SPEC-002. Puede tener además otros productos y categorías. |
| **Horario del local** | Desde las 07:30:00 hasta las 20:29:59, en hora de Bolivia: el local cierra a las 20:30 y la última venta se registra antes. |
| **Horas pico** | De 09:00 a 10:59 y de 15:30 a 17:59. |

## 2. Usuarios

| Usuario | Qué hace con las ventas de demostración |
| --- | --- |
| **Persona que prepara el sistema** | Una persona del equipo con la configuración de acceso a la base en su computadora, como en SPEC-006. Ejecuta la carga a mano, desde su computadora, y la confirma. El sistema no le pide una cuenta de dueño o cajero. |
| **Dueño** | No ejecuta la carga. Ve las ventas cargadas en el Historial (SPEC-005) y en el Dashboard (SPEC-004), y en algunas figura como quien las registró. |
| **Cajero** | No ejecuta la carga. Figura como quien registró la mayoría de las ventas cargadas. |

## 3. Historias de usuario, priorizadas

### HU-1 — Llenar una base con tres meses de ventas variadas (P1)

Como **persona que prepara el sistema**, quiero **cargar con una sola orden, en una base con el menú oficial y sin ventas, tres meses de ventas pasadas variadas armadas con ese menú** para **mostrar el Historial de ventas con días, meses y ventas parecidos a los de un local en marcha, sin registrar miles de ventas a mano**.

**Prueba independiente:** el 28/10/2026, sobre una base con el menú oficial cargado (SPEC-006), sin ventas y con una cuenta de dueño «Luis Mamani» y una de cajero «Ana Quispe», se ejecuta la carga: muestra cuántas ventas cargará, del 28/07/2026 al 27/10/2026, avisa que no se pueden borrar y pide escribir «CARGAR». Al escribir «CARGAR» termina con «Ventas de demostración cargadas: [n] ventas del 28/07/2026 al 27/10/2026». Con una sesión de dueño, «Historial de ventas» muestra hoy sin ventas; «Día anterior» muestra el 27/10/2026 con entre 30 y 80 ventas, todas entre las 07:30 y las 20:29, registradas por «Ana Quispe · Cajero» o «Luis Mamani · Dueño», en efectivo y con QR. El detalle de una venta muestra productos del menú oficial con su categoría y su precio. «Ver por mes» en septiembre de 2026 muestra 30 filas, la mayoría con ventas y alguna con «Bs 0,00 · 0 ventas». Al ejecutar la carga otra vez, se rechaza con el mensaje de base con ventas y nada cambia.

*Producto mínimo útil:* por sí sola, esta historia deja una base lista para mostrar el Historial.

## 4. Requisitos funcionales

### HU-1 — Llenar una base con tres meses de ventas variadas

**RF-1. Ejecución de la carga** (HU-1)

- El sistema deberá ejecutar la carga sin pedir ni usar una sesión de dueño o cajero: solo puede hacerlo quien tenga la configuración de acceso a la base, como en SPEC-006 (RF-2).
- El sistema deberá calcular hoy, ayer y el período de demostración con la fecha y la hora del sistema donde se guardan las ventas, en hora de Bolivia, no con el reloj ni la zona horaria de la computadora desde la que se ejecuta la carga.

**RF-2. Solo en una base preparada y sin ventas** (HU-1)

Antes de pedir la confirmación, el sistema comprueba la base en este orden y se detiene en la primera condición que no se cumple:

- Si la base tiene al menos una venta registrada, entonces el sistema deberá rechazar la carga sin crear, cambiar ni eliminar nada y mostrar «La base ya tiene ventas registradas. Las ventas de demostración solo se cargan en una base sin ventas».
- Si la base no tiene el menú oficial completo y activo (ver «Conceptos»), entonces el sistema deberá rechazar la carga sin cambiar nada y mostrar «La base no tiene el menú oficial completo y activo. Faltan o están inactivos: [productos]», con el nombre de cada producto oficial que falta, está inactivo, está en otra categoría o cuya categoría está inactiva, separados por comas.
- Si la base no tiene ninguna cuenta de dueño ni de cajero, entonces el sistema deberá rechazar la carga sin cambiar nada y mostrar «La base no tiene cuentas de dueño ni de cajero que registren las ventas».
- El sistema deberá no eliminar ni reemplazar nunca ventas, productos, categorías ni cuentas existentes.

**RF-3. Confirmación escrita** (HU-1)

- Cuando la base cumple RF-2, el sistema deberá mostrar «Se cargarán [n] ventas de demostración del [desde] al [hasta]. Las ventas registradas no se pueden borrar. Escribe CARGAR para continuar» y esperar la respuesta, sin cambiar nada todavía.
- Cuando la persona escribe exactamente «CARGAR» (en mayúsculas, sin tener en cuenta los espacios alrededor), el sistema deberá volver a comprobar RF-2 en el mismo momento de cargar y, si se cumple, cargar las [n] ventas anunciadas con el menú y las cuentas tal como están en ese momento.
- Si al escribir «CARGAR» la base ya no cumple RF-2 (por ejemplo, porque se registró una venta, se desactivó un producto oficial o se eliminaron las cuentas mientras se esperaba la respuesta), entonces el sistema deberá rechazar la carga con el mensaje que corresponda de RF-2, sin cambiar nada.
- Si la persona escribe cualquier otra cosa o no escribe nada, entonces el sistema deberá terminar sin cambiar nada y mostrar «Carga cancelada. No se cambió nada».
- Cuando la carga termina, el sistema deberá mostrar «Ventas de demostración cargadas: [n] ventas del [desde] al [hasta]», con las fechas en el formato de SPEC-003 («27/10/2026»).

**RF-4. Días y horas de las ventas** (HU-1)

- El sistema deberá registrar todas las ventas de demostración dentro del período de demostración, en el horario del local, y ninguna hoy ni en un día futuro.
- El sistema deberá dejar sin ventas entre 2 y 4 domingos del período, al menos uno en cada mes calendario completo del período y nunca dos domingos seguidos, y dar a cada uno de los demás días del período entre 30 y 80 ventas.
- El sistema deberá dar a los viernes y sábados, en promedio, al menos un 20 % más de ventas que a los días de lunes a jueves.
- El sistema deberá registrar en las horas pico más ventas por hora que en el resto del horario del local, contando todo el período.

**RF-5. Contenido de cada venta** (HU-1)

- El sistema deberá armar cada venta solo con productos de «Menú oficial» (SPEC-006), con su nombre, el nombre de su categoría y su precio tal como están en el menú vigente de la base al ejecutar la carga; un producto aparece en una sola línea de la venta.
- El sistema deberá repartir las ventas así, contando todo el período y con una tolerancia de 5 puntos: 40 % con un solo producto y cantidad 1; 20 % con un solo producto y cantidad de 2 a 6; 35 % con 2 a 5 productos distintos; y 5 % con 6 a 12 productos distintos.
- El sistema deberá dar a cada día con ventas al menos una venta con un solo producto y al menos una con 2 o más productos distintos.
- El sistema deberá usar en cada línea una cantidad de 1 a 6, salvo en las ventas de 6 a 12 productos, donde puede llegar a 12.
- El sistema deberá incluir al menos una bebida (categorías «Cafés», «Otras bebidas calientes», «Bebidas frías» o «Jugos y licuados») en al menos el 80 % de las ventas con 2 a 5 productos.
- El sistema deberá vender cada uno de los 37 productos oficiales al menos una vez en el período.
- El sistema deberá hacer que «Americano», «Cappuccino», «Café latte», «Salteña de pollo» y «Salteña de carne» estén entre los 10 productos con más unidades vendidas en el período.
- El sistema deberá registrar antes de las 12:00 al menos el 70 % de las unidades vendidas de «Salteña de pollo» y «Salteña de carne», y desde las 14:00 al menos el 60 % de las unidades vendidas de la categoría «Repostería».
- El sistema deberá calcular cada subtotal como precio unitario por cantidad y cada total como la suma exacta de sus subtotales (SPEC-003).

**RF-6. Medio de pago** (HU-1)

- El sistema deberá registrar entre el 55 % y el 65 % de las ventas de demostración con «Efectivo» y el resto con «QR».
- El sistema deberá registrar al menos una venta con cada medio de pago en cada día que tiene ventas.
- El sistema deberá registrar con «QR» una proporción mayor de las ventas con total de Bs 60,00 o más que de las ventas con total menor.

**RF-7. Quién registró cada venta** (HU-1)

- El sistema deberá registrar cada venta de demostración a nombre de una cuenta de dueño o cajero de la base, con el nombre visible y el rol que esa cuenta tiene al ejecutar la carga (SPEC-003, «Datos de una venta registrada»).
- Mientras la base tenga cuentas de los dos roles, el sistema deberá registrar entre el 70 % y el 85 % de las ventas a nombre de cuentas de cajero y el resto a nombre de cuentas de dueño; si solo hay cuentas de un rol, todas a nombre de cuentas de ese rol.
- Donde haya varias cuentas del mismo rol, el sistema deberá registrar ventas a nombre de cada una de ellas.

**RF-8. Número y orden de las ventas** (HU-1)

- El sistema deberá numerar las ventas de demostración desde el N.º 1, sin saltos ni repeticiones, en el orden de su fecha y hora: una venta posterior tiene siempre un número mayor (SPEC-003, «Datos de una venta registrada»).
- El sistema deberá no registrar dos ventas de demostración en el mismo segundo; varias pueden caer en el mismo minuto, como en un mostrador real.
- Cuando después de la carga se registra una venta desde «Nueva venta», el sistema deberá darle el número siguiente al de la última venta de demostración.

**RF-9. Ventas como cualquier otra** (HU-1)

- El sistema deberá dejar las ventas de demostración igual que si se hubieran registrado desde «Nueva venta»: forman parte de las ventas registradas que se entregan a otros módulos (SPEC-003, RF-11), y el Historial (SPEC-005) y el Dashboard (SPEC-004) las muestran y las cuentan como cualquier otra.
- El sistema deberá no cambiar el menú ni las cuentas de la base al cargar las ventas.

**RF-10. Carga completa o nada** (HU-1)

- El sistema deberá cargar todas las ventas anunciadas o no cargar ninguna: nunca queda una parte de las ventas de demostración en la base.
- Si la carga no se puede completar (por ejemplo, por falta de conexión o por una configuración de acceso incorrecta), entonces el sistema deberá dejar la base exactamente como estaba antes de ejecutarla y mostrar «No se pudieron cargar las ventas de demostración. Comprueba la configuración y la conexión a la base».
- Si la persona cancela la carga antes de que termine, entonces el sistema deberá dejar la base exactamente como estaba antes de ejecutarla.
- Si dos cargas se ejecutan a la vez sobre la misma base sin ventas, entonces el sistema deberá completar solo una y rechazar la otra con el mensaje de base con ventas de RF-2.
- Si mientras se ejecuta la carga se registra una venta desde «Nueva venta», entonces el sistema deberá completar solo una de las dos operaciones: o la carga se rechaza con el mensaje de base con ventas de RF-2, o la venta se registra después con el número siguiente al de la última venta de demostración.
- El sistema deberá no mostrar nunca, en ningún mensaje, la dirección de la base, contraseñas ni otros datos de configuración.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los mensajes para la persona están en español.
- **RNF-2. Importes exactos.** Los precios, subtotales y totales de las ventas de demostración son exactos al centavo, con dos decimales (SPEC-002, RNF-2; SPEC-003).
- **RNF-3. Rapidez.** Desde la computadora de la persona que prepara el sistema, la carga termina en menos de 3 minutos después de escribir «CARGAR».
- **RNF-4. Historial ágil.** Con las ventas de demostración cargadas, el Historial cumple su rapidez (SPEC-005, RNF-3): ningún día del período supera las 400 ventas de ese requisito ni ningún mes, las 6000.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Ejecutar la carga dos veces sobre la misma base | La segunda se rechaza sin cambios: la base ya tiene ventas (RF-2). |
| Base con una sola venta registrada desde «Nueva venta» | Se rechaza sin cambios (RF-2). |
| Base sin el menú oficial (vacía o con los productos de prueba) | Se rechaza sin cambios y lista los productos oficiales que faltan (RF-2). |
| El dueño desactivó «Mocochinchi» | Se rechaza sin cambios y nombra «Mocochinchi» (RF-2). |
| El dueño cambió el nombre de «Cuñapé» a «Cuñapé horneado» | Se rechaza sin cambios y nombra «Cuñapé»: ese producto oficial ya no está (RF-2). |
| El dueño cambió el precio de «Americano» a Bs 14,00 | Se carga, y sus líneas llevan Bs 14,00 (RF-5). |
| El dueño agregó productos propios al menú oficial | Se carga, y esos productos no aparecen en ninguna venta de demostración (RF-5). |
| Base con el menú oficial y sin ninguna cuenta | Se rechaza sin cambios (RF-2). |
| Base con solo una cuenta de cajero | Se carga, y todas las ventas figuran a nombre de esa cuenta (RF-7). |
| Base con dos cuentas de cajero y una de dueño | Las dos cuentas de cajero figuran en alguna venta (RF-7). |
| Se escribe «cargar», «sí» o nada en la confirmación | «Carga cancelada. No se cambió nada» (RF-3). |
| Se escribe «  CARGAR  » | Se carga (RF-3). |
| Se ejecuta el 31/12/2026 | El período va del 30/09/2026 al 30/12/2026 (ver «Conceptos»). |
| Se ejecuta el 01/11/2026 | El período va del 01/08/2026 al 31/10/2026, y noviembre queda sin ventas (RF-4). |
| Se ejecuta a las 23:59 de un día y termina después de medianoche | El período es el calculado al ejecutarla; ninguna venta cae en el día en que se ejecutó ni después (RF-1, RF-4). |
| La computadora de la persona tiene otra zona horaria o el reloj equivocado | El período y las horas se calculan con la fecha y la hora del sistema, en hora de Bolivia (RF-1). |
| Se registra una venta, se desactiva un producto oficial o se cambia un precio mientras se espera la respuesta «CARGAR» | Al escribir «CARGAR» se vuelve a comprobar la base: con la venta o el producto inactivo se rechaza sin cambios; con el precio cambiado se carga con el precio nuevo (RF-3). |
| Dos ventas de demostración caen en el mismo minuto | Tienen segundos distintos y el Historial las ordena por número (RF-8; SPEC-005, RF-3). |
| Período del 01/08/2026 al 31/10/2026 | Agosto, septiembre y octubre tienen cada uno al menos un domingo sin ventas (RF-4). |
| Se pierde la conexión a mitad de la carga | La base queda exactamente como estaba (RF-10). |
| La persona cancela a mitad de la carga | La base queda exactamente como estaba (RF-10). |
| Dos personas ejecutan la carga a la vez | Solo una se completa; la otra se rechaza (RF-10). |
| Un cajero registra una venta mientras se ejecuta la carga | Se completa solo una de las dos; si es la venta, la carga se rechaza; si es la carga, la venta toma el número siguiente (RF-10). |
| Después de la carga, el cajero registra una venta hoy | Toma el número siguiente al de la última venta de demostración y aparece hoy en el Historial (RF-8). |
| Después de la carga, el dueño cambia el precio de un producto | Las ventas de demostración conservan el precio con que se cargaron (SPEC-003, RF-11; SPEC-005, RF-7). |
| Se quiere empezar otra demostración, sin las ventas de la anterior | No se borra nada: en una base nueva se carga el menú oficial (SPEC-006) y después las ventas de demostración (RF-2; «Fuera de alcance»). |

## 7. Fuera de alcance

- Borrar, reemplazar o volver a generar ventas de demostración, o cualquier venta registrada. Para empezar una demostración limpia se crea otra base nueva y se ejecutan en ella la carga del menú oficial (SPEC-006) y esta carga.
- Marcar o distinguir las ventas de demostración en el Historial o el Dashboard: se ven como cualquier venta registrada.
- Elegir el período, el volumen, el horario o las proporciones al ejecutar la carga: son los de esta especificación.
- Cargar ventas hoy, en días futuros o en una base que ya tiene ventas.
- Precios distintos de los vigentes al ejecutar la carga (por ejemplo, simular aumentos de precio en el pasado).
- Crear el menú oficial, cuentas o la base: lo hacen SPEC-006 y la preparación del sistema (SPEC-001).
- Ejecutar la carga desde la interfaz, con una sesión de dueño, o automáticamente al desplegar o al arrancar el sistema.
- Feriados, cierres por vacaciones u otros días especiales distintos de los domingos sin ventas.

## 8. Criterios de finalización

- Tras una sola ejecución confirmada sobre una base con el menú oficial y sin ventas, el Historial muestra ventas en cada día del período salvo de 2 a 4 domingos, al menos uno en cada mes completo, y ninguna venta hoy.
- El 100 % de las ventas de demostración tienen solo productos del menú oficial, con los precios vigentes al cargar, y su total es la suma exacta de sus subtotales.
- Los 37 productos oficiales aparecen en al menos una venta, y hay ventas de un solo producto y ventas de varios productos en cada día con ventas.
- Cada día con ventas tiene al menos una venta en efectivo y una con QR.
- El 100 % de las ejecuciones sobre una base con ventas, sin el menú oficial completo y activo o sin cuentas, o sin la confirmación «CARGAR», terminan sin ningún cambio en la base.
- Ninguna ejecución interrumpida deja una parte de las ventas de demostración en la base.
- La carga termina en menos de 3 minutos después de confirmarla.
- Un cajero puede registrar una venta justo después de la carga, y recibe el número siguiente al de la última venta de demostración.

## 9. Dudas abiertas

Ninguna.

## 10. Aclaraciones

### 2026-10-28

- **P:** ¿Qué número y nombre lleva la especificación? → **R:** `007-ventas-demo`. (Aplicado en el título.)
- **P:** ¿En qué base se cargan las ventas de demostración? → **R:** En cualquier base con el menú oficial, también la oficial; la persona decide dónde ejecutarla. (Aplicado en «Contexto y objetivo», «Usuarios» y RF-2.)
- **P:** ¿Qué hace la carga si la base ya tiene ventas registradas? → **R:** Se niega sin tocar nada, igual que SPEC-006 con el menú: evita mezclar ventas ficticias con reales y mantiene la numeración desde el N.º 1. (Aplicado en RF-2, RF-8 y «Casos límite».)
- **P:** ¿Qué período cubren las ventas? → **R:** Los tres meses anteriores a hoy, hasta ayer; hoy queda sin ventas para probar la caja de hoy con ventas de verdad. (Aplicado en «Conceptos» y RF-4.)
- **P:** ¿Cuántas ventas por día y en qué horario? → **R:** De 30 a 80 por día, de 07:30 a 20:30, con más ventas los viernes y sábados, picos a media mañana y media tarde, y algunos domingos sin ventas. (Aplicado en «Conceptos» y RF-4.)
- **P:** ¿Cómo son las ventas por dentro? → **R:** Una mezcla realista: 40 % un producto × 1, 20 % un producto con varias unidades, 35 % combinaciones de 2 a 5 productos (bebida con salado o repostería) y 5 % pedidos grandes de 6 a 12 productos; los 37 productos se venden al menos una vez, con Americano, Cappuccino y salteñas entre los más vendidos, salteñas por la mañana y repostería por la tarde. (Aplicado en RF-5.)
- **P:** ¿Quién figura como la persona que registró cada venta? → **R:** Las cuentas de dueño y cajero que ya hay en la base, la mayoría a nombre de cajeros; sin cuentas, la carga se niega. (Aplicado en RF-2 y RF-7.)
- **P:** ¿Cómo se reparten los medios de pago? → **R:** Alrededor de 60 % efectivo y 40 % QR; las ventas grandes se pagan algo más con QR, y cada día con ventas tiene al menos una de cada medio. (Aplicado en RF-6.)
- **P:** ¿Las ventas usan los precios actuales del menú? → **R:** Sí, los precios vigentes en la base al ejecutar la carga. (Aplicado en RF-5 y «Fuera de alcance».)
- **P:** ¿Qué productos usa la carga si el menú de la base no es exactamente el oficial? → **R:** Exige el menú oficial completo y activo; los productos extra no se venden. (Aplicado en «Conceptos», RF-2 y RF-5.)
- **P:** Las ventas registradas no se pueden borrar, y la carga puede ejecutarse en la base oficial. ¿Qué resguardo se pone? → **R:** Una confirmación escrita: muestra cuántas ventas y qué fechas cargará, avisa que no se pueden borrar y pide escribir «CARGAR». (Aplicado en «Contexto y objetivo» y RF-3.)
- **P:** La idea es cargarla una sola vez, pero ¿qué pasa si se quiere limpiar todo y empezar una demostración limpia? → **R:** No se borra nada: se crea otra base nueva y se cargan en ella el menú oficial (SPEC-006) y las ventas de demostración. Así nunca hay riesgo de borrar ventas reales, y se respeta que una venta registrada no se borra (SPEC-003). Se descartaron una orden «Reiniciar la demo» que borra todas las ventas, que en la base oficial borraría ventas reales, y un reinicio solo para bases marcadas como demostración, que exige definir cómo se marca una base. (Aplicado en «Casos límite» y «Fuera de alcance».)

**Revisión de QA.**

- **P:** (Hallazgo 1) RF-1 no decía de qué reloj salen hoy, ayer y el período. → **R:** Del sistema donde se guardan las ventas, en hora de Bolivia, como en SPEC-005; un reloj equivocado en la computadora no cambia el período. (Aplicado en RF-1 y «Casos límite».)
- **P:** (Hallazgo 2) RF-8 no fijaba la precisión de «misma fecha y hora». ¿Dos ventas pueden caer en el mismo minuto? → **R:** Sí, con segundos distintos; nunca dos en el mismo segundo. (Aplicado en RF-8 y «Casos límite».)
- **P:** (Hallazgo 3) El horario no decía si puede haber una venta a las 20:30. → **R:** No: las ventas van de las 07:30:00 a las 20:29:59. (Aplicado en «Conceptos» y HU-1.)
- **P:** (Hallazgo 4) La prueba de HU-1 espera un día sin ventas en septiembre, pero RF-4 no lo aseguraba. → **R:** RF-4 deja al menos un domingo sin ventas en cada mes completo del período; la prueba queda igual. (Aplicado en RF-4, «Casos límite» y «Criterios de finalización».)
- **P:** (Hallazgo 5) Un criterio de finalización pedía ventas de un solo producto y de varios en cada día, sin RF que lo exigiera. → **R:** Pasa a RF-5. (Aplicado en RF-5.)
- **P:** (Hallazgo 6) «Datos de una venta registrada» de SPEC-003 fija la fecha del momento del registro, la cuenta de la sesión y los precios al registrar, y no mencionaba las ventas de demostración. → **R:** SPEC-003 registra la excepción en sus «Aclaraciones», y «Conceptos» de esta especificación la describe. (Aplicado en «Conceptos» y en `specs/003-ventas/spec.md`, «Aclaraciones».)
- **P:** (Hallazgo 7) No se decía qué pasa si la base cambia entre la comprobación y la respuesta «CARGAR». → **R:** Al escribir «CARGAR» se vuelve a comprobar RF-2 en el mismo momento de cargar: si ya no se cumple, se rechaza sin cambios; si se cumple, se usan el menú y las cuentas de ese momento. (Aplicado en RF-3 y «Casos límite».)
