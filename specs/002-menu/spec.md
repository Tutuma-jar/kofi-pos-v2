# SPEC-002 — Menú

Estado: revisada · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

Depende de [SPEC-001 — Acceso](../001-acceso/spec.md): usa la sesión, la identidad y el rol (dueño o cajero) que define esa especificación.

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas desde una computadora del local (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Menú es el segundo módulo de Kofi POS: define qué vende Kofi y a qué precio.

Objetivo: que el dueño pueda armar y mantener el menú de Kofi (categorías y productos con su precio en bolivianos) desde el sistema, sin ayuda técnica, y que cualquier persona del local pueda consultar el menú vigente.

El módulo Ventas (003) tomará del menú vigente (RF-15) los productos que se pueden vender y su precio. Por eso cada producto tiene un nombre único, una sola categoría y un único precio vigente. Qué precio queda registrado en una venta, y qué pasa con una venta cuando después cambia el menú, lo decide la especificación de Ventas.

## 2. Usuarios

| Usuario | Qué puede hacer en el menú |
| --- | --- |
| **Dueño** | Administrar el menú: crear y editar categorías y productos, desactivarlos y reactivarlos. También consultar el menú vigente. |
| **Cajero** | Consultar el menú vigente. No puede modificar nada. |

### Conceptos

| Concepto | Definición |
| --- | --- |
| **Categoría** | Agrupa productos del menú (por ejemplo, «Bebidas calientes»). Está activa o inactiva. |
| **Producto** | Algo que Kofi vende, con un nombre, una categoría y un precio. Está activo o inactivo. |
| **Menú vigente** | Los productos activos que pertenecen a una categoría activa. Es lo que se ofrece a la clientela. |

### Datos de una categoría

| Dato | Regla |
| --- | --- |
| Nombre | De 1 a 30 caracteres, sin contar los espacios al inicio y al final, que se quitan al guardar. Los espacios seguidos se guardan como uno solo. Admite letras (con tildes, diéresis y «ñ»), dígitos, espacios y los signos `. , - ' ( ) & /`. Único entre todas las categorías, activas o inactivas, según «Comparación de nombres». |
| Estado | Activa o inactiva. Toda categoría nueva se crea activa. |

### Datos de un producto

| Dato | Regla |
| --- | --- |
| Nombre | De 1 a 40 caracteres, con el mismo tratamiento de espacios y los mismos caracteres admitidos que el nombre de una categoría. Único entre todos los productos del menú, activos o inactivos y de cualquier categoría, según «Comparación de nombres». |
| Categoría | Obligatoria y exactamente una. |
| Precio | Importe en bolivianos (BOB) mayor que 0 y como máximo 1000,00, con hasta 2 decimales. Se escribe solo con dígitos y, si tiene decimales, una coma o un punto como separador decimal; los espacios al inicio y al final se ignoran y no se admiten separadores de miles ni espacios intermedios. Se muestra siempre con dos decimales, coma decimal y sin separador de miles, precedido de «Bs»: «Bs 15,50», «Bs 1000,00». |
| Estado | Activo o inactivo. Todo producto nuevo se crea activo. |

### Comparación de nombres

Para decidir si dos nombres se repiten y para ordenarlos, el sistema no distingue mayúsculas de minúsculas, ni vocales con o sin tilde o diéresis («Café» y «cafe», «Pingüino» y «pinguino» son iguales). La «ñ» es una letra distinta de la «n» («Piña» y «Pina» son nombres distintos) y se ordena después de ella, como en el alfabeto español. Un nombre nunca se considera repetido consigo mismo.

## 3. Historias de usuario, priorizadas

### HU-1 — Armar el menú (P1)

Como **dueño**, quiero **crear y editar las categorías y los productos del menú, con su precio**, para **tener en el sistema lo que vende Kofi y corregirlo cuando cambie un nombre o un precio**.

**Prueba independiente:** con una sesión de dueño, la administración del menú vacío invita a crear la primera categoría. Se crea «Bebidas calientes» y, en ella, «Café americano» a «12,5»: aparece en la lista con «Bs 12,50». Un precio de 0, uno con tres decimales o un nombre repetido («CAFÉ AMERICANO») se rechazan con un mensaje que indica el motivo. Al cambiar el precio a 13 y mover el producto a otra categoría, la lista lo muestra así al volver a abrirla, y el menú vigente que el sistema entrega a otros módulos (RF-15) lo incluye con esos datos. Con una sesión de cajero, la administración del menú se rechaza sin cambios.

*Producto mínimo útil:* por sí sola, esta historia ya permite cargar el menú completo de Kofi y mantener sus precios al día, que es lo que necesita Ventas para empezar.

### HU-2 — Sacar del menú lo que no se ofrece (P2)

Como **dueño**, quiero **desactivar y reactivar productos y categorías** para **dejar de ofrecer lo que se acabó o no es de temporada sin perderlo ni tener que volver a cargarlo**.

**Prueba independiente:** con un menú cargado, se desactiva un producto: sigue en la administración marcado como «Inactivo» y deja de formar parte del menú vigente que el sistema entrega a otros módulos (RF-15); al reactivarlo vuelve a él con su mismo nombre, categoría y precio. Una categoría con productos activos no se puede desactivar; tras desactivar sus productos, sí. No se puede crear un producto en una categoría inactiva ni reactivar un producto cuya categoría esté inactiva.

### HU-3 — Consultar el menú vigente (P3)

Como **persona del local (dueño o cajero)**, quiero **consultar el menú vigente con sus precios** para **responder a la clientela qué hay y cuánto cuesta**.

**Prueba independiente:** con un menú cargado, una sesión de cajero abre «Ver menú» y ve las categorías activas con sus productos activos y sus precios, sin ninguna opción para modificarlos. Si no hay productos en el menú vigente, se muestra un aviso. Un cambio hecho por el dueño se ve al volver a abrir la consulta.

## 4. Requisitos funcionales

### HU-1 — Armar el menú

**RF-1. Acceso a la administración del menú** (HU-1)

- Mientras haya una sesión válida de dueño, el sistema deberá ofrecer en la pantalla inicial la opción «Administrar menú».
- Mientras haya una sesión válida de cajero, el sistema deberá no mostrar la opción «Administrar menú».
- Si una sesión de cajero intenta abrir la administración del menú o hacer cualquier cambio en el menú, entonces el sistema deberá rechazarlo sin aplicar ningún cambio, llevar a la pantalla inicial y mostrar en ella «No tienes permiso para administrar el menú».
- Mientras no haya una sesión válida, el sistema deberá aplicar a todas las pantallas y operaciones del menú lo que dice SPEC-001 (RF-4, RF-8, RF-10 y RF-12).

**RF-2. Lista de administración** (HU-1)

- Cuando el dueño abre la administración del menú, el sistema deberá mostrar todas las categorías, activas e inactivas, en orden alfabético, y dentro de cada una todos sus productos, activos e inactivos, en orden alfabético, con su precio en el formato de «Datos de un producto».
- El sistema deberá indicar con la etiqueta «Inactiva» o «Inactivo» cada categoría o producto inactivo.
- El sistema deberá mostrar «Sin productos» en cada categoría que no tenga ninguno.
- Mientras no exista ninguna categoría, el sistema deberá mostrar «Todavía no hay categorías. Crea la primera» y la opción de crear una categoría.
- El sistema deberá ordenar alfabéticamente categorías y productos según «Comparación de nombres».

**RF-3. Crear y renombrar una categoría** (HU-1)

- Cuando el dueño crea una categoría con un nombre que cumple «Datos de una categoría», el sistema deberá guardarla activa y mostrarla en la lista.
- Cuando el dueño cambia el nombre de una categoría por uno que cumple «Datos de una categoría», el sistema deberá guardarlo sin cambiar sus productos ni su estado.
- Si el nombre está vacío o formado solo por espacios, entonces el sistema deberá rechazarlo con el mensaje «Escribe el nombre de la categoría».
- Si el nombre coincide con el de otra categoría según «Comparación de nombres», entonces el sistema deberá rechazarlo con el mensaje «Ya existe una categoría con ese nombre».
- Si el nombre tiene un carácter no admitido en «Datos de una categoría», entonces el sistema deberá rechazarlo con el mensaje «El nombre solo puede tener letras, números, espacios y los signos . , - ' ( ) & /».
- Cuando el dueño cambia el nombre de una categoría solo en mayúsculas, minúsculas, tildes o espacios («bebidas» por «Bebidas»), el sistema deberá guardarlo tal como se escribió.
- El sistema deberá impedir escribir más de 30 caracteres en el nombre de una categoría.

**RF-4. Crear un producto** (HU-1)

- Cuando el dueño crea un producto con un nombre, una categoría activa y un precio que cumplen «Datos de un producto», el sistema deberá guardarlo activo y mostrarlo en su categoría.
- El sistema deberá ofrecer como categorías posibles para un producto nuevo solo las activas.
- Mientras no exista ninguna categoría activa, el sistema deberá no permitir crear productos y mostrar «Crea o reactiva una categoría antes de añadir productos».

**RF-5. Editar un producto** (HU-1)

- Cuando el dueño cambia el nombre, la categoría o el precio de un producto por valores que cumplen «Datos de un producto», el sistema deberá guardarlos sin cambiar su estado.
- Cuando se guarda un nuevo precio, el sistema deberá usarlo como único precio vigente del producto desde ese momento.
- El sistema deberá permitir mover un producto solo a una categoría activa.
- Mientras el producto que se edita esté en una categoría inactiva, el sistema deberá ofrecer como categorías posibles la suya, marcada «Inactiva», y las activas, y permitir guardar su nombre y su precio sin moverlo.
- Cuando el dueño cambia el nombre de un producto solo en mayúsculas, minúsculas, tildes o espacios, el sistema deberá guardarlo tal como se escribió.

**RF-6. Validación de un producto** (HU-1)

Si al crear o editar un producto algún dato no cumple «Datos de un producto», entonces el sistema deberá rechazar el cambio completo, conservar lo escrito e indicar cada dato que falla con estos mensajes:

| Situación | Mensaje |
| --- | --- |
| Nombre vacío o formado solo por espacios | «Escribe el nombre del producto» |
| Nombre igual al de otro producto según «Comparación de nombres» | «Ya existe un producto con ese nombre» |
| Nombre con un carácter no admitido | «El nombre solo puede tener letras, números, espacios y los signos . , - ' ( ) & /» |
| Sin categoría | «Elige una categoría» |
| Categoría inactiva elegida al crear el producto o al moverlo de categoría | «Elige una categoría activa» |
| Precio vacío o formado solo por espacios | «Escribe el precio» |
| Precio que no es un número, con separador de miles, con espacios intermedios o con más de 2 decimales | «Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)» |
| Precio igual a 0 o negativo | «El precio debe ser mayor que 0» |
| Precio mayor que 1000,00 | «El precio no puede superar Bs 1000,00» |

