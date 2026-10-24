# SPEC-003 — Ventas

Estado: borrador · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-001 — Acceso](../001-acceso/spec.md), por la sesión, la identidad y el rol de quien registra cada venta, y de [SPEC-002 — Menú](../002-menu/spec.md), por el menú vigente (RF-15 de esa especificación): los productos que se pueden vender y su precio vigente.

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas desde una computadora del local (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Ventas es el tercer módulo de Kofi POS: en el mostrador, la persona que atiende arma la venta con los productos que pide la clientela, ve el total que tiene que cobrar y, una vez cobrada, la registra.

Objetivo: que cada venta pagada quede registrada en el sistema de forma completa y exacta, sin que la persona que atiende tenga que hacer cuentas, para que el Dashboard (004) y el Historial (005) puedan construirse sobre ventas reales y bien definidas: qué se vendió, a qué precio, el total, quién la registró y cuándo.

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
| Fecha y hora | Las del momento en que el sistema la registra, en hora de Bolivia. Se muestran como «24/10/2026 14:05». |
| Quién la registró | La cuenta de la sesión con la que se registró, con su nombre visible y su rol en ese momento. Se conservan aunque después la cuenta cambie o se elimine. |
| Líneas | De 1 a 30 líneas. Cada una con el nombre del producto, el nombre de su categoría y su precio unitario tal como estaban en el menú vigente al registrar la venta, la cantidad (un entero de 1 a 99) y el subtotal. Un mismo producto aparece en una sola línea. |
| Total | La suma exacta de los subtotales. |

Todos los importes se muestran en el formato de precios de SPEC-002 («Datos de un producto»): «Bs 12,50».

## 3. Historias de usuario, priorizadas

### HU-1 — Registrar una venta pagada (P1)

Como **persona que atiende el mostrador (cajero o dueño)**, quiero **armar la venta con los productos del menú y sus cantidades, ver el total que calcula el sistema y registrarla cuando la clientela paga** para **cobrar lo correcto sin hacer cuentas y que la venta quede registrada para los resúmenes y reportes**.

**Prueba independiente:** con un menú vigente que tiene «Café americano» a Bs 12,50 y «Empanada» a Bs 8,00, una sesión de cajero abre «Registrar venta», agrega dos veces el café y una vez la empanada: la venta en preparación muestra «Café americano × 2 · Bs 25,00», «Empanada × 1 · Bs 8,00» y el total «Bs 33,00». Al registrarla aparece «Venta N.º 1 registrada · Bs 33,00» y la venta en preparación queda vacía. La venta registrada que el sistema entrega a otros módulos (RF-11) tiene el número 1, la fecha y la hora, el nombre y el rol del cajero, las dos líneas con sus precios y el total Bs 33,00. Si después el dueño cambia el precio del café, esa venta sigue igual. Pulsar dos veces seguidas «Registrar venta» registra una sola venta, y una venta sin productos no se puede registrar.

*Producto mínimo útil:* por sí sola, esta historia ya permite cobrar y registrar todas las ventas del local, que es lo que necesitan el Dashboard y el Historial.

### HU-2 — No perder la venta en preparación (P2)

Como **persona que atiende el mostrador**, quiero que **la venta que estoy armando no se pierda si recargo la pantalla, voy a otra pantalla o vence mi sesión**, y que **nadie más la vea** si cierro sesión o entra otra persona, para **no tener que volver a pedirle el pedido a la clientela y no mezclar mi venta con la de otra persona**.

**Prueba independiente:** con una venta en preparación de dos productos, recargar la pantalla, ir a «Ver menú» y volver, o cerrar la pestaña y volver a abrir el sistema conservan sus líneas. Si vence la sesión y la misma cuenta vuelve a entrar en ese navegador, regresa a «Registrar venta» con la misma venta en preparación. Si en cambio entra otra cuenta, o la misma cuenta cierra sesión y vuelve a entrar, «Registrar venta» empieza vacía.

## 4. Requisitos funcionales

### HU-1 — Registrar una venta pagada

**RF-1. Acceso a Ventas** (HU-1)

- Mientras haya una sesión válida, de dueño o de cajero, el sistema deberá ofrecer en la pantalla inicial la opción «Registrar venta».
- Mientras no haya una sesión válida, el sistema deberá aplicar a todas las pantallas y operaciones de Ventas lo que dice SPEC-001 (RF-4, RF-8, RF-10 y RF-12): ninguna venta se registra con una sesión inválida.

**RF-2. Productos para vender** (HU-1)

- Cuando una persona abre «Registrar venta», el sistema deberá mostrar el menú vigente de SPEC-002 tal como está en ese momento: las categorías activas con productos activos, en orden alfabético, y dentro de cada una sus productos activos, en orden alfabético, con su precio.
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

- Si al agregar un producto este ya no está en el menú vigente, entonces el sistema deberá no agregarlo, mostrar «“[producto]” ya no está en el menú» y actualizar los productos para vender (RF-2).
- Si al volver a calcular la venta en preparación (RF-4) el precio vigente de un producto que ya estaba en ella es distinto del que se mostraba, entonces el sistema deberá mostrar el precio nuevo, su subtotal y el total, y avisar «Cambió el precio de “[producto]”: ahora cuesta Bs X».
- Si al volver a calcular la venta en preparación un producto que ya estaba en ella dejó de estar en el menú vigente, entonces el sistema deberá quitar su línea, avisar «Se quitó “[producto]”: ya no está en el menú» y actualizar los productos para vender.
- Cuando un producto de la venta en preparación cambia de nombre o de categoría en el menú sin cambiar de precio, el sistema deberá mostrar su nombre nuevo sin avisar.

[producto] es el nombre del producto tal como se mostraba en la venta en preparación.

**RF-6. Registrar la venta** (HU-1)

- El sistema deberá ofrecer la opción «Registrar venta» en la venta en preparación, para usarla cuando la clientela ya pagó.
- Cuando la persona registra una venta en preparación con al menos una línea, el sistema deberá registrarla con los datos de «Datos de una venta registrada», mostrar «Venta N.º [número] registrada · [total]» y dejar vacía la venta en preparación, lista para la siguiente.
- El sistema deberá mantener visible la confirmación de la última venta registrada hasta que se agregue un producto a la venta siguiente.
- Si la venta en preparación está vacía, entonces el sistema deberá no permitir registrarla; si aun así llega a intentarse, deberá rechazarla con el mensaje «Agrega al menos un producto».

**RF-7. Se cobra lo que se mostró** (HU-1)

- Si al registrar la venta el precio vigente de alguno de sus productos es distinto del que se mostraba, o alguno ya no está en el menú vigente, entonces el sistema deberá no registrarla, actualizar la venta en preparación como indica RF-5 y mostrar «El menú cambió. Revisa la venta antes de registrarla».
- El sistema deberá registrar cada venta con exactamente las líneas, los precios unitarios y el total que se mostraban al elegir «Registrar venta».

**RF-8. Una venta se registra una sola vez** (HU-1)

- Si se elige «Registrar venta» varias veces para la misma venta en preparación (doble clic, o un nuevo intento tras un error de conexión), entonces el sistema deberá registrarla una sola vez y mostrar en cada intento la confirmación de esa misma venta, con su mismo número.
- Mientras se está registrando una venta, el sistema deberá no permitir cambiar la venta en preparación.

**RF-9. Registro completo o nada** (HU-1)

- El sistema deberá registrar cada venta completa, con todas sus líneas, o no registrarla: nunca queda una venta a medias.
- Si una venta no se puede registrar por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces» y conservar la venta en preparación.
- Si un cambio en la venta en preparación (RF-3) no se puede hacer por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo» y dejar la venta en preparación como estaba.

**RF-10. Ventas desde varios navegadores** (HU-1)

- El sistema deberá mantener una venta en preparación independiente por cuenta y navegador: lo que se arma en un navegador no aparece en otro.
- Cuando se registran ventas a la vez desde varios navegadores, el sistema deberá registrarlas todas, cada una con su propio número, sin saltos ni repeticiones.

**RF-11. Ventas registradas para otros módulos** (HU-1)

- El sistema deberá poder indicar en todo momento, para cada venta registrada, los datos de «Datos de una venta registrada»: número, fecha y hora, quién la registró, sus líneas y su total.
- Cuando cambia el menú después de registrar una venta (un precio, un nombre, una categoría, o un producto o una categoría desactivados), el sistema deberá conservar la venta registrada exactamente como se registró.
- Cuando cambia o se elimina la cuenta que registró una venta, el sistema deberá conservar en la venta el nombre visible y el rol que tenía al registrarla.

### HU-2 — No perder la venta en preparación

**RF-12. Conservar la venta en preparación** (HU-2)

- Mientras la sesión siga siendo válida, el sistema deberá conservar la venta en preparación de esa cuenta en ese navegador, con sus líneas y cantidades, aunque se recargue la pantalla, se vaya a otra pantalla del sistema o se cierre y se vuelva a abrir la pestaña.
- Cuando se vuelve a mostrar una venta en preparación conservada, el sistema deberá volver a calcularla con el menú vigente (RF-4 y RF-5).

**RF-13. Venta en preparación y fin de la sesión** (HU-2)

- Cuando vence la sesión (SPEC-001, RF-10) y la misma cuenta vuelve a entrar en ese navegador, el sistema deberá mostrarle la venta en preparación que tenía.
- Cuando la persona elige «Cerrar sesión» (SPEC-001, RF-7), el sistema deberá descartar la venta en preparación de esa cuenta en ese navegador.
- Cuando entra en un navegador una cuenta distinta de la que tenía allí una venta en preparación, el sistema deberá no mostrársela y descartarla.
- Si la sesión termina porque la cuenta cambió o se eliminó (SPEC-001, RF-12), entonces el sistema deberá descartar la venta en preparación.

**RF-14. Descartar la venta en preparación** (HU-2)

- El sistema deberá ofrecer la opción «Descartar venta» mientras la venta en preparación tenga al menos una línea.
- Cuando la persona elige «Descartar venta», el sistema deberá pedir confirmación con «¿Descartar esta venta? Se quitarán todos sus productos» y las opciones «Descartar» y «Volver»; con «Descartar», deberá dejar vacía la venta en preparación sin registrar nada.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-2. Importes exactos.** Subtotales y totales son exactos al centavo: ninguna suma pierde ni gana centavos por redondeo, y el total registrado es siempre la suma de los subtotales de sus líneas.
- **RNF-3. Rapidez.** Desde la computadora del local, con un menú de hasta 200 productos, en el 95 % de los casos: abrir «Registrar venta» tarda menos de 2 segundos, cada cambio de la venta en preparación muestra el total actualizado en menos de 1 segundo y registrar una venta tarda menos de 2 segundos. No cuenta la primera operación tras un período sin uso del sistema, mientras el servicio se reactiva (como en SPEC-001, RNF-4).
- **RNF-4. Uso con teclado.** Se puede armar y registrar una venta solo con teclado: llegar a cada producto y a cada opción de las líneas, y elegirlos con Intro o la barra espaciadora.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Elegir tres veces el mismo producto | Una sola línea con cantidad 3 (RF-3). |
| Restar a una línea con cantidad 1 | No se permite; se usa «Quitar» (RF-3). |
| Sumar a una línea con 99 unidades | No cambia y se avisa del máximo (RF-3). |
| Agregar el producto distinto número 31 | No se agrega y se avisa del máximo (RF-3). |
| Registrar una venta vacía | No se permite (RF-6). |
| Doble clic en «Registrar venta» | Se registra una sola venta (RF-8). |
| Se corta la conexión al registrar y se reintenta; el primer intento sí llegó a registrarse | El reintento muestra la confirmación de esa misma venta, con su número, y no registra otra (RF-8). |
| Se corta la conexión al registrar y se reintenta; el primer intento no llegó | El reintento la registra una vez (RF-8, RF-9). |
| El dueño cambia el precio de un producto mientras el cajero lo tiene en la venta en preparación | Al siguiente cambio de la venta, o al registrarla, se avisa del precio nuevo; si era al registrar, no se registra hasta que la persona la revise (RF-5, RF-7). |
| El dueño desactiva un producto, o su categoría, mientras está en una venta en preparación | Se quita su línea con aviso al siguiente cambio o al registrar; si era al registrar, la venta no se registra (RF-5, RF-7). |
| El dueño cambia solo el nombre de un producto que está en la venta en preparación | Se muestra el nombre nuevo sin aviso y la venta se registra con él (RF-5, RF-7). |
| Se agrega un producto que se desactivó después de abrir «Registrar venta» | No se agrega; se avisa y se actualizan los productos para vender (RF-5). |
| El dueño cambia el precio de un producto después de que se vendió | Las ventas ya registradas conservan el precio con el que se registraron (RF-11). |
| Se desactiva un producto que aparece en ventas registradas | Las ventas registradas no cambian (RF-11). |
| Se elimina la cuenta de un cajero que registró ventas | Sus ventas conservan su nombre visible y su rol (RF-11). |
| Dos navegadores registran una venta en el mismo instante | Se registran las dos, con números consecutivos distintos (RF-10). |
| La misma cuenta arma ventas en dos navegadores | Cada navegador tiene su propia venta en preparación (RF-10). |
| El menú vigente está vacío | Se avisa y no se pueden agregar productos (RF-2). |
| La sesión vence justo al registrar | La venta no se registra y se aplica SPEC-001, RF-10; si la misma cuenta vuelve a entrar, recupera la venta en preparación (RF-1, RF-13). |
| Se recarga la pantalla con una venta en preparación | Se conserva y se vuelve a calcular con el menú vigente (RF-12). |
| La persona cierra sesión con una venta en preparación | Se descarta sin aviso (RF-13). |
| Entra otra cuenta en el navegador donde quedó una venta en preparación | No la ve; la venta se descarta (RF-13). |
| Una venta de 30 productos con 99 unidades cada uno a Bs 1000,00 | Se registra con el total exacto «Bs 2970000,00» (RNF-2). |

## 7. Fuera de alcance

- Modificar o anular una venta registrada, o registrar devoluciones: las ventas registradas no cambian. Corregir una venta equivocada queda para una especificación propia.
- Medio de pago, efectivo recibido y cálculo del cambio (ver «Dudas abiertas»).
- Facturación, impuestos y comprobantes impresos o digitales (ver «Dudas abiertas»).
- Descuentos, promociones, propinas y precios distintos del precio vigente del menú.
- Ventas a crédito, pagos parciales, cuentas por cobrar o ventas pendientes de pago: solo se registran ventas ya pagadas.
- Mesas, nombres de clientes, notas por producto («sin azúcar»), pedidos para cocina y estados de preparación de un pedido.
- Varias ventas en preparación a la vez en un mismo navegador.
- Tamaños, variantes y extras: cada variante es un producto distinto del menú (SPEC-002).
- Inventario y descuento de existencias al vender.
- Consultar, buscar o resumir ventas registradas: lo hacen el Dashboard (SPEC-004) y el Historial (SPEC-005), a partir de RF-11.
- Avisar al cerrar sesión de que hay una venta en preparación: se descarta (RF-13).

## 8. Criterios de finalización

- Una persona registra una venta de 3 productos distintos en menos de 30 segundos desde que abre «Registrar venta».
- En el 100 % de las ventas registradas, el total es la suma exacta de los subtotales, y cada subtotal es el precio unitario por la cantidad.
- Ninguna venta se registra dos veces por un doble clic o por un reintento tras perder la conexión.
- Ninguna venta se registra con un precio distinto del que se mostraba al registrarla.
- Los números de las ventas registradas son 1, 2, 3… sin saltos ni repeticiones, aunque se registren desde dos navegadores a la vez.
- Ningún cambio posterior del menú ni de las cuentas modifica una venta ya registrada.
- Ninguna persona ve la venta en preparación de otra cuenta.

## 9. Dudas abiertas

- [NECESITA ACLARACIÓN] ¿Qué medios de pago acepta Kofi (efectivo, QR, tarjeta…) y quiere el dueño que cada venta registre con cuál se pagó o que el sistema calcule el cambio del efectivo? No bloquea ninguna historia de esta especificación: hasta aclararlo, una venta registrada no indica el medio de pago. Hace falta antes de especificar el Dashboard (004) si el resumen del día debe separar los importes por medio de pago.
- [NECESITA ACLARACIÓN] ¿Kofi emite factura o nota fiscal por sus ventas? No bloquea ninguna historia: la facturación queda fuera de alcance. Si la emite, hará falta una especificación propia.

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
- **Decisión delegada:** El medio de pago, el efectivo recibido y el cálculo del cambio quedan fuera hasta aclarar qué medios de pago acepta Kofi. (Motivo: es un dato que solo conocen las personas, y registrar las ventas no depende de él. Alternativa descartada: suponer que Kofi cobra solo en efectivo.) (Aplicado en «Fuera de alcance» y «Dudas abiertas».)
- **Decisión delegada:** Facturación, descuentos, propinas, ventas a crédito, mesas, notas por producto e inventario quedan fuera. (Motivo: ninguno es necesario para registrar ventas pagadas, y cada uno cambia las reglas del total. Alternativa descartada: incluir descuentos manuales.) (Aplicado en «Fuera de alcance».)
- **Decisión delegada:** Abrir «Registrar venta» muestra el menú vigente agrupado y ordenado como «Ver menú» de SPEC-002, sin búsqueda. (Motivo: el menú de una cafetería pequeña cabe en una pantalla y la persona ya conoce ese orden. Alternativa descartada: un buscador por nombre.) (Aplicado en RF-2.)
- **Decisión delegada:** Rapidez de menos de 1 segundo para cada cambio de la venta en preparación y de 2 segundos para abrirla y registrarla. (Motivo: en el mostrador cada cambio se hace con la clientela delante, y 2 segundos es el umbral de SPEC-001 y SPEC-002 para el resto. Alternativa descartada: 2 segundos para todo.) (Aplicado en RNF-3.)
