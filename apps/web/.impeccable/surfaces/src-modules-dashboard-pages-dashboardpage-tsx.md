---
version: 1
slug: "src-modules-dashboard-pages-dashboardpage-tsx"
primary_target: "src/modules/dashboard/pages/DashboardPage.tsx"
related_targets: ["src/modules/dashboard/pages/DashboardPage.css","src/modules/dashboard/components/PeriodSummaryView.tsx","src/modules/dashboard/components/TodaySummarySection.tsx","src/modules/dashboard/components/MonthSummarySection.tsx","src/modules/dashboard/components/DailySalesTable.tsx"]
---

# Resumen de ventas

## Alcance y modo

Operate. Presentación de `/resumen` (SPEC-004), para dueño y cajero en la computadora compartida del local. Escritorio prioritario y adaptación a ventanas estrechas. Diseño aprobado por la persona mediante shape: primero total de hoy, luego efectivo y QR; lectura despejada aunque requiera más desplazamiento.

## Direction contract

THESIS: Una lectura del día que permite identificar cuánto se vendió y cómo se cobró, con el mes como continuación. Sin tarjetas de métricas equivalentes ni gráficos.

OWN-WORLD: Figtree, azul mostrador y crema, filetes y controles de 8 px; barra de sesión y aguayo existentes. Sin sombras, dependencias ni activos nuevos.

STORY: Leer hoy, reconocer efectivo y QR, consultar los productos; el dueño continúa al mes y sus días. Actualizar conserva las cifras anteriores y sus fechas durante carga o error.

FIRST VIEWPORT: Cabecera con título, Volver al inicio y Actualizar. Hoy y momento de datos preceden el total dominante; ventas y promedio tienen menor peso. Efectivo y QR siguen en una banda abierta; después, lista de productos. Mes completo debajo con separación generosa y tabla de días. En ventanas estrechas, composición en una columna, nombres ajustables e importes alineados.

FORM: Lectura vertical despejada con prioridad al día. Dirección textual elegida y confirmada por la persona; sin sorteo ni seed. Construcción desde código dentro del sistema existente, sin comp aprobado. Actualizar es la interacción existente; sin actualización automática ni animaciones añadidas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Límites y comprobación

Conservar textos, contrato, fechas, formato BOB, datos recibidos, rutas y permisos. Cajero ve solo hoy. Cubrir con ventas, vacío, carga inicial y actualización lenta, desconexión, error inesperado y permiso del mes. Hasta cinco productos por resumen y hasta 31 filas diarias; nombres largos e importes amplios deben seguir legibles. Verificación con los escenarios de desarrollo y tests existentes. Sin cambios globales a DESIGN.md ni a sus tokens.

## Consistencia con el sistema existente

Extensión ordinaria construida desde código y la propuesta textual confirmada. Se contrastaron `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` de `apps/web` con `DashboardPage.tsx`, su CSS y `PeriodSummaryView`, `TodaySummarySection`, `MonthSummarySection` y `DailySalesTable`. Se aplicó el perfil alternativo `reference/degraded/documenter.md`, junto con `reference/document.md`, porque `impeccable_documenter` no está registrado.

El resultado conserva la paleta azul mostrador y crema, Figtree, filetes, controles existentes y la barra de sesión con aguayo. La superficie es plana, sin sombras ni tarjetas de métricas equivalentes. La cifra del día domina; ventas y promedio son secundarios; efectivo y QR siguen en una banda abierta. Productos y, para el dueño, el mes con sus días continúan en vertical. El ancho máximo local es de 64rem y las adaptaciones se resuelven por el espacio disponible del contenedor, manteniendo nombres ajustables e importes alineados.

El detector ejecutado una vez señaló los colores preexistentes de los controles de escenarios de desarrollo (`#fff8e1` y `#e0c060`) y dos avisos tipográficos locales: total de 4rem y título de 2rem en contenedores estrechos. Los tamaños responden a la jerarquía aprobada y a su adaptación; quedan documentados como decisiones de esta superficie, sin añadir tokens globales ni convertir los colores de desarrollo en reglas del producto.

`DESIGN.md` y `.impeccable/design.json` se conservan. Su descripción global de alcance todavía dice que Resumen no tiene diseño propio; se registra esa descripción anticuada sin refrescar el sistema fuera del alcance pedido. No se añadieron fuentes, dependencias ni imágenes al producto.

## Evidencia y cierre

La revisión visual independiente concluyó `ship`, con persistencia `pass`, fidelidad `match` y sin `material_fixes`. La adaptación a móvil y a 320px es la variación esperada de la dirección textual; no hubo un comp aprobado contra el que medir coincidencia de píxeles.

Las capturas locales de `.impeccable/review/dashboard/` cubren `desktop.png`, `desktop-full.png`, `mobile.png`, `mobile-full.png`, `narrow.png`, `narrow-full.png`, `empty.png`, `loading.png`, `refreshing.png`, `offline.png`, `error.png`, `forbidden.png` y `cashier.png`. Todas las capturas requeridas fueron validadas en la revisión. Su procedencia es la interfaz de desarrollo de Dashboard con datos ficticios; son evidencia local, no activos raster incorporados al producto.

`dashboard-checks.json`, en esa misma carpeta, registra ausencia de desbordamiento horizontal en las vistas capturadas: 1440px de escritorio, 390px de móvil, 320px estrechos y 1280px para los estados de escritorio. Registra título/total de 40/64px en escritorio y 32/48px en móvil y estrecho cuando hay resumen. La carga inicial y los errores muestran sus estados propios; una actualización conserva las cifras disponibles y sus fechas.

Comprobaciones confirmadas por ejecución en este cierre:

- Vitest: 1228 pruebas aprobadas.
- Tipos, compilación, exclusión de desarrollo del build web y formato: aprobados.
- Detección del build: 4 pruebas; reglas de Git: 22; medidores con datos ficticios: 40; todas aprobadas.
- Playwright: 22 pruebas aprobadas (1.2m), incluido el escenario individual de Dashboard corregido y comprobado.
- ESLint del código, excluyendo `.impeccable`: sin errores, con un aviso previo de Ventas. `npm run lint` general sigue encontrando el script local previo e ignorado `capture-menu.mjs`.

El cierre visual es `ship` para la superficie y los estados observados. Estas comprobaciones no acreditan tiempos humanos de identificación del total ni recorridos cronometrados.
