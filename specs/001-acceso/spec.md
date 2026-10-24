# SPEC-001 — Acceso

Estado: revisada · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas y con una sola computadora en el local, compartida (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Acceso es el primer módulo de Kofi POS y la puerta de entrada a todos los demás: Menú, Ventas, Dashboard e Historial.

Objetivo: que solo las personas del local con una cuenta puedan usar el sistema, que el sistema sepa en todo momento quién lo está usando y con qué rol, y que en la computadora compartida se pueda cambiar de persona sin dejar una sesión abierta.

Los módulos siguientes usan la identidad de la sesión (RF-5) para registrar quién hizo cada operación y aplicar sus permisos.

## 2. Usuarios

| Usuario | Descripción |
| --- | --- |
| **Dueño** | Administra el negocio. En los módulos siguientes tendrá acceso a la administración del menú y a los reportes. |
| **Cajero** | Atiende el mostrador y registra ventas. |

Acceso identifica a la persona y su rol. Lo que cada rol puede hacer dentro de un módulo lo define la especificación de ese módulo.

### Preparación de las cuentas

Las cuentas no se crean desde la interfaz (ver «Fuera de alcance»). Las crea quien instala el sistema, con los datos que le da el dueño. El dueño elige las contraseñas iniciales y se las entrega a cada persona en privado; no quedan escritas en ningún archivo ni documento del proyecto (constitución, principio 5).

### Datos de una cuenta

| Dato | Regla |
| --- | --- |
| Usuario | De 3 a 30 caracteres: letras de la «a» a la «z» (sin tildes ni «ñ»), dígitos, punto, guion y guion bajo. Único sin distinguir mayúsculas de minúsculas. |
| Contraseña | De 8 a 64 caracteres de cualquier tipo. No puede estar formada solo por espacios. |
| Nombre visible | De 1 a 40 caracteres. Es el nombre que el sistema muestra de la persona. |
| Rol | Dueño o cajero. |

## 3. Historias de usuario, priorizadas

### HU-1 — Iniciar y cerrar sesión (P1)

Como **persona del local (dueño o cajero)**, quiero **iniciar sesión con mi usuario y contraseña y cerrarla al terminar** para **usar el sistema con mi identidad y que la siguiente persona de la computadora compartida no opere con mi cuenta**.

**Prueba independiente:** con dos cuentas preparadas, abrir el sistema sin sesión muestra la pantalla de ingreso; con credenciales incorrectas aparece un mensaje de error y se sigue en el ingreso; con las correctas se llega a la pantalla inicial, donde se ven el nombre y el rol de la persona. Intentar abrir directamente la pantalla inicial sin sesión lleva al ingreso. Al elegir «Cerrar sesión» se vuelve al ingreso, volver atrás no muestra nada y la segunda cuenta puede entrar.

*Producto mínimo útil:* por sí sola, esta historia ya protege el sistema, permite que las dos personas del local se turnen en la misma computadora y le da la identidad de quien opera a los módulos siguientes.

### HU-2 — Proteger las cuentas (P2)

Como **dueño**, quiero que **las sesiones venzan solas, que se frenen los intentos repetidos de adivinar una contraseña y que los cambios en una cuenta corten sus sesiones** para **que una sesión olvidada, alguien probando contraseñas o una cuenta modificada no comprometan el sistema**.

**Prueba independiente:** tras 5 intentos fallidos en 15 minutos sobre una cuenta, el siguiente se rechaza aunque la contraseña sea correcta, y vuelve a aceptarse pasados 5 minutos. Una sesión con más de 12 horas desde su inicio deja de servir: la siguiente acción lleva al ingreso con un aviso y, si vuelve a entrar la misma cuenta, a la pantalla donde se estaba. Si se cambia el rol de una cuenta con sesión abierta, su siguiente acción lleva al ingreso con un aviso.

## 4. Requisitos funcionales

### HU-1 — Iniciar y cerrar sesión

**RF-1. Ingreso con credenciales** (HU-1)

- Cuando una persona envía un usuario y una contraseña que corresponden a una cuenta, el sistema deberá iniciar una sesión a nombre de esa cuenta y mostrar la pantalla inicial.
- El sistema deberá comparar el usuario sin distinguir mayúsculas de minúsculas e ignorando los espacios al inicio y al final, y la contraseña exactamente como se escribió.
- El sistema deberá ocultar los caracteres de la contraseña mientras se escriben.

**RF-2. Credenciales incorrectas** (HU-1)

- Si el usuario no existe o la contraseña no corresponde, entonces el sistema deberá rechazar el ingreso, mantener la pantalla de ingreso con el usuario escrito y la contraseña vacía, y mostrar el mismo mensaje en ambos casos: «Usuario o contraseña incorrectos».

**RF-3. Campos vacíos y largo máximo** (HU-1)

- Si el usuario o la contraseña están vacíos o formados solo por espacios, entonces el sistema deberá indicar qué campo falta sin intentar el ingreso y sin contarlo como intento fallido.
- El sistema deberá impedir escribir en los campos de usuario y contraseña más caracteres que el máximo de «Datos de una cuenta».

**RF-4. Sin sesión no hay acceso** (HU-1)

- Mientras no haya una sesión válida, el sistema deberá rechazar toda pantalla y toda operación distinta del ingreso, y llevar a la pantalla de ingreso sin mostrar información del negocio.

**RF-5. Identidad, rol y pantalla inicial** (HU-1)

- Mientras haya una sesión válida, el sistema deberá mostrar en toda pantalla interna el nombre visible y el rol (dueño o cajero) de la persona.
- El sistema deberá poder indicar, para cada sesión válida, a qué cuenta, nombre visible y rol corresponde.
- El sistema deberá mostrar la misma pantalla inicial a ambos roles, con un saludo que incluya el nombre visible, el rol y la opción «Cerrar sesión». Los módulos siguientes la amplían.

**RF-6. Sesión por navegador** (HU-1)

- El sistema deberá mantener una sesión independiente por navegador, aunque varios estén en la misma computadora: iniciar o cerrar sesión en uno no afecta a los demás.
- Mientras haya una sesión válida en un navegador, cuando en él se abra la pantalla de ingreso, el sistema deberá llevar a la pantalla inicial.

**RF-7. Cierre de sesión** (HU-1)

- Mientras haya una sesión válida, el sistema deberá ofrecer la opción «Cerrar sesión» en todas las pantallas internas.
- Cuando una persona elige «Cerrar sesión», el sistema deberá invalidar esa sesión de inmediato, sin pedir confirmación, y mostrar la pantalla de ingreso.

**RF-8. Sesión cerrada inservible** (HU-1)

- Si se intenta usar una sesión ya cerrada (volviendo atrás, desde otra pestaña abierta antes o repitiendo una operación), entonces el sistema deberá rechazarla y aplicar RF-4.
- Mientras la misma cuenta tenga otras sesiones abiertas, cuando se cierre una, el sistema deberá mantener las demás.

**RF-13. Validación de las cuentas** (HU-1)

- Si al preparar el sistema se intenta crear una cuenta que no cumple «Datos de una cuenta», incluido un usuario igual a otro existente sin distinguir mayúsculas de minúsculas, entonces el sistema deberá rechazarla e indicar qué dato no cumple.

**RF-14. Sin conexión al ingresar** (HU-1)

- Si el ingreso no se puede completar por falta de conexión, entonces el sistema deberá mostrar «No hay conexión. Inténtalo de nuevo», mantener la pantalla de ingreso con el usuario escrito y no contarlo como intento fallido.

### HU-2 — Proteger las cuentas

**RF-9. Bloqueo por intentos fallidos** (HU-2)

- Cuando una cuenta acumula 5 intentos fallidos en 15 minutos, sin un ingreso correcto entre ellos, el sistema deberá rechazar todo ingreso a esa cuenta durante 5 minutos, aunque la contraseña sea correcta, con el mensaje «Demasiados intentos. Vuelve a intentarlo en N minutos» (N redondeado hacia arriba; «1 minuto» en singular).
- El sistema deberá dejar de contar los intentos fallidos con más de 15 minutos de antigüedad.
- Mientras una cuenta está bloqueada, el sistema deberá rechazar sus intentos sin contarlos y sin alargar el bloqueo.
- Cuando una persona inicia sesión correctamente, el sistema deberá reiniciar a cero los intentos fallidos de esa cuenta.
- Cuando terminan los 5 minutos de bloqueo, el sistema deberá volver a aceptar ingresos y contar los intentos desde cero.
- Si el usuario no existe, entonces el sistema deberá responder solo con el mensaje de RF-2, sin bloqueo.

**RF-10. Vencimiento de la sesión** (HU-2)

- El sistema deberá dar por vencida una sesión a las 12 horas de iniciada, aunque haya actividad. No hay cierre por inactividad.
- Si se intenta una operación o se abre una pantalla con una sesión vencida, entonces el sistema deberá rechazarla sin aplicar ningún cambio, mostrar el aviso «Tu sesión venció. Vuelve a iniciar sesión» en la pantalla de ingreso y aplicar RF-4.

**RF-11. Regreso tras el vencimiento** (HU-2)

- Cuando la misma cuenta vuelve a iniciar sesión en ese navegador después de RF-10, el sistema deberá llevarla a la pantalla donde estaba, si su cuenta puede verla; si no, a la pantalla inicial.
- Cuando entra otra cuenta después de RF-10, o cualquier cuenta después de RF-4, RF-8 o RF-12, el sistema deberá llevarla a la pantalla inicial.

**RF-12. Cambios en la cuenta durante la sesión** (HU-2)

- Si la cuenta de una sesión se elimina o cambia su rol o su contraseña, entonces el sistema deberá dar por terminadas todas sus sesiones: la siguiente pantalla u operación se rechaza sin aplicar ningún cambio, se muestra el aviso «Tu sesión terminó. Vuelve a iniciar sesión» en la pantalla de ingreso y se aplica RF-4.

## 5. Requisitos no funcionales

- **RNF-1. Contraseñas protegidas.** Las contraseñas nunca se guardan, se registran ni se muestran en claro, ni siquiera a quien administra el sistema.
- **RNF-2. Sin pistas sobre las cuentas.** Un intento fallido no revela si el usuario existe (RF-2). El mensaje de bloqueo (RF-9) solo aparece para cuentas existentes; se acepta porque el sistema funciona en un único local.
- **RNF-3. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-4. Rapidez.** En el 95 % de los ingresos y cierres de sesión hechos desde la computadora del local, el resultado aparece en menos de 2 segundos. No cuenta el primer ingreso tras un período sin uso del sistema, mientras el servicio se reactiva: ese ingreso puede tardar alrededor de un minuto.
- **RNF-5. Uso con teclado.** El ingreso se puede completar solo con teclado: pasar de un campo a otro y enviar con Intro.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Usuario con mayúsculas o espacios alrededor («  Ana ») | Se acepta como «ana» (RF-1). |
| Contraseña correcta salvo una mayúscula | Se rechaza (RF-1, RF-2). |
| Contraseña con espacios al inicio o al final | Se compara tal cual, sin recortar (RF-1). |
| Usuario o contraseña vacíos o formados solo por espacios | Se indica el campo faltante y no cuenta como intento (RF-3). |
| Texto más largo que el máximo en usuario o contraseña | No se pueden escribir más caracteres (RF-3). |
| Crear «ana» cuando ya existe «Ana» | Se rechaza al preparar el sistema (RF-13). |
| Usuario inexistente probado muchas veces | Siempre «Usuario o contraseña incorrectos»; no se bloquea nada (RF-9). |
| Intento con la contraseña correcta durante un bloqueo | Se rechaza con el mensaje de bloqueo (RF-9). |
| Intentos durante un bloqueo | No suman ni alargan el bloqueo (RF-9). |
| 4 fallos, un ingreso correcto y 4 fallos más | No hay bloqueo: el ingreso correcto reinició la cuenta (RF-9). |
| 4 fallos y el quinto 20 minutos después | No hay bloqueo: los primeros ya no cuentan (RF-9). |
| Volver atrás después de cerrar sesión | No se muestra información ni se puede operar (RF-8). |
| Pestaña abierta antes del cierre de sesión | Su siguiente acción lleva al ingreso (RF-8). |
| Sesión que vence a mitad de una operación | La operación no se aplica; se avisa y se vuelve al ingreso (RF-10). |
| Tras el vencimiento entra otra persona en la misma computadora | Va a la pantalla inicial, no a la de la persona anterior (RF-11). |
| Se cambia el rol, la contraseña o se elimina una cuenta con sesión abierta | Su siguiente acción lleva al ingreso con aviso (RF-12). |
| Ingreso a la pantalla de ingreso con sesión ya iniciada | Se va a la pantalla inicial (RF-6). |
| Dos navegadores en la misma computadora | Cada uno tiene su propia sesión (RF-6). |
| Misma cuenta abierta en dos equipos | Ambas sesiones funcionan; cerrar una no cierra la otra (RF-8). |
| Se pierde la conexión al enviar el ingreso | Se avisa, se queda en el ingreso y no cuenta como intento fallido (RF-14). |

## 7. Fuera de alcance

- Crear, editar, desactivar o eliminar cuentas desde la interfaz: las cuentas se crean al preparar el sistema (ver «Preparación de las cuentas»).
- Recuperar u olvidar la contraseña, y cambiarla desde la interfaz.
- Ingreso con PIN, tarjeta, huella, código QR o cuentas externas (Google, etc.).
- Opción «Recordarme» o sesiones de más de 12 horas.
- Verificación en dos pasos.
- Historial o auditoría de inicios y cierres de sesión.
- Permisos de cada rol dentro de cada módulo: los define la especificación de ese módulo.
- Qué pasa con el trabajo no guardado de otro módulo (por ejemplo, una venta a medio preparar) al cerrar sesión o al vencer: lo decide la especificación de ese módulo.

## 8. Criterios de finalización

- Una persona con cuenta inicia sesión en menos de 15 segundos desde que ve la pantalla de ingreso, salvo en el primer ingreso tras un período sin uso del sistema (RNF-4).
- Al abrir la pantalla inicial sin sesión, con la sesión cerrada, vencida o terminada por un cambio en la cuenta, en el 100 % de los casos no se ve información del negocio y se termina en la pantalla de ingreso.
- Después de cerrar sesión, volver atrás no permite ver ni hacer nada sin iniciar sesión otra vez, y otra cuenta puede entrar en la misma computadora.
- Tras 5 intentos fallidos en 15 minutos, el siguiente se rechaza aunque la contraseña sea correcta, y pasados 5 minutos el ingreso vuelve a funcionar.
- Un intento con un usuario inexistente y otro con una contraseña incorrecta muestran exactamente el mismo mensaje.
- Una sesión deja de servir a las 12 horas de iniciada y, si vuelve a entrar la misma cuenta, regresa a la pantalla donde estaba.
- Una cuenta que no cumple «Datos de una cuenta» no se puede crear.
- En toda pantalla interna se ven el nombre y el rol de la persona y la opción «Cerrar sesión».

## 9. Dudas abiertas

Ninguna. La persona pidió resolver las dudas con las recomendaciones propuestas (ver «Aclaraciones»).

## 10. Aclaraciones

### 2026-10-24

La persona respondió a la primera pregunta: «sigue con todas tus recomendaciones incluyendo las dudas». Por eso las preguntas 2 a 10 no se le hicieron una a una: se resolvieron con la recomendación indicada.

- **P:** ¿Quiénes pueden iniciar sesión y con qué roles? → **R:** Dueño y cajero. Acceso registra el rol y cada módulo decide sus permisos. (Aplicado en «Usuarios», RF-5 y «Fuera de alcance».)
- **P:** ¿Cómo se crean las cuentas? → **R:** Al preparar el sistema, no desde la interfaz; la gestión de cuentas queda fuera de alcance. (Aplicado en «Usuarios» y «Fuera de alcance».)
- **P:** ¿Con qué se identifica una persona? → **R:** Usuario y contraseña. El usuario no distingue mayúsculas ni espacios alrededor; la contraseña se compara exacta. (Aplicado en RF-1 y «Casos límite».)
- **P:** ¿Qué mensaje se muestra ante credenciales incorrectas? → **R:** El mismo, exista o no el usuario: «Usuario o contraseña incorrectos». (Aplicado en RF-2 y RNF-2.)
- **P:** ¿Se limitan los intentos fallidos? → **R:** Sí: 5 fallos seguidos bloquean la cuenta durante 5 minutos; un ingreso correcto reinicia el conteo y los usuarios inexistentes no se bloquean. (Aplicado en RF-9, RNF-2 y HU-3.)
- **P:** ¿Cuánto dura una sesión? → **R:** 12 horas desde el inicio, sin cierre por inactividad, para no interrumpir la atención entre ventas. (Aplicado en RF-10 y HU-3.)
- **P:** ¿Puede una misma cuenta tener varias sesiones a la vez? → **R:** Sí; cerrar una no cierra las demás. (Aplicado en RF-8.)
- **P:** ¿Cómo se cambia de persona en la computadora compartida? → **R:** Cerrando sesión; con una sesión iniciada, la pantalla de ingreso lleva a la pantalla inicial. El cierre no pide confirmación. (Aplicado en RF-6 y RF-7.)
- **P:** ¿Qué pasa si la sesión vence durante una operación? → **R:** La operación no se aplica, se avisa y se vuelve al ingreso; al reingresar se regresa a la pantalla donde se estaba. El trabajo no guardado de otros módulos lo decide cada módulo. (Aplicado en RF-10, RF-11 y «Fuera de alcance».)
- **P:** ¿Se puede recuperar o cambiar la contraseña desde el sistema? → **R:** No en esta especificación; queda fuera de alcance. (Aplicado en «Fuera de alcance».)

**Revisión de QA.** La persona pidió decidir cada hallazgo con la recomendación propuesta: «decide todos en base a tus recomendaciones». Al fusionar historias, la antigua HU-3 pasó a ser HU-2, y las referencias a HU-3 de las entradas anteriores corresponden hoy a HU-2.

- **P:** (Hallazgo 1) ¿Quién crea las cuentas y cómo se entregan las contraseñas iniciales? → **R:** Las crea quien instala el sistema con los datos del dueño; el dueño elige las contraseñas iniciales, las entrega en privado y no quedan escritas en archivos ni documentos del proyecto. (Aplicado en «Preparación de las cuentas».)
- **P:** (Hallazgo 2) ¿Qué es la pantalla inicial? → **R:** La misma para ambos roles: saludo con el nombre visible, el rol y «Cerrar sesión»; los módulos siguientes la amplían. (Aplicado en RF-5.)
- **P:** (Hallazgo 3) ¿Cuál es el límite de una sesión: la computadora o el navegador? → **R:** El navegador: cada uno tiene su propia sesión, aunque estén en la misma computadora. (Aplicado en RF-6 y «Casos límite».)
- **P:** (Hallazgo 4) ¿Qué significa «5 intentos fallidos seguidos»? → **R:** 5 fallos en 15 minutos, sin un ingreso correcto entre ellos; los fallos más antiguos dejan de contar. (Aplicado en RF-9, HU-2, «Casos límite» y «Criterios de finalización».)
- **P:** (Hallazgo 5) ¿Cómo se comprueba que cada operación queda asociada a la cuenta y al rol? → **R:** El requisito pasa a ser que el sistema pueda indicar la cuenta, el nombre visible y el rol de cada sesión válida; el uso por los demás módulos queda como contexto. (Aplicado en RF-5 y «Contexto y objetivo».)
- **P:** (Hallazgo 6) ¿El regreso a la pantalla anterior aplica solo al vencimiento? → **R:** Sí; tras RF-4, RF-8 o RF-12 se va a la pantalla inicial. (Aplicado en RF-11.)
- **P:** (Hallazgo 7) ¿Cómo sirve sola la P1 si para cambiar de cuenta hace falta cerrar sesión? → **R:** Iniciar y cerrar sesión forman una sola historia P1 (HU-1); proteger las cuentas pasa a ser HU-2 (P2). RF-7 y RF-8 pasan a HU-1. (Aplicado en «Historias de usuario», RF-7, RF-8 y RF-9 a RF-12.)
- **P:** (Hallazgo 8) ¿Pueden existir «Ana» y «ana»? → **R:** No: el usuario es único sin distinguir mayúsculas y la cuenta repetida se rechaza al prepararla. (Aplicado en «Datos de una cuenta», RF-13 y «Casos límite».)
- **P:** (Hallazgo 9) ¿Una contraseña de solo espacios cuenta como vacía? → **R:** Sí, y ninguna cuenta puede tener una contraseña así. (Aplicado en RF-3, «Datos de una cuenta» y «Casos límite».)
- **P:** (Hallazgo 10) ¿Qué pasa con los intentos durante un bloqueo? → **R:** Se rechazan sin contarse y sin alargar el bloqueo. (Aplicado en RF-9 y «Casos límite».)
- **P:** (Hallazgo 11) ¿A dónde va otra persona que entra tras el vencimiento? → **R:** A la pantalla inicial; solo la misma cuenta, en el mismo navegador, vuelve a donde estaba. (Aplicado en RF-11 y «Casos límite».)
- **P:** (Hallazgo 12) ¿Qué pasa si se elimina una cuenta o cambia su rol con una sesión abierta? → **R:** Todas sus sesiones terminan, también si cambia su contraseña, con el aviso «Tu sesión terminó. Vuelve a iniciar sesión». (Aplicado en RF-12, HU-2, «Casos límite» y «Criterios de finalización».)
- **P:** (Hallazgo 13) ¿Qué largo y caracteres admiten los datos de una cuenta? → **R:** Usuario de 3 a 30 caracteres (a–z, dígitos, punto, guion y guion bajo), contraseña de 8 a 64 y nombre visible de 1 a 40; los campos del ingreso no admiten más del máximo. (Aplicado en «Datos de una cuenta», RF-3, RF-13 y «Casos límite».)
- **P:** (Hallazgo 14) ¿Qué RF cubre la pérdida de conexión al ingresar? → **R:** Uno nuevo, con el aviso «No hay conexión. Inténtalo de nuevo». (Aplicado en RF-14 y «Casos límite».)
- **P:** (Hallazgo 15) ¿Qué significa «con conexión normal» en RNF-4? → **R:** Se mide como el 95 % de los ingresos y cierres hechos desde la computadora del local. (Aplicado en RNF-4.)
- **P:** (Hallazgo 16) ¿Sobre qué pantallas se mide el 100 %? → **R:** Sobre la pantalla inicial, la única pantalla interna de esta especificación, en los cuatro casos: sin sesión, cerrada, vencida y terminada. (Aplicado en «Criterios de finalización».)
- **P:** (Formato de RF-8) ¿Qué forma EARS corresponde a las sesiones de la misma cuenta? → **R:** La de estado («Mientras …»). (Aplicado en RF-8.)

**Planificación.** El servicio de la API usará el plan gratuito de Render, que se suspende tras 15 minutos sin tráfico y tarda alrededor de un minuto en reactivarse.

- **P:** Con el plan gratuito, el primer ingreso tras un período sin uso no cumple RNF-4 ni el criterio de 15 segundos. ¿Se corrige la especificación o el plan? → **R:** La especificación: ese primer ingreso queda fuera de ambos límites. (Aplicado en RNF-4 y «Criterios de finalización».)

**Implementación de Preparación y Base común (modo delegado).** La persona delegó sus decisiones hasta terminar la Base común: «Delego 001-acceso hasta terminar la Base común». Las decisiones de negocio se registran aquí; quedan aprobadas al fusionar el PR de definición.

- **Decisión delegada (T009):** ¿Con qué textos se indica el dato que no cumple al crear una cuenta (RF-13) o un campo demasiado largo en el ingreso? → **R:** «El usuario debe tener de 3 a 30 caracteres: letras de la «a» a la «z» (sin tildes ni «ñ»), dígitos, punto, guion o guion bajo», «La contraseña debe tener de 8 a 64 caracteres», «La contraseña no puede estar formada solo por espacios», «El nombre visible debe tener de 1 a 40 caracteres» y «El rol debe ser «owner» (dueño) o «cashier» (cajero)»; en el ingreso, «El usuario tiene como máximo 30 caracteres» y «La contraseña tiene como máximo 64 caracteres», que la interfaz no llega a mostrar porque impide escribir más (RF-3). **Motivo:** cada texto nombra el dato y repite la regla de «Datos de una cuenta», sin mostrar el valor rechazado. **Alternativa descartada:** un mensaje genérico («Datos inválidos»), que no indica qué dato no cumple como pide RF-13. (Aplicado en `packages/contracts/src/auth.ts`.)
- **Decisión delegada (T013):** ¿Qué mensaje general acompaña a los campos que no cumplen (`VALIDATION_ERROR`)? → **R:** «Revisa los datos»; la interfaz muestra el mensaje de cada campo (RF-3), y el general solo cuando la petición entera no se puede leer. **Motivo:** es breve y no repite el aviso del campo. **Alternativa descartada:** repetir en el mensaje general el aviso del primer campo, que se mostraría dos veces. (Aplicado en `apps/api/src/shared/http/errors.ts`.)
