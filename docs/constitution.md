# Constitución — Kofi POS

Versión 2.0.0 · 2026-10-24

1. **Stack mínimo.** TypeScript en todo el monorepo (Node 24 y workspaces de npm): interfaz con React y Vite, API con Fastify, contrato con esquemas de Zod, base de datos PostgreSQL y despliegue en Render (interfaz y API) y Neon (base de datos). Toda dependencia nueva se justifica en el `plan.md` que la introduce.
2. **Especificación antes que código.** No se escribe código de las aplicaciones sin `spec.md` y `plan.md` aprobados. La persona aprueba cada paso o delega sus decisiones en el agente, incluidas las que resuelven bloqueos: el agente decide con sus recomendaciones, las registra, y quedan aprobadas al fusionar el PR que las contiene. Cada comportamiento implementado traza a un RF; si código y especificación difieren, se corrige uno de los dos en el mismo PR.
3. **Lógica separada de la interfaz.** Las reglas de negocio viven solo en la API; la interfaz no calcula importes, totales ni métricas oficiales. El contrato entre ambas vive en `packages/contracts`.
4. **Tests primero.** Cada RF tiene al menos un test automatizado que lo cubre, escrito antes del código de su tarea. No se fusiona nada con tests fallando.
5. **Persistencia segura.** Los datos se leen y escriben solo a través de la capa de datos de la API; una operación que modifica varios registros es atómica. Ningún secreto se versiona.
6. **Idioma.** Código e identificadores en inglés; mensajes al usuario, documentación, commits y PR en español. Importes en bolivianos (BOB) y fechas en hora de Bolivia.

## Enmiendas

| Versión | Fecha | Motivo |
| --- | --- | --- |
| 2.0.0 | 2026-10-24 | Principio 2: la persona puede delegar en el agente las decisiones de cada paso, incluidas las que resuelven bloqueos; quedan aprobadas al fusionar el PR que las contiene. Cambia el sentido del principio, que antes exigía aprobar cada paso. |
