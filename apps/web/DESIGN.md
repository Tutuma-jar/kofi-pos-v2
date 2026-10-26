---
name: Kofi POS
description: Punto de venta de Kofi, una cafetería pequeña de Bolivia; azul de mostrador, crema y una tira tejida de aguayo.
colors:
  brand: "#3e5879"
  brand-deep: "#2e4360"
  brand-tint: "#e4e9ef"
  on-brand: "#fbf7ef"
  on-brand-muted: "#ccd5e1"
  cream: "#fbf7ef"
  cream-deep: "#f3ecdf"
  field: "#fffdf8"
  line: "#d6cfc2"
  line-strong: "#8f8778"
  ink: "#1f2430"
  ink-muted: "#565b66"
  error: "#b3261e"
  error-tint: "#f8e6e2"
  weave-orange: "#e07a2e"
  weave-green: "#2f7d5b"
  weave-magenta: "#b0306a"
  weave-light: "#fbf7ef"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3.5rem, 6.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  display-compact:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  feature:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  control:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
  body:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
rounded:
  md: "0.5rem"
  pill: "999px"
spacing:
  "1": "0.5rem"
  "2": "1rem"
  "3": "1.5rem"
  "4": "2rem"
  "6": "3rem"
  "8": "4rem"
  "12": "6rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 1.5rem"
    height: "3.5rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
  button-secondary:
    backgroundColor: "{colors.field}"
    textColor: "{colors.brand}"
    rounded: "{rounded.md}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand}"
  button-on-brand:
    textColor: "{colors.on-brand}"
    rounded: "{rounded.md}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-on-brand-hover:
    backgroundColor: "{colors.on-brand}"
    textColor: "{colors.brand-deep}"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3.5rem"
  role-chip:
    backgroundColor: "{colors.on-brand}"
    textColor: "{colors.brand-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.625rem"
  module-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "1rem"
    height: "4.5rem"
  module-row-hover:
    backgroundColor: "{colors.cream-deep}"
    textColor: "{colors.ink}"
  module-row-feature:
    textColor: "{colors.ink}"
    typography: "{typography.feature}"
    padding: "1rem"
    height: "6rem"
  notice:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  alert:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  session-bar:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    padding: "3rem 2rem"
    width: "16rem"
---

# Design System: Kofi POS

## Overview

**Creative North Star: "La puerta tejida del mostrador"**

Kofi POS se presenta como la puerta de un local pequeño: un bloque de azul de mostrador (el color fijado por la persona) que lleva el nombre o la identidad de quien opera, firmado en su borde por una tira tejida de aguayo, y al lado una superficie crema donde ocurre el trabajo. La firma es una sola y es fija: la tira. Todo lo demás es sobrio, plano y legible, porque la pantalla se usa mientras se atiende a la clientela y se vuelve a abrir varias veces al día.

La densidad es generosa y táctil: controles altos (56 px en formularios y acciones principales), texto base algo mayor que 16 px y una sola familia tipográfica, Figtree, servida desde el proyecto. No hay sombras, degradados ni fotografía; la profundidad sale de bloques de color y bordes finos. El crema ligero reemplaza al blanco en toda la interfaz. El único texto de marca es «Kofi POS»: no hay logo, eslogan ni otros activos.

Alcance actual: el sistema está construido en el ingreso, la barra de sesión y la pantalla inicial. Las pantallas de menú, ventas, resumen e historial todavía no tienen diseño propio; heredan los estilos base (tipografía, controles, tablas, avisos) y la barra de sesión, y tomarán el color de su módulo cuando se diseñen.

**Key Characteristics:**
- Bloque azul a toda altura con la tira de aguayo de 64 px en su borde; crema a la derecha.
- Una sola familia (Figtree 400/600/700/800), títulos en 800.
- Plano: sin sombras; bordes de 1 a 2 px y cambios de tono como estado.
- Esquinas de 8 px en controles y avisos; bloques, filas y muestras rectos.
- Los colores del aguayo solo viven en la tira y en el color de cada módulo.
- Un solo motivo: el rombo escalonado del aguayo, en la tira, el relieve del ingreso y las muestras de módulo.

## Colors

Un azul grisáceo de mostrador sobre crema cálido, con la paleta del aguayo contenida en la tira y en los acentos de módulo.

### Primary
- **Azul mostrador** (brand): panel de marca del ingreso, barra de sesión, botón principal, enlaces, borde de foco de los campos, selección de texto y casillas. Es el color fijado por la persona.
- **Azul mostrador hondo** (brand-deep): estado hover del botón principal y de los enlaces, contorno de foco del teclado y texto de los avisos informativos.
- **Azul velado** (brand-tint): fondo de los avisos informativos y hover del botón secundario.
- **Crema sobre azul** (on-brand) y **crema apagado sobre azul** (on-brand-muted): texto sobre el azul y borde del botón de cerrar sesión en la barra.

### Secondary
- **Naranja aguayo** (weave-orange), **verde aguayo** (weave-green) y **magenta aguayo** (weave-magenta): franjas y banda de rombos de la tira tejida, y color de módulo en la pantalla inicial (verde para Menú, naranja para Nueva venta, magenta para Resumen; Historial usa el azul mostrador).
- **Crema de trama** (weave-light): las franjas claras y los rombos de la tira; es el mismo crema del fondo, nunca blanco.

