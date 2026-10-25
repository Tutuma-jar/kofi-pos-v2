// Superficie pública del módulo history de la interfaz (D-11). Los demás módulos importan solo de aquí.
export { httpHistoryClient, type HistoryClient } from './api/history-client.ts';
export { HistoryClientProvider } from './api/HistoryClientProvider.tsx';
export { DayHistoryPage } from './pages/DayHistoryPage.tsx';
export { MonthHistoryPage } from './pages/MonthHistoryPage.tsx';
export { SaleDetailPage } from './pages/SaleDetailPage.tsx';
