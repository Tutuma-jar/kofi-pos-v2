// Superficie pública del módulo menu de la interfaz (D-11). Los demás módulos importan solo de aquí.
export { httpMenuClient, type MenuClient } from './api/menu-client.ts';
export { MenuClientProvider } from './api/MenuClientProvider.tsx';
export { MenuAdminPage } from './pages/MenuAdminPage.tsx';
export { MenuPage } from './pages/MenuPage.tsx';
