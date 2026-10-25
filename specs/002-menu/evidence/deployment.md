# T035 — Medición real del menú

Resultado: RNF-3 y el criterio de creación humana menor de 30 segundos cumplidos el 2026-10-25, a las 01:26:44 de Bolivia (`America/La_Paz`). Las [muestras originales](menu-performance.json) proceden de `npm run measure:menu`, ejecutado en la computadora de la persona con Chromium visible, contra Render y Neon de comprobación.

## Versión y entorno

- Rama: `feat/002-menu-pulido`.
- Commit medido: `85650aabb5166612555ab9f7f7827f6ca8b8a602`.
- Web: <https://kofi-web.onrender.com>.
- [Despliegue web en Render](https://dashboard.render.com/static/srv-dbe5trbl550s73f9g2kg/deploys/dep-dbeou7c9v7es73cnlmc0).
- [Despliegue API en Render](https://dashboard.render.com/web/srv-dbe5trbl550s73f9g2l0/deploys/dep-dbeoudbrjlhs738d9b0g).
- Ambos servicios mostraron «Live» y el mismo commit en Render antes de medir. El Blueprint también quedó apuntando a la rama de pulido.
- El 2026-10-25 a las 01:16:46 de Bolivia, `GET https://kofi-web.onrender.com/api/health` devolvió HTTP 200 con `{"status":"ok"}`.
- Se reutilizó la base de Neon de comprobación de Acceso. La persona informó que había cargado los 200 productos con `seed:menu`; el medidor comprobó exactamente 200 productos tanto en administración como en consulta. No se repitió la carga ni se cambió `DATABASE_URL`.

## Procedimiento y resultados

La persona ingresó como dueño directamente en Chromium. El medidor comprobó su rol y los 200 productos vigentes, excluyó un calentamiento por operación y midió veinte muestras de cada serie hasta ver el resultado en la interfaz. Los guardados hicieron un PUT real con los datos precargados, conservando nombre, categoría y precio.

| Serie | Muestras menores de 2 s | Percentil 95 |
| --- | --- | --- |
| Apertura de administración | 20/20 | 1,333 s |
| Consulta del menú vigente | 20/20 | 1,182 s |
| Guardado de producto | 20/20 | 1,187 s |

Cada serie supera el mínimo de 19/20. Los tiempos sin redondear y las 60 muestras se conservan en el JSON.

Después, la persona confirmó que estaba lista. Se inició el cronómetro y se abrió la administración; la persona completó y guardó un producto nuevo en una categoría existente. La respuesta de creación fue HTTP 201 y la interfaz mostró el producto y «Cambios guardados». El tiempo completo fue **11,9461429 segundos**, menor de 30 segundos. El medidor no completó el formulario; el producto adicional se conservó y no se eliminaron datos.

El informe y este documento no contienen credenciales, cookies ni datos de sesión. El commit que incorpora esta evidencia solo cambia documentación y evidencia; el código medido corresponde al commit indicado arriba.
