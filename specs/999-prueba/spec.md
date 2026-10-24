# Especificación de prueba: consulta del menú

Estado: borrador de prueba, sin aprobación para implementar.

Este documento contiene ambigüedades deliberadas para probar la revisión de
especificaciones. El número 999 identifica este ejemplo y no una funcionalidad
planificada del producto.

## Contexto y objetivo

Permitir que el personal de la cafetería consulte los productos del menú al
atender a una persona. Se aplican las [reglas de negocio](../../docs/business-rules.md)
y la [constitución](../../docs/constitution.md).

## Usuarios

Personal que atiende en caja.

## Historias de usuario

### HU-1 — Consultar productos (P1)

Como **personal de caja**, quiero **consultar los productos del menú** para
**encontrar lo que pide la persona que estoy atendiendo**.

Prueba independiente: abrir el menú y buscar un producto existente.

## Requisitos funcionales

- **RF-1 (HU-1):** Cuando el personal busque un producto, el sistema deberá
  mostrar los resultados rápidamente.
- **RF-2 (HU-1):** El sistema deberá mostrar primero los productos más relevantes.

## Fuera de alcance

Registrar ventas, cobrar o modificar el menú.

## Criterios de finalización

La revisión identifica las ambigüedades de ambos requisitos y propone preguntas
para convertirlos en requisitos verificables.