- El sistema deberá impedir escribir más de 40 caracteres en el nombre de un producto.

**RF-7. Guardado completo o nada** (HU-1)

- El sistema deberá guardar cada cambio del menú completo o no guardarlo: nunca queda un producto o una categoría a medio cambiar.
- Si un cambio no se puede guardar por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Los cambios no se guardaron», conservar lo escrito y no aplicar nada.
- Cuando un cambio se guarda, el sistema deberá confirmarlo con el mensaje «Cambios guardados» y mostrar la lista actualizada.

**RF-8. Cambios desde dos navegadores** (HU-1)

- Si dos sesiones de dueño guardan cambios sobre el mismo producto o la misma categoría, entonces el sistema deberá conservar el último cambio guardado, siempre que cumpla las reglas de «Datos de una categoría» y «Datos de un producto» en el momento de guardarlo.
- El sistema deberá comprobar cada cambio contra el estado del menú en el momento de guardarlo, de modo que, aunque dos sesiones guarden a la vez, nunca quede un producto activo en una categoría inactiva ni dos nombres repetidos: el cambio que deja de cumplir las reglas se rechaza con su mensaje (RF-3, RF-6, RF-9 o RF-10).

**RF-15. Menú vigente para otros módulos** (HU-1)

- El sistema deberá poder indicar en todo momento el menú vigente: para cada producto activo de una categoría activa, su nombre, su categoría y su precio vigente.

