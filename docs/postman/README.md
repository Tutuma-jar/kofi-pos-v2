# Colección de Postman

Colección importable con los endpoints de la API de Kofi POS desplegada en Render y su entorno.

| Archivo | Contenido |
| --- | --- |
| `kofi-pos.postman_collection.json` | Colección `Kofi POS — API`: 29 peticiones en 8 carpetas, con tests de código de estado |
| `kofi-pos-despliegue.postman_environment.json` | Entorno `Kofi POS — despliegue`: `baseUrl` (`https://kofi-api.onrender.com`) y credenciales de dueño y cajero |

## Origen

La colección y el entorno se crearon el 2026-10-30 en el workspace de Postman del equipo con el servidor MCP de Postman (`createCollection` y `createEnvironment`), se actualizaron para el despliegue con `putCollection` y `putEnvironment`, y se comprobaron con `getCollection`. Los identificadores de este archivo son los que asignó Postman:

| Elemento | UID en Postman |
| --- | --- |
| Colección `Kofi POS — API` | `55813538-bf7b90ca-058a-4322-88a9-c1b947a1eae3` |
| Entorno `Kofi POS — despliegue` | `55813538-a4daf651-f559-4367-8919-6212b34358ad` |

## Uso

1. En Postman, **Import** y arrastra los dos archivos.
2. Selecciona el entorno `Kofi POS — despliegue` y escribe las credenciales de dueño y cajero. Las contraseñas son variables secretas y no se versionan.
3. Ejecuta la colección en orden con el **Runner**: cada carpeta usa los identificadores que guarda la anterior.

La API está en el plan gratuito de Render: la primera petición tras 15 minutos sin uso tarda alrededor de un minuto en responder.

Las carpetas de Menú y Ventas crean una categoría, un producto y una venta reales en la base del despliegue, que no se pueden eliminar y cambian las cifras del Dashboard y del Historial. Para no tocar esos datos, ejecuta solo Salud, Acceso, Dashboard, Historial y Permisos del cajero.
