---
version: 1
slug: "src-modules-history-pages-dayhistorypage-tsx"
primary_target: "src/modules/history/pages/DayHistoryPage.tsx"
related_targets: ["src/modules/history/pages/MonthHistoryPage.tsx","src/modules/history/pages/SaleDetailPage.tsx","src/modules/history/components/PeriodTotals.tsx","src/modules/history/components/SalesList.tsx","src/modules/history/components/MonthDaysTable.tsx","src/modules/history/components/SaleDetailView.tsx","src/modules/history/components/SaleSearch.tsx","src/modules/history/components/QueryStatus.tsx","src/modules/history/history.css"]
---

# Historial y reportes

Operate. Dueño en la computadora compartida; consulta de caja y ventas pasadas. Alcance: día, mes y detalle de SPEC-005. Prioridad y recorrido completo confirmados en shape. La persona eligió «Cifras arriba», segunda opción, y pidió implementarla.

## Direction contract

THESIS: Leer primero la caja del periodo y después las ventas, con una franja continua de cifras y un listado ancho.

OWN-WORLD: Azul de Historial, crema, Figtree y aguayo geométrico del sistema existente; filetes, superficies planas y controles de 8 px. La barra de sesión conserva sus componentes, geometría y SVG existentes.

STORY: Elegir periodo, leer total y desglose, localizar una venta, revisar sus productos y volver a su día. Mes enlaza con cada día.

FIRST VIEWPORT: Título y vuelta al inicio arriba, navegación del periodo debajo. Franja horizontal con Total vendido dominante a la izquierda y Efectivo/QR a la derecha. Momento de los datos y Actualizar junto a búsqueda compacta; filas a todo el ancho. Móvil apila en ese orden. Detalle ordena metadatos, productos y total al cierre.

FORM: Cifras arriba, candidata 3 de la lista estructural; seed 458b489f. Comp aprobada `.impeccable/mocks/decision/historial-franja-cifras.png`. Los textos y componentes existentes prevalecen sobre las imprecisiones del generador. No se añaden métricas, filtros, rutas ni operaciones. Movimiento limitado al feedback de los controles existentes; sin entrada animada en consultas repetidas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Estados y límites

Cifras recibidas de la API, sin cálculos. Hasta 400 ventas por día y 6000 por mes; días sin ventas incluidos. Conservar textos, formatos, URL, permisos y fechas de Bolivia. Búsqueda en las tres vistas. Vacío, carga, actualización conservando la consulta anterior, sin conexión, error, sin permiso, venta inexistente y validación. Foco visible, teclado completo y controles de al menos 44 px. Sin dependencias ni imágenes de producto nuevas.

## Evidencia de implementación

