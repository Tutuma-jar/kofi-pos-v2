# Comprobación automatizada — SPEC-005 T028

Fecha de ejecución: 2026-10-27, hora de Bolivia. Registro final UTC: 2026-10-27T14:26:27.312Z.

**Resultado de T028 automatizable: cumplido.** Las tres series completas superan el mínimo de 19 de 20 aperturas estrictamente menores de 2000 ms. **T028-H permanece pendiente e impide acreditar el cierre completo de SPEC-005.** No se ejecutaron pruebas manuales ni recorridos humanos cronometrados.

## Entorno y revisión medida

- Web: https://kofi-web.onrender.com; API: https://kofi-api.onrender.com, con reescritura de mismo origen.
- Rama de comprobación: feat/005-historial-pulido; Blueprint exs-dbe5tngn74is73buoaf0. Servicios srv-dbe5trbl550s73f9g2kg (web) y srv-dbe5trbl550s73f9g2l0 (API).
- Commit web: 86ecfe8cc204fe10b3193e7e8d3042397dd08458; commit API: 86ecfe8cc204fe10b3193e7e8d3042397dd08458. Ambos comprobados como Live en la sesión autenticada de Render antes de medir.
- Neon de comprobación: identidad del host en la auditoría de carga; ninguna escritura en producción. No se conservan cadenas de conexión ni credenciales.
- Chrome existente autenticado, con admin = owner y operador1 = cashier, roles comprobados nuevamente al finalizar. No se modificaron cuentas, contraseñas ni permisos. Se reutilizó la sesión de admin sin exportarla.
- 202 productos existentes; día 2026-09-15 con 400 ventas; mes 2026-09 con 6000. Detalle N.º 9104. Datos de comprobación ficticios.
- La carga añadió 6000 ventas de septiembre y conservó las 6000 anteriores: total 12000. El hash de las ventas anteriores coincide antes de la carga y después de las mediciones. Menú existente conservado; no fue necesario cargar otros productos.

## Método y resultados

Medidor del repositorio generado con build:measure:history e importado como módulo autocontenido en Cua. Método browser_render_probe, con VITE_HISTORY_MEASUREMENT=true solo en el build de comprobación. Inicio en el clic de apertura; final después de recibir datos, terminar la carga y completar dos cuadros de renderizado. Se vigila foco y visibilidad dentro del navegador y se rechaza su pérdida. La preparación de cada pantalla queda fuera del intervalo.

Cada apertura contrasta contra el contrato y la respuesta real: título, cifras, medios de pago, todas las 400 filas diarias, los 30 días del mes o todas las líneas del detalle; también ausencia de carga, Actualizar habilitado y dos capturas reales. Las comprobaciones posteriores del inspector no se suman al intervalo del producto. Aperturas: fila mensual a día, botón desde el mes vecino a septiembre y fila diaria a detalle. La API obtiene los datos de Neon y calcula las cifras.

Un calentamiento por consulta queda registrado y excluido: día 1489.0999999940395 ms, mes 1194.699999988079 ms y detalle 849.5 ms. Render había reactivado su servicio antes de comenzar las series. Las muestras originales no se redondean ni se filtran; esta tabla solo redondea su presentación.

| Consulta | Muestras | Bajo 2000 ms | Percentil 95 (ms) | Máximo (ms) |
| --- | --- | --- | --- | --- |
| Día con 400 ventas | 20 | 20/20 | 1128.800 | 1214.000 |
| Mes con 6000 ventas | 20 | 20/20 | 1292.400 | 1407.000 |
| Detalle de venta | 20 | 20/20 | 1057.000 | 1175.300 |

## Intentos conservados

- Intento 1: cinco muestras diarias; intervalo anterior que incluía latencia del inspector. Incompleto y no acreditado. T036 corrige el método (plan §22).
- Intento 2: veinte muestras diarias sobre af643aa; se detuvo en el calentamiento mensual porque el campo nativo cambió sin notificar la consulta a React. Incompleto y no acreditado. T037 usa la navegación mensual y conserva el mes consultado en queryMonth.
- Intento definitivo: sesenta muestras sobre 86ecfe8cc204fe10b3193e7e8d3042397dd08458, sin mezclar revisiones ni sustituir muestras lentas. Los intentos anteriores siguen íntegros.

## Evidencia y límites

| Archivo | SHA-256 |
| --- | --- |
| [measurement-render-probe.json](evidence/measurement-render-probe.json) | dbe6396a27956e1f0641ca12bc1602a74afe6187f30fdb95f8d63a333e7c2cc0 |
| [measurement-attempt-1.json](evidence/measurement-attempt-1.json) | 0d1e3526d7aa31741196a2ed5088bcf803da9638bc624ebbe1f327217b6696c2 |
| [measurement-attempt-2.json](evidence/measurement-attempt-2.json) | b4ecd2795adc9cfca609a68af25fd10bb80ed89af7bc93b2b94a93b967d976f3 |
| [seed-audit.json](evidence/seed-audit.json) | 1525189fe80a2eed1e90df9e780e8c632f792fcae30bb0912981e4be8af2c273 |
| [measurement-data-audit.json](evidence/measurement-data-audit.json) | 94b5930f045c49417060ff9f99a41f36d11d6aa573dcfa86ccfebd03fe189196 |

T028 acredita exclusivamente la parte automatizable del entorno de comprobación. Falta la acreditación humana desde la computadora del local y los dos recorridos del dueño en menos de 15 segundos descritos en T028-H. Se mantienen pendientes, sin sustituirlos por estos resultados. El [PR #39](https://github.com/Tutuma-jar/kofi-pos-v2/pull/39) conserva el estado de verificación y la revisión humana.
