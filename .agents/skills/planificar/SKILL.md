---
name: planificar
description: Paso 3 del ciclo SDD de Kofi POS. Usar solo cuando la persona lo invoca con /planificar o $planificar.
disable-model-invocation: true
---

# Planificar

Escribe el `plan.md` de una especificación: el cómo, empezando por el control de la constitución y con el contrato completo.

## Entrada

- `docs/constitution.md`, `docs/business-rules.md` y `docs/architecture.md`.
- `specs/NNN-<nombre>/spec.md`, ya revisada y aprobada por la persona.
- El código existente de los módulos afectados.

Si falta alguno de esos documentos, o la persona no confirma que la especificación está aprobada, detente y dilo.

## Procedimiento

1. **Rama.** Debe ser la de definición de la especificación (`feat/NNN-<nombre>-definicion`, o `feat/NNN-<nombre>` si se hace en una sola rama). Si no estás en ella, detente y dilo. Antes de empezar, integra lo publicado con `git pull`.
2. **Escribe `specs/NNN-<nombre>/plan.md`** con estas secciones, en este orden. Cada parte indica qué RF cubre, y entre todas cubren todos los RF de `spec.md`:
   1. **Versión de la constitución** con la que se planifica (la de `docs/constitution.md`).
   2. **Control de la constitución**, obligatorio y antes que todo lo demás, con una fila por principio:

      | Principio | ¿Se cumple? | Cómo / excepción justificada |
      | --- | --- | --- |
      | 1. Stack mínimo | Sí | Sin dependencias nuevas |

      Si algún principio no se cumple sin una justificación que la persona apruebe, **detente**: el plan no se puede desglosar.
   3. **Módulos afectados y estructura**, según `docs/architecture.md`.
   4. **Modelo de datos**, con un ejemplo.
   5. **Algoritmos relevantes**, en pseudocódigo.
   6. **Contrato de la API** de toda la especificación (rutas, entradas, salidas y errores) y su ubicación en `packages/contracts` (`packages/contracts/src/<módulo>.ts`). Es la única fuente del contrato entre interfaz y API.
   7. **Decisiones técnicas** justificadas, cada una con la alternativa descartada. Toda dependencia nueva se justifica aquí (principio 1).
   8. **Estrategia de tests**, incluida la prueba de punta a punta de cada historia.
3. **Decisiones globales.** Si alguna decisión afecta a todo el proyecto, propón el cambio a `docs/architecture.md`. Solo se aplica, en este mismo PR, si la persona lo aprueba.
4. **Aprobación.** Muestra el plan y pide su aprobación; el contrato lo revisan las dos personas. Aplica los cambios que pidan hasta que lo aprueben.
5. **Commit y PR.** Con la aprobación, haz el commit `docs(<scope>): planificar <nombre>`, publica la rama y actualiza la descripción del PR con el estado «Plan aprobado».

## Salida

`specs/NNN-<nombre>/plan.md` con el formato anterior y, si la persona lo aprobó, el cambio en `docs/architecture.md`.

## Límites

- No escribe código, ni siquiera el contrato: eso lo hacen las tareas de la fase «Base común».
- No continúa si un principio de la constitución no se cumple sin justificación aprobada.
- No inventa requisitos ni datos técnicos: los pregunta o los obtiene del repositorio.
- Termina pidiendo la aprobación de la persona, sin pasar al paso siguiente (`/desglosar`).
