# SPEC-003 — Ventas

Estado: revisada · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-001 — Acceso](../001-acceso/spec.md), por la sesión, la identidad y el rol de quien registra cada venta, y de [SPEC-002 — Menú](../002-menu/spec.md), por el menú vigente (RF-15 de esa especificación): los productos que se pueden vender y su precio vigente.

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas desde una computadora del local (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Ventas es el tercer módulo de Kofi POS: en el mostrador, la persona que atiende arma la venta con los productos que pide la clientela, ve el total que tiene que cobrar y, una vez cobrada, la registra.

Objetivo: que cada venta pagada quede registrada en el sistema de forma completa y exacta, sin que la persona que atiende tenga que hacer cuentas, para que el Dashboard (004) y el Historial (005) puedan construirse sobre ventas reales y bien definidas: qué se vendió, a qué precio, el total, cómo se pagó, quién la registró y cuándo.

## 2. Usuarios

| Usuario | Qué puede hacer en Ventas |
| --- | --- |
| **Cajero** | Preparar y registrar ventas. |
| **Dueño** | Lo mismo que el cajero: en un local atendido por una o dos personas, el dueño también atiende el mostrador. |

### Conceptos

| Concepto | Definición |
| --- | --- |
| **Venta en preparación** | La lista de productos y cantidades que la persona arma mientras la clientela pide, antes de cobrar. Todavía no es una venta: no cuenta para ningún resumen ni reporte. |
| **Línea** | Cada producto distinto de una venta, con su cantidad, su precio unitario y su subtotal (precio unitario por cantidad). |
| **Total** | La suma de los subtotales de todas las líneas. |
| **Venta registrada** | Una venta ya cobrada que la persona registró. No se modifica (ver «Fuera de alcance»). |

### Datos de una venta registrada

| Dato | Regla |
| --- | --- |
| Número | Entero que identifica la venta: 1 para la primera venta registrada en el sistema y uno más para cada venta siguiente, sin saltos ni repeticiones. |
| Fecha y hora | Las del momento en que el sistema la registra, en hora de Bolivia. Se muestran como día/mes/año y hora:minutos en formato de 24 horas, con dos cifras salvo el año: «24/10/2026 14:05», «05/01/2027 09:30». |
| Quién la registró | La cuenta de la sesión con la que se registró, con su nombre visible y su rol en ese momento. Se conservan aunque después la cuenta cambie o se elimine. |
| Líneas | De 1 a 30 líneas. Cada una con el nombre del producto, el nombre de su categoría y su precio unitario tal como estaban en el menú vigente al registrar la venta, la cantidad (un entero de 1 a 99) y el subtotal. Un mismo producto aparece en una sola línea. |
| Total | La suma exacta de los subtotales. |
| Medio de pago | «Efectivo» o «QR», los dos que acepta Kofi (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Uno solo por venta. |

Todos los importes se muestran en el formato de precios de SPEC-002 («Datos de un producto»): «Bs 12,50».

## 3. Historias de usuario, priorizadas

### HU-1 — Registrar una venta pagada (P1)

Como **persona que atiende el mostrador (cajero o dueño)**, quiero **armar la venta con los productos del menú y sus cantidades, ver el total que calcula el sistema y registrarla cuando la clientela paga** para **cobrar lo correcto sin hacer cuentas y que la venta quede registrada para los resúmenes y reportes**.

**Prueba independiente:** con un menú vigente que tiene «Café americano» a Bs 12,50 y «Empanada» a Bs 8,00, una sesión de cajero abre «Nueva venta», agrega dos veces el café y una vez la empanada: la venta en preparación muestra «Café americano × 2 · Bs 25,00», «Empanada × 1 · Bs 8,00» y el total «Bs 33,00». Al elegir el medio de pago «Efectivo» y «Registrar venta» aparece «Venta N.º 1 registrada · Bs 33,00 · Efectivo · [fecha y hora]» y la venta en preparación queda vacía. La venta registrada que el sistema entrega a otros módulos (RF-11) tiene el número 1, la fecha y la hora, el nombre y el rol del cajero, las dos líneas con sus precios, el total Bs 33,00 y el medio de pago «Efectivo»; una segunda venta pagada con «QR» queda registrada con ese medio. Si después el dueño cambia el precio del café, esa venta sigue igual. Pulsar dos veces seguidas «Registrar venta» registra una sola venta, y una venta sin productos o sin medio de pago no se puede registrar.

*Producto mínimo útil:* por sí sola, esta historia ya permite cobrar y registrar todas las ventas del local, que es lo que necesitan el Dashboard y el Historial.

### HU-2 — No perder la venta en preparación (P2)

Como **persona que atiende el mostrador**, quiero que **la venta que estoy armando no se pierda si recargo la pantalla, voy a otra pantalla o vence mi sesión**, y que **nadie más la vea** si cierro sesión o entra otra persona, para **no tener que volver a pedirle el pedido a la clientela y no mezclar mi venta con la de otra persona**.

**Prueba independiente:** con una venta en preparación de dos productos, recargar la pantalla, ir a la pantalla inicial y volver, o cerrar el navegador y volver a abrir el sistema conservan sus líneas; una segunda pestaña del mismo navegador muestra la misma venta. Si vence la sesión en «Nueva venta» y la misma cuenta vuelve a entrar en ese navegador, regresa a «Nueva venta» con la misma venta en preparación. Si en cambio entra otra cuenta, o la misma cuenta cierra sesión y vuelve a entrar, «Nueva venta» empieza vacía.

## 4. Requisitos funcionales

### HU-1 — Registrar una venta pagada

**RF-1. Acceso a Ventas** (HU-1)

- Mientras haya una sesión válida, de dueño o de cajero, el sistema deberá ofrecer en la pantalla inicial la opción «Nueva venta», que abre la pantalla donde se prepara y se registra una venta.
- Mientras no haya una sesión válida, el sistema deberá aplicar a todas las pantallas y operaciones de Ventas lo que dice SPEC-001 (RF-4, RF-8, RF-10 y RF-12): ninguna venta se registra con una sesión inválida.

**RF-2. Productos para vender** (HU-1)

- Cuando una persona abre «Nueva venta», o recarga esa pantalla, el sistema deberá mostrar el menú vigente de SPEC-002 tal como está en ese momento: las categorías activas con productos activos, en orden alfabético, y dentro de cada una sus productos activos, en orden alfabético, con su precio.
- El sistema deberá actualizar los productos para vender solo al abrir o recargar la pantalla y en los casos de RF-5; la lista no se actualiza sola.
- Mientras el menú vigente no tenga ningún producto, el sistema deberá mostrar «El menú todavía no tiene productos para vender» y no permitir agregar productos.

**RF-3. Armar la venta en preparación** (HU-1)

- Cuando la persona elige un producto que no está en la venta en preparación, el sistema deberá agregarlo como una línea nueva, al final, con cantidad 1.
- Cuando la persona elige un producto que ya está en la venta en preparación, el sistema deberá sumar 1 a la cantidad de su línea.
- El sistema deberá ofrecer en cada línea las opciones «+» (sumar 1), «−» (restar 1) y «Quitar» (sacar la línea), sin pedir confirmación.
- Mientras la cantidad de una línea sea 1, el sistema deberá no permitir restarle; la línea se saca con «Quitar».
- Si una línea ya tiene 99 unidades y se intenta sumar una más, entonces el sistema deberá no cambiarla y mostrar «Una venta puede tener como máximo 99 unidades de cada producto».
- Si la venta en preparación ya tiene 30 líneas y se intenta agregar otro producto, entonces el sistema deberá no agregarlo y mostrar «Una venta puede tener como máximo 30 productos distintos».

**RF-4. Importes calculados por el sistema** (HU-1)

- El sistema deberá mostrar en cada línea el nombre del producto, la cantidad, el precio unitario y el subtotal, y debajo de las líneas el total de la venta en preparación.
- Cuando cambia la venta en preparación (se agrega, se suma, se resta o se quita), el sistema deberá volver a calcular los subtotales y el total con los precios del menú vigente en ese momento y mostrarlos antes de permitir otro cambio o el registro.
- Mientras la venta en preparación esté vacía, el sistema deberá mostrar «Elige los productos de la venta» y el total «Bs 0,00».

**RF-5. Cambios del menú durante la preparación** (HU-1)

En los avisos de este requisito y de RF-7, [producto] es el nombre del producto tal como se mostraba en la venta en preparación, y «Bs X», su precio vigente en el formato de SPEC-002.

- Si al agregar un producto este ya no está en el menú vigente, entonces el sistema deberá no agregarlo, mostrar «“[producto]” ya no está en el menú» y actualizar los productos para vender (RF-2).
- Si al volver a calcular la venta en preparación (RF-4) el precio vigente de un producto que ya estaba en ella es distinto del que se mostraba, entonces el sistema deberá mostrar el precio nuevo, su subtotal y el total, y avisar «Cambió el precio de “[producto]”: ahora cuesta Bs X».
- Si al volver a calcular la venta en preparación un producto que ya estaba en ella dejó de estar en el menú vigente, entonces el sistema deberá quitar su línea, avisar «Se quitó “[producto]”: ya no está en el menú» y actualizar los productos para vender.
- Cuando un producto de la venta en preparación cambia de nombre o de categoría en el menú sin cambiar de precio, el sistema deberá mostrar su nombre nuevo sin avisar.
- El sistema deberá mantener visibles los avisos de este requisito y de RF-7 hasta el siguiente cambio de la venta en preparación o hasta que se registre.

**RF-6. Registrar la venta** (HU-1)

- El sistema deberá ofrecer la opción «Registrar venta» en la venta en preparación, para usarla cuando la clientela ya pagó.
- El sistema deberá ofrecer en la venta en preparación la elección del medio de pago, «Efectivo» o «QR», sin ninguno elegido de antemano, y permitir cambiarla hasta registrar la venta.
- Cuando la persona registra una venta en preparación con al menos una línea y un medio de pago elegido, el sistema deberá registrarla con los datos de «Datos de una venta registrada», mostrar «Venta N.º [número] registrada · [total] · [medio de pago] · [fecha y hora]» y dejar vacía la venta en preparación, sin medio de pago elegido, lista para la siguiente.
- El sistema deberá mantener visible la confirmación de la última venta registrada hasta que se agregue un producto a la venta siguiente o se salga de la pantalla; al recargarla, la confirmación ya no se muestra.
- Si la venta en preparación está vacía, entonces el sistema deberá no permitir registrarla; si aun así llega a intentarse, deberá rechazarla con el mensaje «Agrega al menos un producto».
- Si no se eligió el medio de pago, entonces el sistema deberá no permitir registrar la venta; si aun así llega a intentarse, deberá rechazarla con el mensaje «Elige el medio de pago».

**RF-7. Se cobra lo que se mostró** (HU-1)

- Si al registrar la venta el precio vigente de alguno de sus productos es distinto del que se mostraba, o alguno ya no está en el menú vigente, entonces el sistema deberá no registrarla, actualizar la venta en preparación como indica RF-5 y mostrar «El menú cambió. Revisa la venta antes de registrarla».
- El sistema deberá registrar cada venta con exactamente las líneas, las cantidades, los precios unitarios, el total y el medio de pago que se mostraban al elegir «Registrar venta», y con el nombre de cada producto y el de su categoría tal como están en el menú vigente en ese momento (RF-5).

**RF-8. Una venta se registra una sola vez** (HU-1)

- Si se elige «Registrar venta» varias veces para la misma venta en preparación (doble clic, o un nuevo intento tras un error de conexión), entonces el sistema deberá registrarla una sola vez y mostrar en cada intento la confirmación de esa misma venta, con su mismo número.
- Si la venta en preparación ya quedó registrada en un intento anterior, entonces el sistema deberá mostrar su confirmación aunque el menú haya cambiado después, sin aplicar RF-7.
- Mientras se está registrando una venta, el sistema deberá no permitir cambiar la venta en preparación.

**RF-9. Registro completo o nada** (HU-1)

- El sistema deberá registrar cada venta completa, con todas sus líneas, o no registrarla: nunca queda una venta a medias.
- Si una venta no se puede registrar por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces» y conservar la venta en preparación.
- Si un cambio en la venta en preparación (RF-3) no se puede hacer por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo» y dejar la venta en preparación como estaba.

**RF-10. Ventas desde varios navegadores** (HU-1)

- El sistema deberá mantener independientes las ventas en preparación de distintos navegadores, aunque sean de la misma cuenta: lo que se arma en un navegador no aparece en otro.
- Cuando se registran ventas a la vez desde varios navegadores, el sistema deberá registrarlas todas, cada una con su propio número, sin saltos ni repeticiones.

**RF-11. Ventas registradas para otros módulos** (HU-1)

- El sistema deberá poder indicar en todo momento, para cada venta registrada, los datos de «Datos de una venta registrada»: número, fecha y hora, quién la registró, sus líneas, su total y su medio de pago.
- Cuando cambia el menú después de registrar una venta (un precio, un nombre, una categoría, o un producto o una categoría desactivados), el sistema deberá conservar la venta registrada exactamente como se registró.
- Cuando cambia o se elimina la cuenta que registró una venta, el sistema deberá conservar en la venta el nombre visible y el rol que tenía al registrarla.

### HU-2 — No perder la venta en preparación

**RF-12. Conservar la venta en preparación** (HU-2)

- El sistema deberá conservar la venta en preparación de cada cuenta en cada navegador, con sus líneas, sus cantidades y el medio de pago elegido, hasta que se registre o se descarte (RF-13, RF-14), aunque se recargue la pantalla, se vaya a otra pantalla del sistema o se cierre y se vuelva a abrir la pestaña o el navegador.
- El sistema deberá mostrar la misma venta en preparación en todas las pestañas del mismo navegador con la misma cuenta: cuando cambia o se registra en una pestaña, las demás muestran la versión más reciente.
- Cuando se vuelve a mostrar una venta en preparación conservada, el sistema deberá volver a calcularla con el menú vigente (RF-4 y RF-5).

**RF-13. Venta en preparación y fin de la sesión** (HU-2)

- Cuando vence la sesión (SPEC-001, RF-10) y la misma cuenta vuelve a entrar en ese navegador, el sistema deberá conservarle la venta en preparación que tenía: la ve al volver a «Nueva venta», ya sea porque SPEC-001 (RF-11) la regresa a esa pantalla o porque la abre después.
- Cuando la persona elige «Cerrar sesión» (SPEC-001, RF-7), el sistema deberá descartar la venta en preparación de esa cuenta en ese navegador.
- Cuando una cuenta distinta de la que tenía una venta en preparación en un navegador abre «Nueva venta» en él, el sistema deberá no mostrársela y descartarla.
- Si la sesión termina porque la cuenta cambió o se eliminó (SPEC-001, RF-12), entonces el sistema deberá descartar la venta en preparación.

**RF-14. Descartar la venta en preparación** (HU-2)

- El sistema deberá ofrecer la opción «Descartar venta» mientras la venta en preparación tenga al menos una línea.
- Cuando la persona elige «Descartar venta», el sistema deberá pedir confirmación con «¿Descartar esta venta? Se quitarán todos sus productos» y las opciones «Descartar» y «Volver»; con «Descartar», deberá dejar vacía la venta en preparación sin registrar nada.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-2. Importes exactos.** Subtotales y totales son exactos al centavo: ninguna suma pierde ni gana centavos por redondeo, y el total registrado es siempre la suma de los subtotales de sus líneas.
- **RNF-3. Rapidez.** Desde la computadora del local, con un menú de hasta 200 productos, en el 95 % de los casos: abrir «Nueva venta» tarda menos de 2 segundos, cada cambio de la venta en preparación muestra el total actualizado en menos de 1 segundo y registrar una venta tarda menos de 2 segundos. No cuenta la primera operación tras un período sin uso del sistema, mientras el servicio se reactiva (como en SPEC-001, RNF-4).
- **RNF-4. Uso con teclado.** Se puede armar y registrar una venta solo con teclado: llegar a cada producto, a cada opción de las líneas y al medio de pago, y elegirlos con Intro o la barra espaciadora.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Elegir tres veces el mismo producto | Una sola línea con cantidad 3 (RF-3). |
| Restar a una línea con cantidad 1 | No se permite; se usa «Quitar» (RF-3). |
| Sumar a una línea con 99 unidades | No cambia y se avisa del máximo (RF-3). |
| Agregar el producto distinto número 31 | No se agrega y se avisa del máximo (RF-3). |
| Registrar una venta vacía | No se permite (RF-6). |
| Registrar una venta sin elegir el medio de pago | No se permite (RF-6). |
| Elegir «Efectivo», cambiarlo por «QR» y registrar | La venta queda registrada con «QR» (RF-6, RF-7). |
| Se pierde la respuesta del registro, la persona cambia el medio de pago y reintenta | El reintento muestra la venta ya registrada, con el medio de pago con que se registró (RF-8). |
| La clientela quiere pagar una parte en efectivo y otra con QR | No se admite: cada venta tiene un solo medio de pago (ver «Fuera de alcance»). |
| Doble clic en «Registrar venta» | Se registra una sola venta (RF-8). |
| Se corta la conexión al registrar y se reintenta; el primer intento sí llegó a registrarse | El reintento muestra la confirmación de esa misma venta, con su número, y no registra otra (RF-8). |
| Se corta la conexión al registrar y se reintenta; el primer intento no llegó | El reintento la registra una vez (RF-8, RF-9). |
| El dueño cambia el precio de un producto mientras el cajero lo tiene en la venta en preparación | Al siguiente cambio de la venta, o al registrarla, se avisa del precio nuevo; si era al registrar, no se registra hasta que la persona la revise (RF-5, RF-7). |
| El dueño desactiva un producto, o su categoría, mientras está en una venta en preparación | Se quita su línea con aviso al siguiente cambio o al registrar; si era al registrar, la venta no se registra (RF-5, RF-7). |
| El dueño cambia solo el nombre de un producto que está en la venta en preparación | Se muestra el nombre nuevo sin aviso y la venta se registra con él (RF-5, RF-7). |
| Se agrega un producto que se desactivó después de abrir «Nueva venta» | No se agrega; se avisa y se actualizan los productos para vender (RF-5). |
| El dueño cambia el precio de un producto después de que se vendió | Las ventas ya registradas conservan el precio con el que se registraron (RF-11). |
| Se desactiva un producto que aparece en ventas registradas | Las ventas registradas no cambian (RF-11). |
| Se elimina la cuenta de un cajero que registró ventas | Sus ventas conservan su nombre visible y su rol (RF-11). |
| Dos navegadores registran una venta en el mismo instante | Se registran las dos, con números consecutivos distintos (RF-10). |
| La misma cuenta arma ventas en dos navegadores | Cada navegador tiene su propia venta en preparación (RF-10). |
| El menú vigente está vacío | Se avisa y no se pueden agregar productos (RF-2). |
| La sesión vence justo al registrar | La venta no se registra y se aplica SPEC-001, RF-10; si la misma cuenta vuelve a entrar, recupera la venta en preparación (RF-1, RF-13). |
| La sesión vence al agregar un producto o cambiar una cantidad | El cambio no se aplica y se aplica SPEC-001, RF-10; la venta en preparación se conserva como estaba antes del cambio (RF-1, RF-13). |
| Ya se registró la venta, se pierde la respuesta y, antes del reintento, el dueño cambia un precio | El reintento muestra la confirmación de la venta ya registrada, con los precios con que se registró (RF-8). |
| Se recarga la pantalla con una venta en preparación | Se conserva y se vuelve a calcular con el menú vigente (RF-12). |
| La misma cuenta tiene «Nueva venta» abierta en dos pestañas del mismo navegador | Las dos muestran la misma venta en preparación; registrarla en una la deja vacía en las dos (RF-12). |
| Tras vencer la sesión, la misma cuenta vuelve a entrar en ese navegador días después | Recupera la venta en preparación, recalculada con el menú vigente y con los avisos de los cambios (RF-12, RF-13). |
| La persona cierra sesión con una venta en preparación | Se descarta sin aviso (RF-13). |
| Entra otra cuenta en el navegador donde quedó una venta en preparación | No la ve: al abrir «Nueva venta», la venta se descarta (RF-13). |
| Una venta de 30 productos con 99 unidades cada uno a Bs 1000,00 | Se registra con el total exacto «Bs 2970000,00» (RNF-2). |

## 7. Fuera de alcance

- Modificar o anular una venta registrada, o registrar devoluciones: las ventas registradas no cambian. Corregir una venta equivocada queda para una especificación propia.
- Efectivo recibido y cálculo del cambio: la persona da el cambio como hasta ahora.
- Comprobar en el sistema que un pago con QR llegó: la persona lo comprueba como hasta ahora, antes de registrar la venta.
- Pagos combinados (una parte en efectivo y otra con QR) y medios de pago distintos de efectivo y QR, como tarjetas.
- Facturación, impuestos y comprobantes impresos o digitales: Kofi no emite factura.
- Descuentos, promociones, propinas y precios distintos del precio vigente del menú.
- Ventas a crédito, pagos parciales, cuentas por cobrar o ventas pendientes de pago: solo se registran ventas ya pagadas.
- Mesas, nombres de clientes, notas por producto («sin azúcar»), pedidos para cocina y estados de preparación de un pedido.
- Varias ventas en preparación a la vez en un mismo navegador.
- Tamaños, variantes y extras: cada variante es un producto distinto del menú (SPEC-002).
- Inventario y descuento de existencias al vender.
- Consultar, buscar o resumir ventas registradas: lo hacen el Dashboard (SPEC-004) y el Historial (SPEC-005), a partir de RF-11.
- Avisar al cerrar sesión de que hay una venta en preparación: se descarta (RF-13).

## 8. Criterios de finalización

- Una persona registra una venta de 3 productos distintos en menos de 30 segundos desde que abre «Nueva venta».
- En el 100 % de las ventas registradas, el total es la suma exacta de los subtotales, y cada subtotal es el precio unitario por la cantidad.
- Ninguna venta se registra dos veces por un doble clic o por un reintento tras perder la conexión.
- Ninguna venta se registra con un precio distinto del que se mostraba al registrarla.
- Los números de las ventas registradas son 1, 2, 3… sin saltos ni repeticiones, aunque se registren desde dos navegadores a la vez.
- Ningún cambio posterior del menú ni de las cuentas modifica una venta ya registrada.
- Ninguna persona ve la venta en preparación de otra cuenta.
- El 100 % de las ventas registradas indica su medio de pago, «Efectivo» o «QR».

## 9. Dudas abiertas

Ninguna.

## 10. Aclaraciones

### 2026-10-24

La persona delegó la definición completa de 003-ventas («Delego la definición completa de 003-ventas … hasta antes de las historias»). No se le hicieron preguntas: cada punto se decidió con la recomendación indicada.

- **Decisión delegada:** El número y el nombre son `003` y `ventas`. (Motivo: es el siguiente número de `specs/` y el nombre del módulo en `docs/business-rules.md`. Alternativa descartada: ninguna.) (Aplicado en el título.)
- **Decisión delegada:** El cajero y el dueño pueden preparar y registrar ventas, sin diferencias entre roles. (Motivo: SPEC-001 asigna las ventas al cajero, y en un local atendido por una o dos personas el dueño también atiende el mostrador. Alternativa descartada: reservar las ventas al cajero.) (Aplicado en «Usuarios» y RF-1.)
- **Decisión delegada:** El precio que queda registrado en cada línea es el precio vigente del menú en el momento de registrar la venta, y debe coincidir con el que se mostraba; si no coincide, la venta no se registra hasta que la persona la revise. (Motivo: es la pregunta que SPEC-002 dejó a Ventas; así nunca se registra un importe distinto del que se le dijo a la clientela, y el precio registrado es siempre un precio real del menú. Alternativas descartadas: congelar el precio del momento en que se agregó el producto, que podría registrar un precio que ya no existe; registrar con el precio nuevo sin avisar, que cobraría un total distinto del mostrado.) (Aplicado en «Datos de una venta registrada», RF-5 y RF-7.)
- **Decisión delegada:** Una venta registrada conserva el nombre del producto, el nombre de su categoría y el precio unitario de cada línea tal como estaban al registrarla, y los cambios posteriores del menú no la modifican. (Motivo: es la otra pregunta que SPEC-002 dejó a Ventas; el Dashboard y el Historial deben mostrar lo que realmente se vendió, aunque el producto cambie de nombre, de precio o de categoría, o se desactive. Alternativa descartada: mostrar las ventas con los datos actuales del menú, que cambiaría ventas pasadas.) (Aplicado en «Datos de una venta registrada» y RF-11.)
- **Decisión delegada:** Una venta registrada conserva el nombre visible y el rol de quien la registró, aunque la cuenta cambie o se elimine después. (Motivo: SPEC-001 permite cambiar el rol o eliminar una cuenta, y el Historial debe seguir diciendo quién registró cada venta. Alternativa descartada: guardar solo la referencia a la cuenta.) (Aplicado en «Datos de una venta registrada» y RF-11.)
- **Decisión delegada:** Las ventas registradas no se modifican ni se anulan en esta especificación. (Motivo: el módulo Ventas es «preparar y registrar ventas pagadas» según `docs/business-rules.md`; anular exige reglas propias (quién, hasta cuándo, con qué motivo) y su efecto en el Dashboard y el Historial. Alternativa descartada: permitir al dueño anular la última venta.) (Aplicado en «Conceptos» y «Fuera de alcance».)
- **Decisión delegada:** Cada venta registrada tiene un número consecutivo, desde 1 y sin saltos. (Motivo: da a la persona y al Historial una forma simple de referirse a una venta. Alternativa descartada: un identificador interno sin número visible.) (Aplicado en «Datos de una venta registrada», RF-6 y RF-10.)
- **Decisión delegada:** Cada producto ocupa una sola línea; elegirlo de nuevo suma 1; las líneas se cambian con «+», «−» y «Quitar», con un máximo de 99 unidades por línea y 30 líneas por venta. (Motivo: es el flujo más rápido en un mostrador y los límites frenan errores de tipeo sin acercarse a un pedido real de una cafetería. Alternativas descartadas: escribir la cantidad a mano; sin límites.) (Aplicado en «Datos de una venta registrada», RF-3 y «Casos límite».)
- **Decisión delegada:** Los subtotales y el total los calcula el sistema con el menú vigente cada vez que cambia la venta en preparación, y la persona no puede cambiar precios ni importes. (Motivo: la constitución (principio 3) reserva los importes a las reglas de negocio, y así se detecta enseguida un cambio de precio. Alternativa descartada: calcular el total solo al registrar.) (Aplicado en RF-4 y RF-5.)
- **Decisión delegada:** Se registra solo una venta ya pagada, con una sola opción «Registrar venta» y sin paso de confirmación. (Motivo: el módulo registra ventas pagadas y en el mostrador cada paso extra demora la cola; la venta en preparación ya muestra todo lo que se va a registrar. Alternativa descartada: una ventana «¿Registrar la venta por Bs X?».) (Aplicado en RF-6 y «Fuera de alcance».)
- **Decisión delegada:** Registrar varias veces la misma venta en preparación (doble clic o reintento) registra una sola venta. (Motivo: una venta duplicada falsearía el Dashboard y el Historial, y los cortes de conexión en el local son posibles. Alternativa descartada: solo desactivar el botón mientras se registra, que no cubre el reintento tras un error de conexión.) (Aplicado en RF-8, RF-9 y «Casos límite».)
- **Decisión delegada:** La venta en preparación se conserva al recargar, al ir a otra pantalla y al vencer la sesión (la misma cuenta la recupera al volver a entrar), y se descarta al cerrar sesión, al entrar otra cuenta o al terminar la sesión por un cambio de la cuenta. (Motivo: es lo que SPEC-001 dejó decidir a cada módulo; vencer la sesión no es una decisión de la persona y no debe costarle el pedido, mientras que cerrar sesión indica que termina su turno y la siguiente persona no debe ver una venta ajena. Alternativas descartadas: perderla siempre al salir de la pantalla; conservarla también tras cerrar sesión.) (Aplicado en HU-2, RF-12, RF-13 y «Casos límite».)
- **Decisión delegada:** Cerrar sesión con una venta en preparación la descarta sin avisar. (Motivo: el cierre de sesión es de SPEC-001 y no pide confirmación (RF-7 de esa especificación); avisar obligaría a cambiarlo. Alternativa descartada: preguntar antes de cerrar sesión.) (Aplicado en RF-13 y «Fuera de alcance».)
- **Decisión delegada:** Descartar la venta en preparación pide confirmación; quitar una línea, no. (Motivo: descartar borra todo el pedido de una vez, mientras que una línea se vuelve a agregar con un clic. Alternativa descartada: descartar sin confirmación.) (Aplicado en RF-3 y RF-14.)
- **Decisión delegada:** El medio de pago, el efectivo recibido y el cálculo del cambio quedan fuera hasta aclarar qué medios de pago acepta Kofi. (Motivo: es un dato que solo conocen las personas, y registrar las ventas no depende de él. Alternativa descartada: suponer que Kofi cobra solo en efectivo.) (Aplicado en «Fuera de alcance» y «Dudas abiertas».) *Sustituida el 2026-10-24 por las respuestas de la persona: ver «Respuestas a las dudas abiertas».*
- **Decisión delegada:** Facturación, descuentos, propinas, ventas a crédito, mesas, notas por producto e inventario quedan fuera. (Motivo: ninguno es necesario para registrar ventas pagadas, y cada uno cambia las reglas del total. Alternativa descartada: incluir descuentos manuales.) (Aplicado en «Fuera de alcance».)
- **Decisión delegada:** Abrir «Nueva venta» muestra el menú vigente agrupado y ordenado como «Ver menú» de SPEC-002, sin búsqueda. (Motivo: el menú de una cafetería pequeña cabe en una pantalla y la persona ya conoce ese orden. Alternativa descartada: un buscador por nombre.) (Aplicado en RF-2.)
- **Decisión delegada:** Rapidez de menos de 1 segundo para cada cambio de la venta en preparación y de 2 segundos para abrirla y registrarla. (Motivo: en el mostrador cada cambio se hace con la clientela delante, y 2 segundos es el umbral de SPEC-001 y SPEC-002 para el resto. Alternativa descartada: 2 segundos para todo.) (Aplicado en RNF-3.)

**Revisión de QA.** En modo delegado, cada hallazgo se decidió con la recomendación indicada.

- **Decisión delegada:** (Hallazgo 1) «Registrar venta» nombraba a la vez la opción de la pantalla inicial (RF-1) y la acción de registrar (RF-6). → La opción y la pantalla se llaman «Nueva venta»; «Registrar venta» es solo la acción. (Motivo: cada nombre lleva a una sola cosa, y la pantalla también sirve para preparar. Alternativa descartada: llamar «Ventas» a la pantalla, que se confundiría con el Historial de 005.) (Aplicado en HU-1, HU-2, RF-1, RF-2, RNF-3, «Casos límite» y «Criterios de finalización».)
- **Decisión delegada:** (Hallazgo 2) El formato de la fecha y la hora no se definía más allá de un ejemplo, ni dónde se muestra. → Día/mes/año y hora:minutos de 24 horas, con dos cifras salvo el año, y se muestra en la confirmación del registro. (Motivo: es el formato habitual en Bolivia y la persona puede comprobar al momento que la venta quedó registrada. Alternativa descartada: hora de 12 horas con «a. m.» y «p. m.».) (Aplicado en «Datos de una venta registrada», HU-1 y RF-6.)
- **Decisión delegada:** (Hallazgo 3) RF-5 no decía cuánto duran sus avisos. → Hasta el siguiente cambio de la venta en preparación o hasta registrarla. (Motivo: la persona necesita verlos mientras revisa la venta con la clientela. Alternativa descartada: avisos que desaparecen solos a los pocos segundos.) (Aplicado en RF-5.)
- **Decisión delegada:** (Hallazgo 4) RF-2 no decía si los productos para vender se actualizan solos. → Se actualizan al abrir o recargar la pantalla y en los casos de RF-5; no hay actualización automática. (Motivo: el menú cambia pocas veces al día y RF-5 y RF-7 ya impiden vender con datos viejos; igual que «Ver menú» en SPEC-002. Alternativa descartada: actualización automática.) (Aplicado en RF-2.)
- **Decisión delegada:** (Hallazgo 5) RF-12 hablaba de cerrar la pestaña, pero no el navegador. → Se conserva también al cerrar y volver a abrir el navegador. (Motivo: en el local la computadora se apaga o el navegador se cierra entre turnos sin que eso sea cerrar sesión. Alternativa descartada: conservarla solo mientras la pestaña siga abierta.) (Aplicado en HU-2 y RF-12.)
- **Decisión delegada:** (Hallazgo 6) RF-13 decía «mostrarle» la venta tras el vencimiento, pero SPEC-001 (RF-11) lleva a la pantalla donde se estaba, que puede no ser «Nueva venta». → La venta se conserva y se ve al volver a «Nueva venta», por el regreso de SPEC-001 o al abrirla después. (Motivo: respeta RF-11 de SPEC-001 sin cambiarlo. Alternativa descartada: llevar siempre a «Nueva venta» si hay una venta conservada, que contradice SPEC-001.) (Aplicado en HU-2 y RF-13.)
- **Decisión delegada:** (Hallazgo 7) RF-6 no decía qué pasa con la confirmación al recargar o salir de la pantalla. → Desaparece al salir o recargar. (Motivo: la confirmación sirve en el momento del cobro, y consultar ventas pasadas es del Historial (005). Alternativa descartada: conservarla hasta la siguiente venta.) (Aplicado en RF-6.)
- **Decisión delegada:** (Hallazgo 8) RF-7 pedía registrar «exactamente» lo que se mostraba, pero RF-5 y los casos límite registran con el nombre nuevo de un producto renombrado. → Cantidades, precios y total son los que se mostraban; el nombre del producto y el de su categoría, los del menú vigente al registrar. (Motivo: un cambio de nombre no cambia lo que se cobra, y la venta registrada queda con los datos reales del menú en ese momento. Alternativa descartada: rechazar el registro también por un cambio de nombre.) (Aplicado en RF-7.)
- **Decisión delegada:** (Hallazgo 9) RF-8 y RF-7 chocaban si la venta ya quedó registrada y el menú cambia antes del reintento. → El reintento muestra la venta ya registrada, sin aplicar RF-7. (Motivo: la venta ya existe y se cobró con los precios que se mostraban; rechazarla llevaría a registrarla dos veces. Alternativa descartada: aplicar RF-7 también en el reintento.) (Aplicado en RF-8 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 10) RF-10 (HU-1) hablaba de una venta en preparación «por cuenta y navegador», que dependía de cómo se tratan varias pestañas, un tema de HU-2. → RF-10 solo exige que navegadores distintos no compartan la venta en preparación; las pestañas quedan en HU-2. (Motivo: HU-1 se prueba sola, sin la conservación de HU-2. Alternativa descartada: mover RF-10 a HU-2.) (Aplicado en RF-10 y RF-12.)
- **Decisión delegada:** (Hallazgo 11) No se cubría «Nueva venta» abierta en dos pestañas del mismo navegador. → Las pestañas comparten la venta en preparación y muestran siempre la versión más reciente. (Motivo: es la misma persona en el mismo navegador, y así una venta registrada en una pestaña no se vuelve a registrar desde la otra. Alternativa descartada: una venta en preparación por pestaña.) (Aplicado en HU-2, RF-12 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 12) No se decía qué pasa con una venta en preparación conservada durante días. → Se conserva hasta registrarla o descartarla y se recalcula con avisos al volver a mostrarla. (Motivo: RF-5 y RF-7 ya impiden registrarla con precios viejos, y descartarla por tiempo podría perder un pedido. Alternativa descartada: descartarla a las 12 horas.) (Aplicado en RF-12 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 13) No se cubría el vencimiento de la sesión durante un cambio de la venta en preparación. → El cambio no se aplica y la venta queda como estaba. (Motivo: es la regla de SPEC-001 (RF-10) aplicada a Ventas. Alternativa descartada: ninguna.) (Aplicado en «Casos límite».)
- **Decisión delegada:** (Hallazgo 14) La definición de [producto] estaba al final de RF-5, fuera de la notación EARS. → Pasa a una introducción del requisito, que también define «Bs X». (Motivo: deja los criterios en EARS y la definición antes de usarla. Alternativa descartada: ninguna.) (Aplicado en RF-5.)

**Análisis de consistencia.** En modo delegado; ningún hallazgo era bloqueante.

- **Decisión delegada:** (Hallazgo 1) RF-13 descartaba la venta en preparación «cuando entra» otra cuenta, pero el plan la descarta cuando esa cuenta abre «Nueva venta». → Se descarta al abrir «Nueva venta» con otra cuenta. (Motivo: lo que importa es que otra cuenta nunca la vea, y es en esa pantalla donde se vería; el ingreso es de SPEC-001. Alternativa descartada: descartarla en el ingreso, que obligaría a `auth` a conocer las ventas.) (Aplicado en RF-13 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 4) La prueba independiente de HU-2 iba a «Ver menú», que es de la historia 3 de SPEC-002, no de la historia 1 de la que dependen las de Ventas. → Se va a la pantalla inicial y se vuelve. (Motivo: comprueba lo mismo, salir de «Nueva venta» y volver, sin otra dependencia. Alternativa descartada: depender también de SPEC-002 US3.) (Aplicado en HU-2.)

**Respuestas a las dudas abiertas.** La persona respondió las dos dudas; los puntos que dejaron abiertos se decidieron en modo delegado, que sigue vigente para la definición.

- **P:** ¿Qué medios de pago acepta Kofi? → **R:** Efectivo y QR. (Aplicado en «Datos de una venta registrada», RF-6 y «Fuera de alcance»; registrado también en `docs/business-rules.md`.)
- **P:** ¿Kofi emite factura o nota fiscal? → **R:** No. (Aplicado en «Fuera de alcance» y `docs/business-rules.md`.)
- **Decisión delegada:** Cada venta registrada guarda su medio de pago, «Efectivo» o «QR», desde la historia 1. (Motivo: el Dashboard (004) podrá separar el efectivo que debe haber en caja de lo cobrado por QR, y registrarlo desde la primera venta evita ventas sin medio de pago. Alternativa descartada: no registrarlo, o añadirlo en una historia posterior, que dejaría las primeras ventas sin ese dato.) (Aplicado en «Contexto y objetivo», «Datos de una venta registrada», HU-1, RF-6, RF-7, RF-11 y «Criterios de finalización».)
- **Decisión delegada:** La persona elige el medio de pago antes de registrar, sin ninguno elegido de antemano, y puede cambiarlo hasta registrar; la elección se conserva con la venta en preparación. (Motivo: un valor por defecto haría que una venta por QR quedara como efectivo si la persona se olvida de cambiarlo, y la elección es un clic más. Alternativa descartada: «Efectivo» elegido de antemano.) (Aplicado en RF-6, RF-12 y «Casos límite».)
- **Decisión delegada:** El efectivo recibido, el cálculo del cambio, la comprobación del pago QR y los pagos combinados quedan fuera. (Motivo: no hacen falta para registrar bien una venta pagada y cada uno trae reglas propias; la persona sigue dando el cambio y comprobando el QR como hasta ahora. Alternativa descartada: calcular el cambio a partir del efectivo recibido.) (Aplicado en «Fuera de alcance» y «Casos límite».)
- **Decisión delegada:** (Revisión de QA de estos cambios, hallazgo 1) No se cubría un reintento con otro medio de pago tras perder la respuesta de un registro que sí llegó. → El reintento muestra la venta ya registrada, con su medio de pago. (Motivo: es la regla de RF-8; registrar otra venta duplicaría el cobro. Alternativa descartada: rechazar el reintento.) (Aplicado en «Casos límite».)
