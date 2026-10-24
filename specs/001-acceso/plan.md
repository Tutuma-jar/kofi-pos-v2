# Plan — SPEC-001 Acceso

Estado: aprobado (corregido tras el análisis de consistencia) · Fecha: 2026-10-24 · Especificación: [`spec.md`](spec.md)

Es la primera especificación del proyecto: además del módulo `auth`, crea los tres paquetes del monorepo (`apps/web`, `apps/api`, `packages/contracts`), sus herramientas (tipos, lint, formato, pruebas y build) y el despliegue.

## 1. Versión de la constitución

Se planifica con la **versión 1.0.0** de [`docs/constitution.md`](../../docs/constitution.md) (2026-10-23).

## 2. Control de la constitución

| Principio | ¿Se cumple? | Cómo / excepción justificada |
| --- | --- | --- |
| 1. Stack mínimo | Sí | TypeScript, Node 24, workspaces de npm, React con Vite, Fastify, Zod, PostgreSQL, Render y Neon. Cada dependencia nueva se justifica en §7: las decisiones D-6 a D-10 y la tabla completa de dependencias por paquete (§7.1). |
| 2. Especificación antes que código | Sí | Cada parte de este plan indica sus RF (§3 a §8), y entre todas cubren RF-1 a RF-14 (tabla de cobertura, §8.5). |
| 3. Lógica separada de la interfaz | Sí | El bloqueo, el vencimiento, la validez de la sesión y los mensajes con datos calculados (minutos de bloqueo) se resuelven en la API. La interfaz solo valida que los campos no estén vacíos con el esquema del contrato (RF-3) y decide a qué pantalla navegar (RF-6, RF-11). El contrato vive en `packages/contracts/src/auth.ts`. |
| 4. Tests primero | Sí | Cada RF tiene al menos un test automatizado (§8.5), que se escribe antes del código de su tarea. |
| 5. Persistencia segura | Sí | Solo la capa `shared/database` de la API toca la base. El ingreso (intentos, bloqueo y sesión) es una transacción. Cada cambio de cuenta es una sola sentencia: las sesiones no se modifican, sino que dejan de valer por el disparador de `session_version` o por `ON DELETE SET NULL` (§4, §5.2). Las contraseñas se guardan con hash (RNF-1) y los tokens de sesión, como SHA-256. Ningún secreto se versiona: solo `.env.example`. Las contraseñas de prueba de E2E son datos de prueba de una base en memoria, no secretos. |
| 6. Idioma | Sí | Código e identificadores en inglés (`auth`, `users`, `sessions`, `owner`, `cashier`). Los mensajes al usuario están en español y los devuelve la API. Las duraciones (12 h, 5 min, 15 min) no dependen de la zona horaria. Esta especificación no muestra fechas. |

Todos los principios se cumplen sin excepciones.

## 3. Módulos afectados y estructura

