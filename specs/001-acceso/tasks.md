# Tareas — SPEC-001 Acceso

Estado: aprobadas y analizadas (tercer análisis sin bloqueantes); Preparación, Base común y US1 implementadas · Fecha: 2026-10-24 · [`spec.md`](spec.md) · [`plan.md`](plan.md)

## Cómo leer estas tareas

- **Frentes:** `[contrato]`, `[api]`, `[web]` e `[integración]`. Las tareas de Preparación y Pulido que tocan la raíz del monorepo, la CI o el despliegue usan `[integración]`.
- **`[P]`:** se puede hacer en paralelo con las tareas del otro frente de su fase. En Base común, las tareas `[api]` y `[web]` avanzan en paralelo una vez escrito el contrato. En las fases de historia, ninguna tarea `[web]` depende de una `[api]` ni al revés: las dos dependen solo de Preparación y Base común. Dentro de un mismo frente, las tareas se hacen en orden de ID y declaran sus dependencias.
- **Ramas** (`AGENTS.md`): Preparación y Base común completas en `feat/001-acceso-definicion`; cada historia en `feat/001-acceso-usN`; Pulido en `feat/001-acceso-pulido`. `AGENTS.md` describe la rama de definición como «spec, plan, tareas, análisis y contrato». Aquí incluye también Preparación, porque el contrato necesita antes el monorepo, y el resto de la Base común, porque las dos historias dependen de ella. Lo decidió la persona el 2026-10-24.
- **Tests primero:** en cada tarea se escriben primero sus tests y después el código (principio 4).

## Fase 1 — Preparación

Rama: `feat/001-acceso-definicion`.

- [x] **T001 [integración]** Configurar TypeScript y Prettier en la raíz: `tsconfig.base.json` (estricto, ESM, `erasableSyntaxOnly`), `.prettierrc.json` y los scripts `format` y `format:check`
  Hecho cuando: `npm run format:check` pasa en todo el repositorio.
- [x] **T002 [contrato]** Crear el paquete `@kofi/contracts` vacío: `package.json` con `zod`, `tsconfig`, scripts `build` (`tsc` a `dist/`) y `dev` (`tsc --watch`), `exports` hacia `dist/` y una prueba de humo (D-14, plan §3 «Scripts por paquete»). Depende de: T001
  Hecho cuando: `npm run build -w @kofi/contracts` genera `dist/`, `npm run dev -w @kofi/contracts` recompila al guardar y Vitest ejecuta la prueba de humo.
- [x] **T003 [api] [P]** Crear el paquete `@kofi/api` con las dependencias de §7.1 del plan (`fastify`, `@types/node`): `app.ts` con `buildApp(deps)`, `server.ts`, `GET /api/health` y los scripts `dev` con TypeScript nativo de Node (D-13), `build` con `tsc` y `start`. Depende de: T001
  Hecho cuando: una prueba con `app.inject` recibe `200` en `/api/health` y `npm run build -w @kofi/api` termina sin errores.
- [x] **T004 [web] [P]** Crear el paquete `@kofi/web` con las dependencias de §7.1 del plan (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, tipos de React, `jsdom` y Testing Library con `jest-dom`): `index.html`, `main.tsx`, scripts `dev`, `build` y `preview`, y proxy de `/api` a la API en `vite.config.ts` (D-2). Depende de: T001
  Hecho cuando: una prueba de componente de humo pasa y `npm run build -w @kofi/web` genera `apps/web/dist/`.