### HU-2 — Sacar del menú lo que no se ofrece

**RF-9. Desactivar y reactivar un producto** (HU-2)

- Cuando el dueño desactiva un producto activo, el sistema deberá marcarlo como inactivo sin pedir confirmación, conservar su nombre, su categoría y su precio, y quitarlo del menú vigente.
- Cuando el dueño reactiva un producto inactivo cuya categoría está activa, el sistema deberá marcarlo como activo, con los mismos datos que tenía, e incluirlo en el menú vigente.
- Si el dueño intenta reactivar un producto cuya categoría está inactiva, entonces el sistema deberá rechazarlo con el mensaje «Reactiva la categoría “[categoría]” o mueve el producto a otra antes de reactivarlo», donde [categoría] es el nombre de su categoría.

**RF-10. Desactivar y reactivar una categoría** (HU-2)

- Cuando el dueño desactiva una categoría sin productos activos, el sistema deberá marcarla como inactiva sin pedir confirmación.
- Si el dueño intenta desactivar una categoría que tiene productos activos, entonces el sistema deberá rechazarlo con el mensaje «Esta categoría tiene N productos activos. Desactívalos o muévelos a otra categoría antes» («1 producto activo» en singular).
- Cuando el dueño reactiva una categoría, el sistema deberá marcarla como activa sin cambiar el estado de sus productos.