Se crean las carpetas que fija [`docs/architecture.md`](../../docs/architecture.md#3-estructura), solo con lo que esta especificación necesita.

```
package.json                     scripts de la raíz (typecheck, lint, format:check, test, test:e2e, build)
tsconfig.base.json               opciones comunes de TypeScript
eslint.config.js                 lint de todo el monorepo, con la regla de imports entre aplicaciones
.prettierrc.json
vitest.config.ts                 proyectos de Vitest: contracts, api y web
playwright.config.ts             E2E: levanta la API de E2E y la interfaz
render.yaml                      despliegue en Render (D-12)
e2e/
├── fixtures.ts                  cuentas de prueba de E2E
├── us1-iniciar-cerrar-sesion.spec.ts
└── us2-proteger-cuentas.spec.ts
packages/contracts/
└── src/
    ├── index.ts
    ├── errors.ts                formato común de errores (D-4)
    └── auth.ts                  contrato del módulo (§6)
apps/api/
├── .env.example                 DATABASE_URL, PORT
├── test/
│   ├── test-database.ts         PGlite en memoria con las migraciones aplicadas
│   └── e2e-server.ts            API para E2E: PGlite, cuentas de prueba, reloj y rutas de prueba
└── src/
    ├── server.ts                arranque: lee la configuración y escucha
    ├── app.ts                   buildApp(deps): registra plugins y módulos (lo usan las pruebas)
    ├── shared/
    │   ├── clock.ts             Clock { now(): Date } (inyectable en pruebas)
    │   ├── config/env.ts        variables de entorno validadas con Zod
    │   ├── database/
    │   │   ├── database.ts      interfaz Database (query, transaction) y adaptador de pg
    │   │   ├── migrate.ts       aplica las migraciones pendientes en orden
    │   │   └── migrations/001_auth.sql
    │   └── http/
    │       ├── errors.ts        AppError y manejador de errores → formato común
    │       └── validate.ts      valida cuerpos con los esquemas del contrato
    └── modules/auth/
        ├── index.ts             superficie pública: authPlugin, requireSession
        ├── auth.routes.ts       POST /login, POST /logout, GET /session            RF-1–RF-10, RF-12
        ├── auth.service.ts      ingreso, cierre y validación de sesión             RF-1, RF-2, RF-7–RF-12
        ├── auth.hook.ts         requireSession: preHandler para todos los módulos  RF-4, RF-5
        ├── users.repository.ts                                                     RF-1, RF-9, RF-13
        ├── sessions.repository.ts                                                  RF-6–RF-8, RF-10, RF-12
        ├── passwords.service.ts hash y verificación con scrypt                     RF-1, RNF-1
        ├── accounts.service.ts  crear, cambiar y eliminar cuentas                  RF-12, RF-13
        └── accounts.cli.ts      «npm run accounts»: preparación de las cuentas     RF-13
apps/web/
├── index.html
├── vite.config.ts               proxy de /api a la API en desarrollo (D-2)
└── src/
    ├── main.tsx                 monta la app; en desarrollo, el selector de escenarios
    ├── routes.tsx               /ingresar (pública) y / (protegida)
    ├── shared/
    │   ├── http/api-fetch.ts    fetch con credenciales; distingue error de red (RF-14)
    │   └── styles/
    └── modules/auth/
        ├── index.ts             superficie pública: SessionProvider, useSession, RequireSession, AuthenticatedLayout
        ├── api/
        │   ├── auth-client.ts   interfaz AuthClient y cliente HTTP real
        │   └── return-to.ts     guarda y recupera la pantalla de regreso (RF-11)
        ├── components/
        │   ├── SessionProvider.tsx   sesión actual en memoria; reacciona a 401        RF-4, RF-8, RF-10, RF-12
        │   ├── useSession.ts
        │   ├── RequireSession.tsx    guarda de rutas protegidas                        RF-4, RF-10, RF-12
        │   ├── AuthenticatedLayout.tsx  nombre, rol y «Cerrar sesión»               RF-5, RF-7
        │   └── LoginForm.tsx                                                         RF-1–RF-3, RF-9, RF-14
        ├── pages/
        │   ├── LoginPage.tsx    redirige si ya hay sesión; muestra avisos           RF-6, RF-10, RF-12
        │   └── HomePage.tsx     pantalla inicial                                    RF-5
        └── dev/
            ├── fixtures.ts
            ├── auth-demo-client.ts
            └── ScenarioPicker.tsx
```

- La API publica todas sus rutas bajo `/api`. Las del módulo quedan en `/api/auth/*`.
- `/api/health` responde `200` para la comprobación de salud de Render (Preparación; no traza a un RF).
- `HomePage` vive por ahora en `auth`, porque esta especificación es la única que la define (RF-5). Cuando otro módulo la amplíe, se moverá a `shared/` en ese PR.
- Los módulos se importan entre sí solo por su `index.ts` (D-11).
- Cada ruta protegida de la interfaz declara los roles que pueden verla (`roles`; por defecto, los dos). En esta especificación todas las rutas admiten los dos roles (RF-11).

### Scripts por paquete

| Paquete | Scripts |
| --- | --- |
| Raíz | `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `build` (compilan antes el contrato, D-14) |
| `@kofi/contracts` | `build` (`tsc`) y `dev` (`tsc --watch`) |
| `@kofi/api` | `dev` (D-13), `build` (`tsc`), `start`, `migrate` y `accounts` (§5.5) |
| `@kofi/web` | `dev`, `build` y `preview` (Vite) |

En desarrollo, cada persona abre tres terminales: `npm run dev -w @kofi/contracts`, `npm run dev -w @kofi/api` y `npm run dev -w @kofi/web`.

## 4. Modelo de datos

Migración `apps/api/src/shared/database/migrations/001_auth.sql`:

**`users`**: las cuentas (RF-1, RF-5, RF-9, RF-12, RF-13)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `username` | `text` | `UNIQUE`, normalizado (sin espacios alrededor y en minúsculas), `CHECK (username ~ '^[a-z0-9._-]{3,30}$')` |
| `display_name` | `text` | `CHECK (char_length(display_name) BETWEEN 1 AND 40)` |
| `role` | `text` | `CHECK (role IN ('owner', 'cashier'))` |
| `password_hash` | `text` | `scrypt$<N>$<r>$<p>$<sal>$<hash>` (base64url) |
| `session_version` | `integer` | `NOT NULL DEFAULT 1`. Un disparador lo incrementa cuando cambian `role` o `password_hash` (RF-12) |
| `locked_until` | `timestamptz` | `NULL` si la cuenta no está bloqueada (RF-9) |
| `created_at`, `updated_at` | `timestamptz` | `DEFAULT now()` |

**`failed_logins`**: intentos fallidos que cuentan para el bloqueo (RF-9)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `bigint` | PK, `GENERATED ALWAYS AS IDENTITY` |
| `user_id` | `uuid` | FK → `users`, `ON DELETE CASCADE`, con índice |
| `attempted_at` | `timestamptz` | `NOT NULL` |

**`sessions`**: una fila por sesión iniciada (RF-6 a RF-8, RF-10, RF-12)

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `token_hash` | `text` | `UNIQUE`; SHA-256 del token de la cookie (el token en sí no se guarda) |
| `user_id` | `uuid` | FK → `users`, `ON DELETE SET NULL`: si se elimina la cuenta, la sesión queda y se reconoce como terminada (RF-12) |
| `user_session_version` | `integer` | `session_version` de la cuenta al iniciar sesión |
| `created_at` | `timestamptz` | `NOT NULL` |
| `expires_at` | `timestamptz` | `created_at + 12 h` (RF-10) |
| `revoked_at` | `timestamptz` | `NULL` mientras la sesión no se cierre (RF-7) |

Ejemplo:

```text
users
id                                    username  display_name  role     session_version  locked_until
4c1f…-9a2e                            ana       Ana Quispe    owner    1                NULL
b7d0…-11c3                            luis      Luis Mamani   cashier  2                2026-11-03 10:17:00-04

sessions
id          token_hash  user_id     user_session_version  created_at              expires_at              revoked_at
0e9a…-c1    a3f5…       4c1f…-9a2e  1                     2026-11-03 07:58:00-04  2026-11-03 19:58:00-04  NULL
51bb…-07    9c02…       b7d0…-11c3  1                     2026-11-03 08:02:00-04  2026-11-03 20:02:00-04  NULL   ← terminada: la cuenta va por la versión 2
```

## 5. Algoritmos relevantes

### 5.1 Ingreso (RF-1, RF-2, RF-9, RNF-2)

```text
login(username, password, previousToken?):
  name ← lowercase(trim(username))
  now  ← clock.now()
  transaction:
    user ← SELECT … FROM users WHERE username = name FOR UPDATE
    if user is null:
      verifyPassword(password, DUMMY_HASH)          # mismo costo de tiempo (RNF-2)
      fail INVALID_CREDENTIALS                      # 401, sin contar ni bloquear
    if user.locked_until > now:
      fail ACCOUNT_LOCKED(ceil((user.locked_until − now) / 1 min))   # 429; no cuenta ni alarga
    if not verifyPassword(password, user.password_hash):
      INSERT failed_logins(user.id, now)
      recent ← COUNT failed_logins WHERE user_id = user.id AND attempted_at > now − 15 min
      if recent ≥ 5:
        UPDATE users SET locked_until = now + 5 min
        DELETE failed_logins WHERE user_id = user.id   # tras el bloqueo se cuenta desde cero
      fail INVALID_CREDENTIALS                      # el quinto fallo aún responde «incorrectos»
    DELETE failed_logins WHERE user_id = user.id      # un ingreso correcto reinicia
    UPDATE users SET locked_until = NULL
    if previousToken: revoke(previousToken)          # la sesión anterior de ese navegador
    token ← 32 bytes aleatorios (base64url)
    INSERT sessions(id, sha256(token), user.id, user.session_version, now, now + 12 h)
  return (token, toSessionUser(user))
```

### 5.2 Validación de la sesión en cada petición protegida (RF-4, RF-8, RF-10, RF-12)

```text
resolveSession(token):
  if token is missing: return SESSION_MISSING
  row ← SELECT s.*, u.* FROM sessions s LEFT JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = sha256(token)
  if row is null or row.revoked_at is not null: return SESSION_MISSING          # RF-4, RF-8
  if row.user_id is null or u.session_version ≠ s.user_session_version:
      return SESSION_TERMINATED                                                  # RF-12
  if clock.now() ≥ row.expires_at: return SESSION_EXPIRED(u.id)                 # RF-10; la cuenta, para RF-11
  return toSessionUser(u)
```

`requireSession` llama a `resolveSession`. Si falla, responde `401` con el código, borra la cookie y no ejecuta el manejador de la ruta, así que la operación no aplica ningún cambio (RF-10, RF-12). Solo `SESSION_EXPIRED` incluye `userId`: la cuenta de la sesión vencida, que solo recibe el navegador que tenía esa cookie. Así la interfaz sabe a qué cuenta pertenecía aunque se haya recargado (RF-11).

### 5.3 Cierre de sesión (RF-7, RF-8)

```text
logout(token):
  if token: UPDATE sessions SET revoked_at = now WHERE token_hash = sha256(token) AND revoked_at IS NULL
  borrar la cookie; responder 204       # idempotente: sin sesión también responde 204
```

Solo se cierra la sesión de ese token. Las demás sesiones de la cuenta siguen válidas (RF-8).

### 5.4 Contraseñas (RF-1, RNF-1)

```text
hashPassword(pw):    sal ← 16 bytes aleatorios; h ← scrypt(pw, sal, 64, N=2^15, r=8, p=3, maxmem=64 MiB)
                     return "scrypt$32768$8$3$" + b64url(sal) + "$" + b64url(h)
verifyPassword(pw, stored): recalcula con los parámetros guardados y compara con timingSafeEqual
```

Se guardan los parámetros junto al hash para poder subirlos más adelante sin invalidar las contraseñas existentes.

### 5.5 Cambios de cuenta (RF-12, RF-13)

```text
createAccount(input):    valida con accountInputSchema (Datos de una cuenta); username normalizado;
                         si ya existe → «Ya existe una cuenta con el usuario <u>» (RF-13)
updateAccount(u, cambios): UPDATE users …   # el disparador sube session_version si cambian rol o contraseña
deleteAccount(u):        DELETE FROM users … # las sesiones quedan con user_id NULL → SESSION_TERMINATED
```

`accounts.cli.ts` expone `create`, `update`, `delete` y `list`. Pide la contraseña sin mostrarla y nunca la recibe como argumento, para que no quede en el historial de la consola.

### 5.6 Interfaz: navegación (RF-4, RF-6, RF-10, RF-11, RF-12)

```text
RequireSession (en cada ruta protegida, al abrirla o recargarla, y en pageshow persistido):
  r ← authClient.getSession()
  ok                         → mostrar la pantalla
  SESSION_EXPIRED(userId)    → returnTo.save(userId, rutaPedida); ir a /ingresar con el aviso de la API
  SESSION_TERMINATED         → returnTo.clear(); ir a /ingresar con el aviso de la API
  SESSION_MISSING            → ir a /ingresar sin aviso (returnTo no se toca)

«Cerrar sesión» (RF-7):  returnTo.clear(); logout(); ir a /ingresar

LoginPage al montar:  si getSession() es ok → ir a /                                     # RF-6
tras login ok:        t ← returnTo.take()                                                  # lee y borra
                      si t y t.userId = user.id y canView(user.role, t.path) → ir a t.path  # RF-11
                      si no → ir a /

canView(role, path):  existe una ruta protegida para path y su lista roles incluye role  # «si su cuenta puede verla»
```

- `rutaPedida` es la ruta que se abría o recargaba, o la ruta actual si el `401` llegó en una operación.
- `userId` lo da la API en `SESSION_EXPIRED` (§5.2), así que funciona aunque la página se haya recargado o abierto en otra pestaña.
- `SESSION_MISSING` no borra `returnTo`, porque puede llegar justo después de un `SESSION_EXPIRED` en otra petición (la cookie ya se borró). Se borra al usarlo, al cerrar sesión y ante `SESSION_TERMINATED`.
- `returnTo` se guarda en `localStorage`, que pertenece al navegador (RF-6, RF-11). Cualquier respuesta `401` de una operación también pasa por `SessionProvider`, que aplica las mismas reglas.

## 6. Contrato de la API

Ubicación: **`packages/contracts/src/auth.ts`** (esquemas de Zod y tipos derivados) y **`packages/contracts/src/errors.ts`** (formato común de errores). Es la única fuente del contrato: la API valida con estos esquemas y la interfaz los usa para tipar su cliente y su cliente simulado.

### 6.1 Constantes y tipos

| Nombre | Valor / forma | RF |
| --- | --- | --- |
| `USERNAME_MAX_LENGTH` | `30` | RF-3 |
| `PASSWORD_MAX_LENGTH` | `64` | RF-3 |
| `Role` | `'owner' \| 'cashier'` | RF-5 |
| `SessionUser` | `{ id: string (uuid), username: string, displayName: string, role: Role }` | RF-5 |
| `accountInputSchema` | `{ username: /^[a-z0-9._-]{3,30}$/ tras trim y minúsculas, password: 8–64 y no solo espacios, displayName: 1–40 tras trim, role: Role }` | RF-13 |
| `ApiError` | `{ error: { code: string, message: string, fields?: Record<string, string>, retryAfterMinutes?: number, userId?: string (uuid) } }` | RF-2, RF-3, RF-9, RF-10, RF-11, RF-12 |

### 6.2 Rutas

La cookie de sesión es `kofi_session`: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` en producción y `Max-Age` igual al tiempo que le queda a la sesión. Todas las respuestas llevan `Cache-Control: no-store`.

**`POST /api/auth/login`** (RF-1, RF-2, RF-3, RF-6, RF-9)

| | Contenido |
| --- | --- |
| Entrada | `loginRequestSchema`: `{ username: string (trim, 1–30), password: string (1–64, no solo espacios) }` |
| `200` | `loginResponseSchema`: `{ user: SessionUser }` + `Set-Cookie: kofi_session=…` |
| `400 VALIDATION_ERROR` | `fields: { username?: "Escribe tu usuario", password?: "Escribe tu contraseña" }`. No cuenta como intento (RF-3) |
| `401 INVALID_CREDENTIALS` | `message: "Usuario o contraseña incorrectos"` (RF-2, y también usuario inexistente) |
| `429 ACCOUNT_LOCKED` | `message: "Demasiados intentos. Vuelve a intentarlo en N minutos"` («1 minuto» en singular), `retryAfterMinutes: N` (RF-9) |

Ejemplo:

```json
POST /api/auth/login      { "username": "  Ana ", "password": "cafe con leche" }
200                       { "user": { "id": "4c1f…-9a2e", "username": "ana", "displayName": "Ana Quispe", "role": "owner" } }
429                       { "error": { "code": "ACCOUNT_LOCKED", "message": "Demasiados intentos. Vuelve a intentarlo en 4 minutos", "retryAfterMinutes": 4 } }

GET /api/auth/session     (cookie de una sesión con más de 12 h)
401                       { "error": { "code": "SESSION_EXPIRED", "message": "Tu sesión venció. Vuelve a iniciar sesión", "userId": "4c1f…-9a2e" } }
```

**`POST /api/auth/logout`** (RF-7, RF-8)

| | Contenido |
| --- | --- |
| Entrada | Sin cuerpo; la cookie, si existe |
| `204` | Sin cuerpo. Borra la cookie. Responde igual si no había sesión |

**`GET /api/auth/session`** (RF-4, RF-5, RF-6, RF-10, RF-12)

| | Contenido |
| --- | --- |
| Entrada | La cookie |
| `200` | `sessionResponseSchema`: `{ user: SessionUser }` |
| `401 SESSION_MISSING` | Sin cookie, token desconocido o sesión cerrada. `message: "Inicia sesión para continuar"`; la interfaz no lo muestra (RF-4, RF-8) |
| `401 SESSION_EXPIRED` | `message: "Tu sesión venció. Vuelve a iniciar sesión"` y `userId` de la cuenta de la sesión vencida (RF-10, RF-11) |
| `401 SESSION_TERMINATED` | `message: "Tu sesión terminó. Vuelve a iniciar sesión"` (RF-12) |

Las rutas protegidas de los módulos siguientes usan `requireSession` y responden los mismos tres `401`.

### 6.3 Errores sin esquema propio

- **Sin conexión (RF-14):** no llega respuesta. `api-fetch.ts` convierte el error de red en `{ code: "NETWORK_ERROR" }`, solo en la interfaz, y el formulario muestra «No hay conexión. Inténtalo de nuevo». La API no registra nada, así que no cuenta como intento.
- **Error inesperado:** `500 INTERNAL_ERROR` con `message: "Ocurrió un error. Inténtalo de nuevo"`, sin detalles internos.

## 7. Decisiones técnicas

| # | Decisión | Por qué | Alternativa descartada | RF |
| --- | --- | --- | --- | --- |
| D-1 | **Sesión en la base con cookie `HttpOnly`** que guarda un token aleatorio; en la base solo queda su SHA-256 | Permite invalidar de inmediato una sesión (RF-7, RF-8), terminar todas las sesiones de una cuenta (RF-12) y tener una sesión por navegador (RF-6). El token no es accesible desde JavaScript | JWT sin estado: no se puede revocar sin una lista de bloqueo, que vuelve a necesitar la base. Token en `localStorage`: queda expuesto a cualquier script de la página | RF-6–RF-8, RF-10, RF-12 |
| D-2 | **Mismo origen para interfaz y API:** en Render, una regla de reescritura del sitio estático envía `/api/*` al servicio de la API; en desarrollo lo hace el proxy de Vite | Permite `SameSite=Strict`, sin CORS ni cookies de terceros, que los navegadores restringen. Render admite que el destino de una reescritura sea «una URL completa y pública» | Dominios separados con `SameSite=None` y CORS con credenciales: depende de cookies de terceros. **Riesgo:** la documentación de Render no detalla cómo trata las cookies ni los métodos POST en una reescritura; una tarea de Preparación lo comprueba en un despliegue real antes de construir encima | RF-1, RF-7 |
| D-3 | **Contraseñas con `scrypt` de `node:crypto`** (N=2^15, r=8, p=3) | Viene con Node: no agrega dependencias. Es un algoritmo resistente a fuerza bruta con GPU, con parámetros guardados junto al hash | `argon2` (paquete nativo): otra dependencia con binarios por plataforma, en un equipo que trabaja en Windows | RF-1, RNF-1 |
| D-4 | **Formato común de errores** `{ error: { code, message, … } }` y **mensajes en español generados por la API** | La API calcula los datos de los mensajes (minutos de bloqueo, principio 3) y la interfaz los muestra sin rearmarlos. `code` sirve para decidir la navegación | Que la interfaz traduzca cada código: duplica textos y reglas en la interfaz | RF-2, RF-9, RF-10, RF-12 |
| D-5 | **Bloqueo con tabla `failed_logins` y `users.locked_until`**, dentro de una transacción con `SELECT … FOR UPDATE` | Implementa literalmente la ventana de 15 minutos. El bloqueo de la fila evita que dos intentos simultáneos se cuenten mal (principio 5) | Un contador en `users`: no sabe cuándo ocurrió cada intento. `@fastify/rate-limit`: limita por IP, no por cuenta | RF-9 |
| D-6 | **`pg`** (node-postgres) con SQL escrito a mano y un ejecutor propio de migraciones en orden (`migrate.ts` y la tabla `schema_migrations`) | El cliente de PostgreSQL más usado en Node, sin generador de código. Con el modelo de esta especificación (tres tablas) no hace falta un ORM | Prisma: motor binario y generador aparte. Drizzle o Kysely: otra capa que aprender para tres tablas. `node-pg-migrate`: una dependencia más para algo que son unas 40 líneas | Todos |
| D-7 | **`@electric-sql/pglite`** (devDependency de `apps/api`): PostgreSQL en memoria para las pruebas de integración y la API de E2E | Es PostgreSQL real (disparadores, `FOR UPDATE`, `gen_random_uuid`) sin instalar nada en Windows ni Docker. La interfaz `Database` tiene dos adaptadores: `pg` en producción y PGlite en pruebas | Testcontainers: exige Docker en las dos computadoras. Un PostgreSQL instalado para pruebas: cada persona tendría que instalarlo y configurarlo | Todos |
| D-8 | **`@fastify/cookie`** | Plugin oficial de Fastify para leer y firmar cookies; evita parsear cabeceras a mano | Parsear `Cookie` y armar `Set-Cookie` a mano: es fácil equivocarse con los atributos | RF-1, RF-7 |
| D-9 | **`react-router`** (modo biblioteca) | Rutas pública y protegida, redirecciones con estado (avisos de RF-10 y RF-12) y la ruta de regreso (RF-11) | Un enrutador propio con `history`: hay que reimplementar casos que la biblioteca ya resuelve | RF-4, RF-6, RF-11 |
| D-10 | **Herramientas de calidad:** Vitest (pruebas unitarias, de integración y de componentes, con `jsdom`, `@testing-library/react` y `@testing-library/user-event`); Playwright con Chromium para E2E; ESLint con `typescript-eslint` y `eslint-plugin-react-hooks`; Prettier | Vitest usa la misma configuración que Vite y entiende TypeScript directamente. Playwright permite simular la falta de conexión (RF-14) y reutilizar una sesión entre pestañas (RF-8). La regla nativa `no-restricted-imports` de ESLint cubre «ninguna aplicación importa de otra» sin otro plugin | Jest: necesita transformar TypeScript y ESM. Cypress: más pesado y no maneja varias pestañas. `eslint-plugin-import`: una dependencia más para lo que la regla nativa ya hace | Todos |
| D-11 | **Cada módulo expone un `index.ts`** como superficie pública, y los demás módulos importan solo de ahí | Hace verificable la regla de arquitectura «un módulo no importa los archivos internos de otro», con `no-restricted-imports` | Sin superficie pública: la regla depende de la revisión manual | RF-4, RF-5 |
| D-12 | **Despliegue con `render.yaml`** (Blueprint): sitio estático `kofi-web` (publica `apps/web/dist`, reescribe `/api/*` a la API y `/*` a `/index.html`) y servicio web `kofi-api` (aplica las migraciones al arrancar, comprobación de salud en `/api/health`). `DATABASE_URL` se declara sin valor (`sync: false`) y se carga en Render. Neon aloja la base de producción. **Comprobaciones antes de `main`:** mientras Acceso no esté en `main`, el Blueprint apunta a la rama que se comprueba (la de definición en la Preparación y la de pulido al final), con su propia base de Neon. Cuando Acceso llega a `main`, se cambia a `main` y se usa la base de producción | La configuración queda versionada sin secretos. El build instala también las dependencias de desarrollo (`npm ci --include=dev`), porque TypeScript lo es | Configurar Render a mano: no queda registro ni se puede revisar en un PR | RNF-4 |
| D-13 | **API ejecutada con TypeScript nativo de Node 24** en desarrollo (`node --watch --env-file-if-exists=.env src/server.ts`, con `erasableSyntaxOnly`) y compilada con `tsc` para producción | Sin dependencias para ejecutar TypeScript. `erasableSyntaxOnly` hace que `tsc` rechace lo que Node no puede quitar (por ejemplo, `enum`) | `tsx`: otra dependencia para algo que Node 24 ya hace | — (Preparación) |
| D-14 | **`packages/contracts` se compila antes** que las aplicaciones: los scripts `typecheck`, `test` y `build` de la raíz lo compilan primero, y `npm run dev -w @kofi/contracts` lo recompila en desarrollo | Es lo que fija `docs/architecture.md` §4.4 | Que cada aplicación importe el código fuente del contrato: cada una tendría que configurar su propia forma de resolverlo | — (Base común) |

### 7.1 Dependencias por paquete

Todas se instalan en su última versión estable al crear el paquete, y la versión queda fijada en `package-lock.json`. Las que fija la constitución (principio 1) no necesitan otra justificación.

| Paquete | Dependencia | Tipo | Justificación |
| --- | --- | --- | --- |
| Raíz | `typescript` | desarrollo | Principio 1 |
| Raíz | `prettier` | desarrollo | D-10 |
| Raíz | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` | desarrollo | D-10. `@eslint/js` aporta las reglas recomendadas de ESLint y `globals`, las variables globales del navegador y de Node |
| Raíz | `vitest` | desarrollo | D-10 |
| Raíz | `@playwright/test` | desarrollo | D-10 |
| `@kofi/contracts` | `zod` | producción | Principio 1 |
| `@kofi/api` | `fastify` | producción | Principio 1 |
| `@kofi/api` | `@fastify/cookie` | producción | D-8 |
| `@kofi/api` | `pg` | producción | D-6 |
| `@kofi/api` | `@types/pg`, `@types/node` | desarrollo | Tipos de TypeScript de `pg` y de Node, que no los incluyen |
| `@kofi/api` | `@electric-sql/pglite` | desarrollo | D-7 |
| `@kofi/web` | `react`, `react-dom` | producción | Principio 1 |
| `@kofi/web` | `react-router` | producción | D-9 |
| `@kofi/web` | `vite` | desarrollo | Principio 1 |
| `@kofi/web` | `@vitejs/plugin-react` | desarrollo | Plugin oficial de Vite para React: compila JSX y recarga los componentes sin perder el estado. Sin él, Vite no entiende React |
| `@kofi/web` | `@types/react`, `@types/react-dom` | desarrollo | Tipos de TypeScript de React, que no los incluye |
| `@kofi/web` | `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | desarrollo | D-10. `@testing-library/jest-dom` agrega aserciones legibles sobre el DOM («está visible», «tiene el valor») |

Agregar cualquier otra dependencia exige actualizar este plan o el de la especificación que la necesite.

**Plan gratuito de Render.** El servicio `kofi-api` usa el plan gratuito, por decisión de la persona. En ese plan, un servicio web «se suspende tras 15 minutos sin tráfico» y reactivarlo «tarda alrededor de un minuto» ([render.com/docs/free](https://render.com/docs/free)). Por eso `spec.md` excluye de RNF-4 y del criterio de 15 segundos el primer ingreso después de un período sin uso (ver sus «Aclaraciones»). Mientras el servicio se reactiva, la interfaz muestra el formulario como enviado y espera la respuesta; no lo trata como falta de conexión (RF-14).

## 8. Estrategia de tests

### 8.1 Niveles

| Nivel | Herramienta | Qué cubre | Dónde |
| --- | --- | --- | --- |
| Unitario | Vitest | Esquemas del contrato, `passwords.service`, formato del mensaje de bloqueo, `return-to` | `*.test.ts` junto al código |
| Integración de la API | Vitest + `app.inject` de Fastify + PGlite + reloj falso | Rutas completas con la base real en memoria: ingreso, bloqueo, vencimiento, cierre, cambios de cuenta y CLI de cuentas | `*.integration.test.ts` en `apps/api/src/modules/auth/` |
| Componentes de la interfaz | Vitest + Testing Library + `auth-demo-client` | Formulario, guarda de rutas, layout, avisos y navegación de regreso | `*.test.tsx` junto a cada componente |
| Punta a punta | Playwright (Chromium) contra `vite preview` y `apps/api/test/e2e-server.ts` | Cada historia completa, en un navegador real | `e2e/` |

La API de E2E (`e2e-server.ts`) usa PGlite en memoria, crea las cuentas de `e2e/fixtures.ts` con `accounts.service` y registra rutas que **solo existen en ese archivo**: `POST /api/__test/clock` (adelantar el reloj) y `POST /api/__test/accounts/:username` (cambiar rol, contraseña o eliminar). `app.ts` nunca las registra.

### 8.2 Punta a punta por historia

**US1 — Iniciar y cerrar sesión** (`e2e/us1-iniciar-cerrar-sesion.spec.ts`)

1. Abrir `/` sin sesión → se termina en `/ingresar` sin información del negocio (RF-4).
2. Enviar con la contraseña vacía → «Escribe tu contraseña» y no se hace la petición (RF-3).
3. Usuario inexistente y contraseña incorrecta → el mismo «Usuario o contraseña incorrectos», con el usuario escrito y la contraseña vacía (RF-2).
4. Ingresar como `"  Ana "` → pantalla inicial con «Ana Quispe» y «Dueño» (RF-1, RF-5).
5. Abrir `/ingresar` con la sesión iniciada → se vuelve a `/` (RF-6).
6. Abrir una segunda pestaña, «Cerrar sesión» en la primera → la acción siguiente de la segunda termina en `/ingresar`, y volver atrás en la primera no muestra nada (RF-7, RF-8).
7. Ingresar con la cuenta del cajero en la misma computadora → «Cajero» (HU-1).
8. Cortar la red (`page.route` abortada) y enviar → «No hay conexión. Inténtalo de nuevo» (RF-14).

**US2 — Proteger las cuentas** (`e2e/us2-proteger-cuentas.spec.ts`)

1. 5 fallos sobre «luis» y luego la contraseña correcta → «Demasiados intentos. Vuelve a intentarlo en 5 minutos» (RF-9).
2. Adelantar el reloj 5 minutos → el ingreso funciona (RF-9).
3. Adelantar el reloj 12 horas y recargar → `/ingresar` con «Tu sesión venció…»; al volver a ingresar con la misma cuenta, se regresa a `/` (RF-10, RF-11).
4. Cambiar el rol de la cuenta con la sesión abierta y recargar → «Tu sesión terminó…» (RF-12).

En esta especificación la única pantalla interna es la inicial, así que la E2E de RF-11 solo comprueba que se vuelve a `/`. Que se regrese a otra ruta se prueba en `RequireSession.test.tsx` y `return-to.test.ts` con una ruta de prueba, incluido el caso en que el vencimiento se detecta al recargar (sin cuenta en memoria). Se reforzará en la E2E de Menú cuando existan otras pantallas.

### 8.3 Requisitos no funcionales

| RNF | Cómo se comprueba |
| --- | --- |
| RNF-1 | Integración: el hash no contiene la contraseña y la contraseña no aparece en los registros de la API. CLI: la contraseña no se recibe como argumento |
| RNF-2 | Integración: con un usuario inexistente y con uno existente, `verifyPassword` se ejecuta exactamente una vez (espía sobre `passwords.service`), y la respuesta es idéntica. Se comprueba la llamada, no el tiempo, para que la prueba no dependa de la velocidad de la máquina |
| RNF-3 | Las pruebas de componentes y E2E comparan los textos en español tal como los define la especificación |
| RNF-4 | Medición manual en el despliegue (Pulido): 20 ingresos y 20 cierres de sesión desde un navegador, después de un primer ingreso que reactiva el servicio. Al menos 19 de cada 20 deben tardar menos de 2 segundos (tiempo de la petición en las herramientas del navegador). El resultado se anota en el PR de pulido |
| RNF-5 | Componentes: el formulario se completa y se envía solo con el teclado |
| Criterio de 15 s | Medición manual en el despliegue (Pulido), junto con RNF-4: una persona ingresa desde la pantalla de ingreso, con el servicio ya reactivado, en menos de 15 segundos |

### 8.4 Datos y tiempo

- Las pruebas de la API inyectan un `Clock` falso para el bloqueo (5 y 15 minutos) y el vencimiento (12 horas), sin esperas reales.
- Cada prueba de integración crea su propia base PGlite con las migraciones aplicadas.
- Las cuentas y contraseñas de prueba están en `e2e/fixtures.ts` y en los fixtures de las pruebas. Solo valen para bases en memoria.

### 8.5 Cobertura por RF

| RF | Integración de la API | Componentes de la interfaz | E2E |
| --- | --- | --- | --- |
| RF-1 | ingreso correcto, normalización del usuario, contraseña exacta | `LoginForm`: contraseña oculta y envío | US1-4 |
| RF-2 | inexistente e incorrecta → mismo `401` con el mismo mensaje | `LoginForm`: conserva el usuario y vacía la contraseña | US1-3 |
| RF-3 | vacíos o solo espacios → `400` sin contar intento | `LoginForm`: campo faltante, `maxLength` 30/64 | US1-2 |
| RF-4 | rutas protegidas sin cookie → `401 SESSION_MISSING` | `RequireSession` | US1-1 |
| RF-5 | `GET /session` devuelve cuenta, nombre y rol | `AuthenticatedLayout`, `HomePage` | US1-4, US1-7 |
| RF-6 | dos cookies distintas → dos sesiones independientes | `LoginPage` redirige con sesión | US1-5 |
| RF-7 | `logout` revoca y borra la cookie; `204` sin sesión | `AuthenticatedLayout`: «Cerrar sesión» | US1-6 |
| RF-8 | token revocado → `SESSION_MISSING`; otras sesiones siguen | `SessionProvider` ante `401` | US1-6 |
| RF-9 | 5 fallos en 15 min, ventana deslizante, intentos durante el bloqueo, reinicio, inexistentes, «1 minuto» | `LoginForm` muestra el mensaje de la API | US2-1, US2-2 |
| RF-10 | 12 h → `SESSION_EXPIRED`; la operación no se aplica | `RequireSession`: aviso | US2-3 |
| RF-11 | `SESSION_EXPIRED` incluye `userId`; `SESSION_MISSING` y `SESSION_TERMINATED` no | `return-to` y `RequireSession`: misma cuenta, otra cuenta, ruta desconocida, ruta que el rol no puede ver, vencimiento detectado al recargar, borrado al cerrar sesión y ante `SESSION_TERMINATED` | US2-3 |
| RF-12 | rol, contraseña o cuenta eliminada → `SESSION_TERMINATED` | `RequireSession`: aviso | US2-4 |
| RF-13 | `accounts.service` y CLI: datos inválidos, usuario repetido sin distinguir mayúsculas | — | — |
| RF-14 | — (no llega a la API) | `LoginForm` ante `NETWORK_ERROR` | US1-8 |

## 9. Decisiones globales en `docs/architecture.md`

Afectan a todo el proyecto. La persona las aprobó y se aplican en este mismo PR.

1. **Ramas y despliegue (§2):** `main` pasa a ser la rama de producción. Render despliega automáticamente desde `main` según `render.yaml`, y `develop` se lleva a `main` con un PR que hace una persona cuando se completa una especificación.
2. **Plan de Render:** el sitio estático y el servicio de la API usan el plan gratuito, y se acepta la demora de la reactivación (ver §7).
3. **Mismo origen (D-2):** toda la API bajo `/api`, servida al mismo origen que la interfaz (reescritura en Render, proxy en Vite).
4. **Sesión y errores (D-1, D-4):** cookie `kofi_session` con `requireSession` como único mecanismo de autenticación de los módulos, y el formato común de errores `{ error: { code, message, … } }` con mensajes en español desde la API.
5. **Datos (D-6, D-7):** `pg` con SQL y migraciones numeradas en `apps/api/src/shared/database/migrations/`, PGlite en las pruebas y `shared/clock.ts` como única fuente de la hora en la API.
6. **Herramientas (D-10, D-13, D-14):** Vitest, Playwright en `e2e/` en la raíz, ESLint y Prettier; TypeScript nativo de Node en el desarrollo de la API; compilación previa del contrato.
7. **Superficie pública de los módulos (D-11):** `index.ts` en cada módulo de las dos aplicaciones.

**Añadidas tras el análisis de consistencia**, también aprobadas y aplicadas en este PR:

8. **Despliegues de comprobación (D-12):** mientras una especificación no esté en `main`, el Blueprint de Render puede apuntar temporalmente a su rama, con una base de Neon propia, para comprobar el despliegue. Después vuelve a `main`.
9. **Roles por ruta (§3):** cada ruta protegida de la interfaz declara los roles que pueden verla (`roles`, los dos por defecto). Lo usan la navegación de regreso (RF-11) y los módulos que restrinjan pantallas por rol.

## 10. Cambios tras el análisis de consistencia

Correcciones del 2026-10-24 a los hallazgos del análisis que corresponden al plan:

| Hallazgo | Corrección | Dónde |
| --- | --- | --- |
| 1 (bloqueante) | `SESSION_EXPIRED` incluye el `userId` de la sesión vencida, así que la interfaz guarda la pantalla de regreso aunque se haya recargado. `returnTo` se borra al cerrar sesión y ante `SESSION_TERMINATED` | §5.2, §5.6, §6.1, §6.2, §8.2, §8.5 |
| 2 | La pantalla de regreso se usa si existe y el rol de la cuenta puede verla (`canView`), como dice RF-11 | §3, §5.6 |
| 4 | Tabla completa de dependencias por paquete, con `@vitejs/plugin-react` y los paquetes de tipos | §2, §7.1 |
| 5 | El control del principio 5 describe cómo terminan las sesiones al cambiar una cuenta | §2 |
| 6 | RF-14 deja de asignarse a `auth.routes.ts` | §3 |
| 7 | Scripts de cada paquete, incluido `dev` de `@kofi/contracts` | §3 |
| 8 | Despliegue de comprobación desde la rama antes de `main` | §7 (D-12), §9 |
| 10 | Cómo se comprueba cada RNF y el criterio de 15 segundos | §8.3 |

Los hallazgos 3 (la E2E de HU-2 solo comprueba `/`, reconocido en §8.2), 9 (rama de las tareas de Preparación y Base común) y 11 (marca `[P]` en Base común) no son del plan: 9 y 11 se corrigen en `tasks.md` con `/desglosar`.