- [x] **T005 [integración]** Scripts de la raíz (`typecheck`, `lint`, `test` y `build`, que compilan el contrato primero), proyectos de Vitest y `eslint.config.js` con `typescript-eslint`, `eslint-plugin-react-hooks` y `no-restricted-imports` (ninguna aplicación importa de otra, el código real no importa de `dev/` y los módulos solo se importan por su `index.ts`, D-11). Depende de: T002, T003, T004
  Hecho cuando: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` pasan desde la raíz, y un import prohibido escrito a propósito hace fallar `npm run lint`.
- [x] **T006 [integración]** Configurar Playwright con Chromium: `playwright.config.ts`, que levanta `vite preview` y una API mínima de E2E (`apps/api/test/e2e-server.ts`), el script `test:e2e`, una prueba de humo en `e2e/` y los pasos de Playwright en `.github/workflows/ci.yml`. Depende de: T005
  Hecho cuando: `npm run test:e2e` abre la interfaz y recibe `200` de `/api/health` a través del proxy, y la CI del PR ejecuta ese paso.
- [x] **T007 [integración]** Desplegar en Render con `render.yaml` (D-12): sitio estático `kofi-web` con las reescrituras `/api/*` → `kofi-api` y `/*` → `/index.html`, y servicio `kofi-api` en el plan gratuito con comprobación de salud. Para esta comprobación, el Blueprint apunta a esta rama y usa una base de Neon propia, con su `DATABASE_URL` cargada en Render (`docs/architecture.md` §6.5). Requiere a una persona con acceso a Render y a Neon. Depende de: T006
  Hecho cuando: en un despliegue de prueba desde esta rama, `GET /api/health` responde `200` a través del dominio del sitio estático, y un `POST` a `/api` llega a la API (responde el `404` JSON de Fastify, no el de Render). Esto comprueba el riesgo de D-2 antes de construir encima. Si falla, se detiene y se propone corregir el plan.

## Fase 2 — Base común

Rama: `feat/001-acceso-definicion`.

- [x] **T008 [contrato]** Escribir `packages/contracts/src/errors.ts`: esquema `ApiError` (`code`, `message`, `fields?`, `retryAfterMinutes?`, `userId?`) y los códigos de error del plan (§6; RF-11). Depende de: T002
  Hecho cuando: las pruebas validan los ejemplos de error de §6 del plan, incluido `SESSION_EXPIRED` con `userId`, y rechazan un error sin `code`, sin `message` o con un `userId` que no es un uuid.
- [x] **T009 [contrato]** Escribir `packages/contracts/src/auth.ts`: `USERNAME_MAX_LENGTH`, `PASSWORD_MAX_LENGTH`, `Role`, `SessionUser`, `accountInputSchema`, `loginRequestSchema`, `loginResponseSchema` y `sessionResponseSchema` (RF-1, RF-3, RF-5, RF-13). Depende de: T008
  Hecho cuando: las pruebas validan los ejemplos de §6 del plan, `"  Ana "` queda como `"ana"`, una contraseña solo con espacios se rechaza, se respetan los límites de «Datos de una cuenta» y `npm run typecheck` pasa.
- [x] **T010 [api] [P]** Escribir la interfaz `Database` (`query`, `transaction`) con el adaptador de `pg` y el de PGlite, y el helper `apps/api/test/test-database.ts` (D-6, D-7). Depende de: T003
  Hecho cuando: una prueba de integración ejecuta una consulta y una transacción que se deshace ante un error, sobre PGlite.
- [x] **T011 [api] [P]** Escribir `migrate.ts` (tabla `schema_migrations`, aplica en orden las pendientes), el script `npm run migrate -w @kofi/api` (plan §3) y `001_auth.sql`: `users`, `failed_logins`, `sessions` y el disparador de `session_version` (plan §4; datos de RF-9, RF-10 y RF-12). Depende de: T010, T012
  Hecho cuando: las pruebas de integración aplican las migraciones dos veces sin error, rechazan un `username` que no cumple el `CHECK` y comprueban que cambiar `role` o `password_hash` sube `session_version` y cambiar `display_name` no; además, `npm run migrate -w @kofi/api` aplica las migraciones contra la base de `DATABASE_URL`.
- [x] **T012 [api] [P]** Escribir `shared/clock.ts` (`Clock` real y falso para pruebas) y `shared/config/env.ts` (`DATABASE_URL`, `PORT` y `NODE_ENV` validados con Zod), con `apps/api/.env.example`. Depende de: T003
  Hecho cuando: las pruebas cubren el reloj falso (fijar y adelantar) y el error de configuración cuando falta `DATABASE_URL`.
- [x] **T013 [api] [P]** Escribir `shared/http/errors.ts` (`AppError` y manejador que responde con el formato común, `500 INTERNAL_ERROR` sin detalles), `shared/http/validate.ts` y la cabecera `Cache-Control: no-store` en todas las respuestas (D-4). Depende de: T008, T003
  Hecho cuando: las pruebas comprueban un `AppError`, un error inesperado (`500` sin la traza) y un cuerpo inválido (`400 VALIDATION_ERROR` con `fields`), y que todas las respuestas llevan `no-store`.
- [x] **T014 [api] [P]** Escribir `passwords.service.ts` con `scrypt` de `node:crypto` (plan §5.4, D-3; RF-1, RNF-1). Depende de: T003
  Hecho cuando: las pruebas comprueban que el hash no contiene la contraseña, que dos hash de la misma contraseña son distintos, que se verifica la correcta, se rechaza otra (incluida una diferencia de mayúsculas) y se verifica con los parámetros guardados.
- [x] **T015 [api] [P]** Escribir `users.repository.ts` y `sessions.repository.ts`: buscar cuenta por usuario (con `FOR UPDATE`), crear sesión con `sha256(token)`, buscar sesión por token con su cuenta y revocar (RF-1, RF-6, RF-7). Depende de: T011
  Hecho cuando: las pruebas de integración crean y encuentran una sesión por su token, comprueban que el token no se guarda en claro y que una sesión revocada se lee con `revoked_at`.
- [x] **T016 [web] [P]** Escribir `shared/http/api-fetch.ts`: peticiones al mismo origen con cookies, lectura de `ApiError` con el esquema del contrato y error de red convertido en `NETWORK_ERROR` (RF-14). Depende de: T004, T008
  Hecho cuando: las pruebas cubren una respuesta `200`, un `ApiError` y un fallo de red simulado.
- [x] **T017 [web] [P]** Escribir `modules/auth/api/auth-client.ts`: interfaz `AuthClient` (`login`, `logout`, `getSession`) y su cliente HTTP real sobre `api-fetch`. Depende de: T009, T016
  Hecho cuando: las pruebas comprueban la ruta, el método y el cuerpo de cada llamada, y que las respuestas se validan con los esquemas del contrato.
- [x] **T018 [web] [P]** Escribir `modules/auth/dev/`: `fixtures.ts`, `auth-demo-client.ts` (implementa `AuthClient`) y `ScenarioPicker.tsx` con los escenarios dueño, cajero, credenciales incorrectas, cuenta bloqueada, sin conexión, sesión vencida y sesión terminada, montado solo en desarrollo (`import.meta.env.DEV`). Depende de: T017
  Hecho cuando: las pruebas validan con los esquemas del contrato todos los datos del cliente simulado, y el build de producción no contiene `ScenarioPicker`.
- [x] **T019 [web] [P]** Escribir `routes.tsx` con `react-router` (D-9): `/ingresar` pública y `/` protegida con su lista `roles` (por defecto, los dos; `docs/architecture.md` §6.6), con páginas provisionales, y `modules/auth/index.ts` (RF-11). Depende de: T004
  Hecho cuando: una prueba de componente navega a las dos rutas, una ruta desconocida lleva a `/` y la ruta `/` declara los dos roles.

## Fase 3 — US1: iniciar y cerrar sesión (P1)

Rama: `feat/001-acceso-us1`.

- [x] **T020 [api] [P] [US1]** Escribir el ingreso en `auth.service.ts`: usuario normalizado, contraseña exacta, hash ficticio si el usuario no existe, sesión de 12 h y revocación de la sesión anterior del mismo navegador, todavía sin bloqueo (plan §5.1; RF-1, RF-2, RF-6, RNF-2). Depende de: T012, T014, T015
  Hecho cuando: las pruebas de integración cubren el ingreso correcto con `"  Ana "`, la contraseña con otra mayúscula, el usuario inexistente y la contraseña incorrecta (el mismo error), que `verifyPassword` se ejecuta exactamente una vez tanto con un usuario inexistente como con uno existente (espía, plan §8.3) y una sesión nueva que revoca la anterior.
- [x] **T021 [api] [P] [US1]** Escribir `POST /api/auth/login` en `auth.routes.ts`, con la cookie `kofi_session` (`HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` en producción y `Max-Age=648000`, D-15) y `@fastify/cookie` (D-8) (RF-1, RF-2, RF-3, RF-10, RNF-1). Depende de: T013, T020
  Hecho cuando: las pruebas con `app.inject` cubren `200` con `Set-Cookie` y todos sus atributos, incluido `Max-Age=648000`, `401 INVALID_CREDENTIALS`, `400 VALIDATION_ERROR` para campos vacíos o solo con espacios (sin contar intento), y que la contraseña no aparece en los registros de la API.
- [x] **T022 [api] [P] [US1]** Escribir `resolveSession` (sin cookie, token desconocido o revocado → `SESSION_MISSING`), el hook `requireSession` (exportado en `modules/auth/index.ts`) y `GET /api/auth/session` (plan §5.2; RF-4, RF-5, RF-6, RF-8). Depende de: T013, T015
  Hecho cuando: las pruebas cubren `200` con `SessionUser`, `401 SESSION_MISSING` en los tres casos (con la cookie borrada), dos cookies de la misma cuenta como sesiones independientes y una ruta de prueba protegida que no ejecuta su manejador sin sesión.
- [x] **T023 [api] [P] [US1]** Escribir `POST /api/auth/logout` (plan §5.3; RF-7, RF-8). Depende de: T022
  Hecho cuando: las pruebas comprueban `204` con la cookie borrada, que después la sesión da `SESSION_MISSING`, que otra sesión de la misma cuenta sigue válida y que sin sesión también responde `204`.
- [x] **T024 [api] [P] [US1]** Escribir `accounts.service.ts` con `create` y `list`, validando con `accountInputSchema` (RF-13). Depende de: T009, T014, T015
  Hecho cuando: las pruebas de integración crean una cuenta válida, rechazan cada dato fuera de «Datos de una cuenta» indicando cuál, y rechazan `ana` si ya existe `Ana`.
- [x] **T025 [api] [P] [US1]** Escribir `accounts.cli.ts` y el script `npm run accounts -w @kofi/api` con `create` y `list`; la contraseña se pide sin mostrarla y nunca se recibe como argumento (RF-13). Depende de: T024
  Hecho cuando: las pruebas ejecutan `create` y `list` con una entrada simulada y comprueban los mensajes en español, incluido el de usuario repetido.
- [x] **T026 [web] [P] [US1]** Escribir `LoginForm.tsx`: contraseña oculta, `maxLength` de 30 y 64, aviso del campo faltante con el esquema del contrato sin enviar, mensaje de la API, usuario conservado y contraseña vaciada tras un error, «No hay conexión. Inténtalo de nuevo» ante `NETWORK_ERROR` y envío con Intro (RF-1, RF-2, RF-3, RF-14, RNF-5). Depende de: T018
  Hecho cuando: las pruebas de componente, contra el cliente simulado, cubren el éxito, las credenciales incorrectas, los campos vacíos o solo con espacios (sin llamar al cliente), los límites de largo, la falta de conexión y el uso solo con teclado.
- [x] **T027 [web] [P] [US1]** Escribir `SessionProvider.tsx`, `useSession.ts` y `RequireSession.tsx`: la sesión se comprueba al abrir o recargar una ruta protegida y, ante `SESSION_MISSING` en cualquier respuesta, se va a `/ingresar` sin aviso (RF-4, RF-8). Depende de: T018, T019
  Hecho cuando: las pruebas de componente comprueban que sin sesión no se muestra el contenido protegido y se termina en `/ingresar`, y que un `401` en una operación hace lo mismo.
- [x] **T028 [web] [P] [US1]** Escribir `LoginPage.tsx`: si ya hay sesión, va a `/`; tras un ingreso correcto, va a `/` (RF-1, RF-6). Depende de: T026, T027
  Hecho cuando: las pruebas de componente cubren las dos redirecciones con el cliente simulado.
- [x] **T029 [web] [P] [US1]** Escribir `AuthenticatedLayout.tsx` y `HomePage.tsx`: saludo con el nombre visible, rol («Dueño» o «Cajero») y «Cerrar sesión» sin confirmación, que lleva a `/ingresar`; al volver con `pageshow` persistido, se comprueba de nuevo la sesión (RF-5, RF-7, RF-8). Depende de: T027
  Hecho cuando: las pruebas de componente cubren los dos roles, el cierre de sesión y la nueva comprobación de la sesión en `pageshow`.
- [x] **T030 [integración] [US1]** Cambiar el cliente simulado por el real en la aplicación y ampliar `e2e-server.ts` con PGlite y las cuentas de `e2e/fixtures.ts` creadas con `accounts.service` (RF-1 a RF-8, RF-13, RF-14). Depende de: T021, T022, T023, T024, T025, T026, T027, T028, T029
  Hecho cuando: la interfaz en `vite preview` inicia y cierra sesión contra la API de E2E, y `npm test` sigue pasando.
- [x] **T031 [integración] [US1]** Escribir `e2e/us1-iniciar-cerrar-sesion.spec.ts` con los 8 pasos de §8.2 del plan (RF-1 a RF-8, RF-14). Depende de: T030
  Hecho cuando: `npm run test:e2e` pasa con la prueba de US1 contra la API real de E2E.

## Fase 4 — US2: proteger las cuentas (P2)

Rama: `feat/001-acceso-us2`.

- [x] **T032 [api] [P] [US2]** Añadir el bloqueo al ingreso: `failed_logins`, ventana de 15 minutos, `locked_until` de 5 minutos, intentos durante el bloqueo sin contar ni alargarlo, reinicio con un ingreso correcto, transacción con `FOR UPDATE` y el mensaje `ACCOUNT_LOCKED` con «N minutos» y «1 minuto» (plan §5.1, D-5; RF-9). Depende de: T020, T021
  Hecho cuando: las pruebas de integración, con reloj falso, cubren: 5 fallos y el siguiente rechazado aunque sea correcto (`429`), el quinto fallo todavía con `INVALID_CREDENTIALS`, desbloqueo a los 5 minutos con el conteo en cero, 4 fallos + ingreso correcto + 4 fallos sin bloqueo, 4 fallos + uno a los 20 minutos sin bloqueo, intentos durante el bloqueo, usuario inexistente sin bloqueo y dos intentos simultáneos contados bien.
- [x] **T033 [api] [P] [US2]** Añadir el vencimiento: `resolveSession` devuelve `SESSION_EXPIRED` con el `userId` de la sesión a las 12 horas, aunque haya actividad, y la operación protegida no se ejecuta (plan §5.2; RF-10, RF-11). Depende de: T022
  Hecho cuando: las pruebas, con reloj falso, comprueban la sesión válida a las 11 h 59 min, `401 SESSION_EXPIRED` a las 12 h con su mensaje y el `userId` de la cuenta, que `SESSION_MISSING` no incluye `userId` y una ruta de prueba protegida que no aplica cambios.
- [x] **T034 [api] [P] [US2]** Añadir la terminación: `SESSION_TERMINATED` si la cuenta se eliminó o su `session_version` cambió (plan §5.2; RF-12). Depende de: T022
  Hecho cuando: las pruebas comprueban `401 SESSION_TERMINATED` sin `userId` tras cambiar el rol, tras cambiar la contraseña y tras eliminar la cuenta, y que cambiar solo el nombre visible no termina la sesión.
- [ ] **T035 [api] [P] [US2]** Añadir `update` y `delete` a `accounts.service.ts` y a `accounts.cli.ts` (plan §5.5; RF-12, RF-13). Depende de: T025, T034
  Hecho cuando: las pruebas cambian el rol, la contraseña y el nombre visible, eliminan una cuenta, rechazan datos inválidos y comprueban que las sesiones de la cuenta terminan cuando corresponde.
- [ ] **T036 [web] [P] [US2]** Mostrar en `LoginPage` y `LoginForm` el mensaje de bloqueo de la API y los avisos de vencimiento y terminación recibidos al llegar a `/ingresar` (RF-9, RF-10, RF-12). Depende de: T028
  Hecho cuando: las pruebas de componente, con los escenarios de bloqueo, sesión vencida y sesión terminada del cliente simulado, muestran cada mensaje tal como lo devuelve la API.
- [ ] **T037 [web] [P] [US2]** Hacer que `SessionProvider` y `RequireSession` manejen `SESSION_EXPIRED` y `SESSION_TERMINATED`: van a `/ingresar` con el aviso de la API (plan §5.6; RF-10, RF-12). Depende de: T027
  Hecho cuando: las pruebas de componente comprueban los dos avisos al abrir una ruta protegida, al recargarla (sin cuenta en memoria) y ante un `401` en una operación.
- [ ] **T038 [web] [P] [US2]** Escribir `api/return-to.ts` y la navegación de regreso tras el vencimiento (plan §5.6; RF-11): ante `SESSION_EXPIRED` se guardan en `localStorage` el `userId` que da la API y la ruta pedida; tras ingresar, la misma cuenta vuelve a esa ruta si existe y su rol puede verla (`canView`), y si no, va a `/`. `returnTo` se borra al usarlo, al cerrar sesión y ante `SESSION_TERMINATED`, pero no ante `SESSION_MISSING`. Depende de: T028, T029, T037
  Hecho cuando: las pruebas cubren, con una ruta de prueba: la misma cuenta, otra cuenta, una ruta desconocida, una ruta que el rol no puede ver, el vencimiento detectado al recargar (sin cuenta en memoria), que el dato se borra tras usarlo, al cerrar sesión y ante `SESSION_TERMINATED`, y que un `SESSION_MISSING` posterior no lo borra.
- [ ] **T039 [integración] [US2]** Añadir a `e2e-server.ts` las rutas de prueba `POST /api/__test/clock` y `POST /api/__test/accounts/:username`, que no existen en `app.ts` (RF-9, RF-10, RF-12). Depende de: T032, T033, T034, T035, T036, T037, T038
  Hecho cuando: una prueba comprueba que `buildApp` no registra rutas `/api/__test`, y las rutas de prueba adelantan el reloj y cambian una cuenta en la API de E2E.
- [ ] **T040 [integración] [US2]** Escribir `e2e/us2-proteger-cuentas.spec.ts` con los 4 pasos de §8.2 del plan, incluida la comprobación de que la cookie del navegador vence más de 12 horas después del ingreso (D-15; RF-9 a RF-12). Depende de: T039
  Hecho cuando: `npm run test:e2e` pasa con las pruebas de US1 y US2 contra la API real de E2E.

## Fase 5 — Pulido

Rama: `feat/001-acceso-pulido`.

- [ ] **T041 [integración]** Añadir a la CI la comprobación de que el build de `apps/web` no contiene nada de `dev/`, con un script en Node (`docs/architecture.md` §5). Depende de: T040
  Hecho cuando: el script falla si se importa `ScenarioPicker` fuera de `dev/` y pasa con el build actual, y la CI lo ejecuta.
- [ ] **T042 [integración]** Desplegar la versión completa en Render y comprobarla, con el Blueprint apuntando a esta rama y su base de Neon propia (`docs/architecture.md` §6.5): migraciones al arrancar, cuentas creadas con `npm run accounts` (contraseñas entregadas en privado, sin escribirlas en ningún archivo) e ingreso y cierre de sesión a través de la reescritura. Requiere a una persona con acceso a Render y a Neon. Depende de: T041
  Hecho cuando: la cookie `kofi_session` llega con sus atributos a través del dominio del sitio estático, se inicia y se cierra sesión con una cuenta creada con la CLI y `/api/health` responde `200`.
- [ ] **T043 [integración]** Medir en el despliegue de T042 el RNF-4 y el criterio de 15 segundos, como indica el plan (§8.3): tras un primer ingreso que reactiva el servicio, 20 ingresos y 20 cierres de sesión, y un ingreso cronometrado desde la pantalla de ingreso (RNF-4). Depende de: T042
  Hecho cuando: al menos 19 de cada 20 ingresos y cierres tardan menos de 2 segundos, el ingreso cronometrado tarda menos de 15 segundos, y los resultados quedan anotados en la descripción del PR de pulido.
- [ ] **T044 [integración]** Actualizar `README.md`: estado del módulo Acceso, cómo arrancar en desarrollo (`apps/api/.env`, `npm run migrate` y las tres terminales de §3 del plan: `npm run dev -w @kofi/contracts`, `-w @kofi/api` y `-w @kofi/web`) y cómo preparar las cuentas. Depende de: T043
  Hecho cuando: siguiendo el README desde un clon nuevo se levanta la aplicación en desarrollo y se crea una cuenta.

## Cobertura de RF

| RF | Tareas |
| --- | --- |
| RF-1 | T009, T014, T015, T020, T021, T026, T028, T030, T031 |
| RF-2 | T020, T021, T026, T031 |
| RF-3 | T009, T021, T026, T031 |
| RF-4 | T022, T027, T031 |
| RF-5 | T009, T022, T029, T031 |
| RF-6 | T015, T020, T022, T028, T031 |
| RF-7 | T015, T023, T029, T031 |
| RF-8 | T022, T023, T027, T029, T031 |
| RF-9 | T011, T032, T036, T040 |
| RF-10 | T011, T021, T033, T036, T037, T040 |
| RF-11 | T008, T019, T033, T038, T040 |
| RF-12 | T011, T034, T035, T036, T037, T040 |
| RF-13 | T009, T024, T025, T035 |
| RF-14 | T016, T026, T031 |