La implementación extiende el sistema Kofi existente. Se contrastaron `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, los tokens y estilos base de `src/shared/styles/`, la barra de sesión en `src/modules/auth/components/AuthenticatedLayout.css` y los componentes de Historial. No se modifica el sistema global ni se elevan decisiones de esta pantalla a reglas generales.

| Pieza | Evidencia en el código |
| --- | --- |
| Día y mes | Las páginas componen título y navegación del periodo, `PeriodTotals`, estado/actualización y búsqueda, y registros a todo el ancho. Comparten `history.css`. |
| Franja de cifras | `PeriodTotals` mantiene el total y la cantidad en una lista de definiciones; el total azul usa peso 800. «Por medio de pago» encabeza Efectivo y QR en dos columnas, cada uno con importe y cantidad; filetes separan las secciones. |
| Ventas del día | `SalesList` conserva una lista ordenada con enlaces a `/ventas/:numero`. Encabezados visuales en escritorio y filas con número, hora, persona/rol, pago e importe; el número subrayado mantiene la señal de enlace. |
| Días del mes | `MonthDaysTable` conserva tabla, encabezado y enlace de cada día a `/ventas?fecha=...`; fecha subrayada, importe y cantidad alineados para comparar filas. |
| Detalle | `SaleDetailView` dispone los metadatos entre filetes, productos en lista ordenada, cantidad/precio y subtotal en columnas y un total azul al cierre. |
| Consulta | `QueryStatus` agrupa momento de los datos, Actualizar, carga y avisos existentes. `SaleSearch` conserva etiqueta, validación, asociación del error y navegación; el cambio presenta el formulario de forma compacta. |

La paleta sigue los tokens azul mostrador, crema, tinta y líneas del sistema; no hay sombras ni nuevos motivos. Figtree y los pesos existentes sostienen la jerarquía, con cifras tabulares. El título y los totales usan tamaños fluidos locales; el total del periodo llega a 3.5rem. Los controles heredan el radio de 8 px, altura mínima de 44 px y foco visible del estilo base. El espaciado principal usa la escala existente de 8 px; los intervalos de 4 px se limitan a agrupaciones internas de texto.

La adaptación responde al ancho disponible de Historial: a 52rem o menos, herramientas y búsqueda se apilan, las ventas pasan a dos renglones y los productos del detalle se reorganizan; a 38rem o menos, el total queda sobre los pagos y la navegación de periodo y las filas del mes se compactan. Son ajustes de esta superficie, sin cambiar el breakpoint global de sesión.

La geometría de sesión vigente es la original: columna de 16rem y tira de 4rem en escritorio; bajo 56.25rem, barra y tira horizontales. No hay una variante estrecha de la barra para Historial. Se conservan sus componentes y SVG existentes. No se añadieron dependencias ni imágenes raster de producto; la comp es una referencia de decisión, no un activo de la interfaz.

## Comparación y comprobaciones disponibles

La estructura implementada recoge «Cifras arriba»: franja de total y pagos antes de los registros, filetes y lista ancha. Esto describe el código; no acredita igualdad píxel a píxel con la comp aprobada.

El lote de capturas en `.impeccable/review/history/` cubre `desktop.png`, `mobile.png`, `month-desktop.png`, `month-mobile.png`, `detail-desktop.png`, `detail-mobile.png`, `empty.png`, `offline.png`, `error.png` y `user-1265.png`. Al registrar esta evidencia, las capturas de escritorio que mostraban la barra estrecha están pendientes de recaptura y no prueban la geometría vigente. La existencia del lote no equivale a un cierre de fidelidad visual.

Los logs existentes registran 1228 pruebas aprobadas en `vitest-final.log`, 117 en `history-final.log`, 22 E2E en `e2e-final.log` y 8 pruebas del medidor en `measure-history-final.log`. Tras la estructura final de pagos, `e2e-payment-final.log` acredita mes aprobado y día fallido; la ejecución posterior `e2e-day-final.log` acredita el día aprobado. Estos resultados son evidencia funcional de las ejecuciones registradas, no una nueva ejecución del documenter ni una aprobación visual.

Según el handoff de ejecución, tipos, compilación y formato pasaron; lint del código no tiene errores. El lint general encuentra un script local previo no versionado, `.impeccable/mocks/capture-menu.mjs`; al excluir `.impeccable` queda el warning previo de Sales. Las comprobaciones de guardias también fueron informadas como aprobadas. Estas comprobaciones no sustituyen el gate de comparación.

## Estado real de cierre

FINISH sigue pendiente de fidelidad y aprobación. El revisor independiente devolvió `fix`: la jerarquía de pagos consta como resuelta; la persistencia del gate hero sigue sin resolver. El estado `.impeccable/build/state.json` mantiene hero abierto, `gate.ok: false` y `finish: null`. El último resultado registrado fue 81 % con la barra estrecha; no es un aprobado ni una medición del código con la geometría de sesión restaurada. Las siguientes fases del estado automático siguen pendientes.

Este registro documenta la implementación y sus límites; no declara `ship` ni cierra FINISH. Quedan la recaptura vigente y la resolución o aceptación explícita de la limitación de comparación automática antes de cerrar la fidelidad.

## Drift previo no canonizado

El párrafo «Alcance actual» de `DESIGN.md` todavía dice que Historial no tiene diseño propio. Ese texto ya no describe esta implementación. Se registra como drift previo sin repararlo: este trabajo extiende el sistema confirmado y no autoriza reescribir `DESIGN.md` ni `.impeccable/design.json`. La barra estrecha descartada, las diferencias de la comp y los fallos del gate tampoco se convierten en reglas del sistema.
