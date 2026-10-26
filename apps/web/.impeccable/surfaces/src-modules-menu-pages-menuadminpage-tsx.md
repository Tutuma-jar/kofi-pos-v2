---
version: 1
slug: "src-modules-menu-pages-menuadminpage-tsx"
primary_target: "src/modules/menu/pages/MenuAdminPage.tsx"
related_targets: ["src/modules/menu/pages/MenuPage.tsx","src/modules/menu/components/MenuAdminList.tsx","src/modules/menu/components/CurrentMenuList.tsx","src/modules/menu/components/CategoryForm.tsx","src/modules/menu/components/ProductForm.tsx","src/modules/menu/components/SaveStatus.tsx","src/modules/menu/menu.css"]
---

# Menú: administración y consulta

## Alcance y modo

Operate. `/menu/administrar` para el dueño y `/menu` para ambos roles. Prioridad confirmada: mantener el menú y corregir precios. Brief confirmado por la persona; composición «Secciones amplias» elegida en la comparación visual.

## Direction contract

THESIS: Categorías como secciones horizontales con productos y precios alineados; sustituir la acumulación de controles sin jerarquía.

OWN-WORLD: Heredar Figtree, azul mostrador, crema y aguayo geométrico existente. Verde solo en las muestras de módulo. Superficies planas, filetes y controles de ocho píxeles; sin sombras ni texturas nuevas.

STORY: El dueño localiza categoría y precio, abre el formulario existente, corrige y guarda. La consulta muestra los mismos nombres y precios vigentes, sin controles administrativos.

FIRST VIEWPORT: Barra de sesión y tira a la izquierda. Título de 40 px y vuelta al inicio arriba; acciones de creación a la derecha. Encabezados de categoría con muestra verde y acciones; productos debajo en filas con precio y acciones alineados. Separación generosa entre categorías. Formularios en el flujo sobre la lista. En móvil se apilan grupos sin recortes.

FORM: Secciones amplias, candidata 4; seed c466070d. Referencia aprobada: `.impeccable/mocks/decision/menu-secciones.png`. Mantener textos exactos y etiquetas Inactiva/Inactivo, superficies planas y tipografía del sistema aunque el generador los represente imperfectamente.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Estados y restricciones

Carga, menú vacío, categoría sin productos, guardado, validación, desconexión, permisos e inactivos. Preservar valores al fallar, manejo de sesión, orden alfabético, acciones y formularios existentes. Sin búsqueda, filtros, colapsados, modales, eliminación ni actualización automática. Hasta 200 productos; nombres hasta 30/40 caracteres. Precios recibidos de la API mediante el contrato. Teclado y foco visibles; revisión a 1440 y 390 px con escenarios de desarrollo.

## Implementación y sistema conservado

Extensión de la interfaz existente, sin cambio global del mundo visual. Se reutilizan Figtree, los tokens de azul y crema, botones, avisos, campos y foco; las categorías incorporan la muestra verde del módulo con `SteppedDiamond`. La barra de sesión y la firma de aguayo conservan sus SVG existentes. No se incorporan dependencias ni imágenes raster al producto; la composición generada y las capturas son evidencia de trabajo.

La lista administrativa usa secciones completas con filetes, nombres, precios con cifras tabulares y acciones alineadas. La consulta comparte las secciones y omite los controles administrativos. Los formularios permanecen en el flujo. El CSS local adapta el título de 40 px en escritorio a 32 px bajo 44rem y apila las acciones sin recortes. Esta adaptación corresponde solo a Menú; no cambia la jerarquía global de `DESIGN.md`.

`DESIGN.md` y `.impeccable/design.json` se conservan. Se detectó desfase documental previo en la descripción de alcance de `DESIGN.md`, que todavía dice que Menú no tiene diseño propio. No se reescribe el sistema sin un cambio global aprobado ni se convierte la adaptación local en regla para otras pantallas.

## Evidencia y revisión final

Composición elegida: `.impeccable/mocks/decision/menu-secciones.png`, con sidecar `.impeccable/mocks/decision/menu-secciones.json` marcado `approved: true`. El prompt documenta Figtree, títulos de 40 px, categorías de 22 px, cuerpo de 17 px, crema y superficies planas. La imagen generada representa imperfectamente esos requisitos: fondo más blanco, textos mayores y apariencia sombreada.

Se inspeccionaron visualmente `.impeccable/review/desktop.png`, `mobile.png`, `desktop-consulta.png`, `mobile-consulta.png`, `desktop-editar.png` y `mobile-validacion.png`: secciones y precios legibles, estados Inactiva/Inactivo presentes, formulario con foco visible y validación junto al campo. En la misma carpeta existen además las parejas desktop/mobile de `categoria`, `bloqueo`, `vacio`, `consulta-vacia`, `sin-conexion`, y las capturas complementarias `desktop-validacion.png` y `mobile-editar.png`.

Las mediciones guardadas en `.impeccable/review/menu-measurements.json` abarcan escritorio a 1440 px, móvil a 390 px y hero a 1505 px. En esos registros el ancho del documento coincide con el viewport, `overflowing` está vacío, el título mide 40/32 px y las acciones registradas miden 44 o 56 px de alto. Son mediciones de los escenarios capturados; no sustituyen las comprobaciones funcionales del repositorio ni afirman cobertura visual de todo dato límite.

La revisión independiente informó render sin hallazgos materiales y disposición `fix` únicamente por la persistencia del gate hero. La adjudicación visual considera el aviso de tamaño móvil orientativo: el título local de 32 px sigue legible. Las columnas y etiquetas que el comparador clasifica como `missing` están presentes en las capturas completas; sus cajas cambiaron de posición respecto de la composición.

## Limitación pendiente de autorización

El informe `.impeccable/review/diff/final/report.json` conserva veredicto `drift`, puntuación global 75,74 % y estructura 88,13 %. `.impeccable/review/diff/hero/report.json` y `.impeccable/build/spec.json` conservan la comparación regional. `.impeccable/build/state.json` permanece en fase `hero`, estado `open`, con `gate.ok: false` y sin cierre final.

La documentación y la revisión del render quedan registradas, pero el cierre automático no está aprobado. Las diferencias regionales entre la imagen generada y el brief confirmado no se han ocultado ni se ha forzado el gate. Falta autorización expresa de la persona para rebajar la autoridad exacta de la composición frente al brief y al sistema existente; hasta entonces no se declara completado el flujo de build.