### Neutral
- **Crema ligero** (cream): fondo de toda la aplicación, pista de la barra de desplazamiento.
- **Crema tostado** (cream-deep): hover de los accesos de módulo.
- **Crema de campo** (field): relleno de campos, botones secundarios y accesos de módulo; es la superficie más clara permitida.
- **Línea** (line): borde de campos en reposo, contenedores y filas de tabla.
- **Línea marcada** (line-strong): borde de campos en hover y pulgar de la barra de desplazamiento.
- **Tinta** (ink): texto principal. **Tinta apagada** (ink-muted): saludo, estados de espera y encabezados de tabla.

### Error
- **Rojo de bloqueo** (error) sobre **rojo velado** (error-tint): avisos de error y bloqueo, mensajes de campo y borde de campo inválido.

### Named Rules
**The Aguayo Contenido Rule.** Naranja, verde y magenta solo aparecen en la tira tejida y como color de módulo (muestra de acceso y flecha en hover). Nunca como color de texto, relleno de botón ni fondo de una zona.

**The Crema, Nunca Blanco Rule.** No existe el blanco puro en la interfaz. La superficie más clara es el crema de campo; el fondo es el crema ligero.

**The Rojo Reservado Rule.** El rojo significa error o bloqueo y nada más.

## Typography

