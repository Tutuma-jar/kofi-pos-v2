// Superficie pública del módulo sales de la API (D-11). Los demás módulos importan solo de aquí.
export { salesPlugin } from './sales.routes.ts';
export { listRegisteredSales, findSaleByNumber } from './sales.repository.ts';
export { loadDemoSales } from './demo-sales.service.ts';
