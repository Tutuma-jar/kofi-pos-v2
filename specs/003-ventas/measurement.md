# T026 — Medir Ventas en Render y Neon de comprobación

Estado: **medición real repetida tras corregir RF-2 (T035), el 2026-10-25 a las 21:36:30, hora de Bolivia**. Las muestras actuales están en [`measurement-results.json`](measurement-results.json).

## Resultado real de T026 y reevaluación T035

Se ejecutó de nuevo `npm run measure:sales` desde Chromium en la computadora de la persona, contra `https://kofi-web.onrender.com`, con los 200 productos vigentes del seed y el código corregido de T034. La persona ingresó directamente en Chromium y realizó la venta manual; el medidor ejecutó las tres series automáticas. Se excluyó un calentamiento por operación y se conservaron las 22 ventas ficticias de esta ejecución.

| Criterio | Resultado | p95 | Veredicto |
| --- | --- | --- | --- |
| Abrir Nueva venta < 2000 ms | 20/20 | 1379,913 ms | Cumple |
| Cambiar la preparación < 1000 ms | 20/20 | 560,007 ms | Cumple |
| Registrar venta < 2000 ms | 20/20 | 460,790 ms | Cumple |
| Venta humana de tres productos < 30000 ms | 9218,840 ms | — | Cumple |

Todas las operaciones medidas quedaron bajo sus límites estrictos. Los valores completos sin redondear están en el JSON. La primera ejecución de T026 (commit `5b5c34a`) había cumplido con 19/20 aperturas y 20/20 cambios y registros, y una venta humana de 9807,158 ms. T035 sustituye la evidencia actual porque T034 cambió código de la interfaz; la primera ejecución permanece en el historial de Git.