**RF-11. Categorías inactivas** (HU-2)

- Mientras una categoría esté inactiva, el sistema deberá no permitir crear productos en ella ni mover productos hacia ella (RF-4, RF-5, RF-6).
- Mientras una categoría esté inactiva, el sistema deberá permitir cambiar su nombre (RF-3).

**RF-12. Datos que se conservan** (HU-2)

- El sistema deberá conservar todas las categorías y productos creados, activos o inactivos: no ofrece la opción de eliminarlos.
- El sistema deberá tener en cuenta las categorías y los productos inactivos al comprobar que un nombre no se repite (RF-3, RF-6).

### HU-3 — Consultar el menú vigente

**RF-13. Acceso a la consulta** (HU-3)

- Mientras haya una sesión válida, de dueño o de cajero, el sistema deberá ofrecer en la pantalla inicial la opción «Ver menú».

**RF-14. Consulta del menú vigente** (HU-3)

- Cuando una persona abre «Ver menú», el sistema deberá mostrar solo el menú vigente: las categorías activas que tienen al menos un producto activo, en orden alfabético, y dentro de cada una sus productos activos, en orden alfabético, con su precio en el formato de «Datos de un producto».
- El sistema deberá mostrar la consulta sin ninguna opción para crear, editar, desactivar o reactivar.
- Mientras el menú vigente no tenga ningún producto, el sistema deberá mostrar «El menú todavía no tiene productos disponibles».
- El sistema deberá mostrar el menú vigente tal como está al abrir la consulta, ya sea desde la pantalla inicial o recargando la pantalla; los cambios guardados después se ven al volver a abrirla o al recargarla. La consulta no se actualiza sola.

## 5. Requisitos no funcionales

