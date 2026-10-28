// Superficie pública del módulo menu de la API (D-11). Los demás módulos importan solo de aquí.
export { getCurrentMenu, getAdminMenu } from './menu.views.ts';
export { menuPlugin } from './menu.routes.ts';
export { saveCategory } from './categories.service.ts';
export { saveProduct } from './products.service.ts';
export { loadOfficialMenu } from './official-menu.service.ts';
