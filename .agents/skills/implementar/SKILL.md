---
name: implementar
description: Paso 6 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /implementar T<nnn> o $implementar T<nnn>.
disable-model-invocation: true
---

# Implementar

Implementa **una sola tarea** de `tasks.md`: tests primero, código después, comprobaciones, casilla marcada, commit y PR actualizado.

## Entrada

- El ID de la tarea (`T<nnn>`) que indica la persona. Si no lo indica, pregúntalo.
- `docs/constitution.md` y `docs/architecture.md`.
- `specs/NNN-<nombre>/spec.md`, `plan.md` y `tasks.md`.

Si falta alguno de esos archivos, detente y dilo.

## Procedimiento

1. **Preparación.** Aplica la regla 0 de `AGENTS.md`.
2. **Tarea.** Busca la tarea en `tasks.md`. Detente y dilo si no existe, si ya está marcada o si alguna de sus dependencias no está marcada.
3. **Rama.** La rama debe corresponder a la fase de la tarea:
   - Preparación y Base común → `feat/NNN-<nombre>-definicion`.
   - Fase de la historia N → `feat/NNN-<nombre>-usN`.
   - Pulido → `feat/NNN-<nombre>-pulido`.
   - Si la persona decidió hacer la especificación en una sola rama → `feat/NNN-<nombre>`.

   Si no estás en esa rama, **detente** y dilo. Integra lo publicado por la otra persona con `git pull` (merge, nunca rebase).
4. **Bloqueos.** Detente si el último análisis tiene hallazgos bloqueantes o si hay `[NECESITA ACLARACIÓN]` abiertos que afecten a la historia de la tarea.
5. **Tests primero.** Escribe los tests que cubren los RF de la tarea y su línea «Hecho cuando:». Ejecútalos y comprueba que fallan por la razón esperada.
6. **Código.** Escribe el código mínimo para que pasen, siguiendo `plan.md`, `docs/architecture.md` y el contrato de `packages/contracts`. Si algo no encaja con `spec.md` o `plan.md`, detente y propón corregir uno de los dos.
7. **Comprobaciones.** Ejecuta las comprobaciones de «Comandos» de `AGENTS.md` que existan y anota los comandos y sus resultados reales.
8. **Casilla.** Marca la tarea en `tasks.md`.
9. **Commit.** Agrega los archivos de forma explícita, revisa el diff (sin secretos, `.env` ni archivos temporales) y haz un commit con el formato de `AGENTS.md`, terminado en `Refs: SPEC-NNN (T<nnn>)`.
10. **Publicación y PR.** Publica la rama con `git push -u origin <rama>`. Si la rama no tiene PR, ábrelo **en borrador** hacia `develop`; si ya lo tiene, actualiza su descripción. Las secciones salen de datos reales:
    - **Resumen:** fase, objetivo y estado según `tasks.md` (por ejemplo, «US1: web 2 de 3, API 3 de 3, integración pendiente»).
    - **Cambios:** por módulo, a partir de `git diff --stat origin/develop...HEAD` y el diff real.
    - **Verificación:** los comandos ejecutados en esta tarea y su resultado, con extractos reales de los errores.
    - **Relacionado:** `specs/NNN-<nombre>/` y las especificaciones de las que depende.
    - **Observaciones:** problemas conocidos, desvíos respecto a `plan.md` y pasos pendientes.
11. **Informe.** Indica qué RF cubre la tarea, el resultado de las comprobaciones, el enlace al PR y si era la última casilla de la fase de la rama. Después **detente**.

## Salida

La tarea implementada con sus tests, la casilla marcada, un commit y el PR actualizado.

## Límites

- No empieza la siguiente tarea, aunque sea pequeña o esté relacionada, salvo que la persona lo pida.
- No hace tareas de otra fase que la de la rama.
- No inventa requisitos ni datos técnicos: los pregunta o los obtiene del repositorio y de la ejecución real.
- Termina pidiendo la aprobación de la persona, sin pasar a la siguiente tarea.