- **RNF-1. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-2. Importes exactos.** Los precios se guardan y se muestran exactamente como se escribieron, con dos decimales: «12,5» se guarda como 12,50 y nunca aparece como 12,49 o 12,500.
- **RNF-3. Rapidez.** En el 95 % de las aperturas de la administración o de la consulta y de los guardados hechos desde la computadora del local, con un menú de hasta 200 productos, el resultado aparece en menos de 2 segundos. No cuenta la primera operación tras un período sin uso del sistema, mientras el servicio se reactiva (como en SPEC-001, RNF-4).
- **RNF-4. Uso con teclado.** Crear o editar una categoría o un producto se puede completar solo con teclado: pasar de un campo a otro, elegir la categoría y guardar con Intro.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Crear «café americano» cuando existe «Café Americano» | Se rechaza: nombre repetido (RF-6). |
| Crear «Cafe americano» cuando existe «Café americano» | Se rechaza: las tildes no distinguen (RF-6). |
| Crear un producto con el nombre de uno inactivo | Se rechaza: los inactivos cuentan (RF-12). |
| Crear «Jugo de piña» cuando existe «Jugo de pina» | Se acepta: la «ñ» distingue (Comparación de nombres). |
| Renombrar «bebidas frías» como «Bebidas Frías» | Se acepta: no se repite consigo mismo (RF-3). |
| Nombre con emoji, comillas o un salto de línea | Se rechaza: carácter no admitido (RF-3, RF-6). |
| Dos productos con el mismo nombre en categorías distintas | No se permite: el nombre es único en todo el menú (RF-6). |
| Nombre «  Té   de   coca  » | Se guarda como «Té de coca» (Datos de un producto). |
| Precio «12,5» o «12.5» | Se guarda y se muestra como «Bs 12,50» (RF-4, RNF-2). |
| Precio «12,505» | Se rechaza: más de 2 decimales (RF-6). |
| Precio «1.000» | Se rechaza: se lee como separador de miles o tres decimales (RF-6). |
| Precio «1 000» | Se rechaza: espacio intermedio (RF-6). |
| Precio « 12,50 » | Se acepta como «Bs 12,50»: los espacios alrededor se ignoran (Datos de un producto). |
| Precio «1000» | Se acepta: es el máximo, «Bs 1000,00». |
| Precio «1000,01», «0», «0,00» o «-5» | Se rechaza con su mensaje (RF-6). |
| Precio «Bs 12» o «doce» | Se rechaza: no es un número (RF-6). |
| Desactivar una categoría con productos activos | Se rechaza e indica cuántos tiene (RF-10). |
| Desactivar una categoría que solo tiene productos inactivos | Se permite (RF-10). |
| Reactivar una categoría | Sus productos siguen como estaban: los inactivos no se reactivan (RF-10). |
| Reactivar un producto de una categoría inactiva | Se rechaza (RF-9). |
| Editar el precio de un producto inactivo | Se permite; sigue inactivo (RF-5). |
| Mover un producto a una categoría inactiva | No se ofrece ni se acepta (RF-5, RF-11). |
| Editar el precio de un producto que está en una categoría inactiva | Se permite sin moverlo (RF-5). |
| La categoría elegida se desactiva desde otro navegador antes de guardar el producto | El producto se rechaza con «Elige una categoría activa» (RF-6, RF-8). |
| Un navegador desactiva una categoría mientras otro crea, reactiva o mueve a ella un producto | Solo uno de los dos cambios se aplica: nunca queda un producto activo en una categoría inactiva (RF-8). |
| Dos navegadores del dueño cambian el precio del mismo producto | Queda el último guardado (RF-8). |
| Categoría activa cuyos productos están todos inactivos | Aparece en la administración, no en «Ver menú» (RF-2, RF-14). |
| Un cajero intenta abrir la administración escribiendo su dirección | Se rechaza y vuelve a la pantalla inicial con el mensaje de permiso (RF-1). |
| La sesión vence mientras se edita un producto | No se guarda nada y se aplica SPEC-001, RF-10 (RF-1). |
| Se pierde la conexión al guardar | Se avisa, no se guarda y se conserva lo escrito (RF-7). |
| El dueño cambia un precio mientras el cajero tiene abierta la consulta | El cajero ve el precio nuevo al volver a abrirla o al recargarla (RF-14). |

## 7. Fuera de alcance

- Eliminar categorías o productos: se desactivan (RF-12).
- Tamaños, variantes, extras y modificadores (por ejemplo, «grande» o «con leche de almendras»): cada variante con precio propio se carga como un producto distinto («Latte grande»).
- Descripción, foto, ingredientes o alérgenos de un producto.
- Inventario, existencias, recetas, costos y márgenes.
- Combos, descuentos, promociones y precios distintos por horario, día o cliente.
- Impuestos y facturación.
- Historial de precios o registro de quién cambió qué en el menú.
- Orden personalizado de categorías o productos: se ordenan alfabéticamente.
- Búsqueda y filtros en la administración o en la consulta.
- Importar o exportar el menú (por ejemplo, desde una hoja de cálculo) y cargarlo al preparar el sistema. La carga del menú oficial en una base nueva la cubre [SPEC-006](../006-menu-inicial/spec.md).
- Qué precio se registra en una venta y cómo afectan a una venta los cambios del menú: lo decide SPEC-003 (Ventas).
- Qué pasa con un cambio no guardado del menú al cerrar sesión: se pierde, como cualquier cambio no guardado.

## 8. Criterios de finalización

- El dueño crea un producto nuevo en una categoría existente en menos de 30 segundos desde que abre la administración del menú.
- El 100 % de los intentos de un cajero de abrir la administración o de cambiar el menú se rechazan sin cambios.
- Ningún producto con un precio fuera de «Datos de un producto» ni con un nombre repetido llega a guardarse.
- Todo precio guardado se muestra igual en la administración y en la consulta, con dos decimales y «Bs».
- «Ver menú» muestra exactamente los productos activos de categorías activas: un producto desactivado deja de verse y uno reactivado vuelve a verse al abrir de nuevo la consulta.
- Un producto desactivado y reactivado conserva su nombre, su categoría y su precio.
- Ninguna categoría con productos activos puede quedar inactiva.

