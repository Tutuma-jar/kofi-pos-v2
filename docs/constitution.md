# Constitución — Kofi POS

Versión 1.0.0 · 2026-10-23

1. **Stack mínimo.** TypeScript en todo el monorepo (Node 24 y workspaces de npm): interfaz con React y Vite, API con Fastify, contrato con esquemas de Zod, base de datos PostgreSQL y despliegue en Render (interfaz y API) y Neon (base de datos). Toda dependencia nueva se justifica en el `plan.md` que la introduce.
2. **Especificación antes que código.** No se escribe código sin `spec.md` y `plan.md` aprobados. Cada comportamiento implementado traza a un RF; si código y especificación difieren, se corrige uno de los dos en el mismo PR.
3. **Lógica separada de la interfaz.** Las reglas de negocio viven solo en la API; la interfaz no calcula importes, totales ni métricas oficiales. El contrato entre ambas vive en `packages/contracts`.
4. **Tests primero.** Cada RF tiene al menos un test automatizado que lo cubre, escrito antes del código de su tarea. No se fusiona nada con tests fallando.
5. **Persistencia segura.** Los datos se leen y escriben solo a través de la capa de datos de la API; una operación que modifica varios registros es atómica. Ningún secreto se versiona.
6. **Idioma.** Código e identificadores en inglés; mensajes al usuario, documentación, commits y PR en español. Importes en bolivianos (BOB) y fechas en hora de Bolivia.
