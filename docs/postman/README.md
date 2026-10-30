# Colección de Postman

Colección importable con los endpoints de la API de Kofi POS y su entorno de prueba.

| Archivo | Contenido |
| --- | --- |
| `kofi-pos.postman_collection.json` | Colección `Kofi POS — API`: 29 peticiones en 8 carpetas, con tests de código de estado |
| `kofi-pos-prueba.postman_environment.json` | Entorno `Kofi POS — prueba`: `baseUrl` y credenciales de dueño y cajero |

## Origen

La colección y el entorno se crearon el 2026-10-30 en el workspace de Postman del equipo con el servidor MCP de Postman (`createCollection` y `createEnvironment`), y la colección se comprobó con `getCollection`. Los identificadores de este archivo son los que asignó Postman:

| Elemento | UID en Postman |
| --- | --- |
| Colección `Kofi POS — API` | `55813538-bf7b90ca-058a-4322-88a9-c1b947a1eae3` |
| Entorno `Kofi POS — prueba` | `55813538-a4daf651-f559-4367-8919-6212b34358ad` |

## Uso

1. En Postman, **Import** y arrastra los dos archivos.
2. Selecciona el entorno `Kofi POS — prueba`, pon en `baseUrl` la API que vas a probar y escribe las credenciales de dueño y cajero. Las contraseñas son variables secretas y no se versionan.
3. Ejecuta la colección en orden con el **Runner**: cada carpeta usa los identificadores que guarda la anterior.

Usa solo una API de prueba con su propia base, nunca el despliegue de `main`: las carpetas de Menú y Ventas crean categorías, productos y una venta que no se pueden eliminar.