## 9. Dudas abiertas

Ninguna. La duda sobre las categorías, los productos y los precios reales de Kofi se resolvió el 2026-10-28 en [SPEC-006 — Menú inicial](../006-menu-inicial/spec.md#menú-oficial), que fija el menú oficial y su carga en una base nueva; sus nombres y precios cumplen los largos, los caracteres admitidos y el máximo de Bs 1000,00 de esta especificación.

## 10. Aclaraciones

### 2026-10-24

La persona delegó la especificación de 002-menu («Delego la especificación de 002-menu»). No se le hicieron preguntas: cada punto se decidió con la recomendación indicada.

- **Decisión delegada:** El dueño administra el menú y ambos roles consultan el menú vigente; el cajero no puede modificar nada. (Motivo: SPEC-001 asigna al dueño la administración del menú y al cajero la atención y las ventas; un error de precio del cajero afectaría a todas las ventas. Alternativa descartada: que el cajero pueda cambiar precios o desactivar productos agotados.) (Aplicado en «Usuarios», RF-1 y RF-13.)
- **Decisión delegada:** El menú tiene dos niveles: categorías y productos; cada producto pertenece a exactamente una categoría. (Motivo: es lo mínimo para ordenar el menú y para que Ventas lo muestre agrupado. Alternativa descartada: subcategorías o productos en varias categorías.) (Aplicado en «Conceptos», «Datos de un producto» y RF-4.)
- **Decisión delegada:** El nombre de un producto es único en todo el menú, y el de una categoría entre todas las categorías, sin distinguir mayúsculas, minúsculas ni tildes, y contando los inactivos. (Motivo: Ventas identificará cada producto por su nombre sin ambigüedad, y reactivar un producto nunca puede chocar con otro. Alternativa descartada: nombres únicos solo dentro de cada categoría.) (Aplicado en «Datos de una categoría», «Datos de un producto», RF-3, RF-6 y RF-12.)
- **Decisión delegada:** Nombres de categoría de 1 a 30 caracteres y de producto de 1 a 40, sin espacios alrededor y con los espacios seguidos reducidos a uno. (Motivo: alcanzan para nombres como «Bebidas calientes» o «Cheesecake de maracuyá con frutos rojos» y evitan duplicados que solo difieren en espacios. Alternativa descartada: sin límite de largo.) (Aplicado en «Datos de una categoría» y «Datos de un producto».)
- **Decisión delegada:** Un producto tiene un único precio en BOB, mayor que 0 y como máximo 1000,00, con hasta 2 decimales, escrito con coma o punto decimal y mostrado como «Bs 15,50». (Motivo: un máximo bajo frena errores de tipeo como 1550 en lugar de 15,50, y ningún producto de una cafetería pequeña se acerca a ese precio; la coma decimal es la convención de Bolivia. Alternativas descartadas: máximo de 9 999,99; aceptar solo números enteros.) (Aplicado en «Datos de un producto», RF-6, RNF-2 y «Casos límite».)
- **Decisión delegada:** Las categorías y los productos no se eliminan: se desactivan y reactivan. (Motivo: Ventas e Historial harán referencia a productos que dejen de ofrecerse, y desactivar es reversible. Alternativa descartada: eliminar los que nunca se vendieron.) (Aplicado en HU-2, RF-9, RF-10, RF-12 y «Fuera de alcance».)
- **Decisión delegada:** Una categoría con productos activos no se puede desactivar, y reactivar una categoría no reactiva sus productos. (Motivo: evita productos activos que no se ven en el menú vigente sin que el dueño lo note, y respeta lo que el dueño desactivó a propósito. Alternativa descartada: que desactivar una categoría desactive en cascada sus productos.) (Aplicado en RF-10, RF-11 y «Casos límite».)
- **Decisión delegada:** El menú vigente son los productos activos de categorías activas, y es lo que el sistema entrega a otros módulos. (Motivo: da a Ventas una definición única de qué se puede vender y a qué precio. Alternativa descartada: que cada módulo filtre el menú por su cuenta.) (Aplicado en «Conceptos», RF-14 y RF-15.)
- **Decisión delegada:** El precio vigente es el último guardado; el menú no guarda historial de precios, y qué precio queda en una venta lo decide Ventas. (Motivo: mantiene el menú simple y deja la regla de cobro en el módulo que la usa. Alternativa descartada: precios con fecha de vigencia.) (Aplicado en «Contexto y objetivo», RF-5 y «Fuera de alcance».)
- **Decisión delegada:** Orden alfabético de categorías y productos, sin orden personalizado, búsqueda ni filtros. (Motivo: el menú de una cafetería pequeña cabe en una pantalla y el orden alfabético no requiere mantenimiento. Alternativa descartada: que el dueño ordene a mano.) (Aplicado en RF-2, RF-14 y «Fuera de alcance».)
- **Decisión delegada:** Si dos sesiones del dueño cambian lo mismo, queda el último cambio guardado que cumpla las reglas. (Motivo: el negocio tiene un solo dueño y el caso es raro; detectar conflictos complicaría la edición sin beneficio claro. Alternativa descartada: rechazar el guardado si el dato cambió desde que se abrió.) (Aplicado en RF-8 y «Casos límite».)
- **Decisión delegada:** Tamaños, variantes y extras quedan fuera; cada variante con precio propio es un producto distinto. (Motivo: cubre la necesidad con el modelo más simple y deja la posibilidad de una especificación propia. Alternativa descartada: productos con opciones y recargos.) (Aplicado en «Fuera de alcance».)
- **Decisión delegada:** El menú empieza vacío y el dueño lo carga desde la interfaz; no se importa ni se precarga al preparar el sistema. (Motivo: la carga desde la interfaz es la HU-1 y no depende de datos que aún no tenemos. Alternativa descartada: precargar el menú real al instalar.) (Aplicado en RF-2 y «Fuera de alcance»; los datos reales quedan en «Dudas abiertas».)
- **Decisión delegada:** La consulta del menú se actualiza al abrirla o actualizarla, no en tiempo real. (Motivo: el menú cambia pocas veces al día. Alternativa descartada: actualización automática en pantalla.) (Aplicado en RF-14.)

**Revisión de QA.** En modo delegado, cada hallazgo se decidió con la recomendación indicada.

- **Decisión delegada:** (Hallazgo 1) «Sin distinguir tildes» no decía qué pasa con la «ñ», la diéresis ni el orden. → Tildes y diéresis no distinguen; la «ñ» es una letra distinta de la «n» y se ordena después de ella. (Motivo: en español «piña» y «pina» son palabras distintas, mientras que «cafe» y «café» son el mismo producto mal escrito. Alternativa descartada: tratar la «ñ» como «n».) (Aplicado en «Comparación de nombres», «Datos de una categoría», «Datos de un producto», RF-2, RF-3, RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 2) No se decía si el precio admite espacios. → Los espacios alrededor se ignoran y los intermedios se rechazan. (Motivo: un espacio al final es un descuido inofensivo; uno intermedio puede ser un separador de miles. Alternativa descartada: quitar todos los espacios.) (Aplicado en «Datos de un producto», RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 3) El precio se escribe sin separador de miles, pero el máximo se mostraba como «Bs 1 000,00». → Los precios se muestran sin separador de miles: «Bs 1000,00». (Motivo: la norma del español no separa los números de cuatro cifras y así lo mostrado coincide con lo que se escribe. Alternativa descartada: mostrar «Bs 1 000,00».) (Aplicado en «Datos de un producto», RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 4) No se definían los caracteres admitidos en los nombres. → Letras (con tildes, diéresis y «ñ»), dígitos, espacios y `. , - ' ( ) & /`, con un mensaje propio para el resto. (Motivo: cubre nombres como «Café (doble)» o «Pan & queso» y evita emojis o saltos de línea que complican comparar y ordenar. Alternativa descartada: admitir cualquier carácter.) (Aplicado en «Datos de una categoría», «Datos de un producto», RF-3, RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 5) RF-14 no decía cómo se «actualiza» la consulta. → Se ve el menú del momento al abrirla desde la pantalla inicial o al recargarla; no hay actualización automática ni botón propio. (Motivo: el menú cambia pocas veces al día. Alternativa descartada: un botón «Actualizar».) (Aplicado en RF-14 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 6) RF-1 no decía dónde queda el cajero tras el rechazo. → Va a la pantalla inicial, donde se muestra el mensaje de permiso. (Motivo: es el punto de partida de ambos roles en SPEC-001. Alternativa descartada: una pantalla de error propia.) (Aplicado en RF-1 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 7) RF-5 permitía editar un producto de una categoría inactiva sin moverlo, pero RF-6 rechazaba toda categoría inactiva y RF-4 solo ofrecía las activas. → La categoría inactiva se rechaza solo al crear o al mover; al editar un producto de una categoría inactiva se ofrece su categoría, marcada «Inactiva», junto con las activas. (Motivo: respeta lo decidido en RF-5 sin dejar productos imposibles de corregir. Alternativa descartada: exigir mover el producto antes de editarlo.) (Aplicado en RF-4, RF-5, RF-6 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 8) HU-1 se presentaba como suficiente para Ventas, pero RF-15 (el menú vigente para otros módulos) estaba en HU-3 (P3). → RF-15 pasa a HU-1. (Motivo: Ventas necesita el menú vigente desde la P1. Alternativa descartada: subir HU-3 a P1.) (Aplicado en HU-1, RF-15.)
- **Decisión delegada:** (Hallazgo 9) RF-8 solo cubría cambios simultáneos sobre el mismo dato; desactivar una categoría mientras otro navegador crea, reactiva o mueve a ella un producto podía dejar un producto activo en una categoría inactiva. → Cada cambio se comprueba contra el menú en el momento de guardarlo y se rechaza el que deje de cumplir las reglas. (Motivo: mantiene siempre válido el menú vigente que usará Ventas. Alternativa descartada: aceptar el caso por ser raro.) (Aplicado en RF-8 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 10) No se decía si renombrar algo cambiando solo mayúsculas o tildes choca consigo mismo. → No choca y se guarda tal como se escribió. (Motivo: corregir «bebidas frías» a «Bebidas Frías» es un caso habitual. Alternativa descartada: rechazarlo como repetido.) (Aplicado en «Comparación de nombres», RF-3, RF-5 y «Casos límite».)
- **Decisión delegada:** (Hallazgo 11) El último criterio de RF-2 no estaba en notación EARS. → Se reescribe como «El sistema deberá ordenar…». (Motivo: formato de la skill `especificar`. Alternativa descartada: ninguna.) (Aplicado en RF-2.)
- **Decisión delegada:** (Hallazgo 12) La prueba independiente de HU-2 comprobaba el menú vigente, que solo se veía en HU-3. → Con RF-15 en HU-1, las pruebas de HU-1 y HU-2 comprueban el menú vigente que el sistema entrega a otros módulos. (Motivo: cada historia se prueba sola. Alternativa descartada: quitar el menú vigente de la prueba de HU-2.) (Aplicado en HU-1 y HU-2.)
- **Decisión delegada:** (Hallazgo 13) El mensaje de RF-9 anidaba comillas latinas dentro de comillas latinas y no decía qué es [categoría]. → La categoría va entre comillas inglesas y se indica que es su nombre. (Motivo: la norma del español usa «“ ”» para citas dentro de citas. Alternativa descartada: ninguna.) (Aplicado en RF-9.)

**Análisis de consistencia.** En modo delegado.

- **Decisión delegada:** (Hallazgo 4) ¿Con qué textos responde el sistema a un nombre más largo que el máximo, que la interfaz no deja escribir, y a una categoría o un producto que no existe? → «El nombre de la categoría tiene como máximo 30 caracteres», «El nombre del producto tiene como máximo 40 caracteres», «No se encontró la categoría» y «No se encontró el producto». (Motivo: cada texto nombra el dato, como los de SPEC-001; los dos primeros solo se ven si se esquiva la interfaz, y los dos últimos, si se usa la dirección de algo que no existe. Alternativa descartada: un mensaje genérico «Datos inválidos».) (Aplicado en `plan.md` §6.1 y §6.2.)

### 2026-10-28

- **P:** ¿Sigue vigente que el menú empieza vacío y no se precarga al preparar el sistema? → **R:** Sí para esta especificación; la carga del menú oficial de Kofi en una base nueva, una sola vez y sin tocar un menú existente, la cubre [SPEC-006](../006-menu-inicial/spec.md), que también responde la duda sobre las categorías, los productos y los precios reales. (Aplicado en «Fuera de alcance» y «Dudas abiertas».)
