---
version: 1
slug: "src-modules-auth-pages-loginpage-tsx"
primary_target: "src/modules/auth/pages/LoginPage.tsx"
related_targets: ["src/modules/auth/components/LoginForm.tsx","src/modules/auth/components/AuthenticatedLayout.tsx","src/modules/auth/pages/HomePage.tsx"]
---

# Ingreso y base interna

## Alcance y modo

Operate. Pantalla de ingreso (`/ingresar`) con todos sus estados, y la base que heredan las pantallas internas: cabecera de sesión (`AuthenticatedLayout`) y pantalla inicial (`HomePage`). Presencia de portada en el ingreso por pedido de la persona («más como una landing»), sin textos nuevos.

## Audiencia y tarea

Dueño y cajero en la computadora compartida del mostrador, con teclado y ratón; repiten el ingreso varias veces al día. También es lo primero que ve quien evalúa el proyecto. Tarea: ingresar en menos de 15 s y entender cada error a la primera; dentro, saber siempre quién opera y con qué rol.

## Restricciones

- Textos fijados en `specs/001-acceso/spec.md` y comportamiento sin cambios; único texto de marca: «Kofi POS».
- Sin información del negocio antes del ingreso (RF-4).
- Uso completo con teclado (RNF-5), foco visible.
- Color principal `#3E5879` y crema ligero `#FBF7EF` en lugar de blanco (fijados por la persona).

## Direction contract

THESIS: El ingreso es la puerta del local: un panel azul con el nombre y un borde tejido de aguayo que firma Kofi; rechaza la tarjeta blanca centrada sobre gris del estándar.

OWN-WORLD: Azul `#3E5879` (oscuro `#2E4360`) en panel y barra lateral; crema ligero `#FBF7EF` de fondo y `#FFFDF8` en campos; tira de aguayo vertical de 64 px con franjas naranja `#E07A2E`, verde `#2F7D5B`, crema `#FBF7EF` (la misma del fondo: la persona pidió crema ligero en lugar de blanco, y el `#F4F4F2` del boceto era casi blanco) y banda de rombos magenta `#B0306A`; texto `#1F2430`; rojo `#B3261E` solo para errores y bloqueos. Figtree, esquinas de 8 px, sin sombras decorativas.

STORY: Quien llega reconoce Kofi por el panel y la tira, ve un solo formulario, ingresa; dentro encuentra su nombre y rol en la barra lateral y los módulos de su rol, cada uno con su color de franja.

FIRST VIEWPORT: A 1440 px: panel azul de 600 px a toda altura con «Kofi POS» a 96 px en crema, arriba a la izquierda; tira tejida de 64 px en su borde derecho; a la derecha, sobre crema, «Ingresar» a 40 px y el formulario de 440 px centrado en vertical, botón azul de 56 px. Bajo 900 px el panel pasa a franja superior y la tira a horizontal.

FORM: Panel de marca con borde tejido, candidata 2 de la ronda combinada pedida por la persona (base segura y un toque audaz); seed:3aea6bc95333cb6c

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones tomadas en el build

- Color de cada módulo en la pantalla inicial: por destino, no por orden, para que no cambie si se agrega un enlace o si el rol oculta alguno. Menú (`/menu`, `/menu/administrar`) verde, Nueva venta (`/ventas/nueva`) naranja, Resumen (`/resumen`) magenta e Historial (`/ventas`) azul. Una pantalla futura toma el color de su módulo.
- La tira se ve completa desde el primer fotograma: sin animación de entrada, porque el ingreso se repite varias veces al día.
