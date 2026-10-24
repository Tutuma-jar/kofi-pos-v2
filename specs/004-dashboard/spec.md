# SPEC-004 — Dashboard

Estado: revisada · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-001 — Acceso](../001-acceso/spec.md), por la sesión y el rol de quien consulta, y de [SPEC-003 — Ventas](../003-ventas/spec.md), por las ventas registradas que entrega a otros módulos (RF-11 de esa especificación): número, fecha y hora, quién la registró, líneas, total y medio de pago.

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas desde una computadora del local (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Dashboard es el cuarto módulo de Kofi POS: resume las ventas registradas en Ventas (SPEC-003).

Objetivo: que el dueño sepa en un vistazo, sin hacer cuentas, cuánto vendió Kofi hoy y en lo que va del mes, cuánto cobró en efectivo y cuánto con QR, y qué productos se venden más, para controlar la caja al cerrar el día y seguir la marcha del negocio.

Consultar ventas pasadas una por una, buscarlas o ver otros días y meses es del Historial (SPEC-005): el Dashboard solo muestra el resumen del día y del mes en curso.

## 2. Usuarios

| Usuario | Qué puede hacer en el Dashboard |
| --- | --- |
| **Dueño** | Ver el resumen de las ventas de hoy y del mes en curso. |
| **Cajero** | Nada, mientras no se aclare si debe ver el resumen del día (ver «Dudas abiertas»). |

### Conceptos

| Concepto | Definición |
| --- | --- |
| **Venta registrada** | Una venta cobrada y registrada en Ventas (SPEC-003). Solo las ventas registradas cuentan en el Dashboard; una venta en preparación no cuenta. |
| **Hoy** | El día de la fecha actual en hora de Bolivia, desde las 00:00 hasta el momento de la consulta. Una venta es «de hoy» si su fecha y hora de registro, en hora de Bolivia, caen en ese día. |
| **Mes en curso** | El mes de la fecha actual en hora de Bolivia, desde las 00:00 del día 1 hasta el momento de la consulta. |
| **Resumen** | Las cifras de las ventas registradas en un período (hoy o el mes en curso), que calcula el sistema. |

### Datos de un resumen

| Dato | Regla |
| --- | --- |
| Total vendido | La suma exacta de los totales de las ventas registradas del período. |
| Ventas | Cuántas ventas registradas tiene el período. |
| Venta promedio | El total vendido dividido entre el número de ventas, redondeado al centavo más cercano (medio centavo hacia arriba). Sin ventas, se muestra «—». |
| Por medio de pago | Para «Efectivo» y para «QR», en ese orden y siempre los dos: la suma de los totales de las ventas del período pagadas con ese medio y cuántas son. |
| Productos más vendidos | Hasta 5 productos, de más a menos unidades vendidas en el período. A igual número de unidades, primero el de mayor importe y, si también empatan, por nombre en orden alfabético (según «Comparación de nombres» de SPEC-002). De cada uno: su nombre, las unidades vendidas (la suma de las cantidades de sus líneas) y su importe (la suma de los subtotales de sus líneas). |
| Momento de los datos | La fecha y la hora en que el sistema calculó el resumen. |

- Un producto se cuenta como uno solo aunque haya cambiado de nombre, de precio o de categoría durante el período, y se muestra con el nombre que tenía en su venta registrada más reciente del período.
- Los importes se muestran en el formato de precios de SPEC-002 («Bs 12,50»), y las fechas y horas, en el de SPEC-003 («24/10/2026 14:05»). Una fecha sin hora se muestra «24/10/2026», y un mes, con su nombre y su año: «Octubre de 2026».
- Las cantidades se escriben en singular o en plural según corresponda: «1 venta», «2 ventas», «1 unidad», «3 unidades».

## 3. Historias de usuario, priorizadas

### HU-1 — Ver el resumen de hoy (P1)

Como **dueño**, quiero **ver cuánto se vendió hoy, en cuántas ventas, cuánto se cobró en efectivo y cuánto con QR, y qué productos se vendieron más** para **controlar la caja al cerrar el día y saber cómo va la jornada sin hacer cuentas**.

**Prueba independiente:** con estas ventas registradas: el 23/10/2026 a las 23:50, «Café americano × 1» por Bs 12,50 en efectivo; el 24/10/2026 a las 09:15, «Café americano × 2» por Bs 25,00 en efectivo; y el 24/10/2026 a las 10:30, «Empanada × 1» y «Café americano × 1» por Bs 20,50 con QR. Ese mismo día a las 11:00, una sesión de dueño abre «Resumen de ventas» y ve en «Hoy · 24/10/2026»: total vendido «Bs 45,50», «2 ventas», venta promedio «Bs 22,75», «Efectivo: Bs 25,00 · 1 venta», «QR: Bs 20,50 · 1 venta», los productos más vendidos «Café americano · 3 unidades · Bs 37,50» y «Empanada · 1 unidad · Bs 8,00», y «Datos al 24/10/2026 11:00». La venta del 23/10 no cuenta. Si se registra otra venta y el dueño elige «Actualizar», el resumen la incluye. Una sesión de cajero no ve la opción «Resumen de ventas», y si abre su dirección recibe «No tienes permiso para ver el resumen de ventas».

*Producto mínimo útil:* por sí sola, esta historia ya permite al dueño cerrar la caja del día sabiendo cuánto debe tener en efectivo y cuánto entró por QR.

### HU-2 — Ver el resumen del mes en curso (P2)

Como **dueño**, quiero **ver cuánto se vendió en lo que va del mes, cómo se reparte entre efectivo y QR, cuánto se vendió cada día y qué productos se vendieron más** para **seguir la marcha del negocio durante el mes**.

**Prueba independiente:** con ventas registradas el 30/09/2026 a las 23:59 por Bs 12,50, el 01/10/2026 a las 08:00 por Bs 8,00 en efectivo, el 15/10/2026 a las 16:20 por Bs 25,00 con QR y el 24/10/2026 a las 09:15 por Bs 12,50 en efectivo, el 24/10/2026 a las 11:00 una sesión de dueño abre «Resumen de ventas» y ve en «Octubre de 2026»: total vendido «Bs 45,50», «3 ventas», venta promedio «Bs 15,17», «Efectivo: Bs 20,50 · 2 ventas», «QR: Bs 25,00 · 1 venta», sus productos más vendidos y las ventas por día del 01/10/2026 al 24/10/2026: el 01/10 con «Bs 8,00 · 1 venta», el 15/10 con «Bs 25,00 · 1 venta», el 24/10 con «Bs 12,50 · 1 venta» y los demás días con «Bs 0,00 · 0 ventas». La venta del 30/09 no cuenta.

## 4. Requisitos funcionales

### HU-1 — Ver el resumen de hoy

**RF-1. Acceso al resumen** (HU-1)

- Mientras haya una sesión válida de dueño, el sistema deberá ofrecer en la pantalla inicial la opción «Resumen de ventas», que abre la pantalla con los resúmenes.
- Mientras la sesión sea de cajero, el sistema deberá no ofrecerle la opción «Resumen de ventas».
- Si una sesión de cajero intenta ver el resumen de ventas, entonces el sistema deberá rechazarlo, mostrar «No tienes permiso para ver el resumen de ventas» y no mostrar ninguna cifra.
- Mientras no haya una sesión válida, el sistema deberá aplicar al resumen de ventas lo que dice SPEC-001 (RF-4, RF-8, RF-10 y RF-12).

**RF-2. Ventas de hoy** (HU-1)

- El sistema deberá mostrar el resumen de hoy con el título «Hoy · [fecha]», donde [fecha] es la fecha de hoy en hora de Bolivia.
- El sistema deberá contar en el resumen de hoy todas las ventas registradas de hoy (ver «Conceptos»), y ninguna otra.

**RF-3. Totales de un resumen** (HU-1)

- El sistema deberá mostrar en cada resumen el total vendido, el número de ventas y la venta promedio, según «Datos de un resumen».
- Mientras un resumen no tenga ventas, el sistema deberá mostrar el total vendido «Bs 0,00», «0 ventas» y la venta promedio «—».

**RF-4. Por medio de pago** (HU-1)

- El sistema deberá mostrar en cada resumen, para «Efectivo» y para «QR», en ese orden y siempre los dos, el importe y el número de ventas pagadas con ese medio: «Efectivo: Bs 25,00 · 1 venta».
- El sistema deberá mostrar importes por medio de pago que sumen exactamente el total vendido del resumen, y números de ventas que sumen exactamente su número de ventas.

**RF-5. Productos más vendidos** (HU-1)

- El sistema deberá mostrar en cada resumen sus productos más vendidos, según «Datos de un resumen», en ese orden y cada uno como «[nombre] · [unidades] · [importe]».
- Mientras el resumen de hoy no tenga ventas, el sistema deberá mostrar en lugar de sus productos más vendidos el aviso «Todavía no hay ventas hoy».
- El sistema deberá mostrar como dos productos distintos dos productos del menú que aparezcan con el mismo nombre en los más vendidos (por ejemplo, porque uno se renombró con el nombre que antes tenía el otro).

**RF-6. Momento de los datos y actualización** (HU-1)

- El sistema deberá calcular los resúmenes al abrir o recargar la pantalla y cuando la persona elige «Actualizar»; los resúmenes no se actualizan solos.
- El sistema deberá mostrar en cada resumen el momento de sus datos: «Datos al 24/10/2026 11:00».
- Cuando la persona elige «Actualizar» después de la medianoche, el sistema deberá mostrar como resumen de hoy el del día nuevo.
- Mientras se calculan los resúmenes, el sistema deberá mostrar «Cargando…» y no permitir elegir «Actualizar» de nuevo; si ya se mostraban resúmenes anteriores, deberá seguir mostrándolos mientras tanto.
- El sistema deberá decidir qué es «hoy» y «el mes en curso» con su propia fecha y hora en hora de Bolivia, no con la de la computadora desde la que se consulta.

**RF-7. Sin conexión o con error** (HU-1)

- Si los resúmenes no se pueden obtener por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo» junto a la opción «Actualizar».
- Si los resúmenes no se pueden obtener por un error inesperado del sistema, entonces el sistema deberá mostrar «Ocurrió un error. Inténtalo de nuevo» junto a la opción «Actualizar».
- Si ya se mostraban resúmenes anteriores, entonces el sistema deberá seguir mostrándolos, cada uno con el momento de sus datos, junto al aviso.

**RF-8. Las cifras salen de las ventas tal como se registraron** (HU-1)

- El sistema deberá calcular cada resumen con los datos de cada venta tal como se registró (SPEC-003, RF-11): sus líneas, cantidades, subtotales, total y medio de pago, aunque después haya cambiado el menú o se haya eliminado la cuenta que la registró.
- El sistema deberá mostrar los resúmenes sin modificar ninguna venta registrada.

### HU-2 — Ver el resumen del mes en curso

**RF-9. Ventas del mes en curso** (HU-2)

- El sistema deberá mostrar en la pantalla «Resumen de ventas», después del resumen de hoy, el resumen del mes en curso con el título «[Mes] de [año]», por ejemplo «Octubre de 2026».
- El sistema deberá contar en el resumen del mes todas las ventas registradas del mes en curso (ver «Conceptos»), y ninguna otra, con los datos de RF-3, RF-4 y RF-5, y calcularlo, actualizarlo y mostrar el momento de sus datos como indican RF-6 y RF-7.
- Mientras el resumen del mes no tenga ventas, el sistema deberá mostrar en lugar de sus productos más vendidos el aviso «Todavía no hay ventas este mes».

**RF-10. Ventas por día** (HU-2)

- El sistema deberá mostrar en el resumen del mes una fila por cada día del mes en curso, desde el día 1 hasta hoy, del más antiguo al más reciente, cada una con su fecha, el total vendido ese día y su número de ventas: «01/10/2026 · Bs 8,00 · 1 venta».
- El sistema deberá mostrar los días sin ventas con «Bs 0,00 · 0 ventas».
- El sistema deberá mostrar filas por día cuyos totales sumen exactamente el total vendido del mes y cuyos números de ventas sumen exactamente su número de ventas.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-2. Cifras exactas.** Los totales, importes y sumas son exactos al centavo: ninguno pierde ni gana centavos por redondeo. Solo la venta promedio se redondea, como indica «Datos de un resumen».
- **RNF-3. Rapidez.** Desde la computadora del local, con hasta 6000 ventas registradas en el mes en curso, en el 95 % de los casos abrir «Resumen de ventas» o elegir «Actualizar» muestra todos sus resúmenes en menos de 2 segundos. No cuenta la primera operación tras un período sin uso del sistema, mientras el servicio se reactiva (como en SPEC-001, RNF-4).
- **RNF-4. Uso con teclado.** Se puede llegar a «Resumen de ventas» y a «Actualizar» y elegirlos solo con teclado.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Todavía no hay ventas hoy | Total «Bs 0,00», «0 ventas», promedio «—», los dos medios de pago en «Bs 0,00 · 0 ventas» y el aviso «Todavía no hay ventas hoy» (RF-3 a RF-5). |
| No hay ninguna venta registrada en el sistema | Los dos resúmenes vacíos, con sus avisos, y en el del mes todos los días con «Bs 0,00 · 0 ventas» (RF-3 a RF-5, RF-9, RF-10). |
| Una venta registrada a las 23:59 y otra a las 00:00 del día siguiente, en hora de Bolivia | Cada una cuenta en su día (RF-2, RF-10). |
| Una venta registrada el último día del mes anterior a las 23:59 | No cuenta en el mes en curso (RF-9). |
| Hoy es el día 1 del mes | El resumen del mes tiene las mismas cifras que el de hoy y una sola fila por día (RF-9, RF-10). |
| La pantalla queda abierta y pasa la medianoche | Las cifras no cambian hasta «Actualizar»; al actualizar, «Hoy» es el día nuevo y, si cambió el mes, el resumen del mes es el del mes nuevo (RF-6). |
| Se registra una venta mientras el dueño mira el resumen | No aparece hasta «Actualizar» o recargar (RF-6). |
| Un producto cambió de nombre durante el período | Cuenta como un solo producto, con el nombre de su venta más reciente del período (Datos de un resumen, RF-5). |
| Un producto cambió de precio durante el período | Sus unidades y su importe suman las de todas sus ventas, cada una con el precio con que se registró (RF-5, RF-8). |
| Un producto vendido hoy se desactivó o se eliminó la cuenta que registró una venta | Las ventas siguen contando igual (RF-8). |
| Dos productos empatan en unidades y en importe | Se ordenan por nombre en orden alfabético (Datos de un resumen). |
| Se vendieron más de 5 productos distintos en el período | Se muestran solo los 5 primeros (Datos de un resumen). |
| Solo se cobró con un medio de pago | El otro aparece igual, con «Bs 0,00 · 0 ventas» (RF-4). |
| Tres ventas que suman Bs 45,50 | Venta promedio «Bs 15,17» (45,50 ÷ 3 = 15,1666…) (Datos de un resumen). |
| Dos ventas de Bs 0,25 y Bs 0,50 | Venta promedio «Bs 0,38» (0,375 se redondea hacia arriba) (Datos de un resumen). |
| Un cajero abre la dirección del resumen | Ve «No tienes permiso para ver el resumen de ventas», sin cifras (RF-1). |
| La sesión vence mientras se muestra el resumen y se elige «Actualizar» | Se aplica SPEC-001, RF-10 (RF-1). |
| Se corta la conexión al elegir «Actualizar» | Se ve «No hay conexión. Inténtalo de nuevo» y siguen visibles las cifras anteriores, con el momento de sus datos (RF-7). |
| La computadora del local tiene otra zona horaria o la hora equivocada | «Hoy» y «el mes en curso» siguen siendo los de la fecha y la hora del sistema en Bolivia (RF-6). |
| Un producto se renombró con el nombre que antes tenía otro, y los dos se vendieron en el período | Aparecen como dos productos distintos, aunque se muestren con el mismo nombre (RF-5). |
| Se elige «Actualizar» con resúmenes ya visibles | Se ve «Cargando…» y siguen visibles las cifras anteriores hasta que llegan las nuevas (RF-6). |
| Un mes con 6000 ventas | Los resúmenes se muestran en menos de 2 segundos (RNF-3). |

## 7. Fuera de alcance

- Consultar, buscar o listar ventas registradas una por una, ver el detalle de una venta, o ver días y meses anteriores al actual: es del Historial (SPEC-005).
- Comparar con el día, la semana o el mes anterior, metas de venta y proyecciones.
- Resúmenes por persona que registró las ventas, por categoría o por hora del día.
- Cierre o arqueo de caja: monto inicial, efectivo contado, diferencias y retiros. El Dashboard solo muestra lo cobrado en efectivo según las ventas registradas.
- Exportar o imprimir los resúmenes, y enviarlos por correo o mensajería.
- Gráficos: las cifras se muestran como números y listas.
- Actualización automática de los resúmenes mientras la pantalla está abierta (RF-6).
- Costos, ganancias, impuestos e inventario: Kofi POS no los registra.

## 8. Criterios de finalización

- El dueño ve el total vendido hoy, separado en efectivo y QR, en menos de 10 segundos desde la pantalla inicial.
- En el 100 % de los resúmenes, el total vendido es la suma exacta de los totales de sus ventas, los importes por medio de pago suman el total vendido y, en el del mes, las filas por día suman el total del mes.
- Ninguna venta se cuenta en un día o un mes distinto del de su fecha y hora de registro en hora de Bolivia.
- Ninguna sesión ve cifras del resumen de ventas que su rol no puede ver según «Usuarios».
- Ningún cambio del menú ni de las cuentas cambia las cifras de las ventas ya registradas.

## 9. Dudas abiertas

1. [NECESITA ACLARACIÓN] ¿La jornada de Kofi puede pasar de la medianoche (por ejemplo, abrir hasta la 01:00)? Si es así, ¿las ventas de después de la medianoche deben contar en el día en que empezó la jornada? Mientras no se aclare, «hoy» es el día calendario en hora de Bolivia, de 00:00 a 23:59 (ver «Conceptos»). Afecta a HU-1 y HU-2.
2. [NECESITA ACLARACIÓN] ¿El cajero debe ver el resumen de hoy (por ejemplo, para cerrar la caja de su turno)? Mientras no se aclare, solo el dueño ve el resumen de ventas (RF-1). Afecta a HU-1.

## 10. Aclaraciones

### 2026-10-24

La persona delegó la definición completa de 004-dashboard («Delego la definición completa de 004-dashboard … hasta antes de las historias»). No se le hicieron preguntas: cada punto se decidió con la recomendación indicada, salvo los dos datos del local que quedan en «Dudas abiertas».

- **Decisión delegada:** El número y el nombre son `004` y `dashboard`. (Motivo: es el siguiente número de `specs/` y el nombre del módulo en `docs/business-rules.md`. Alternativa descartada: ninguna.) (Aplicado en el título.)
- **Decisión delegada:** El Dashboard muestra solo dos períodos: hoy y el mes en curso, sin elegir otros días ni meses. (Motivo: es el alcance del módulo en `docs/business-rules.md` («resumen de las ventas del día y del mes»), y consultar ventas pasadas es del Historial (005). Alternativa descartada: un selector de fecha o de mes.) (Aplicado en «Contexto y objetivo», «Conceptos» y «Fuera de alcance».)
- **Decisión delegada:** Cada resumen muestra total vendido, número de ventas, venta promedio, importes por medio de pago y productos más vendidos. (Motivo: responden a lo que un dueño mira al cerrar el día y durante el mes, y el reparto entre efectivo y QR es lo que SPEC-003 anticipó para controlar la caja. Alternativa descartada: solo total y número de ventas, que no ayuda a controlar la caja.) (Aplicado en «Datos de un resumen», RF-3 a RF-5 y RF-9.)
- **Decisión delegada:** Hasta 5 productos más vendidos, ordenados por unidades, luego por importe y luego por nombre. (Motivo: las unidades reflejan lo que más pide la clientela; el importe y el nombre deshacen empates de forma estable; 5 caben a la vista. Alternativas descartadas: ordenar por importe, que favorece a los productos caros; mostrar todos los productos, que es más propio del Historial.) (Aplicado en «Datos de un resumen» y RF-5.)
- **Decisión delegada:** Un producto se cuenta como uno solo aunque cambie de nombre, de precio o de categoría, y se muestra con el nombre de su venta más reciente del período. (Motivo: SPEC-003 conserva en cada venta los datos del momento; agrupar por nombre partiría en dos un producto renombrado. Alternativa descartada: agrupar por nombre.) (Aplicado en «Datos de un resumen» y «Casos límite».)
- **Decisión delegada:** La venta promedio se redondea al centavo más cercano, con medio centavo hacia arriba, y se muestra «—» sin ventas. (Motivo: es la única cifra que no es una suma exacta y necesita una regla clara; «Bs 0,00» de promedio sin ventas confundiría. Alternativa descartada: truncar los centavos.) (Aplicado en «Datos de un resumen», RF-3 y «Casos límite».)
- **Decisión delegada:** El resumen del mes incluye una fila por cada día, del día 1 a hoy, también los días sin ventas. (Motivo: muestra la marcha del mes y deja ver los días sin ventas; es un resumen, no el listado de ventas del Historial. Alternativa descartada: listar solo los días con ventas, que oculta los días sin actividad.) (Aplicado en RF-10.)
- **Decisión delegada:** Las cifras se muestran como números y listas, sin gráficos. (Motivo: con dos períodos y pocas cifras, los números se leen mejor en la computadora del local, y un gráfico exigiría una dependencia nueva. Alternativa descartada: un gráfico de barras de las ventas por día.) (Aplicado en «Fuera de alcance».)
- **Decisión delegada:** Los resúmenes se calculan al abrir, al recargar y al elegir «Actualizar», con el momento de sus datos visible, y no se actualizan solos. (Motivo: el dueño lo consulta de vez en cuando, y el momento visible deja claro hasta cuándo valen las cifras; igual que «Ver menú» (SPEC-002) y los productos para vender (SPEC-003). Alternativa descartada: actualizar cada minuto, que genera tráfico sin que nadie mire y no deja claro cuándo cambian las cifras.) (Aplicado en RF-6 y «Fuera de alcance».)
- **Decisión delegada:** Si no hay conexión al actualizar, se siguen mostrando las cifras anteriores con el momento de sus datos y un aviso. (Motivo: las cifras anteriores siguen siendo útiles y su momento dice cuánto tienen de antiguas. Alternativa descartada: vaciar la pantalla.) (Aplicado en RF-7.)
- **Decisión delegada:** La opción de la pantalla inicial y el título de la pantalla son «Resumen de ventas». (Motivo: describe en español lo que muestra (RNF-1); «Dashboard» es el nombre interno del módulo. Alternativa descartada: «Dashboard».) (Aplicado en HU-1 y RF-1.)
- **Decisión delegada:** Mientras no se aclare la duda 2, solo el dueño ve el resumen de ventas, y un cajero recibe «No tienes permiso para ver el resumen de ventas». (Motivo: SPEC-001 anticipa que el dueño tiene acceso a los reportes; dar acceso al cajero sin confirmarlo mostraría datos del negocio que el dueño quizá no quiera compartir, mientras que darlo después solo añade un permiso. Alternativa descartada: mostrar el resumen de hoy a los dos roles.) (Aplicado en «Usuarios», RF-1 y «Dudas abiertas».)
- **Decisión delegada:** Rapidez de menos de 2 segundos con hasta 6000 ventas en el mes. (Motivo: 2 segundos es el umbral de SPEC-001 a SPEC-003 para abrir una pantalla, y 6000 ventas son unas 200 por día durante 30 días, más de lo que atiende una cafetería pequeña con una o dos personas. Alternativa descartada: no fijar un volumen, que deja el requisito sin medida.) (Aplicado en RNF-3.)
- **Decisión delegada:** Quedan fuera las comparaciones con períodos anteriores, los resúmenes por persona, categoría u hora, el arqueo de caja, la exportación y los gráficos. (Motivo: ninguno es necesario para saber cuánto se vendió hoy y en el mes, y cada uno trae reglas propias; los períodos anteriores son del Historial. Alternativa descartada: incluir la comparación con el día anterior.) (Aplicado en «Fuera de alcance».)

**Revisión de QA.** En modo delegado, cada hallazgo se decidió con la recomendación indicada.

- **Decisión delegada:** (Hallazgo 1) RF-6 no decía qué ve la persona mientras se calculan los resúmenes. → «Cargando…», y las cifras anteriores siguen visibles hasta que llegan las nuevas. (Motivo: la persona sabe que se está actualizando sin perder de vista lo que ya tenía. Alternativa descartada: vaciar la pantalla mientras carga.) (Aplicado en RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 2) RF-10 no decía en qué sentido se ordenan los días. → Del más antiguo (día 1) al más reciente (hoy). (Motivo: se lee como un calendario y muestra la marcha del mes. Alternativa descartada: de hoy hacia atrás.) (Aplicado en RF-10.)
- **Decisión delegada:** (Hallazgo 3) RF-5, de HU-1, definía el aviso del resumen del mes, que es de HU-2. → El aviso del mes pasa a RF-9. (Motivo: HU-1 debe poder probarse sin el resumen del mes. Alternativa descartada: mover RF-5 a HU-2.) (Aplicado en RF-5 y RF-9.)
- **Decisión delegada:** (Hallazgo 4) RF-9 mostraba el mes «junto al resumen de hoy», que hacía depender HU-2 de HU-1. → El resumen del mes va en la misma pantalla, después del de hoy si existe, y sigue las mismas reglas de cálculo, actualización y conexión (RF-6, RF-7). (Motivo: las dos historias comparten la pantalla, pero cada una se prueba sola. Alternativa descartada: una pantalla propia para el mes, que obliga a ir y volver para ver las dos cifras.) (Aplicado en RF-9.)
- **Decisión delegada:** (Hallazgo 5) RNF-3 hablaba de «los dos resúmenes», pero con solo HU-1 hay uno. → «Todos sus resúmenes». (Motivo: el requisito vale con una o con las dos historias. Alternativa descartada: ninguna.) (Aplicado en RNF-3.)
- **Decisión delegada:** (Hallazgo 6) No se cubría una computadora con otra zona horaria o con la hora equivocada. → «Hoy» y «el mes en curso» los decide la fecha y la hora del sistema en Bolivia. (Motivo: las ventas se registran con la hora del sistema (SPEC-003), y así el resumen es el mismo desde cualquier computadora. Alternativa descartada: usar la fecha de la computadora.) (Aplicado en RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 7) No se cubría que dos productos distintos aparezcan con el mismo nombre en los más vendidos. → Se muestran como dos productos. (Motivo: es la regla de contar cada producto del menú por separado, aunque se renombre; el caso es raro y unirlos mezclaría ventas de productos distintos. Alternativa descartada: unirlos por nombre.) (Aplicado en RF-5 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 8) Un criterio de finalización dependía de la duda abierta 2 y cambiaría de sentido al responderla. → Ninguna sesión ve cifras que su rol no puede ver según «Usuarios». (Motivo: el criterio sigue valiendo con cualquier respuesta. Alternativa descartada: ninguna.) (Aplicado en «Criterios de finalización».)

**Análisis de consistencia.** En modo delegado; ningún hallazgo era bloqueante.

- **Decisión delegada:** (Hallazgo 1) El plan trataba un error inesperado al obtener los resúmenes, pero ningún requisito lo pedía. → RF-7 lo cubre: se muestra «Ocurrió un error. Inténtalo de nuevo» y se conservan las cifras anteriores, como sin conexión. (Motivo: cada comportamiento traza a un RF (principio 2), y la persona necesita lo mismo en los dos casos: saber que no se actualizó y poder reintentar. Alternativa descartada: quitar el caso del plan, que dejaría la pantalla sin respuesta ante un error.) (Aplicado en RF-7.)