Render confirmó **Live** en ambos servicios sobre `f548356a09bbf74b4dd21715593a51fb62618cdb`, rama `feat/003-ventas-pulido`: [despliegue de la API](https://dashboard.render.com/web/srv-dbe5trbl550s73f9g2l0/deploys/dep-dbfaqus9v7es73d9gmq0) y [despliegue web](https://dashboard.render.com/static/srv-dbe5trbl550s73f9g2kg/deploys/dep-dbfaqus9v7es73d9gmt0). La sincronización inicial del Blueprint fue `exe-dbfae4tg1s2s73f2afl0`; T034 se desplegó automáticamente al publicar la corrección. `GET /api/health` a través de la web respondió 200 con `{"status":"ok"}` antes de medir.

Se contrastó sin divulgar credenciales que Render y el entorno local usan la misma base de Neon ya preparada. Antes de T035 había 202 productos activos, incluidos los 200 del seed, y las 22 ventas de T026. Se desactivaron temporalmente «comida» y «comida2» mediante los servicios de Menú de la API; al terminar se reactivaron ambos. La base conserva sus cuentas, los 202 productos activos y las 44 ventas ficticias de ambas ejecuciones. No se borraron datos ni se cambió la conexión privada. Para repetir, hay que volver a preparar exactamente los 200 productos vigentes del seed (D-15).

## 1. Actualizar la computadora usada para medir

Desde la raíz de este repositorio, en tu terminal interactiva, con Node 24 y npm 11:

```text
git switch feat/003-ventas-pulido
git pull --no-rebase
npm install
npm run build:contracts
npx playwright install chromium
git rev-parse HEAD
```

Conserva el SHA que devuelve el último comando: debe coincidir con ambos despliegues de Render antes de medir. No hagas cambios en el menú ni en el código durante la medición.

## 2. Preparar la base de comprobación en Neon

Si la persona ya preparó una base de comprobación con los 200 productos del seed y sus cuentas, se puede reutilizar tras contrastar la conexión local con Render sin mostrar sus credenciales. No vuelvas a ejecutar el seed sobre esa base. Si las pruebas anteriores dejaron productos adicionales, desactívalos temporalmente mediante Menú y reactívalos al terminar: deben quedar exactamente los 200 productos vigentes del seed durante toda la medición (D-15). Conserva todos los datos y las ventas ficticias. Los pasos siguientes son para preparar una base nueva cuando no existe una adecuada.

1. En tu proyecto de Neon, selecciona una **rama de comprobación**, separada de producción, en el selector superior. Abre **Postgres database → Databases → Add database**; escribe un nombre nuevo, por ejemplo `kofi_ventas_comprobacion`, selecciona su propietario y pulsa **Create**. Neon permite varias bases por rama. También sirve un proyecto nuevo con su base vacía. [Crear bases en Neon](https://neon.com/docs/manage/databases).
2. En **Connect**, selecciona esa rama, **esa base** y el rol que la posee. Copia su cadena PostgreSQL privada con TLS. La cadena se usará únicamente en `apps/api/.env` y en `DATABASE_URL` de Render. [Conectar una aplicación a Neon](https://neon.com/docs/connect/connect-from-any-app).
3. Abre `apps/api/.env` en tu editor local (si falta, copia `.env.example`). Conserva en privado tu configuración anterior y cambia `DATABASE_URL` a la base nueva. Para estos comandos locales deja `NODE_ENV=development` y `PORT=3000`. No envíes el archivo ni la cadena por chat o al PR.

Se pide una base **vacía**, no una copia de solo esquema: el proyecto mantiene las migraciones aplicadas en `schema_migrations`. Una copia del esquema sin esas filas no equivale a una base recién creada. No borres tablas ni datos para preparar la prueba.

Desde la raíz:

```text
npm run migrate -w @kofi/api
npm run seed:menu -w @kofi/api
npm run accounts -w @kofi/api -- create
```

El seed debe indicar **«Menú de prueba cargado: 200 productos»**. Crea una cuenta de comprobación con rol `cashier` u `owner`; la CLI pide la contraseña sin eco. Si la cuenta ya existe en una base preparada, puedes reutilizarla.

El seed crea `Producto de prueba 001` a `Producto de prueba 200`, activos a Bs 10,00. Rechaza una base que ya tenga productos y no elimina nada. Una base reutilizada debe tener exactamente esos 200 productos vigentes antes de medir. Un error del seed se resuelve comprobando la base seleccionada, sin ejecutar borrados.

## 3. Desplegar el mismo commit en los dos servicios de Render

1. En el **Blueprint existente** de comprobación de Render, enlaza la rama `feat/003-ventas-pulido`, con `render.yaml` en la raíz del repositorio. Sincronízalo; si no usas sincronización automática, pulsa **Manual Sync**. No crees otro Blueprint que gestione los mismos servicios. [Blueprints de Render](https://render.com/docs/infrastructure-as-code).
2. En **kofi-api → Environment**, configura `DATABASE_URL` con la cadena privada de la base del paso 2. Guarda los cambios y despliega. `sync: false` no cambia una variable secreta ya existente al sincronizar el Blueprint: debes actualizarla tú en el servicio. Mantén `NODE_ENV=production`, como indica el YAML. [Variables de Blueprint](https://render.com/docs/blueprint-spec#prompting-for-secret-values).
3. Comprueba que **kofi-api** y **kofi-web** apunten a `feat/003-ventas-pulido`. Si hace falta, usa el despliegue manual del último commit. En la página de despliegues de cada servicio, espera **Live** y compara su SHA con `git rev-parse HEAD`. Ambos deben mostrar el mismo código preparado. Guarda los enlaces de esos dos despliegues. [Despliegues de Render](https://render.com/docs/deploys).
4. Abre [la salud de la API a través de la web](https://kofi-web.onrender.com/api/health): debe responder HTTP 200 con `{"status":"ok"}`. Reactiva primero el servicio si estaba suspendido; ese primer acceso no se mide.

El Blueprint de esta rama configura `feat/003-ventas-pulido` para ambos servicios y mantiene el proxy web hacia `https://kofi-api.onrender.com/api/*`. Si tus servicios usan otras URLs, detén esta guía y comunica únicamente sus URLs públicas para adaptar el proxy y el medidor; no envíes cadenas de conexión.

## 4. Ejecutar la medición asistida

En la misma computadora y conexión que se usan para comprobar el sistema:

```text
npm run measure:sales
```

1. Se abre Chromium visible en [la web de comprobación](https://kofi-web.onrender.com/ingresar). Ingresa tú con la cuenta preparada. La contraseña se escribe **solo en Chromium**. El medidor no pide usuario ni contraseña en la terminal.
2. Comprueba el menú de 200 productos y excluye un calentamiento por operación. Déjalo trabajar sin usar esa ventana: mide **20 aperturas**, **20 cambios** y **20 registros**, incluyendo respuesta, actualización de la interfaz y pintado. Para los registros elige automáticamente Efectivo y registra ventas ficticias; la preparación queda vacía entre ellas.
3. La terminal muestra las tres cuentas y guarda el informe parcial. Cuando te lo indique, prepara la acción humana: al pulsar **Enter en la terminal**, se abrirá Nueva venta y empezará el cronómetro. Elige tú **tres productos distintos**, una unidad de cada uno, elige Efectivo o QR y pulsa **Registrar venta**. El cronómetro termina al ver la confirmación. El medidor no elige productos ni registra por ti durante esta parte.
4. El informe final sustituye al parcial e incluye la venta humana. Se crean **21 ventas automáticas** (20 medidas y un calentamiento) más **una humana** en la base de comprobación. Las ventas se conservan y no se eliminan. El menú sigue teniendo 200 productos, por lo que se puede repetir la prueba. Un error detiene la secuencia sin reintentar registros automáticamente.

No uses argumentos, entrada redirigida, `DEBUG` ni `PWDEBUG`. Si una operación falla, el medidor se detiene y cierra su sesión sin imprimir cookies o datos internos. Si falla la parte humana, el JSON conserva las tres series sin acreditar la venta humana; informa el error antes de repetir.

## 5. Enviar los resultados

Para encontrar el archivo del informe, sin abrir la configuración privada:

```text
git rev-parse --git-path sales-performance.json
```

Envía **ese JSON** y los enlaces de los despliegues web y API. El informe incluye fecha y hora de Bolivia, URL pública, commit local, las 60 duraciones originales y el tiempo humano. No contiene contraseñas, cookies ni `DATABASE_URL`.

Incluye también la confirmación de que los dos servicios estaban Live con ese commit y usaban la base de comprobación, y de que mediste desde la computadora y conexión destinadas a comprobar el sistema. No es necesario enviar capturas de Environment, Connect ni archivos `.env`.

| Criterio | Resultado necesario |
| --- | --- |
| Aperturas | Al menos 19/20 **< 2000 ms** |
| Cambios | Al menos 19/20 **< 1000 ms** |
| Registros | Al menos 19/20 **< 2000 ms** |
| Venta humana de tres productos | **< 30000 ms** |

Un tiempo igual al límite no cumple. Una salida no exitosa del medidor puede indicar que un criterio no se cumplió; envía el informe y el mensaje de la terminal sin datos privados para revisarlo. No sustituyas la medición real con los resultados de `test:measure`.

La evidencia real acredita T026 y su reevaluación T035 en el PR de Pulido; T027 documenta el uso del módulo y después se delega la verificación completa. El retorno de Blueprint y servicios a `main`, con la base de producción, se hace al publicar la especificación por el flujo humano del proyecto; esta preparación no fusiona ni publica producción.
