# Kofi POS

Kofi POS es el sistema web de punto de venta de **Kofi**, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia.

## Equipo

- Pablo Ramírez ([@Tutuma-jar](https://github.com/Tutuma-jar))
- Natalia Arteaga

## Módulos

| Módulo | Especificación | Estado |
| --- | --- | --- |
| Acceso | `specs/001-acceso/` | Implementado; pulido en revisión |
| Menú | `specs/002-menu/` | US1, US2 y US3 implementadas; medición de T035 cumplida, en revisión |
| Ventas | `specs/003-ventas/` | US1 y US2 implementadas; medición de T026 cumplida, pulido en revisión |
| Dashboard | `specs/004-dashboard/` | Pendiente |
| Historial y reportes | `specs/005-historial/` | Pendiente |

El estado se actualiza en el PR que completa cada especificación.

## Arquitectura

TypeScript en todo el monorepo (Node 24 y workspaces de npm): interfaz con React y Vite, API con Fastify y contrato con Zod, sobre PostgreSQL. Se despliega en Render (interfaz y API) y Neon (base de datos). El detalle está en la [constitución](docs/constitution.md) y en [docs/architecture.md](docs/architecture.md).

```
apps/web/            interfaz web
apps/api/            API
packages/contracts/  contrato compartido entre interfaz y API
docs/                constitución, reglas de negocio y arquitectura
specs/               una carpeta por funcionalidad: spec.md, plan.md y tasks.md
```

Cada PR hacia `develop` debe pasar dos checks: `technical-checks` (tipos, lint, formato, pruebas y build) y `pr-rules` (rama, título y descripción del PR).

## Requisitos

Una vez por computadora (Windows):

1. Git: `winget install Git.Git`
2. Node 24, con `node` en el PATH del sistema
3. GitHub CLI: `winget install GitHub.cli` y luego `gh auth login`
4. Identidad de Git: `git config --global user.name "…"` y `git config --global user.email "…"`
5. En la app de Codex: usar el agente nativo de Windows y marcar el proyecto como de confianza
6. Confiar en los hooks de agente del proyecto:
   - En Claude, aceptar el aviso de confianza de la carpeta al abrir el proyecto. Para verlos, `/hooks` en Claude Code desde la terminal (`claude`); la app de escritorio no tiene ese comando.
   - En Codex, revisar y confiar en `SessionStart` y `PreToolUse` en **Settings → Hooks**. Codex pide hacerlo de nuevo cada vez que cambia `.codex/hooks.json`, y mientras tanto no ejecuta los hooks que cambiaron.

## Instalación

```bash
git clone https://github.com/Tutuma-jar/kofi-pos-v2.git
cd kofi-pos-v2
npm install   # dependencias, hooks de Git, skills y subagente del proyecto
```

## Desarrollo de Acceso

Ejecuta todos los comandos desde la raíz del repositorio, con Node 24 y npm 11.

### Preparar la base y el contrato

1. Crea una base propia de desarrollo en Neon; usa una rama distinta de producción y de las bases de las otras personas.
2. Copia `apps/api/.env.example` como `apps/api/.env` y completa `DATABASE_URL` con la cadena privada de esa base (con `?sslmode=require`). Mantén `PORT=3000` y `NODE_ENV=development`: el proxy web apunta a ese puerto. `.env` no se versiona; no compartas su contenido por chat ni en el PR.
3. Compila el contrato y aplica las migraciones:

```sh
npm run build:contracts
npm run migrate -w @kofi/api
```

Las migraciones pendientes se aplican en orden. Repetir el comando no vuelve a aplicar las ya registradas.

### Preparar las cuentas

Las cuentas se preparan con la CLI; no hay registro ni gestión de cuentas en la interfaz:

```sh
npm run accounts -w @kofi/api -- create
```

La CLI pide estos datos, en este orden:

| Dato | Qué escribir |
| --- | --- |
| Usuario | De 3 a 30 caracteres: letras a–z, dígitos, punto, guion o guion bajo. No distingue mayúsculas ni espacios alrededor y debe ser único. |
| Nombre visible | De 1 a 40 caracteres: el nombre que se mostrará en el sistema. |
| Rol | `owner` para dueño o `cashier` para cajero. |
| Contraseña | De 8 a 64 caracteres, no solo espacios. Escríbela en la terminal: no se muestra mientras la introduces. |

Repite `create` para cada persona. El dueño elige las contraseñas y las entrega a cada persona en privado. No las escribas en archivos, ejemplos, argumentos de comandos, chat ni PR.

Para comprobar las cuentas preparadas:

```sh
npm run accounts -w @kofi/api -- list
```

`list` muestra usuario, nombre visible y rol; nunca contraseñas ni hashes. La misma CLI admite `update` y `delete`, y pide los datos de forma interactiva. Cambiar el rol o la contraseña, o eliminar una cuenta, termina sus sesiones; cambiar solo el nombre visible las conserva.

### Arrancar con tres terminales

Deja estos procesos abiertos, cada uno en una terminal situada en la raíz:

Terminal 1 — recompilar el contrato al guardar:

```sh
npm run dev -w @kofi/contracts
```

Terminal 2 — API con la configuración de `apps/api/.env`:

```sh
npm run dev -w @kofi/api
```

Terminal 3 — interfaz con el proxy hacia la API:

```sh
npm run dev -w @kofi/web
```

Abre la URL que indica Vite (por defecto, [http://localhost:5173/ingresar](http://localhost:5173/ingresar)). Ingresa con una cuenta preparada: verás su nombre, su rol y «Cerrar sesión». La comprobación de salud está en [http://localhost:5173/api/health](http://localhost:5173/api/health), pasando por el proxy web, y debe responder `{"status":"ok"}`.

El ingreso mantiene una sesión por navegador. Cinco intentos fallidos en quince minutos bloquean la cuenta durante cinco minutos; la sesión vence a las doce horas. El detalle y los casos de prueba están en [SPEC-001](specs/001-acceso/spec.md).

### Comprobar Acceso

```sh
npm run test
npx playwright install chromium
npm run test:e2e
```

Las pruebas usan cuentas ficticias y una base en memoria. Los comandos compilan antes el contrato; E2E también compila la web y levanta sus propios servidores. Las demás comprobaciones están en [AGENTS.md](AGENTS.md#comandos).

Para medir el despliegue de comprobación con una persona, usa `npm run measure:access`: pide una contraseña oculta en la terminal, automatiza veinte ingresos y cierres después del calentamiento y luego cronometra un ingreso manual. RNF-4 exige al menos 19 de 20 ingresos en menos de 3 segundos y 19 de 20 cierres en menos de 2 segundos; el ingreso manual debe tardar menos de 15 segundos. El primer acceso tras la suspensión del servicio queda excluido. La evidencia de Pulido y su reevaluación aprobada están en [el informe de tiempos](specs/001-acceso/evidence/access-performance.json) y en [el plan](specs/001-acceso/plan.md#pulido--medición-asistida-t043).

## Menú

El dueño abre **Administrar menú** desde la pantalla inicial (`/menu/administrar`). Para cargar lo que vende Kofi:

1. Elige **Crear categoría**, escribe su nombre y guarda con Intro o **Guardar categoría**.
2. Elige **Crear producto**, escribe su nombre, elige una categoría activa y escribe el precio en bolivianos (por ejemplo, `12,50`). Guarda con Intro o **Guardar producto**.
3. Comprueba **Cambios guardados** y el producto en la lista, con su precio como «Bs 12,50». **Renombrar** y **Editar** permiten corregir los datos. Los mensajes de validación aparecen junto a cada campo y conservan lo escrito.

El dueño puede **Desactivar** y **Reactivar** productos y categorías desde su fila, sin borrarlos. Una categoría con productos activos no se puede desactivar; antes hay que desactivarlos o moverlos. Reactivar una categoría conserva el estado de sus productos. Para reactivar un producto, su categoría debe estar activa.

Dueño y cajero abren **Ver menú** desde inicio (`/menu`): ven solo los productos activos de categorías activas y sus precios, sin opciones de edición. Los cambios posteriores aparecen al volver a abrir o recargar la consulta. El cajero no puede administrar ni modificar el menú.

### Cargar los 200 productos de prueba de T035

Prepara una base propia de comprobación en Neon, sin productos, y configura su `DATABASE_URL` en `apps/api/.env`, como en «Preparar la base y el contrato». Usa esa misma base en el despliegue de comprobación de Render. Desde la raíz:

```sh
npm run build:contracts
npm run seed:menu -w @kofi/api
```

El script aplica las migraciones pendientes y carga 200 productos ficticios mediante los servicios de Menú, en una transacción. Se niega a cargar si ya hay productos, incluidos los inactivos; no elimina datos. Un error revierte toda la carga. Estos datos son solo para comprobación, no el menú real del local. Prepara las cuentas con `npm run accounts -w @kofi/api -- create`, introduciendo la contraseña oculta en la terminal.

**T035 medida el 2026-10-25:** las tres series cumplieron 20/20 operaciones menores de 2 segundos y la creación humana tardó 11,946 segundos. La [evidencia del despliegue](specs/002-menu/evidence/deployment.md) y las [60 muestras originales](specs/002-menu/evidence/menu-performance.json) registran los resultados. Para repetir aquella medición, configura el Blueprint y ambos servicios con `feat/002-menu-pulido`, la base de comprobación y el proxy de `/api` funcionando. El `render.yaml` de aquella rama contiene esa configuración; comprueba en Render que tanto la web como la API desplieguen el commit que se va a medir. La rama actual de Pulido de Ventas apunta a `feat/003-ventas-pulido`.

Para automatizar las series y el cronómetro desde la computadora usada para comprobar el sistema:

```sh
npx playwright install chromium
npm run measure:menu
```

Chromium se abre en la web de comprobación. Ingresa tú con una cuenta de dueño, escribiendo la contraseña solo en ese navegador. El medidor exige exactamente 200 productos, todos vigentes; excluye un calentamiento por operación y mide las tres series de veinte operaciones reales hasta ver su resultado en la interfaz. Los guardados conservan los datos precargados del producto. No uses esa ventana mientras se ejecutan los ciclos. Después, la terminal te pedirá pulsar Intro: se abrirá la administración y deberás crear tú un producto nuevo, con nombre único, categoría existente y precio. El cronómetro termina al verlo guardado en la lista. Esa creación deja un producto adicional; no se elimina automáticamente. Una repetición exige volver a disponer de 200 productos.

El JSON sin credenciales se guarda en la ruta que muestra `git rev-parse --git-path menu-performance.json`. Incluye todas las duraciones, los límites, la hora de Bolivia y el commit local para contrastarlo con los desplegados en Render. La creación automatizada de un producto no sustituye la prueba humana. `npm run test:measure` verifica los medidores con datos ficticios y `npm run test:measure:menu` comprueba solo el de Menú.

Con los servicios ya reactivados y los 200 productos cargados, mide desde la computadora del local 20 aperturas de la administración, 20 de la consulta y 20 guardados de productos existentes. Cronometra desde la acción hasta ver la lista o la confirmación actualizada: al menos 19 de cada serie deben tardar menos de 2 segundos. Excluye la primera operación tras la suspensión del servicio. Después, cronometra crear un producto en una categoría existente desde que se abre la administración: debe tardar menos de 30 segundos. Anota las duraciones, la fecha en hora de Bolivia, las URLs y el commit desplegado en el PR de pulido. La ejecución de las pruebas locales no sustituye esta medición; consulta [el plan de Menú, §8.3](specs/002-menu/plan.md#83-requisitos-no-funcionales).

## Ventas

Dueño y cajero abren **Nueva venta** desde la pantalla inicial (`/ventas/nueva`). Eligen productos del menú vigente y ajustan sus cantidades con **+**, **−** o **Quitar**. La API calcula los subtotales y el total con los precios vigentes, en bolivianos. Si el menú cambió, la preparación se actualiza y muestra los avisos para revisarla antes de registrar.

Elige **Efectivo** o **QR**, sin opción seleccionada de antemano, y pulsa **Registrar venta**. La confirmación muestra el número, total, medio de pago y fecha en hora de Bolivia; la preparación queda vacía para la siguiente venta. La venta registrada conserva los nombres, categorías, precios y cantidades del momento, además de quién la registró. Un doble clic o un reintento tras perder la respuesta no duplica la venta.

La venta en preparación conserva sus líneas, cantidades y medio de pago en el mismo navegador al navegar, recargar, cerrar una pestaña o vencer la sesión. Al recuperarla, la API vuelve a calcularla con el menú vigente. Las pestañas comparten la preparación y reflejan su registro o descarte. **Cerrar sesión**, la terminación de la sesión por cambios de la cuenta o abrir Nueva venta con otra cuenta descartan la preparación anterior; una cuenta no recibe la de otra. **Descartar venta** pide confirmación: **Volver** conserva lo preparado y **Descartar** lo vacía sin registrar una venta.

**T026 medida y reevaluada en T035 el 2026-10-25:** tras corregir RF-2, con 200 productos vigentes de prueba, cumplieron 20/20 aperturas y 20/20 registros por debajo de 2 segundos, y 20/20 cambios por debajo de 1 segundo. La persona registró una venta de tres productos distintos en **9,219 segundos**. El [informe de Render y Neon](specs/003-ventas/measurement.md) y las [60 muestras actuales y el tiempo humano](specs/003-ventas/measurement-results.json) documentan la ejecución real.

Para repetirla desde la computadora usada para comprobar el sistema, sigue la preparación de Neon y Render del informe y ejecuta `npm run measure:sales`. Ingresa directamente en Chromium, deja trabajar al medidor y después registra tú la venta de tres productos cuando lo indique la terminal. Se conservan las ventas ficticias; la prueba humana no se automatiza. `npm run test:measure` comprueba los medidores con datos ficticios.

## Dashboard

Dueño y cajero abren **Resumen de ventas** desde la pantalla inicial (`/resumen`). Los dos ven **Hoy**, con la fecha de Bolivia, el total vendido, la cantidad de ventas, la venta promedio, el desglose de **Efectivo** y **QR** y hasta cinco productos más vendidos con sus unidades e importes. El dueño ve después el resumen del **mes en curso** y una tabla con cada día desde el 1 hasta hoy, incluidos los días sin ventas. El cajero no pide ni ve el resumen del mes.

La API calcula las cifras usando las ventas registradas y sus nombres y precios históricos. Las fechas y el momento «Datos al…» se muestran en hora de Bolivia, y los importes, en bolivianos. **Actualizar** vuelve a consultar los resúmenes; no hay actualización automática. Durante la carga o ante un error de conexión o del servidor se conservan las cifras anteriores. Un período sin ventas muestra ceros, «—» como promedio y su aviso.

**T022 pendiente:** todavía falta desplegar y medir RNF-3 y el criterio de 10 segundos en Render y Neon. Las pruebas locales y E2E no acreditan esos tiempos. La persona ejecutará esa tarea; [el PR de pulido](https://github.com/Tutuma-jar/kofi-pos-v2/pull/33) contiene los pasos exactos de preparación, carga y medición. Esta documentación (T023) se entrega antes de T022 por autorización expresa, sin declarar terminada la fase de Pulido.

Para preparar la base de comprobación nueva, después de las migraciones, las cuentas y los 200 productos de `seed:menu`, se dispone de:

```text
npm run build:contracts
npm run seed:sales -w @kofi/api
```

`seed:sales` usa la `DATABASE_URL` local de `apps/api/.env`, exige una base sin ventas y exactamente 200 productos vigentes, y carga 6000 ventas ficticias repartidas desde el primer día del mes hasta hoy. Requiere una cuenta existente, prefiere cajero y alterna Efectivo y QR. Toda la carga es atómica: un error revierte ventas, líneas y contador. Rechaza `NODE_ENV=production` antes de acceder a la base y no elimina datos ni permite repetir una carga. Debe usarse en la base de comprobación; el servicio de Render conserva su configuración de producción. La preparación y la medición deben hacerse dentro del mismo mes de Bolivia.

Por instrucción expresa de la persona, también puede prepararse la base existente con `npm run seed:sales -w @kofi/api -- --complete`. Este modo exige al menos 200 productos vigentes y añade solo las ventas que faltan para llegar a 6000 en el mes hasta el momento de la carga. Conserva todos los productos y ventas previos; con 6000 no añade nada y con más de 6000 rechaza la operación. La evidencia de T022 debe indicar el volumen real del menú y de ventas; sigue pendiente la medición del despliegue.

Para medir desde la computadora del local, ejecutar `npm run build:contracts` y `npm run measure:dashboard` en una terminal interactiva, sin argumentos ni depuración. El medidor abre Chromium: ingresa primero como dueño y, cuando se abra la segunda ventana, como cajero, con la contraseña solo en el navegador. Por cada rol excluye un calentamiento y mide veinte aperturas y veinte actualizaciones; no uses la ventana durante las series. Después aparecen controles del medidor: desde la pantalla inicial pulsa **Comenzar**, abre tú **Resumen de ventas**, identifica el total de hoy y pulsa **Ya identifiqué el total de hoy**. El programa no hace ese recorrido ni confirma la lectura por ti. Cada serie exige al menos 19/20 muestras bajo 2 segundos y cada recorrido humano debe durar menos de 10 segundos. El informe, sin credenciales, se guarda en la ruta de `git rev-parse --git-path dashboard-performance.json`. Los SHA desplegados de web y API se acreditan aparte del SHA local del medidor; las pruebas con datos ficticios están en `npm run test:measure`.

El Blueprint de comprobación apunta a `feat/004-dashboard-pulido` tanto en la API como en la web. Antes de abrir Chromium, el medidor verifica que el bundle público de la web ya contenga ambas secciones del Dashboard. Si todavía sirve una versión anterior, detiene la medición sin pedir credenciales; sincroniza el Blueprint y comprueba el despliegue Live de ambos servicios antes de repetirla.

## Flujo de trabajo

Las reglas completas están en [AGENTS.md](AGENTS.md) y la [constitución](docs/constitution.md), que Claude y Codex cargan automáticamente.

Cada funcionalidad sigue el ciclo de desarrollo guiado por especificaciones. El agente invoca la skill de cada paso cuando le toca, y una persona aprueba cada paso antes del siguiente o delega sus decisiones (por ejemplo, «delego 001-acceso»): en ese caso el agente decide con sus recomendaciones, las registra y todo se revisa en el PR antes de fusionarlo. Las skills también se pueden invocar a mano:

| Paso | Cómo |
| --- | --- |
| 1. Especificar | `/especificar` (Claude) o `$especificar` (Codex) → `spec.md` |
| 2. Revisar | `/revisar-spec` → lista de hallazgos |
| 3. Planificar | `/planificar` → `plan.md` |
| 4. Desglosar | `/desglosar` → `tasks.md`, en fases por historia |
| 5. Analizar | `/analizar` → consistencia entre documentos, antes de programar |
| 6. Implementar | `/implementar T<nnn>` → una tarea, tests primero |
| 7. Verificar | Automático: el subagente `verificador` recorre los RF |
| 8. Integrar | Una persona revisa y fusiona con squash merge |

Cada especificación se entrega **por historias priorizadas**: un PR de definición (con el contrato), un PR por historia (`feat/NNN-<nombre>-usN`) y un PR de pulido. Dentro de cada historia, la interfaz (contra un cliente simulado del contrato) y la API avanzan en paralelo, y la historia cierra integrada y probada de punta a punta.

### Hooks de Git

| Hook | Qué hace |
| --- | --- |
| `post-checkout` | Coloca cada rama nueva sobre `origin/develop` actualizado |
| `pre-commit` | Impide commits en `develop` y `main` y commits con secretos |
| `prepare-commit-msg` | Agrega `Refs: SPEC-NNN` según la rama |
| `pre-push` | Valida el nombre de la rama e impide pushes a `develop` o `main` y el force push |
| `post-merge` | Avisa si cambiaron las dependencias |

`npm run hooks` muestra si están activos.

### Hooks de agente

| Hook | Qué hace |
| --- | --- |
| `SessionStart` | Entrega la constitución al agente y le avisa si falta preparar el entorno |
| `PreToolUse` | Impide que el agente salte los hooks de Git, haga force push, publique en `develop` o `main` o fusione PR |

Si un cambio modifica `.codex/hooks.json`, cada persona que use Codex debe volver a confiar en los hooks en **Settings → Hooks** y abrir una sesión nueva.

## Skills de terceros

Cada persona instala estas skills en su computadora siguiendo su guía oficial, y las usa manualmente. No se copian al repositorio ni se modifican.

- **Impeccable:** https://impeccable.style/tutorials/getting-started/
- **Emil Design Engineering:** https://emilkowal.ski/skill
