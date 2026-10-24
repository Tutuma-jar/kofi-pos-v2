import {
  monthSummarySchema,
  todaySummarySchema,
  type MonthSummary,
  type TodaySummary,
} from '@kofi/contracts';
import { apiFetch } from '../../../shared/http/api-fetch.ts';

// Lo que la interfaz necesita de /api/dashboard (plan §6.2). Lo implementan el cliente HTTP real y el
// cliente simulado de dev/, así que la integración es cambiar uno por otro (D-8). Los errores llegan
// como ApiFetchError.

export interface DashboardClient {
  // Resumen de hoy (US1; RF-2 a RF-8).
  today(): Promise<TodaySummary>;
  // Resumen del mes en curso (US2; RF-9, RF-10).
  month(): Promise<MonthSummary>;
}

export const httpDashboardClient: DashboardClient = {
  today: () => apiFetch('/api/dashboard/today', { schema: todaySummarySchema }),
  month: () => apiFetch('/api/dashboard/month', { schema: monthSummarySchema }),
};
