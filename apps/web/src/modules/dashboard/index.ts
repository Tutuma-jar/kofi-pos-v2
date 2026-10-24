// Superficie pública del módulo dashboard de la interfaz (D-11). Los demás módulos importan solo de aquí.
export { httpDashboardClient, type DashboardClient } from './api/dashboard-client.ts';
export { DashboardClientProvider } from './api/DashboardClientProvider.tsx';
