---
name: desglosar
description: Paso 4 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /desglosar o $desglosar.
disable-model-invocation: true
---

# Desglosar

Escribe el `tasks.md` de una especificación: el trabajo, en fases verticales por historia.

## Entrada

- `docs/constitution.md`.
- `specs/NNN-<nombre>/spec.md` y `plan.md`, ya aprobados por la persona.

Si falta alguno, o el control de la constitución de `plan.md` tiene un principio sin cumplir ni justificar, detente y dilo.

## Procedimiento

1. **Rama.** Debe ser la de definición de la especificación (`feat/NNN-<nombre>-definicion`, o `feat/NNN-<nombre>` si se hace en una sola rama). Si no estás en ella, detente y dilo. Antes de empezar, integra lo publicado con `git pull`.
2. **Escribe `specs/NNN-<nombre>/tasks.md`** en fases verticales, en este orden: **Preparación** → **Base común** (incluye escribir el contrato en `packages/contracts`) → **una fase por historia**, en orden de prioridad (US1 = P1 primero) → **Pulido**.
3. **Cada tarea** lleva:
   - un ID consecutivo (`T001`, `T002`…);
   - su **frente**: `[contrato]`, `[web]`, `[api]` o `[integración]`;
   - **`[P]`** si puede hacerse en paralelo con otras de su fase;
   - la **historia** (`[US1]`…) si pertenece a una;
   - los **RF** que cubre;
   - sus **dependencias** («Depende de: T002»);
   - una línea **«Hecho cuando:»** verificable.

   Son tareas pequeñas, de unos 20 a 30 minutos cada una. Ejemplo:

   ```markdown
   ## Fase 1 — Preparación
   - [ ] **T001 [api]** Crear el módulo `auth` vacío en la API con su prueba de humo
     Hecho cuando: `npm test` ejecuta la prueba del módulo.

   ## Fase 2 — Base común
   - [ ] **T002 [contrato]** Definir el contrato de inicio y cierre de sesión (RF-1 a RF-4)
     Hecho cuando: los esquemas validan los ejemplos del plan y `npm run typecheck` pasa.

   ## Fase 3 — US1: iniciar sesión (P1)
   - [ ] **T003 [web] [P] [US1]** Formulario de inicio de sesión contra el cliente simulado (RF-1, RF-3). Depende de: T002
     Hecho cuando: las pruebas de componente cubren éxito, credenciales inválidas y error de red.
   - [ ] **T004 [api] [P] [US1]** Endpoint de inicio de sesión (RF-1, RF-2). Depende de: T002
     Hecho cuando: las pruebas del endpoint cubren éxito, credenciales inválidas y bloqueo.
   - [ ] **T005 [integración] [US1]** Conectar el inicio de sesión al cliente real y prueba de punta a punta (RF-1 a RF-3). Depende de: T003, T004
     Hecho cuando: la prueba de punta a punta de US1 pasa contra la API real.
   ```

4. **Reglas de las fases de historia:**
   - Las tareas `[web]` y `[api]` dependen solo del contrato, nunca unas de otras, y van marcadas `[P]`.
   - Las tareas `[web]` trabajan contra un cliente simulado del contrato en `dev/`.
   - Cada historia cierra con su tarea `[integración]`, que cambia el cliente simulado por el real y añade la prueba de punta a punta.
   - Cada RF de `spec.md` tiene al menos una tarea, y cada tarea traza a un RF o a Preparación, Base común o Pulido.
5. **`quickstart.md` (solo si la persona lo pide):** pasos para comprobar a mano la funcionalidad, por historia, con los datos de partida, las acciones y el resultado esperado.
6. **Aprobación.** Muestra las tareas y pide su aprobación. Aplica los cambios que pida hasta que las apruebe.
7. **Commit y PR.** Con la aprobación, haz el commit `docs(<scope>): desglosar <nombre>`, publica la rama y actualiza la descripción del PR con el estado «Tareas aprobadas, pendiente de análisis».

## Salida

`specs/NNN-<nombre>/tasks.md` con el formato anterior y, si la persona lo pidió, `quickstart.md`.

## Límites

- No escribe código.
- No inventa requisitos ni datos técnicos: los pregunta o los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona, sin pasar al paso siguiente (`/analizar`).
