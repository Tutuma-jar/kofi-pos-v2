---
name: analizar
description: Paso 5 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /analizar o $analizar.
disable-model-invocation: true
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
5. **PR.** Con la aprobación de la persona, pega el informe resumido en la sección «Verificación» de la descripción del PR de definición.

## Salida

El informe de consistencia. Mientras tenga hallazgos bloqueantes, no se implementa.

## Límites

- **No modifica ningún archivo** del repositorio ni hace commits. Las correcciones se hacen con la skill que corresponde al documento (`/especificar`, `/planificar` o `/desglosar`), con la aprobación de la persona.
- No propone soluciones: solo detecta y clasifica.
- No inventa requisitos ni datos técnicos: los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona, sin pasar al paso siguiente (`/implementar`).
