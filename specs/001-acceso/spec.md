# SPEC-001 — Acceso

Estado: aprobada, pendiente de revisión · Fecha: 2026-10-24

Reglas globales (moneda, zona horaria, un solo local): ver [`docs/business-rules.md`](../../docs/business-rules.md#reglas-globales).

## 1. Contexto y objetivo

Kofi es una cafetería pequeña, atendida por una o dos personas y con una sola computadora en el local, compartida (ver [`docs/business-rules.md`](../../docs/business-rules.md#contexto)). Acceso es el primer módulo de Kofi POS y la puerta de entrada a todos los demás: Menú, Ventas, Dashboard e Historial.

Objetivo: que solo las personas del local con una cuenta puedan usar el sistema, que el sistema sepa en todo momento quién lo está usando y con qué rol, y que en la computadora compartida se pueda cambiar de persona sin dejar una sesión abierta.

## 2. Usuarios

| Usuario | Descripción |
| --- | --- |
| **Dueño** | Administra el negocio. En los módulos siguientes tendrá acceso a la administración del menú y a los reportes. |
| **Cajero** | Atiende el mostrador y registra ventas. |

Acceso identifica a la persona y su rol. Lo que cada rol puede hacer dentro de un módulo lo define la especificación de ese módulo.

Las cuentas (usuario, contraseña, nombre visible y rol) se crean al preparar el sistema, no desde la interfaz (ver «Fuera de alcance»).

## 3. Historias de usuario, priorizadas

### HU-1 — Iniciar sesión (P1)

Como **persona del local (dueño o cajero)**, quiero **iniciar sesión con mi usuario y contraseña** para **usar el sistema con mi identidad y que nadie sin cuenta pueda usarlo**.

**Prueba independiente:** con una cuenta preparada, abrir el sistema sin sesión muestra la pantalla de ingreso; con credenciales incorrectas aparece un mensaje de error y se sigue en el ingreso; con las correctas se llega a la pantalla inicial, donde se ven el nombre y el rol de la persona. Intentar abrir directamente cualquier otra pantalla sin sesión lleva al ingreso.

*Producto mínimo útil:* por sí sola, esta historia ya protege el sistema y le da la identidad de quien opera a los módulos siguientes.

### HU-2 — Cerrar sesión (P2)

Como **persona del local**, quiero **cerrar mi sesión** para **que la siguiente persona que use la computadora compartida no opere con mi cuenta**.

**Prueba independiente:** con una sesión iniciada, elegir «Cerrar sesión» lleva a la pantalla de ingreso; después, ni volver atrás ni abrir directamente una pantalla interna muestra información ni permite operar sin volver a iniciar sesión.

### HU-3 — Proteger las cuentas (P3)

Como **dueño**, quiero que **las sesiones venzan solas y que se frenen los intentos repetidos de adivinar una contraseña** para **que una sesión olvidada o alguien probando contraseñas no comprometa el sistema**.

**Prueba independiente:** tras 5 intentos fallidos seguidos sobre una cuenta, el sexto se rechaza aunque la contraseña sea correcta, y vuelve a aceptarse pasados 5 minutos. Una sesión con más de 12 horas desde su inicio deja de servir: la siguiente acción lleva al ingreso con un aviso y, al volver a ingresar, a la pantalla donde se estaba.

## 4. Requisitos funcionales

### HU-1 — Iniciar sesión

**RF-1. Ingreso con credenciales** (HU-1)

- Cuando una persona envía un usuario y una contraseña que corresponden a una cuenta, el sistema deberá iniciar una sesión a nombre de esa cuenta y mostrar la pantalla inicial.
- El sistema deberá comparar el usuario sin distinguir mayúsculas de minúsculas e ignorando los espacios al inicio y al final, y la contraseña exactamente como se escribió.
- El sistema deberá ocultar los caracteres de la contraseña mientras se escriben.

**RF-2. Credenciales incorrectas** (HU-1)

- Si el usuario no existe o la contraseña no corresponde, entonces el sistema deberá rechazar el ingreso, mantener la pantalla de ingreso con el usuario escrito y la contraseña vacía, y mostrar el mismo mensaje en ambos casos: «Usuario o contraseña incorrectos».

**RF-3. Campos vacíos** (HU-1)

- Si el usuario o la contraseña están vacíos (o el usuario solo tiene espacios), entonces el sistema deberá indicar qué campo falta sin intentar el ingreso y sin contarlo como intento fallido.

**RF-4. Sin sesión no hay acceso** (HU-1)

- Mientras no haya una sesión válida, el sistema deberá rechazar toda pantalla y toda operación distinta del ingreso, y llevar a la pantalla de ingreso sin mostrar información del negocio.

**RF-5. Identidad y rol en la sesión** (HU-1)

- Mientras haya una sesión válida, el sistema deberá mostrar el nombre visible y el rol (dueño o cajero) de la persona.
- El sistema deberá asociar cada operación hecha con una sesión a la cuenta y al rol de esa sesión, para que los demás módulos puedan registrar quién la hizo y aplicar sus permisos.

**RF-6. Ingreso con sesión ya iniciada** (HU-1)

- Mientras haya una sesión válida en la computadora, cuando se abra la pantalla de ingreso el sistema deberá llevar a la pantalla inicial. Para entrar con otra cuenta primero se cierra la sesión (RF-7).

### HU-2 — Cerrar sesión

**RF-7. Cierre de sesión** (HU-2)

- Mientras haya una sesión válida, el sistema deberá ofrecer la opción «Cerrar sesión» en todas las pantallas internas.
- Cuando una persona elige «Cerrar sesión», el sistema deberá invalidar esa sesión de inmediato, sin pedir confirmación, y mostrar la pantalla de ingreso.

**RF-8. Sesión cerrada inservible** (HU-2)

- Si se intenta usar una sesión ya cerrada (volviendo atrás, desde otra pestaña abierta antes o repitiendo una operación), entonces el sistema deberá rechazarla y aplicar RF-4.
- Donde la misma cuenta tenga sesiones abiertas en otros equipos o navegadores, el sistema deberá cerrar solo la sesión elegida y mantener las demás.

### HU-3 — Proteger las cuentas

**RF-9. Bloqueo por intentos fallidos** (HU-3)

- Cuando una cuenta acumula 5 intentos fallidos seguidos, el sistema deberá rechazar todo ingreso a esa cuenta durante 5 minutos, aunque la contraseña sea correcta, con el mensaje «Demasiados intentos. Vuelve a intentarlo en N minutos» (N redondeado hacia arriba).
- Cuando una persona inicia sesión correctamente, el sistema deberá reiniciar a cero los intentos fallidos de esa cuenta.
- Cuando terminan los 5 minutos de bloqueo, el sistema deberá volver a aceptar ingresos y contar los intentos desde cero.
- Si el usuario no existe, entonces el sistema deberá responder solo con el mensaje de RF-2, sin bloqueo.

**RF-10. Vencimiento de la sesión** (HU-3)

- El sistema deberá dar por vencida una sesión a las 12 horas de iniciada, aunque haya actividad. No hay cierre por inactividad.
- Si se intenta una operación o se abre una pantalla con una sesión vencida, entonces el sistema deberá rechazarla sin aplicar ningún cambio, mostrar el aviso «Tu sesión venció. Vuelve a iniciar sesión» en la pantalla de ingreso y aplicar RF-4.

**RF-11. Regreso tras el vencimiento** (HU-3)

- Cuando una persona vuelve a iniciar sesión después de RF-10, el sistema deberá llevarla a la pantalla donde estaba, en lugar de la pantalla inicial, si su cuenta puede verla; si no, a la pantalla inicial.

## 5. Requisitos no funcionales

- **RNF-1. Contraseñas protegidas.** Las contraseñas nunca se guardan, se registran ni se muestran en claro, ni siquiera a quien administra el sistema.
- **RNF-2. Sin pistas sobre las cuentas.** Un intento fallido no revela si el usuario existe (RF-2). El mensaje de bloqueo (RF-9) solo aparece para cuentas existentes; se acepta porque el sistema funciona en un único local.
- **RNF-3. Idioma.** Todos los textos y mensajes para la persona están en español.
- **RNF-4. Rapidez.** Con conexión normal, el resultado del ingreso o del cierre de sesión aparece en menos de 2 segundos.
- **RNF-5. Uso con teclado.** El ingreso se puede completar solo con teclado: pasar de un campo a otro y enviar con Intro.

## 6. Casos límite

| Caso | Comportamiento esperado |
| --- | --- |
| Usuario con mayúsculas o espacios alrededor («  Ana ») | Se acepta como «ana» (RF-1). |
| Contraseña correcta salvo una mayúscula | Se rechaza (RF-1, RF-2). |
| Contraseña con espacios al inicio o al final | Se compara tal cual, sin recortar (RF-1). |
| Usuario o contraseña vacíos | Se indica el campo faltante y no cuenta como intento (RF-3). |
| Usuario inexistente probado muchas veces | Siempre «Usuario o contraseña incorrectos»; no se bloquea nada (RF-9). |
| Sexto intento con la contraseña correcta durante un bloqueo | Se rechaza con el mensaje de bloqueo (RF-9). |
| 4 fallos, un ingreso correcto y 4 fallos más | No hay bloqueo: el ingreso correcto reinició la cuenta (RF-9). |
| Volver atrás después de cerrar sesión | No se muestra información ni se puede operar (RF-8). |
| Pestaña abierta antes del cierre de sesión | Su siguiente acción lleva al ingreso (RF-8). |
| Sesión que vence a mitad de una operación | La operación no se aplica; se avisa y se vuelve al ingreso (RF-10). |
| Ingreso a la pantalla de ingreso con sesión ya iniciada | Se va a la pantalla inicial (RF-6). |
| Misma cuenta abierta en dos equipos | Ambas sesiones funcionan; cerrar una no cierra la otra (RF-8). |
| Se pierde la conexión al enviar el ingreso | Se muestra un error de conexión, se queda en el ingreso y no cuenta como intento fallido. |

## 7. Fuera de alcance

- Crear, editar, desactivar o eliminar cuentas desde la interfaz: las cuentas se crean al preparar el sistema.
- Recuperar u olvidar la contraseña, y cambiarla desde la interfaz.
- Ingreso con PIN, tarjeta, huella, código QR o cuentas externas (Google, etc.).
- Opción «Recordarme» o sesiones de más de 12 horas.
- Verificación en dos pasos.
- Historial o auditoría de inicios y cierres de sesión.
- Permisos de cada rol dentro de cada módulo: los define la especificación de ese módulo.
- Qué pasa con el trabajo no guardado de otro módulo (por ejemplo, una venta a medio preparar) al cerrar sesión o al vencer: lo decide la especificación de ese módulo.

## 8. Criterios de finalización

- Una persona con cuenta inicia sesión en menos de 15 segundos desde que ve la pantalla de ingreso.
- En el 100 % de las pantallas internas que se prueban sin sesión, con sesión cerrada o con sesión vencida, no se ve información del negocio y se termina en la pantalla de ingreso.
- Después de cerrar sesión, volver atrás no permite ver ni hacer nada sin iniciar sesión otra vez.
- Tras 5 intentos fallidos seguidos, el sexto intento se rechaza aunque la contraseña sea correcta, y pasados 5 minutos el ingreso vuelve a funcionar.
- Un intento con un usuario inexistente y otro con una contraseña incorrecta muestran exactamente el mismo mensaje.
- Una sesión deja de servir a las 12 horas de iniciada y, al volver a ingresar, la persona regresa a la pantalla donde estaba.
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
