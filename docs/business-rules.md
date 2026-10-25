# Reglas de negocio — Kofi POS

## Qué es Kofi

Kofi POS es el sistema web de punto de venta de Kofi, una cafetería ficticia que representa un pequeño emprendimiento gastronómico común en Bolivia.

## Contexto

- Negocio pequeño, atendido por una o dos personas.
- Una sola sucursal.
- Se usa desde una computadora del local, con conexión.
- Cobra en efectivo y con QR, y no emite factura (SPEC-003).
- Atiende dentro del día: la jornada no pasa de la medianoche, así que cada día de ventas es el día calendario en hora de Bolivia (SPEC-004).

## Módulos

| # | Módulo | Qué hace | Especificación |
| --- | --- | --- | --- |
| 1 | Acceso | Iniciar y cerrar sesión | `specs/001-acceso/` |
| 2 | Menú | Administrar productos y categorías | `specs/002-menu/` |
| 3 | Ventas | Preparar y registrar ventas pagadas | `specs/003-ventas/` |
| 4 | Dashboard | Resumen de las ventas del día y del mes | `specs/004-dashboard/` |
| 5 | Historial y reportes | Consultar ventas pasadas | `specs/005-historial/` |

Se construyen en ese orden. El dashboard y el historial dependen de ventas reales.

## Reglas globales

Aplican a todo el producto. Las especificaciones no las copian: las enlazan.

| Regla | Valor |
| --- | --- |
| Moneda | Bolivianos (BOB) |
| Zona horaria | Hora de Bolivia (`America/La_Paz`, UTC−4, sin horario de verano) |
| Locales | Uno solo: no hay varias sucursales |
