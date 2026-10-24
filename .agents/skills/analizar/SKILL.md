---
name: analizar
description: Paso 5 del ciclo SDD de Kofi POS. Comprueba, sin modificar archivos, la consistencia entre constitución, spec.md, plan.md y tasks.md. Usar cuando tasks.md está terminado y antes de implementar, o cuando la persona pida el análisis.
---

# Analizar

Comprueba la consistencia entre la constitución, la especificación, el plan y las tareas antes de implementar. Es de **solo lectura**.

## Entrada

- `docs/constitution.md`.
- `specs/NNN-<nombre>/spec.md`, `plan.md` y `tasks.md`.

Si falta alguno, detente y dilo.

## Procedimiento

1. **Rama.** Debe ser la de definición de la especificación (`feat/NNN-<nombre>-definicion`, o `feat/NNN-<nombre>` si se hace en una sola rama). Si no estás en ella, detente y dilo. Antes de empezar, integra lo publicado con `git pull`.
2. **Comprobaciones.** Revisa cada una y anota su resultado:

   | Comprobación | Resultado |
   | --- | --- |
   | Cada RF tiene al menos una tarea | Lista de RF sin tareas |
   | Cada tarea traza a un RF o a Preparación, Base común o Pulido | Lista de tareas huérfanas |
   | Cada historia tiene su tarea `[integración]` y su prueba independiente | Faltantes |
   | `plan.md` cumple la constitución (control completo y coherente con el contenido) | Conflictos |
   | Terminología y datos coherentes entre `spec.md`, `plan.md` y `tasks.md` | Contradicciones |
   | `[NECESITA ACLARACIÓN]` abiertos | Lista |

3. **Hallazgos.** Numera cada hallazgo, indica dónde está y clasifícalo como **bloqueante** (impide implementar) o **menor**. Si una comprobación no tiene hallazgos, escribe «Ninguno».
4. **Informe.** Entrega el informe a la persona: la tabla, la lista de hallazgos y el total de bloqueantes y menores.
5. **PR.** Con la aprobación de la persona (o, en modo delegado, directamente), pega el informe resumido en la sección «Verificación» de la descripción del PR de definición.
6. **Bloqueantes en modo delegado.** Aplica «Bloqueos y correcciones» de `AGENTS.md`: corrige cada documento con la skill que le corresponde (`especificar`, `planificar` o `desglosar`) y vuelve a analizar. Si tras dos rondas siguen quedando bloqueantes, detente e infórmalo.

## Salida

El informe de consistencia. Mientras tenga hallazgos bloqueantes, no se implementa.

## Límites

- **No modifica ningún archivo** del repositorio ni hace commits. Las correcciones se hacen con la skill que corresponde al documento (`especificar`, `planificar` o `desglosar`), con la aprobación de la persona o en modo delegado.
- El informe no propone soluciones: solo detecta y clasifica.
- No inventa requisitos ni datos técnicos: los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona. Sin bloqueantes, y con su aprobación o en modo delegado, sigue con la skill `implementar` para las tareas de Preparación y Base común.