**Display Font:** Figtree (con system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Figtree (la misma familia)

**Character:** Una sans geométrica y amable, firme en 800 para nombres y títulos y tranquila en 400 para el texto; una sola voz de pies a cabeza, cargada localmente desde @fontsource (subconjunto latin, pesos 400, 600, 700 y 800).

### Hierarchy
- **Display** (800, clamp 3.5–6rem, 1, -0.02em): solo «Kofi POS» en el panel de marca del ingreso.
- **Display compacto** (800, 3rem, 1, -0.02em): el mismo «Kofi POS» bajo 900 px, en la franja superior.
- **Headline** (800, 2.5rem, 1.15, -0.01em): título de pantalla (h1), por ejemplo «Ingresar».
- **Feature** (800, 1.75rem, 1.15): solo el acceso a la tarea principal del mostrador, «Nueva venta».
- **Title** (700, 1.375rem, 1.15): h2, nombre de quien opera en la barra, texto de los accesos de módulo; el saludo usa este tamaño en 400 y tinta apagada.
- **Control** (800, 1.125rem): texto del botón principal; los campos de formulario usan este tamaño en 400.
- **Body** (400, 1.0625rem, 1.5): texto corrido; etiquetas de campo en 600.
- **Label** (700, 0.875rem): rol en la barra, encabezados de tabla; los mensajes de campo usan este tamaño en 600.

### Named Rules
**The Una Sola Voz Rule.** Figtree en sus cuatro pesos cargados y ninguna otra familia; un peso fuera de 400/600/700/800 no se renderiza fiel.

## Layout

El modelo espacial es una cuadrícula de tres columnas a toda altura: bloque azul, tira tejida de 64 px y contenido sobre crema. En el ingreso el bloque mide hasta 600 px (37.5rem) con el nombre arriba a la izquierda, y el formulario ocupa una columna de 440 px (27.5rem) centrada en vertical. Dentro, la barra de sesión mide 256 px (16rem), es pegajosa a toda la altura de la ventana con la tira también fija, y el contenido lleva 48/64 px de relleno.

Bajo 900 px (56.25rem) todo se apila: el bloque azul pasa a franja superior, la tira tejida a horizontal debajo de ella y el contenido sigue en una columna; la barra de sesión se vuelve una fila con nombre, rol y cerrar sesión.

El ritmo usa la escala de 8 px (0.5, 1, 1.5, 2, 3, 4 y 6 rem). Los formularios separan campos con 24 px y etiqueta de campo con 8 px. Los accesos de módulo son una lista de una sola columna, una fila por acceso separada por filetes de 1 px, dentro de un ancho máximo de 704 px (44rem): nunca quedan accesos sueltos, sea cual sea el rol.

En el ingreso de escritorio, bajo el nombre, el panel azul lleva en relieve un gran rombo escalonado en azul hondo que sangra por la esquina inferior derecha; se oculta bajo 900 px, donde la franja es baja.

## Elevation & Depth

Sistema plano: no hay sombras en ningún elemento. La profundidad se transmite con bloques de color (azul contra crema), con la tira tejida como borde físico entre ambos, con bordes de 1 px en contenedores y 2 px en controles, y con cambios de tono en hover (crema tostado, azul velado, azul hondo). El único desplazamiento es el botón principal, que baja 1 px al presionarse.

### Named Rules
**The Plano Tejido Rule.** Nada flota: si algo necesita separarse, cambia de tono o gana un borde, nunca una sombra.

## Shapes

Esquinas suavemente redondeadas de 8 px en campos, botones y avisos. La única excepción es la píldora del rol, totalmente redondeada. Los paneles de marca, la barra de sesión, las filas de acceso y las muestras de módulo son rectos, sin esquinas. La geometría recurrente es el rombo escalonado del aguayo, dibujado sobre una retícula de 4 px en una celda de 28 × 28 (contorno, anillo y ojo; componente `SteppedDiamond`): en la banda de pallay de la tira, en el relieve del panel de ingreso y en la muestra de cada acceso de módulo, como rombo crema sobre un cuadrado del color del módulo.

## Components

### Buttons
Firmes y altos, sin adornos.
- **Shape:** esquinas suaves (8 px), borde de 2 px.
- **Primary:** azul mostrador con texto crema en 800 a 1.125rem, 56 px de alto; es la acción de un formulario (Ingresar).
- **Hover / Focus:** hover a azul hondo; presionado baja 1 px; en espera queda al 75 % de opacidad con cursor de progreso. Foco de teclado: contorno de 3 px azul hondo separado 2 px.
- **Secondary:** botón por defecto de toda la app: crema de campo, texto y borde azul en 700, 44 px de alto; hover a azul velado; deshabilitado al 60 %.
- **Sobre azul:** en la barra de sesión, transparente con texto crema y borde crema apagado; en hover se invierte a crema con texto azul hondo. El foco dentro de la barra usa contorno crema.

### Chips
- **Style:** el rol de quien opera (Dueño, Cajero) es una píldora crema con texto azul hondo en 700 a 0.875rem, sobre la barra azul.
- **State:** solo informativa; no es interactiva.

### Cards / Containers
No hay tarjetas. Los accesos de módulo son filas de una lista: sin fondo propio, separadas por filetes de 1 px de línea, con 16 px de relleno; en hover la fila toma el crema tostado. Ninguna sombra (ver Elevation & Depth).

### Inputs / Fields
- **Style:** crema de campo, borde de 2 px de línea, 8 px de esquina, 44 px de alto por defecto y 56 px dentro de un campo de formulario (texto a 1.125rem). Etiqueta encima en 600.
- **Focus:** el borde pasa a azul mostrador, más el contorno de foco general.
- **Error / Disabled:** borde rojo y mensaje debajo en rojo, 0.875rem, 600. El hover sube el borde a línea marcada.

### Avisos
- **Informativo:** azul velado con texto azul hondo, borde azul de 1 px, 600.
- **Error:** rojo velado con texto rojo y borde rojo de 1 px, 600. Ambos con 12 por 16 px de relleno y 8 px de esquina.

### Navigation
La barra de sesión es la navegación persistente de toda pantalla interna: bloque azul a la izquierda con el nombre de quien opera (Title, 800), su rol en píldora y «Cerrar sesión» al pie, seguido de la tira tejida. Bajo 900 px se convierte en una fila superior con la tira horizontal debajo. En la pantalla inicial, cada módulo es una fila de 72 px de alto con la muestra de rombo tejido, el nombre en Title y una flecha que avanza 4 px y toma el color del módulo en hover. El color del módulo se asigna por destino, no por orden. «Nueva venta», la tarea del mostrador, es la única fila destacada (96 px, Feature y muestra de 56 px) sin cambiar el orden de los enlaces, que sigue el de las rutas.

### La tira tejida (Signature Component)
La firma de Kofi: una tira de aguayo dibujada en SVG, de 64 px de grosor. A cada lado, franjas simétricas naranja y verde separadas por filetes crema de 2 px; al centro, una banda de pallay de 28 px sobre magenta con rombos escalonados crema que alternan anillo verde y anillo naranja, como se tejen. Va siempre en el borde del bloque azul: vertical en escritorio, horizontal bajo 900 px. Es decorativa (oculta para lectores de pantalla, sin foco) y aparece completa desde el primer fotograma, sin animación de entrada.

## Do's and Don'ts

### Do:
- **Do** usar los tokens de color, espacio y radio de tokens.css; el azul mostrador y el crema ligero son fijos.
- **Do** poner la tira tejida en el borde de un bloque azul a toda altura, vertical en escritorio y horizontal bajo 900 px.
- **Do** asignar el color de cada módulo por destino (Menú verde, Nueva venta naranja, Resumen magenta, Historial azul) y hacer que una pantalla nueva tome el de su módulo.
- **Do** dar 56 px de alto a los campos y a la acción principal de un formulario, y 44 px como mínimo a cualquier control.
- **Do** mantener visible el foco: contorno de 3 px azul hondo con 2 px de separación, crema sobre fondo azul.
- **Do** usar «Kofi POS» como único texto de marca.

### Don't:
- **Don't** usar blanco puro (#FFFFFF); la superficie más clara es el crema de campo.
- **Don't** usar naranja, verde o magenta fuera de la tira y del color de módulo.
- **Don't** usar el rojo para nada que no sea un error o un bloqueo.
- **Don't** agregar sombras, degradados ni elevación; la profundidad es tono y borde.
- **Don't** animar la entrada de la tira tejida ni de la pantalla de ingreso, que se repite varias veces al día.
- **Don't** inventar logo, eslogan ni otro activo de marca.
- **Don't** cargar otra familia tipográfica ni pesos fuera de 400, 600, 700 y 800.
