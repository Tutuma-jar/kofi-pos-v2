# Comprobación de T022 — Dashboard

Fecha de las mediciones: 2026-10-26, hora de Bolivia. RNF-3 se acredita con las series originales del dueño y la repetición controlada del cajero. El exceso del recorrido manual del dueño queda aceptado expresamente por la persona, conforme a spec §8; el objetivo original de 10 segundos no se declara cumplido.

## Entorno y despliegue

- Web: [sitio de comprobación](https://kofi-web.onrender.com); [despliegue confirmado Live](https://dashboard.render.com/static/srv-dbe5trbl550s73f9g2kg/deploys/dep-dbfeh367bikc73d86pc0).
- API: [servicio](https://kofi-api.onrender.com); [despliegue confirmado Live](https://dashboard.render.com/web/srv-dbe5trbl550s73f9g2l0/deploys/dep-dbfedj8473hc73cs3n20).
- [Sincronización autorizada del Blueprint](https://dashboard.render.com/blueprint/exs-dbe5tngn74is73buoaf0/sync/exe-dbfegvnavr4c73drhp7g).
- Ambos servicios se comprobaron Live sobre `90b15d7081439596112dcd12d8693767f0048a13`, rama `feat/004-dashboard-pulido`. Después de sincronizar, el bundle público de la web coincidió con el build local y contenía ambas secciones del Dashboard.
- Datos de comprobación: **202 productos vigentes y 6000 ventas del mes 2026-10**. La persona autorizó usar la misma base; se añadieron 5956 ventas a las 44 previas y se verificó que esas ventas, sus líneas, todos los productos y las cuentas permanecieran intactos. No se presentan como exactamente 200 productos.
- Chromium 156.0.8078.4; win32; Node 24.19.0. Ingreso manual en Chromium, sin credenciales por chat, archivos de resultados ni argumentos.

## Primera ejecución completa

Ejecutada con `npm run measure:dashboard`. Fecha del informe: **2026-10-26 01:58:45**, Bolivia. SHA local del medidor: `90b15d7081439596112dcd12d8693767f0048a13`. Se excluyó un calentamiento por operación y se conservaron veinte muestras por serie. Los tiempos comprenden desde la acción hasta ver los resúmenes del rol y terminar su pintado.

[Informe original completo, sin reformatear](evidence/measurement-attempt-1.json). SHA-256: `258632aa8d6e40eb844a40d10bd52c1975950b6a332aa01682a848ed2cef410b`.

| Rol | Aperturas < 2 s | P95 apertura | Actualizaciones < 2 s | P95 actualización | RNF-3 en esta ejecución |
| --- | --- | --- | --- | --- | --- |
| Dueño | 20/20 | 1,773 s | 20/20 | 1,207 s | Cumple |
| Cajero | 8/20 | 3,655 s | 7/20 | 4,018 s | No cumple |

La primera ejecución del cajero no acredita RNF-3 y conserva su indicador `rnf3Passed: false`. El primer medidor no capturaba el foco de la ventana; las demoras repetidas son compatibles con una pérdida de primer plano, pero no se afirma que esa fuera la causa demostrada. No se borran ni ajustan muestras lentas.

## Repetición controlada de las series del cajero

Fecha del informe: **2026-10-26 02:22:47**, Bolivia. SHA local del medidor: `0b9a214942cba4047136c630aedb141ff32f3b2b`. Se usaron los exports `createBrowserDriver('cashier')` y `measureCycles`, con ingreso manual, sin repetir ni automatizar el recorrido humano. Se verificó el volumen del menú y se mantuvo el conjunto de 6000 ventas. El medidor trae la página al frente antes del cronómetro, registra pérdidas de foco/visibilidad durante cada muestra y rechaza la serie si ocurren.

[Informe separado de la repetición](evidence/measurement-cashier-repeat.json). Se conserva el original anterior y se agregan estas cuarenta muestras nuevas; no se mezclan para ocultar el primer incumplimiento.

| Serie del cajero | Muestras < 2 s | P95 | Límite | Resultado |
| --- | --- | --- | --- | --- |
| Apertura | 20/20 | 0,958 s | Al menos 19/20 estrictamente bajo 2 s | Cumple |
| Actualización | 20/20 | 0,428 s | Al menos 19/20 estrictamente bajo 2 s | Cumple |

El contrato y el código de las aplicaciones no cambiaron entre las dos mediciones, comprobado con los árboles Git:

| Módulo | Árbol en ambos commits |
| --- | --- |
| `apps/api` | `64c66d3775f8e59d85fecc211adb8584baa59b3d` |
| `apps/web` | `c4a7d21308325a5e143d50223e9c85915678d110` |
| `packages/contracts` | `b1773ee61420eac697b2c16ba533d7eaa4536236` |

La revisión posterior corresponde al medidor y a la documentación; no se inventa otro SHA desplegado. Con las series originales del dueño (20/20 en ambas operaciones) y estas series controladas del cajero (20/20 en ambas), RNF-3 queda acreditado.

## Recorridos humanos y aceptación expresa

La persona inició cada recorrido desde la pantalla inicial, abrió «Resumen de ventas», identificó el total de hoy y confirmó su lectura en el control del medidor. El programa no hizo ese recorrido ni confirmó la lectura por ella.

| Rol | Tiempo real original | Objetivo < 10 s | Tratamiento |
| --- | --- | --- | --- |
| Dueño | 11,874 s | No cumple | Exceso aceptado expresamente |
| Cajero | 3,859 s | Cumple | Tiempo original conservado |

**Decisión de la persona, 2026-10-26:** «Listo acepta el tiempo del recorrido manual asi se exceda». Se documenta en spec §8 y «Aclaraciones». La excepción permite aceptar el criterio manual conservando la evidencia; no reduce la duración ni cambia `humanPassed: false` / `humanTargetMet: false` en los informes. No se repitieron los recorridos humanos para obtener un aprobado. La aceptación no flexibiliza RNF-3.

## Resultado

Preparación de datos y despliegue comprobados; RF verificados por las pruebas de las historias; RNF-3 acreditado con las series identificadas; criterio manual aceptado con la excepción expresa. T022 puede cerrarse y la fase debe pasar la verificación independiente del subagente antes de la revisión humana y el squash merge.
