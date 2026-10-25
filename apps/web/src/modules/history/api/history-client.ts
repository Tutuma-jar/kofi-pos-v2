import {
  dayHistorySchema,
  historySaleResponseSchema,
  monthHistorySchema,
  type DayHistory,
  type HistorySaleResponse,
  type MonthHistory,
} from '@kofi/contracts';
import { apiFetch } from '../../../shared/http/api-fetch.ts';

// Lo que la interfaz necesita de /api/history (plan §6.2). Lo implementan el cliente HTTP real y el
// cliente simulado de dev/, así que la integración es cambiar uno por otro (D-9). La fecha, el mes y
// el número llegan tal como están en la URL y los valida la API. Los errores llegan como
// ApiFetchError.

export interface HistoryClient {
  // Las ventas de un día; sin fecha, las de hoy (US1; RF-2 a RF-5).
  day(date?: string): Promise<DayHistory>;
  // El detalle de una venta por su número (US2; RF-8, RF-9).
  sale(number: string): Promise<HistorySaleResponse>;
  // Las cifras de un mes; sin mes, las del mes en curso (US3; RF-11 a RF-13).
  month(month?: string): Promise<MonthHistory>;
}

const withQuery = (path: string, name: string, value: string | undefined) =>
  value === undefined ? path : `${path}?${new URLSearchParams({ [name]: value })}`;

export const httpHistoryClient: HistoryClient = {
  day: (date) =>
    apiFetch(withQuery('/api/history/day', 'date', date), { schema: dayHistorySchema }),
  sale: (number) =>
    apiFetch(`/api/history/sales/${encodeURIComponent(number)}`, {
      schema: historySaleResponseSchema,
    }),
  month: (month) =>
    apiFetch(withQuery('/api/history/month', 'month', month), { schema: monthHistorySchema }),
};
