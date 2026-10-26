# Constitución — Kofi POS

Versión 3.0.0 · 2026-10-25

1. **Stack mínimo.** TypeScript en todo el monorepo (Node 24 y workspaces de npm): interfaz con React y Vite, API con Fastify, contrato con esquemas de Zod, base de datos PostgreSQL y despliegue en Render (interfaz y API) y Neon (base de datos). Toda dependencia nueva se justifica en el `plan.md` que la introduce o, en un cambio de presentación, en su PR.
2. **Especificación antes que código.** No se escribe código de las aplicaciones sin `spec.md` y `plan.md` aprobados. La persona aprueba cada paso o delega sus decisiones en el agente, incluidas las que resuelven bloqueos: el agente decide con sus recomendaciones y las registra, y la especificación, el plan y el código que dependa de ellos quedan aprobados juntos al fusionar el PR que los contiene. Cada comportamiento implementado traza a un RF; si código y especificación difieren, se corrige uno de los dos en el mismo PR. Se exceptúan los cambios de presentación de la interfaz (estilos, maquetación, tipografía, color e iconos): no necesitan especificación si no cambian comportamiento, rutas, contrato, reglas de negocio ni textos fijados en una especificación, y quedan aprobados al fusionar su PR.
3. **Lógica separada de la interfaz.** Las reglas de negocio viven solo en la API; la interfaz no calcula importes, totales ni métricas oficiales. El contrato entre ambas vive en `packages/contracts`.
4. **Tests primero.** Cada RF tiene al menos un test automatizado que lo cubre, escrito antes del código de su tarea. No se fusiona nada con tests fallando.
5. **Persistencia segura.** Los datos se leen y escriben solo a través de la capa de datos de la API; una operación que modifica varios registros es atómica. Ningún secreto se versiona.
6. **Idioma.** Código e identificadores en inglés; mensajes al usuario, documentación, commits y PR en español. Importes en bolivianos (BOB) y fechas en hora de Bolivia.

## Enmiendas

| Versión | Fecha | Motivo |
| --- | --- | --- |
| 2.0.0 | 2026-10-24 | Principio 2: la persona puede delegar en el agente las decisiones de cada paso, incluidas las que resuelven bloqueos; la especificación, el plan y el código que dependa de ellos quedan aprobados juntos al fusionar el PR que los contiene. Cambia el sentido del principio, que antes exigía aprobar cada paso antes de escribir código. |
| 3.0.0 | 2026-10-25 | Principio 2: los cambios de presentación de la interfaz que no alteran comportamiento, rutas, contrato, reglas de negocio ni textos fijados en una especificación se hacen sin `spec.md` ni `plan.md` y se aprueban al fusionar su PR. Principio 1: sus dependencias nuevas se justifican en ese PR. Cambia el sentido del principio 2, que antes exigía especificación para todo código de las aplicaciones, para que el diseño de la interfaz no requiera planificar cada pantalla. |
