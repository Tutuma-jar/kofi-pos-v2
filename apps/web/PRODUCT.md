# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Dueño:** administra el negocio. Mantiene el menú (categorías, productos y precios en bolivianos) y consulta el resumen del día y del mes y el historial de ventas.
- **Cajero:** atiende el mostrador y registra las ventas. Consulta el menú vigente para responder a la clientela qué hay y cuánto cuesta.

El local lo atienden una o dos personas, que se turnan en la misma computadora: cada una inicia sesión con su cuenta y la cierra al terminar para que la siguiente no opere con ella. Lo que puede hacer cada rol lo fija la especificación de cada módulo (`specs/NNN-<nombre>/spec.md`).

## Product Purpose

Kofi POS es el sistema web de punto de venta de Kofi, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia. Permite iniciar y cerrar sesión, administrar el menú, registrar ventas pagadas, ver el resumen de ventas del día y del mes y consultar el historial.

Es un proyecto académico y de portafolio: lo evalúan docentes y quien revise el portafolio, y no se usará en un local real. El éxito es que cada pantalla permita completar el trabajo del mostrador de forma rápida, exacta y comprensible para quien la evalúa, y que demuestre un desarrollo guiado por especificaciones.

## Positioning

Está modelado a la medida de un negocio gastronómico pequeño de Bolivia, no de una cadena: una sola sucursal, importes en bolivianos, cobro en efectivo y con QR sin factura, y una jornada que es el día calendario en hora de Bolivia. Cada comportamiento traza a un requisito escrito en `specs/`.

## Operating Context

- Una computadora compartida en el mostrador, con conexión, que se opera con teclado y ratón o touchpad.
- Se usa mientras se atiende a la clientela: armar una venta, elegir el medio de pago y registrarla son operaciones de pocos segundos.
- Cambios de persona frecuentes en la misma computadora. Las sesiones vencen a las 12 horas y los intentos fallidos repetidos bloquean temporalmente la cuenta.
- El primer ingreso tras un período sin uso puede tardar alrededor de un minuto mientras el servicio se reactiva.
- Para revisar cada pantalla en desarrollo hay escenarios con datos ficticios: `?escenarios=<módulo>`.

## Capabilities and Constraints

- Módulos: Acceso (`specs/001-acceso/`), Menú (`specs/002-menu/`), Ventas (`specs/003-ventas/`), Dashboard (`specs/004-dashboard/`) e Historial y reportes (`specs/005-historial/`).
- La interfaz no calcula importes, totales ni métricas oficiales: los recibe de la API (constitución, principio 3).
- Todos los textos están en español. Los textos fijados en una especificación (etiquetas, mensajes, avisos) no se cambian en un cambio de presentación; cambiarlos lleva al ciclo de especificación.
- Importes en bolivianos con el formato de las especificaciones, por ejemplo «Bs 12,50». Fechas y horas en hora de Bolivia (`America/La_Paz`).
- Un cambio de presentación no cambia comportamiento, rutas, contrato ni reglas de negocio (constitución, principio 2). Las dependencias nuevas, como fuentes o bibliotecas, se justifican en su PR.
- Stack fijado por la constitución: React con Vite, compilado a archivos estáticos y desplegado en Render.

## Brand Commitments

- Nombre: «Kofi» para la cafetería y «Kofi POS» para el sistema. No hay logo, eslogan ni otros activos de marca.
- Voz de los mensajes: español con tuteo, frases cortas y directas que dicen qué pasó y qué hacer, por ejemplo «Tu sesión terminó. Vuelve a iniciar sesión».

## Evidence on Hand

- Los menús, ventas y cuentas que aparecen en desarrollo son datos ficticios de los escenarios (`apps/web/src/modules/*/dev/`).
- No hay clientes, testimonios, fotografías del local, cifras reales ni logo. No se deben inventar.

## Product Principles

1. **El mostrador primero:** la operación frecuente (vender, consultar un precio) se completa en pocos pasos y sin dudas, mientras se atiende.
2. **Cifras exactas y legibles:** los importes y totales que entrega la API se muestran tal cual, al centavo, y se leen de un vistazo.
3. **Identidad siempre visible:** en la computadora compartida queda claro quién está operando y con qué rol, y cómo cerrar sesión.
4. **Fiel a la especificación:** cada pantalla respeta sus textos y su comportamiento especificados; el diseño los presenta, no los reinterpreta.

## Accessibility & Inclusion

- Uso completo con teclado en cada flujo especificado: ingreso (SPEC-001, RNF-5), edición del menú (SPEC-002, RNF-4), venta (SPEC-003, RNF-4), resumen (SPEC-004, RNF-4) e historial (SPEC-005, RNF-4).
- Interfaz en español (`lang="es"`). No se fijó un estándar formal adicional.
