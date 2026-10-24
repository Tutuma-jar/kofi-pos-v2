---
name: especificar
description: Paso 1 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /especificar o $especificar.
disable-model-invocation: true
---

# Especificar

Escribe la `spec.md` de una funcionalidad: el qué y el por qué, sin stack, arquitectura ni nombres de archivos.

## Entrada

- `docs/constitution.md` y `docs/business-rules.md`.
- La descripción de la funcionalidad que da la persona.
- Si ya existe, `specs/NNN-<nombre>/spec.md`, para continuarla.

Si falta la constitución o las reglas de negocio, detente y dilo.

## Procedimiento

1. **Número y nombre.** `NNN` es el siguiente número de tres dígitos después del mayor de `specs/` (`001` si no hay ninguno); nunca se reutiliza. `<nombre>` va en kebab-case, sin tildes ni `ñ`. Confírmalos con la persona.
2. **Rama.** Trabaja en `feat/NNN-<nombre>-definicion`. Si la rama ya existe en GitHub, únete con `git fetch` y `git switch <rama>`; si no, créala con `git switch -c <rama>`. Si la persona decidió hacer la especificación en una sola rama, usa `feat/NNN-<nombre>`.
3. **Contexto.** Lee la constitución y las reglas de negocio. Las reglas globales (moneda, zona horaria, un solo local) no se copian en la especificación: se enlazan.
4. **Preguntas.** Pregunta **de una en una**, como máximo 10, sobre casos límite, errores y alcance. Espera cada respuesta antes de la siguiente.
5. **Escribe `specs/NNN-<nombre>/spec.md`** con este formato:
   1. **Contexto y objetivo.**
   2. **Usuarios.**
   3. **Historias de usuario, priorizadas.** Cada una: «Como **[usuario]**, quiero **[acción]** para **[beneficio]**», su **prioridad** (P1, P2, P3…; la P1 sola debe ser un producto mínimo útil) y su **prueba independiente** (cómo se comprueba sola, sin las demás).
   4. **Requisitos funcionales** numerados (`RF-1`, `RF-2`…), cada uno asociado a su historia y con criterios de aceptación en notación EARS:
      - Siempre: «El sistema **deberá** …».
      - Por evento: «**Cuando** …, el sistema deberá …».
      - Por estado: «**Mientras** …, el sistema deberá …».
      - No deseado: «**Si** …, **entonces** el sistema deberá …».
      - Opcional: «**Donde** …, el sistema deberá …».
   5. **Requisitos no funcionales.**
   6. **Casos límite.**
   7. **Fuera de alcance.**
   8. **Criterios de finalización:** medibles y sin mencionar tecnología («el operador registra una venta en menos de 30 segundos», no «la API responde rápido»).
   9. **Dudas abiertas**, marcadas `[NECESITA ACLARACIÓN]`. Máximo 3: si hay más, la especificación no está lista; díselo a la persona.
   10. **Aclaraciones:** cada pregunta hecha, su respuesta y la fecha, agrupadas por día. Aplica también cada respuesta en las secciones que correspondan e indica dónde:

       ```markdown
       ## Aclaraciones

       ### AAAA-MM-DD
       - **P:** ¿…? → **R:** … (Aplicado en RF-3.)
       ```

   La fecha es la de hoy en hora de Bolivia, obtenida al ejecutarla: `node -e "console.log(new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz'}).format(new Date()))"`.
6. **Aprobación.** Muestra la especificación y pide su aprobación. Aplica los cambios que pida hasta que la apruebe.
7. **Commit y PR.** Con la aprobación, haz el commit `docs(<scope>): especificar <nombre>` (`<scope>` es el nombre del módulo en el código: `auth`, `menu`, `sales`, `dashboard` o `history`) y publica la rama con `git push -u origin <rama>`. Si la rama aún no tiene PR, ábrelo **en borrador** hacia `develop`, con la descripción de `AGENTS.md` y el estado «Especificación aprobada, pendiente de revisión».

## Salida

`specs/NNN-<nombre>/spec.md` con el formato anterior, commiteado en la rama de definición, y su PR en borrador.

## Límites

- No decide stack, arquitectura, archivos ni código.
- No inventa requisitos ni datos técnicos: los pregunta o los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona, sin pasar al paso siguiente (`/revisar-spec`).
