---
version: 1
slug: "src-modules-sales-pages-newsalepage-tsx"
primary_target: "src/modules/sales/pages/NewSalePage.tsx"
related_targets: ["src/modules/sales/pages/NewSalePage.css","src/modules/sales/components/ProductPicker.tsx","src/modules/sales/components/SaleDraftLines.tsx","src/modules/sales/components/PaymentMethodPicker.tsx","src/modules/sales/components/SaleConfirmation.tsx","src/modules/sales/components/DiscardSaleDialog.tsx"]
---

# Nueva venta

## Alcance y modo

Operate. Presentación de `/ventas/nueva` (SPEC-003), confirmación de registro y diálogo de descarte. Cajero y dueño en la computadora compartida del mostrador. Escritorio prioritario; adaptación funcional a pantallas pequeñas.

## Decisiones confirmadas

Catálogo y pedido juntos, con total y registro a mano. Identidad existente de Kofi. Sin cambios de textos, rutas, contrato, reglas, persistencia ni operaciones. Importes recibidos de la API. Hasta 200 productos, 30 líneas y 99 unidades por producto. Teclado completo; estados vacío, carga, ocupado, confirmación, error, menú modificado y recuperación. Sin dependencias nuevas ni imágenes.

## Direction contract

THESIS: El catálogo y la venta comparten un mostrador; elegir y revisar son simultáneos, sin separar el cobro en otro paso.

OWN-WORLD: Figtree, azul mostrador, crema, controles de 8 px y filetes. La tira de aguayo heredada y una muestra naranja identifican Ventas. Sin sombras ni tarjetas decorativas.

STORY: Elegir productos por categoría, ajustar líneas, leer el total, elegir Efectivo o QR y registrar después del pago; los avisos explican cambios sin ocultar el pedido.

FIRST VIEWPORT: Catálogo a la izquierda y pedido a la derecha, encabezado compacto con Nueva venta y Volver al inicio. El pedido fija total, medio de pago y botón azul de 56 px; desplaza sus líneas largas. En espacio estrecho se apilan y se permite desplazamiento natural sin superposición.

FORM: Mostrador de dos columnas. Selección directa de la persona mediante shape confirmado; sin sorteo ni seed generado. Construcción code-led dentro del sistema existente. Interacción distintiva: el pedido permanece visible mientras se recorre el catálogo.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Evidencia de consistencia y cierre

Extensión ordinaria del sistema existente, construida desde código y con propuesta textual confirmada por la persona. Se conserva `DESIGN.md` y `.impeccable/design.json`: esta superficie aplica la identidad vigente y no introduce un mundo visual ni tokens globales nuevos. La composición de catálogo y pedido pertenece a este brief; no se convierte en una regla para otras pantallas.

Se contrastaron `NewSalePage.tsx`, `NewSalePage.css`, los cinco componentes relacionados, `src/shared/styles/tokens.css`, `PRODUCT.md`, `DESIGN.md` y el sidecar con las capturas de Ventas en `.impeccable/review/`.

| Compromiso | Evidencia construida |
| --- | --- |
| Catálogo y pedido simultáneos | Cuadrícula de dos columnas; filas de producto con nombre y precio, pedido con líneas y pie de cobro. El pedido permanece pegajoso y desplaza sus líneas cuando hay altura disponible. |
| Cobro legible y accesible | Total con cifras tabulares, Efectivo y QR con radios nativos, acción principal heredada de 56 px y controles de línea de al menos 44 px. Se conservan nombres accesibles y estados deshabilitados. |
| Identidad Kofi | Figtree heredada, azul mostrador y crema de los tokens existentes, filetes, controles de 8 px y muestra naranja con `SteppedDiamond`. Sin sombras ni imágenes añadidas. |
| Adaptación al espacio | Bajo 38 rem de ancho del contenedor, catálogo y pedido se apilan y el pedido usa desplazamiento natural. Bajo 40 rem de altura se libera también la posición pegajosa. |
| Estados de la operación | Avisos informativos y errores heredan los tratamientos existentes; confirmación sobre el espacio de trabajo y descarte en diálogo nativo, con foco inicial en Volver y restauración al cerrar. |

Las capturas inspeccionadas son evidencia de la interfaz con datos ficticios de desarrollo, no activos visuales incorporados al producto:

- `desktop.png`, `mobile.png` y `user-1280-viewport.png`: composición, adaptación y visibilidad del cobro.
- `empty.png` y `offline.png`: menú vacío y falta de conexión.
- `price-changed-viewport.png`, `product-removed.png` y `lost-response.png`: cambios del menú y recuperación conservando el pedido.
- `confirmation.png` y `discard.png`: registro confirmado y diálogo de descarte.

El revisor final independiente comunicó `disposition: ship`, `material_fixes: []` y fidelidad `match`; el detector comunicó `[]`. La ejecución de Vitest registrada en `.impeccable/review/vitest.log` confirma 1216 pruebas aprobadas. La coordinación del cierre comunicó también 22 pruebas E2E aprobadas. Esta documentación no vuelve a ejecutar esas comprobaciones.

Drift global observado y no reparado: el párrafo «Alcance actual» de `DESIGN.md` y su copia en `narrative.overview` de `.impeccable/design.json` aún afirman que Menú y Ventas no tienen diseño propio. Esa descripción de cobertura está anticuada; los tokens y las reglas visuales contrastados siguen siendo aplicables. Se registra sin refrescar documentos globales en esta extensión ordinaria. No se canoniza ningún defecto ni se amplía el sistema con decisiones particulares de esta pantalla.
