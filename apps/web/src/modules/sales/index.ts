// Superficie pública del módulo sales de la interfaz (D-11). Los demás módulos importan solo de aquí.
export { httpSalesClient, type SalesClient } from './api/sales-client.ts';
export { SalesClientProvider } from './api/SalesClientProvider.tsx';
