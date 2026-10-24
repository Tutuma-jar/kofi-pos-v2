---
name: revisar-spec
description: Paso 2 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /revisar-spec o $revisar-spec.
disable-model-invocation: true
---

# Revisar la especificación

Revisa una `spec.md` como QA: detecta problemas, sin proponer soluciones.

## Entrada

- `docs/constitution.md` y `docs/business-rules.md`.
- `specs/NNN-<nombre>/spec.md`. Si la persona no indica cuál y hay más de una, pregúntale.

Si falta alguno de esos archivos, detente y dilo.

## Procedimiento

1. **Rama.** Debe ser la de definición de la especificación (`feat/NNN-<nombre>-definicion`, o `feat/NNN-<nombre>` si se hace en una sola rama). Si no estás en ella, detente y dilo. Antes de empezar, integra lo publicado con `git pull`.
2. **Revisión.** Lee la especificación completa y lista los hallazgos **numerados**, agrupados en estas categorías:
   - Ambigüedades.
   - Contradicciones.
   - Casos límite no cubiertos.
   - Conflictos con la constitución o con las reglas de negocio.
   - Criterios no medibles o que mencionan tecnología.
   - Formato: secciones que faltan, RF sin historia o sin criterios EARS, historias sin prioridad o sin prueba independiente.
   - Más de 3 `[NECESITA ACLARACIÓN]` abiertos.

   Cada hallazgo indica dónde está (sección, historia o RF) y por qué es un problema, sin decir cómo resolverlo. Si una categoría no tiene hallazgos, escribe «Ninguno».
3. **Decisiones de la persona.** La persona decide qué hacer con cada hallazgo. Registra cada pregunta y su respuesta en «Aclaraciones», bajo la fecha de hoy en hora de Bolivia (`node -e "console.log(new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz'}).format(new Date()))"`), y aplica cada respuesta en las secciones que correspondan, indicando dónde.
4. **Aprobación.** Muestra los cambios en `spec.md` y pide su aprobación.
5. **Commit y PR.** Con la aprobación, haz el commit `docs(<scope>): revisar especificación de <nombre>`, publica la rama y actualiza la descripción del PR con el estado «Especificación revisada».

## Salida

La lista numerada de hallazgos y, tras las decisiones de la persona, `spec.md` actualizada con sus aclaraciones.

## Límites

- No propone soluciones ni redacta requisitos por su cuenta: solo detecta y aplica lo que la persona decide.
- No inventa requisitos ni datos técnicos: los pregunta o los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona, sin pasar al paso siguiente (`/planificar`).
