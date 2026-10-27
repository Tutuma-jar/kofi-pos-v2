---
target: homepage
total_score: 27
max_score: 36
na_heuristics: 9
p0_count: 0
p1_count: 0
target_identity: "file:C:\\kofi-pos-v2\\apps\\web\\src\\modules\\auth\\pages\\HomePage.tsx"
target_fingerprint: "sha256:7fe858f22f743cc94ea851d8be8e956f40b1225617ef89c51668006291cb7400"
target_path: "C:\\kofi-pos-v2\\apps\\web\\src\\modules\\auth\\pages\\HomePage.tsx"
timestamp: 2026-10-27T20-00-10Z
slug: apps-web-src-modules-auth-pages-homepage-tsx
closed: true
---
Method: dual-agent (A: /root/design_review · B: /root/detector_review)

# Crítica de HomePage

Modo Operate. Alcance: apps/web/src/modules/auth/pages/HomePage.tsx y sus estilos; el shell compartido solo aporta contexto. Sin cambios en la interfaz.

## Veredicto de especificidad

La pantalla tiene identidad de Kofi: azul y crema, tipografía Figtree y motivo tejido. La lista plana encaja con un punto de venta pequeño. La oportunidad principal es expresar mejor la prioridad del mostrador: Nueva venta destaca por tamaño, pero llega después de los accesos al menú.

Detector: 0 hallazgos; salida JSON []; exit 0. Solo escaneó HomePage.tsx. No acredita ausencia de problemas de diseño ni cubre por sí solo el CSS. Sin falsos positivos. No hubo overlay: la API del navegador no expone mutación documentada para inyectarlo.

## Salud de diseño

| # | Heurística | Nota | Evidencia principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3/4 | Identidad y foco visibles; aviso previsto en fuente, no ejercitado. |
| 2 | Lenguaje del mundo real | 4/4 | Destinos escritos en términos del negocio. |
| 3 | Control y libertad | 3/4 | Enlaces nativos y salida visible en el shell. |
| 4 | Consistencia | 4/4 | Lista y estados coherentes con el sistema visual. |
| 5 | Prevención de errores | 4/4 | Opciones filtradas por rol; pantalla de navegación sin edición. |
| 6 | Reconocer antes que recordar | 4/4 | Todos los destinos llevan texto y están visibles. |
| 7 | Eficiencia | 2/4 | Teclado convencional; prioridad visual de venta mejorable. |
| 8 | Estética y minimalismo | 3/4 | Sobria; encabezado y motivos pesan más de lo necesario. |
| 9 | Recuperación de errores | n/a | No ejecuta una operación propia susceptible de error. |
| 10 | Ayuda | 0/4 | No ofrece ayuda contextual; impacto limitado por su sencillez. |
| | Total | 27/36 (75 %) | Bueno. Evaluación experta, no medición con usuarios. |

## Lo que funciona

- Filas completas de 72 px, y 96 px en Nueva venta: áreas cómodas y legibles.
- Opciones adaptadas al rol: cinco para Dueño y tres para Cajero, sin huecos.
- Foco visible alrededor de toda la fila; los colores y motivos no sustituyen el texto.

## Prioridades

1. [P2] Nueva venta destaca, pero llega tarde en el barrido. Dueño la encuentra en tercera posición y Cajero en segunda. Reforzar su separación mediante espacio y contraste de superficie, conservando el orden y los destinos. Comando: impeccable layout.
2. [P3] El encabezado pesa demasiado para un acceso operativo recurrente. A 1280 × 720, Kofi POS se muestra aproximadamente a 56 px y los accesos empiezan cerca de y=210. Compactar título y espacios superiores conservando el saludo. Comando: impeccable distill.
3. [P3] Las muestras repiten la misma silueta en todos los accesos. Los dos destinos de menú comparten además el verde: la distinción depende del texto. Mantener el motivo establecido, reducir su peso en filas secundarias y reservar el énfasis para Nueva venta. Mejora de escaneo, no fallo de comprensión observado. Comando: impeccable polish.

No se observaron bloqueos P0 ni P1.

## Carga cognitiva y recorrido

Dueño ve cinco opciones simultáneas, por encima del umbral de cuatro del checklist; Cajero ve tres. Las etiquetas concretas y la venta destacada compensan buena parte de esa carga. No justifica añadir menús ocultos ni otro paso.

El saludo y la identidad de sesión transmiten control en una computadora compartida. La composición se percibe como un índice claro del sistema; podría acercar visualmente la tarea frecuente sin aumentar contenido.

## Personas

- Alex, uso frecuente: puede operar con enlaces nativos y teclado, aunque debe localizar Nueva venta dentro de la lista. No se propone añadir atajos como cambio de presentación.
- Jordan, primera visita: las etiquetas ayudan; Resumen de ventas e Historial de ventas pueden exigir una primera interpretación. Es una posible vacilación, no confusión comprobada con usuarios.
- Sam, teclado: foco visible observado en la primera fila y en Nueva venta. Sin prueba de lector de pantalla, zoom ni conformidad formal de accesibilidad.

## Observaciones menores y límites

El selector amarillo de escenarios es una herramienta de desarrollo y queda excluido de la crítica del producto. El shell compartido queda fuera del alcance editable. No se ejercitaron avisos, nombres largos ni destinos posteriores. Cambiar textos fijados o comportamiento requiere el ciclo de especificación.

Ambas evaluaciones inspeccionaron capturas nativas y árbol accesible en pestañas nuevas independientes a 1280 × 720, con Dueño y Cajero y datos ficticios en ?escenarios=acceso. No hubo resize documentado: móvil se revisó solo en CSS por A, sin captura móvil.

## Preguntas para decidir la siguiente mejora

- Prioridad: ¿reforzar Nueva venta, compactar encabezado o reducir motivos secundarios?
- Alcance: ¿solo la prioridad P2 o las tres mejoras, conservando textos, orden y destinos?
