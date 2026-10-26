# SPEC-005 — Historial y reportes

Estado: revisada · Fecha: 2026-10-25

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-001 — Acceso](../001-acceso/spec.md), por la sesión y el rol de quien consulta, y de [SPEC-003 — Ventas](../003-ventas/spec.md), por las ventas registradas que entrega a otros módulos (RF-11 de esa especificación): número, fecha y hora, quién la registró, líneas, total y medio de pago. Los días y los meses se entienden como en [SPEC-004 — Dashboard](../004-dashboard/spec.md) («Conceptos»).

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas desde una computadora del local (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Historial y reportes es el quinto módulo de Kofi POS: deja consultar las ventas registradas en Ventas (SPEC-003) después de registrarlas.

Objetivo: que el dueño pueda revisar, sin hacer cuentas, qué se vendió un día o un mes cualquiera, cuánto se cobró en efectivo y cuánto con QR, y qué tuvo cada venta, para controlar la caja de días pasados, aclarar dudas sobre una venta concreta y comparar la marcha del negocio entre meses.

El resumen de hoy y del mes en curso, con su venta promedio y sus productos más vendidos, es del Dashboard (SPEC-004): el Historial lista las ventas una por una, muestra su detalle y da las cifras de cualquier día o mes, también de los anteriores.

## 2. Usuarios

| Usuario | Qué puede hacer en el Historial |
| --- | --- |
| **Dueño** | Consultar las ventas de cualquier día, el detalle de cualquier venta y las cifras de cualquier mes. |
| **Cajero** | Nada: no ve la opción «Historial de ventas» y no puede consultar ventas pasadas (ver «Aclaraciones», respuesta de la persona). |

### Conceptos

| Concepto | Definición |
| --- | --- |
| **Venta registrada** | Una venta cobrada y registrada en Ventas (SPEC-003). Solo las ventas registradas aparecen en el Historial; una venta en preparación no aparece. |
| **Día** | Un día calendario en hora de Bolivia, de 00:00 a 23:59, como en SPEC-004. Si un cambio histórico omite o repite horas, incluye todos los instantes que tienen esa fecha local. Una venta es de un día si su fecha y hora de registro, en hora de Bolivia, caen en ese día. |
| **Mes** | Un mes calendario en hora de Bolivia, desde las 00:00 del día 1 hasta las 23:59 de su último día. |
| **Hoy** y **mes en curso** | El día y el mes de la fecha actual del sistema en hora de Bolivia, hasta el momento de la consulta. |
| **Fecha consultable** | Cualquier día hasta hoy y cualquier mes hasta el mes en curso, sin límite hacia atrás (ver «Aclaraciones», respuesta de la persona). Un día o un mes futuro no se puede consultar. |

### Datos de una venta en el Historial

Son los de «Datos de una venta registrada» de SPEC-003, tal como se registraron:

| Dato | Cómo se muestra |
| --- | --- |
| Número | «N.º 12». |
| Fecha y hora | En la lista de un día, solo la hora: «14:05». En el detalle, la fecha y la hora: «24/10/2026 14:05». |
| Quién la registró | Su nombre visible y su rol en ese momento: «Ana Quispe · Cajero». Se muestra igual aunque la cuenta haya cambiado o se haya eliminado después. |
| Líneas | Solo en el detalle, en el orden en que se registraron, cada una como «[producto] · [categoría] · [precio unitario] × [cantidad] · [subtotal]». |
| Total | «Bs 25,00». |
| Medio de pago | «Efectivo» o «QR». |

### Cifras de un día o de un mes

| Dato | Regla |
| --- | --- |
| Total vendido | La suma exacta de los totales de las ventas registradas del día o del mes. |
| Ventas | Cuántas ventas registradas tiene el día o el mes. |
| Por medio de pago | Para «Efectivo» y para «QR», en ese orden y siempre los dos: la suma de los totales de las ventas pagadas con ese medio y cuántas son. |
| Momento de los datos | La fecha y la hora en que el sistema obtuvo las cifras. |

- Los importes se muestran en el formato de precios de SPEC-002 («Bs 12,50»); las fechas y horas, en el de SPEC-003 («24/10/2026 14:05»); una fecha sin hora, «24/10/2026», y un mes, «Octubre de 2026», como en SPEC-004.
- El calendario admite años de cuatro cifras del 0001 al 9999, sin año cero. No se limita la antigüedad de las ventas dentro de ese formato. En el primer día o mes representable, no se puede retroceder más.
- Las cantidades se escriben en singular o en plural: «1 venta», «2 ventas».

## 3. Historias de usuario, priorizadas

### HU-1 — Consultar las ventas de un día (P1)

Como **dueño**, quiero **elegir un día y ver todas sus ventas, una por una, con cuánto se vendió en total, cuánto en efectivo y cuánto con QR** para **controlar la caja de días pasados y encontrar una venta concreta por su hora, su medio de pago o su importe**.

**Prueba independiente:** con estas ventas registradas: N.º 1 el 23/10/2026 a las 23:50, «Café americano × 1», Bs 12,50 en efectivo, por «Ana Quispe» (cajero); N.º 2 el 24/10/2026 a las 09:15, «Café americano × 2», Bs 25,00 en efectivo, por «Ana Quispe» (cajero); y N.º 3 el 24/10/2026 a las 10:30, «Empanada × 1» y «Café americano × 1», Bs 20,50 con QR, por «Luis Mamani» (dueño). El 25/10/2026 a las 11:00, una sesión de dueño abre «Historial de ventas» y ve «Ventas del 25/10/2026» con «No hay ventas registradas este día». Elige «Día anterior» y ve «Ventas del 24/10/2026»: total vendido «Bs 45,50», «2 ventas», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», «Datos al 25/10/2026 11:00» y, de la más reciente a la más antigua, «N.º 3 · 10:30 · Luis Mamani · Dueño · QR · Bs 20,50» y «N.º 2 · 09:15 · Ana Quispe · Cajero · Efectivo · Bs 25,00». La venta N.º 1 no aparece. Al elegir la fecha 23/10/2026 ve solo la N.º 1. «Día siguiente» no se puede elegir estando en el 25/10/2026. Una sesión de cajero no ve la opción «Historial de ventas».

*Producto mínimo útil:* por sí sola, esta historia ya permite al dueño revisar la caja y las ventas de cualquier día pasado.

### HU-2 — Ver el detalle de una venta (P2)

Como **dueño**, quiero **abrir una venta y ver todo lo que tuvo: sus productos, cantidades y precios, su total, cómo se pagó, quién la registró y cuándo**, ya sea **desde la lista de un día o escribiendo su número**, para **aclarar una duda sobre una venta concreta**.

**Prueba independiente:** con la venta N.º 3 del ejemplo de HU-1, registrada cuando «Café americano» costaba Bs 12,50, y con ese precio cambiado después a Bs 13,00, una sesión de dueño abre «Historial de ventas», escribe «3» en «Buscar venta por número» y elige «Buscar»: ve «Venta N.º 3», «24/10/2026 10:30», «Registrada por Luis Mamani · Dueño», «Medio de pago: QR», las líneas «Empanada · Salados · Bs 8,00 × 1 · Bs 8,00» y «Café americano · Bebidas calientes · Bs 12,50 × 1 · Bs 12,50», en ese orden, y el total «Bs 20,50». Al buscar «99» ve «No existe la venta N.º 99». La prueba no usa la lista de ventas de un día: la búsqueda está en la pantalla que abre «Historial de ventas» (RF-1, RF-9). Con HU-1, elegir la venta en la lista de un día abre ese mismo detalle, y «Volver» regresa a la lista de su día.

### HU-3 — Consultar las cifras de un mes (P3)

Como **dueño**, quiero **elegir un mes y ver cuánto se vendió, cuánto en efectivo y cuánto con QR, y cuánto se vendió cada día** para **comparar la marcha del negocio entre meses y encontrar los días con más o menos ventas**.

**Prueba independiente:** con ventas registradas el 30/09/2026 a las 23:59 por Bs 12,50 en efectivo, el 01/10/2026 a las 08:00 por Bs 8,00 en efectivo, el 15/10/2026 a las 16:20 por Bs 25,00 con QR y el 01/11/2026 a las 00:00 por Bs 10,00 con QR, el 05/11/2026 una sesión de dueño abre «Historial de ventas», elige «Ver por mes» y ve «Noviembre de 2026» con «Bs 10,00 · 1 venta» y una fila por día del 01/11/2026 al 05/11/2026. Elige «Mes anterior» y ve «Octubre de 2026»: total vendido «Bs 33,00», «2 ventas», «Efectivo: Bs 8,00 · 1 venta», «QR: Bs 25,00 · 1 venta» y una fila por cada día del 01/10/2026 al 31/10/2026, con «01/10/2026 · Bs 8,00 · 1 venta», «15/10/2026 · Bs 25,00 · 1 venta» y los demás días con «Bs 0,00 · 0 ventas». La venta del 30/09 no cuenta en octubre. «Mes siguiente» no se puede elegir estando en noviembre de 2026. La prueba no usa la lista de ventas de un día: «Ver por mes» está en la pantalla que abre «Historial de ventas» (RF-1, RF-11).

## 4. Requisitos funcionales

### HU-1 — Consultar las ventas de un día

**RF-1. Acceso al Historial** (HU-1)

- Mientras haya una sesión válida de dueño, el sistema deberá ofrecer en la pantalla inicial la opción «Historial de ventas», que abre las ventas de hoy.
- Mientras la sesión sea de cajero, el sistema deberá no mostrarle la opción «Historial de ventas» (ver «Usuarios»).
- Si una sesión de cajero intenta abrir el Historial o consultar cualquiera de sus datos por otra vía, entonces el sistema deberá rechazarlo con el mensaje «No tienes permiso para ver el historial de ventas» y no mostrar ningún dato de ventas.
- Mientras no haya una sesión válida, el sistema deberá aplicar al Historial lo que dice SPEC-001 (RF-4, RF-8, RF-10 y RF-12).

**RF-2. Elegir el día** (HU-1)

- El sistema deberá mostrar las ventas de un día con el título «Ventas del [fecha]» y ofrecer las opciones «Día anterior», «Día siguiente» y un campo para elegir una fecha cualquiera, que no ofrece días posteriores a hoy.
- Cuando la persona elige «Día anterior», «Día siguiente» u otra fecha, el sistema deberá mostrar las ventas y las cifras de ese día.
- Mientras se muestre el día que era hoy cuando el sistema obtuvo los datos, el sistema deberá no permitir elegir «Día siguiente»; tras la medianoche, lo permite después de «Actualizar» (RF-5).
- Si se pide un día futuro por otra vía (por ejemplo, escribiéndolo en la dirección), entonces el sistema deberá rechazarlo con el mensaje «No se pueden consultar fechas futuras» y no mostrar ninguna venta de ese día.
- Si se pide una fecha que no existe en el calendario o no se puede leer como fecha, entonces el sistema deberá rechazarla con el mensaje «La fecha no es válida».
- El sistema deberá decidir qué día es hoy con su propia fecha y hora en hora de Bolivia, no con la de la computadora desde la que se consulta.

- Mientras se muestre el 01/01/0001, el sistema deberá no permitir elegir «Día anterior»; un año cero se rechaza como fecha no válida.

**RF-3. Ventas de un día** (HU-1)

- El sistema deberá mostrar todas las ventas registradas del día elegido (ver «Conceptos»), y ninguna otra, de la más reciente a la más antigua (de mayor a menor número, que es el orden en que se registraron), cada una con su número, su hora, quién la registró, su medio de pago y su total: «N.º 3 · 10:30 · Luis Mamani · Dueño · QR · Bs 20,50».
- Mientras el día elegido no tenga ventas, el sistema deberá mostrar «No hay ventas registradas este día» en lugar de la lista.

**RF-4. Cifras de un día** (HU-1)

- El sistema deberá mostrar, junto a las ventas del día, su total vendido, su número de ventas y, para «Efectivo» y para «QR», en ese orden y siempre los dos, el importe y el número de ventas pagadas con ese medio, según «Cifras de un día o de un mes».
- El sistema deberá mostrar importes por medio de pago que sumen exactamente el total vendido del día, y números de ventas que sumen exactamente su número de ventas, que es también el número de ventas de la lista.
- Mientras el día no tenga ventas, el sistema deberá mostrar el total vendido «Bs 0,00», «0 ventas» y los dos medios de pago con «Bs 0,00 · 0 ventas».

**RF-5. Momento de los datos y actualización** (HU-1)

- El sistema deberá obtener cada consulta del Historial (las ventas de un día y, con las demás historias, el detalle de una venta o las cifras de un mes) al abrirla o recargar la pantalla y cuando la persona elige «Actualizar»; no se actualiza sola.
- El sistema deberá mostrar, junto a las cifras de un día, el momento de sus datos: «Datos al 25/10/2026 11:00».
- Mientras obtiene lo que va a mostrar, el sistema deberá mostrar «Cargando…» y no permitir elegir «Actualizar» de nuevo; si ya se mostraba una consulta anterior, deberá seguir mostrándola mientras tanto.
- Cuando la persona recarga la pantalla o vuelve atrás con el navegador, el sistema deberá mostrar el mismo día, mes o venta que se estaba consultando.

**RF-6. Sin conexión o con error** (HU-1)

- Si una consulta no se puede obtener por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo» junto a la opción «Actualizar».
- Si una consulta no se puede obtener por un error inesperado del sistema, entonces el sistema deberá mostrar «Ocurrió un error. Inténtalo de nuevo» junto a la opción «Actualizar».
- Si ya se mostraba una consulta anterior, entonces el sistema deberá seguir mostrándola junto al aviso, con su propio título y el momento de sus datos, para que no se confunda con la que se pidió.

**RF-7. Las ventas se muestran tal como se registraron** (HU-1)

- El sistema deberá mostrar cada venta y calcular cada cifra con los datos de cada venta tal como se registró (SPEC-003, RF-11), aunque después haya cambiado el menú o haya cambiado o se haya eliminado la cuenta que la registró.
- El sistema deberá consultar el Historial sin modificar ninguna venta registrada.

### HU-2 — Ver el detalle de una venta

**RF-8. Detalle de una venta** (HU-2)

- Cuando la persona elige una venta, el sistema deberá mostrar su detalle con el título «Venta N.º [número]»: su fecha y hora, «Registrada por [nombre] · [rol]», «Medio de pago: [medio]», todas sus líneas en el orden en que se registraron y su total, según «Datos de una venta en el Historial».
- Mientras se muestre el detalle de una venta, el sistema deberá ofrecer la opción «Volver», que lleva a la lista de ventas del día de esa venta.
- El sistema deberá obtener el detalle, actualizarlo y avisar sin conexión o con error como indican RF-5 y RF-6.

**RF-9. Buscar una venta por su número** (HU-2)

- El sistema deberá ofrecer en todas las pantallas del Historial (las ventas de un día, el detalle de una venta y las cifras de un mes) el campo «Buscar venta por número» con la opción «Buscar».
- Cuando la persona busca el número de una venta registrada, el sistema deberá mostrar su detalle (RF-8), sin tener en cuenta los espacios alrededor ni los ceros a la izquierda («007» es la venta N.º 7).
- Si no existe ninguna venta registrada con ese número, por grande que sea, entonces el sistema deberá mostrar «No existe la venta N.º [número]».
- Si lo escrito no es un número entero mayor que cero, entonces el sistema deberá mostrar «Escribe un número de venta válido» y no buscar.

**RF-10. Abrir el detalle desde la lista de un día** (HU-2)

- Donde estén las ventas de un día (HU-1), el sistema deberá permitir elegir cada venta de la lista para abrir su detalle (RF-8).

### HU-3 — Consultar las cifras de un mes

**RF-11. Elegir el mes** (HU-3)

- El sistema deberá ofrecer en el Historial la opción «Ver por mes», que muestra las cifras del mes en curso, con el título «[Mes] de [año]», por ejemplo «Octubre de 2026», y las opciones «Mes anterior», «Mes siguiente» y un campo para elegir un mes cualquiera, que no ofrece meses posteriores al mes en curso.
- Cuando la persona elige «Mes anterior», «Mes siguiente» u otro mes, el sistema deberá mostrar las cifras de ese mes.
- Si se pide un mes futuro por otra vía, entonces el sistema deberá rechazarlo con el mensaje «No se pueden consultar meses futuros» y no mostrar ninguna cifra de ese mes.
- Si se pide un mes que no existe o no se puede leer como mes, entonces el sistema deberá rechazarlo con el mensaje «El mes no es válido».
- Mientras se muestre el mes que era el mes en curso cuando el sistema obtuvo los datos, el sistema deberá no permitir elegir «Mes siguiente» (como «Día siguiente» en RF-2).
- Donde estén las ventas de un día (HU-1), el sistema deberá ofrecer en las cifras de un mes la opción «Ver por día», que muestra las ventas de hoy.
- El sistema deberá decidir cuál es el mes en curso con su propia fecha y hora en hora de Bolivia (como en RF-2).

- Mientras se muestre enero de 0001, el sistema deberá no permitir elegir «Mes anterior»; un año cero se rechaza como mes no válido.

**RF-12. Cifras de un mes** (HU-3)

- El sistema deberá mostrar del mes elegido su total vendido, su número de ventas y sus importes por medio de pago, contando todas las ventas registradas del mes (ver «Conceptos») y ninguna otra, con las mismas reglas que RF-4, y obtenerlas, actualizarlas, mostrar el momento de sus datos («Datos al …») y avisar sin conexión o con error como indican RF-5 a RF-7.
- Mientras el mes no tenga ventas, el sistema deberá mostrar «No hay ventas registradas este mes» junto a sus cifras en cero.

**RF-13. Ventas por día de un mes** (HU-3)

- El sistema deberá mostrar en las cifras de un mes una fila por cada día, del más antiguo al más reciente, cada una con su fecha, el total vendido ese día y su número de ventas: «01/10/2026 · Bs 8,00 · 1 venta»; en un mes anterior, del día 1 a su último día, y en el mes en curso, del día 1 a hoy.
- El sistema deberá mostrar los días sin ventas con «Bs 0,00 · 0 ventas».
- El sistema deberá mostrar filas por día cuyos totales sumen exactamente el total vendido del mes y cuyos números de ventas sumen exactamente su número de ventas.
- Donde estén las ventas de un día (HU-1), el sistema deberá permitir elegir cada fila para ver las ventas de ese día (RF-3).

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-2. Cifras exactas.** Los totales, importes y sumas son exactos al centavo: ninguno pierde ni gana centavos por redondeo.
- **RNF-3. Rapidez.** Desde la computadora del local, en el 95 % de los casos y con hasta 400 ventas registradas en un día y 6000 en un mes: mostrar las ventas de un día, las cifras de un mes o el detalle de una venta tarda menos de 2 segundos. No cuenta la primera operación tras un período sin uso del sistema, mientras el servicio se reactiva (como en SPEC-001, RNF-4).
- **RNF-4. Uso con teclado.** Se puede llegar a «Historial de ventas», cambiar de día y de mes, buscar una venta por su número, abrir una venta de la lista, «Volver» y «Actualizar» solo con teclado.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Se abre el Historial y todavía no hay ventas hoy | «Ventas del [hoy]», cifras en cero y «No hay ventas registradas este día» (RF-3, RF-4). |
| No hay ninguna venta registrada en el sistema | Cualquier día y cualquier mes muestran sus cifras en cero y su aviso de sin ventas; el mes muestra todos sus días con «Bs 0,00 · 0 ventas» (RF-3, RF-4, RF-12, RF-13). |
| Se elige un día anterior a la primera venta registrada | Se muestra con sus cifras en cero y «No hay ventas registradas este día» (RF-3, RF-4). |
| Una venta a las 23:59 y otra a las 00:00 del día siguiente, en hora de Bolivia | Cada una aparece en su día y cuenta en su fila del mes (RF-3, RF-13). |
| Una venta el último día de un mes a las 23:59 | Cuenta en ese mes, no en el siguiente (RF-12). |
| Se pide un día o un mes futuro (por ejemplo, escribiéndolo en la dirección) | Se rechaza con su mensaje y no se muestra ningún dato (RF-2, RF-11). |
| Se pide el 30/02/2026 o el mes 13 | «La fecha no es válida» o «El mes no es válido» (RF-2, RF-11). |
| Febrero de un año bisiesto | Muestra 29 filas por día (RF-13). |
| Se consulta el mes en curso el día 1 | Una sola fila por día, la de hoy (RF-13). |
| La pantalla de hoy queda abierta y se registra una venta | No aparece hasta «Actualizar» o recargar (RF-5). |
| La pantalla de hoy queda abierta y pasa la medianoche | Lo que se muestra no cambia; el día consultado sigue siendo el mismo, y «Día siguiente» se puede elegir después de «Actualizar» (RF-2, RF-5). |
| La computadora del local tiene otra zona horaria o la hora equivocada | Hoy y el mes en curso siguen siendo los del sistema en Bolivia, y los días de las ventas no cambian (RF-2, RF-11). |
| Un producto cambió de nombre o de precio después de venderse | El detalle muestra el nombre, la categoría y el precio con que se registró (RF-7, RF-8). |
| Se eliminó la cuenta que registró una venta, o cambió su nombre o su rol | La venta sigue mostrando el nombre y el rol del momento del registro (RF-7). |
| Se busca la venta «0», «-3», «2,5» o «abc» | «Escribe un número de venta válido» (RF-9). |
| Se busca un número mayor que el de la última venta | «No existe la venta N.º [número]» (RF-9). |
| Se busca con el campo vacío | «Escribe un número de venta válido» (RF-9). |
| Se busca « 007 » | Se abre la venta N.º 7 (RF-9). |
| Se busca un número de 20 cifras | «No existe la venta N.º [número]» (RF-9). |
| Se está en «Ver por mes» y se quiere volver a las ventas de un día | «Ver por día» muestra las de hoy; elegir una fila muestra las de ese día (RF-11, RF-13). |
| Una venta con 30 líneas | El detalle muestra las 30, en el orden en que se registraron (RF-8). |
| Un día con 400 ventas | Se muestran todas en menos de 2 segundos (RF-3, RNF-3). |
| Un mes con 6000 ventas | Sus cifras se muestran en menos de 2 segundos (RF-12, RNF-3). |
| Solo se cobró con un medio de pago en el día | El otro aparece igual, con «Bs 0,00 · 0 ventas» (RF-4). |
| Se recarga la pantalla con el detalle de una venta o un mes abierto | Se vuelve a mostrar la misma venta o el mismo mes (RF-5). |
| Se corta la conexión al cambiar de día | Se ve «No hay conexión. Inténtalo de nuevo» y sigue visible el día anterior, con su título y el momento de sus datos (RF-6). |
| Un cajero escribe la dirección del Historial | Recibe «No tienes permiso para ver el historial de ventas», sin datos de ventas (RF-1). |
| La sesión vence con el Historial abierto y se elige «Actualizar» | Se aplica SPEC-001, RF-10 (RF-1). |
| Dos ventas de la misma hora y minuto | Se distinguen por su número; la de número mayor va primero (RF-3). |
| La pantalla de un mes queda abierta y empieza un mes nuevo | Lo que se muestra no cambia; «Mes siguiente» se puede elegir después de «Actualizar» (RF-11). |

## 7. Fuera de alcance

- El resumen de hoy y del mes en curso con su venta promedio y sus productos más vendidos: es del Dashboard (SPEC-004).
- Productos más vendidos, ventas por producto, por categoría, por persona o por hora de días y meses anteriores.
- Filtrar las ventas de un día por medio de pago, por persona, por producto o por importe, y buscar ventas por cualquier dato distinto de su número.
- Rangos de fechas libres (por ejemplo, «del 3 al 17») y comparaciones entre períodos (día contra día, mes contra mes).
- Modificar, anular o devolver una venta registrada desde el Historial: las ventas registradas no cambian (SPEC-003).
- Exportar, imprimir o enviar ventas y cifras (PDF, planilla, correo, mensajería), y comprobantes o facturas: Kofi no emite factura.
- Cierre o arqueo de caja: monto inicial, efectivo contado, diferencias y retiros.
- Gráficos: las cifras se muestran como números y listas.
- Actualización automática mientras la pantalla está abierta (RF-5).
- Costos, ganancias, impuestos e inventario: Kofi POS no los registra.

## 8. Criterios de finalización

- El dueño ve el total vendido de un día anterior, separado en efectivo y QR, en menos de 15 segundos desde la pantalla inicial.
- El dueño abre el detalle de una venta cuyo número conoce en menos de 15 segundos desde la pantalla inicial.
- En el 100 % de los días y meses consultados, el total vendido es la suma exacta de los totales de sus ventas, los importes por medio de pago suman el total vendido y, en un mes, las filas por día suman el total del mes.
- Ninguna venta aparece en un día o un mes distinto del de su fecha y hora de registro en hora de Bolivia, y ninguna venta registrada falta en el día que le corresponde.
- Ninguna sesión ve datos del Historial que su rol no puede ver según «Usuarios».
- Ninguna consulta del Historial modifica una venta registrada, y ningún cambio del menú ni de las cuentas cambia lo que muestra una venta ya registrada.

## 9. Dudas abiertas

Ninguna. Las dos dudas quedaron respondidas el 2026-10-25 (ver «Respuestas a las dudas abiertas» en «Aclaraciones»).

## 10. Aclaraciones

### 2026-10-25

La persona delegó la definición completa de 005-historial («Delego la definición completa de 005-historial … hasta antes de las historias»). No se le hicieron preguntas: cada punto se decidió con la recomendación indicada, salvo los dos datos del local que quedan en «Dudas abiertas».

- **Decisión delegada:** El número y el nombre son `005` e `historial`. (Motivo: es el siguiente número de `specs/` y la carpeta que ya anuncia `docs/business-rules.md`. Alternativa descartada: `reportes`, que deja fuera la consulta de ventas una por una.) (Aplicado en el título.)
- **Decisión delegada:** Tres historias: las ventas de un día (P1), el detalle de una venta (P2) y las cifras de un mes (P3). (Motivo: cubren «buscar, listar y ver el detalle de ventas pasadas y consultar días y meses anteriores»; el día es lo mínimo útil para controlar la caja de días pasados, y cada historia se prueba sola. Alternativa descartada: una sola historia con todo, que no se puede integrar por partes.) (Aplicado en «Historias de usuario».)
- **Decisión delegada:** El Historial no repite la venta promedio ni los productos más vendidos del Dashboard: muestra, de un día o de un mes, el total, el número de ventas y el reparto entre efectivo y QR, que se necesitan para controlar la caja, y además la lista de ventas o las filas por día. (Motivo: el Dashboard ya resume hoy y el mes en curso, y la persona pidió no repetirlo; las cifras de caja sí hacen falta para cualquier día. Alternativa descartada: el resumen completo del Dashboard para cualquier período, que duplica el módulo 004.) (Aplicado en «Contexto y objetivo», «Cifras de un día o de un mes» y «Fuera de alcance».)
- **Decisión delegada:** Al abrir el Historial se muestran las ventas de hoy, y desde ahí se cambia de día con «Día anterior», «Día siguiente» o eligiendo una fecha. (Motivo: hoy es lo que más se consulta para encontrar una venta reciente, y un paso atrás lleva al día anterior, el más común para revisar la caja. Alternativa descartada: abrir en el día anterior, que obliga a avanzar para ver las ventas del día.) (Aplicado en RF-1 y RF-2.)
- **Decisión delegada:** Las ventas de un día se listan de la más reciente a la más antigua, sin paginar. (Motivo: lo último que se registró es lo que más se busca; con hasta 400 ventas en un día la lista completa se recorre con la búsqueda del navegador. Alternativa descartada: de la más antigua a la más reciente, que obliga a bajar hasta el final para ver lo último; paginar, que esconde ventas del día.) (Aplicado en RF-3 y RNF-3.)
- **Decisión delegada:** Buscar ventas es buscar por número; los filtros por medio de pago, persona, producto o importe quedan fuera. (Motivo: el número es lo que el sistema muestra al registrar una venta (SPEC-003) y lleva directo a una venta; la lista de un día ya muestra la hora, el medio de pago y el importe de cada una. Alternativa descartada: filtros en la lista del día, que traen reglas propias y pueden llegar en una especificación nueva.) (Aplicado en RF-9 y «Fuera de alcance».)
- **Decisión delegada:** En la lista de un día se muestra solo la hora de cada venta, y en el detalle, la fecha y la hora. (Motivo: el título ya dice el día, y repetir la fecha en cada fila alarga la lista sin dar información. Alternativa descartada: fecha y hora en cada fila.) (Aplicado en «Datos de una venta en el Historial» y RF-3.)
- **Decisión delegada:** El detalle de una venta tiene «Volver», que lleva a la lista de su día. (Motivo: desde la búsqueda por número, el día de la venta es el contexto más útil; desde la lista, es donde se estaba. Alternativa descartada: volver a la pantalla anterior, que después de buscar no lleva a ninguna lista.) (Aplicado en RF-8.)
- **Decisión delegada:** Las cifras de un mes incluyen una fila por día, del 1 al último día del mes (o a hoy, en el mes en curso), también los días sin ventas, y cada fila lleva a las ventas de ese día. (Motivo: es lo que permite comparar días y meses, igual que el resumen del mes de SPEC-004, y conecta el mes con el detalle. Alternativa descartada: solo los días con ventas, que oculta los días sin actividad.) (Aplicado en RF-13.)
- **Decisión delegada:** Al abrir «Ver por mes» se muestra el mes en curso, y desde ahí se cambia con «Mes anterior», «Mes siguiente» o eligiendo un mes. (Motivo: es el mismo patrón que el día y el punto de partida más natural para ir hacia atrás. Alternativa descartada: abrir en el mes anterior.) (Aplicado en RF-11.)
- **Decisión delegada:** Los días y meses futuros no se pueden consultar, y las fechas o meses inválidos se rechazan con su mensaje. (Motivo: no pueden tener ventas, y rechazarlos evita confundir «sin ventas» con «todavía no llegó». Alternativa descartada: mostrarlos vacíos.) (Aplicado en RF-2, RF-11 y «Casos límite».)
- **Decisión delegada:** Lo que muestra el Historial se obtiene al abrir, recargar, cambiar de día, de mes o de venta y con «Actualizar», con el momento de los datos visible; no se actualiza solo. Al recargar o volver atrás se conserva lo que se estaba consultando. (Motivo: el mismo criterio que el Dashboard (SPEC-004, RF-6); conservar la consulta evita perder el día o la venta buscados. Alternativa descartada: actualizar cada minuto, que genera tráfico sin que nadie mire.) (Aplicado en RF-5.)
- **Decisión delegada:** Sin conexión o con un error inesperado se sigue mostrando la consulta anterior, con su propio título y el momento de sus datos, junto al aviso. (Motivo: el mismo criterio que el Dashboard (SPEC-004, RF-7); el título evita confundir el día que se ve con el que se pidió. Alternativa descartada: vaciar la pantalla.) (Aplicado en RF-6.)
- **Decisión delegada:** La opción de la pantalla inicial se llama «Historial de ventas». (Motivo: describe en español lo que muestra (RNF-1) y no se confunde con «Resumen de ventas» (SPEC-004) ni con «Nueva venta» (SPEC-003). Alternativa descartada: «Reportes», que no dice que se pueden ver las ventas una por una.) (Aplicado en RF-1.)
- **Decisión delegada:** Mientras no se aclare la duda 1, solo el dueño usa el Historial, y un cajero recibe «No tienes permiso para ver el historial de ventas». (Motivo: SPEC-001 anticipa que el dueño tiene acceso a los reportes; dar acceso al cajero sin confirmarlo mostraría datos del negocio que el dueño quizá no quiera compartir, mientras que darlo después solo añade un permiso, como se hizo en SPEC-004. Alternativa descartada: dar el Historial a los dos roles.) (Aplicado en «Usuarios», RF-1 y «Dudas abiertas».) *Confirmada el 2026-10-25 por la respuesta de la persona: ver «Respuestas a las dudas abiertas».*
- **Decisión delegada:** Mientras no se aclare la duda 2, se puede consultar cualquier fecha hasta hoy, sin límite hacia atrás. (Motivo: las ventas registradas no se borran ni se modifican (SPEC-003), y un límite escondería datos que existen; poner un límite después solo restringe la consulta. Alternativa descartada: un límite inventado, como 12 meses.) (Aplicado en «Fecha consultable» y «Dudas abiertas».) *Confirmada el 2026-10-25 por la respuesta de la persona: ver «Respuestas a las dudas abiertas».*
- **Decisión delegada:** Rapidez de menos de 2 segundos con hasta 400 ventas en un día y 6000 en un mes. (Motivo: 2 segundos es el umbral de SPEC-001 a SPEC-004 para abrir una pantalla; 6000 ventas al mes es el volumen de SPEC-004, y 400 en un día es el doble de su promedio diario, para cubrir los días de más movimiento. Alternativa descartada: no fijar un volumen, que deja el requisito sin medida.) (Aplicado en RNF-3.)
- **Decisión delegada:** Quedan fuera los productos más vendidos y los reportes por producto, categoría, persona u hora de períodos anteriores, los filtros, los rangos libres, las comparaciones, la exportación, el arqueo y los gráficos. (Motivo: ninguno es necesario para consultar las ventas y las cifras de caja de un día o un mes, y cada uno trae reglas propias que pueden llegar en una especificación nueva. Alternativa descartada: incluir los productos más vendidos de cualquier mes, que repite el cálculo del Dashboard.) (Aplicado en «Fuera de alcance».)

**Revisión de QA.** En modo delegado, cada hallazgo se decidió con la recomendación indicada.

- **Decisión delegada:** (Hallazgo 1) RF-9 no decía en qué pantallas está la búsqueda por número. → En todas las del Historial: día, detalle y mes. (Motivo: la persona busca una venta desde donde esté, sin volver a una pantalla concreta. Alternativa descartada: solo en la lista del día.) (Aplicado en RF-9.)
- **Decisión delegada:** (Hallazgo 2) RF-2 no decía si el campo de fecha ofrece días futuros. → El campo no los ofrece, y el rechazo con su mensaje se aplica si se piden por otra vía (por ejemplo, la dirección); lo mismo para los meses. (Motivo: no ofrecer lo que no se puede consultar, y no mostrar datos si se pide igual. Alternativa descartada: dejarlos elegir y rechazarlos después.) (Aplicado en RF-2 y RF-11.)
- **Decisión delegada:** (Hallazgo 3) RF-3 no fijaba el orden de dos ventas del mismo minuto. → De mayor a menor número, que es el orden en que se registraron (SPEC-003). (Motivo: el número es único y sigue el orden de registro, así que el orden es estable. Alternativa descartada: por hora, que empata en el mismo minuto.) (Aplicado en RF-3.)
- **Decisión delegada:** (Hallazgo 4) RF-9 no decía qué pasa con espacios y ceros a la izquierda. → Se ignoran: « 007 » es la venta N.º 7. (Motivo: es el mismo número y no hay motivo para rechazarlo. Alternativa descartada: rechazarlo como número no válido.) (Aplicado en RF-9 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 5) RF-5, de HU-1, hablaba del mes y del detalle, de HU-2 y HU-3. → RF-5 habla de «cada consulta del Historial» y del día; RF-8 y RF-12 remiten a RF-5 y RF-6 para el detalle y el mes. (Motivo: HU-1 debe poder probarse sin las demás. Alternativa descartada: repetir las reglas de carga y conexión en cada historia.) (Aplicado en RF-5, RF-6, RF-8 y RF-12.)
- **Decisión delegada:** (Hallazgo 6) RF-2 decía «mientras se muestre el día de hoy», lo que contradecía el caso de la medianoche. → «Día siguiente» y «Mes siguiente» se bloquean según el día y el mes que eran los actuales cuando el sistema obtuvo los datos; tras la medianoche o el cambio de mes, se habilitan después de «Actualizar». (Motivo: la pantalla no cambia sola (RF-5), y así se comporta igual que las cifras. Alternativa descartada: habilitarlos solos a la medianoche, que sería una actualización automática.) (Aplicado en RF-2, RF-11 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 7) Las pruebas de HU-2 y HU-3 parecían depender de HU-1. → Usan solo el acceso de RF-1 y la búsqueda o «Ver por mes», que están en la pantalla que abre el Historial, no la lista de un día; lo que depende de HU-1 (RF-10, «Ver por día», elegir una fila del mes) está marcado con «Donde». (Motivo: cada historia se prueba sola; el acceso es común. Alternativa descartada: una pantalla propia de búsqueda.) (Aplicado en HU-2, HU-3 y RF-11.)
- **Decisión delegada:** (Hallazgo 8) Desde «Ver por mes» no se podía volver a la vista por día salvo eligiendo una fila. → Las cifras de un mes ofrecen «Ver por día», que muestra las ventas de hoy. (Motivo: es el camino de vuelta simétrico de «Ver por mes». Alternativa descartada: depender del botón atrás del navegador.) (Aplicado en RF-11 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 9) No se cubría un número de venta enorme. → Cualquier entero mayor que cero sin venta muestra «No existe la venta N.º [número]», por grande que sea. (Motivo: es un número válido que no corresponde a ninguna venta; un límite de cifras sería inventado. Alternativa descartada: «Escribe un número de venta válido».) (Aplicado en RF-9 y «Casos límite».)

**Respuestas a las dudas abiertas.** La persona respondió las dos dudas con las decisiones provisionales («Respondo las dudas con las decisiones provisionales: solo el dueño usa el Historial y no hay límite hacia atrás»).

- **P:** ¿El cajero puede usar el Historial y, si puede, qué ventas ve? → **R:** No: solo el dueño usa el Historial. El cajero no ve la opción «Historial de ventas» y, si intenta consultar sus datos por otra vía, recibe «No tienes permiso para ver el historial de ventas». (Aplicado en «Usuarios» y «Dudas abiertas»; RF-1 ya lo decía.)
- **P:** ¿Hasta qué fecha hacia atrás debe poder consultarse el Historial? → **R:** Sin límite: se puede consultar cualquier día y cualquier mes hasta hoy. (Aplicado en «Fecha consultable» y «Dudas abiertas».)

### 2026-10-26 — Corrección de la verificación de US1

- **Decisión delegada:** «Sin límite hacia atrás» significa sin recorte de antigüedad de las ventas; el calendario civil de cuatro cifras admite los años 0001–9999, sin año cero. En 01/01/0001 y enero de 0001, las opciones de retroceso están deshabilitadas. Motivo: ninguna fecha admitida debe navegar fuera del formato del calendario; alternativa descartada: imponer una antigüedad de negocio o navegar a una fecha que luego se rechaza. Aplicado en «Datos de una venta», RF-2 y RF-11.

- **Decisión delegada (T031):** cada día comprende exactamente los instantes con esa fecha local en Bolivia, también ante cambios históricos de hora. Motivo: RF-2/RF-3 no deben perder ni trasladar ventas entre días; alternativa descartada: aplicar a todo el día una misma diferencia horaria o excluir fechas antiguas. Aplicado en «Conceptos» y los casos de medianoche de RF-2/RF-3.
