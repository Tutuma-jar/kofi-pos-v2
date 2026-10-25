import {
  boliviaDateSchema,
  boliviaMonthSchema,
  dayHistorySchema,
  HISTORY_MESSAGES,
  historySaleResponseSchema,
  monthHistorySchema,
  parseSaleNumber,
  saleNotFoundMessage,
  type DayHistory,
  type HistorySaleResponse,
  type MonthHistory,
} from '@kofi/contracts';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';
import type { HistoryClient } from '../api/history-client.ts';
import { monthDays, shiftDate, shiftMonth } from './demo-calendar.ts';
import {
  DEMO_CURRENT_MONTH,
  DEMO_DAYS,
  DEMO_MONTHS,
  DEMO_NO_PAYMENTS,
  DEMO_SALES,
  DEMO_TODAY,
} from './fixtures.ts';

// Cliente simulado de /api/history para trabajar la interfaz sin la API (docs/architecture.md §4.5,
// plan D-9). Devuelve cifras fijas ya calculadas, sin hacer cuentas (principio 3); un día o un mes
// sin datos en los fixtures llega vacío, con su navegación. Este archivo no llega al build.

interface Scenario {
  label: string;
}

export const HISTORY_SCENARIOS = {
  withSales: { label: 'Con ventas' },
  empty: { label: 'Sin ventas' },
  offline: { label: 'Sin conexión' },
  // Error inesperado de la API (RF-6).
  error: { label: 'Con error' },
  // Rechaza todo, como la API a un cajero (RF-1).
  forbidden: { label: 'Sin permiso' },
  // Como «Con ventas», pero cada respuesta tarda 1,5 s, para ver «Cargando…».
  slow: { label: 'Lento' },
} as const satisfies Record<string, Scenario>;

export type HistoryScenarioId = keyof typeof HISTORY_SCENARIOS;

export interface HistoryDemoClient extends HistoryClient {
  readonly scenario: HistoryScenarioId;
  setScenario(scenario: HistoryScenarioId): void;
}

const SLOW_MILLISECONDS = 1500;
// El mensaje de 500 INTERNAL_ERROR de la API (docs/architecture.md §6.3).
const INTERNAL_ERROR_MESSAGE = 'Ocurrió un error. Inténtalo de nuevo';

const rejected = (status: number, code: string, message: string) =>
  new ApiFetchError(status, { code, message });

function emptyDay(date: string): DayHistory {
  return {
    date,
    today: DEMO_TODAY,
    previousDate: shiftDate(date, -1),
    nextDate: date === DEMO_TODAY ? null : shiftDate(date, 1),
    asOf: '',
    totalCents: 0,
    salesCount: 0,
    byPaymentMethod: DEMO_NO_PAYMENTS,
    sales: [],
  };
}

function emptyMonth(month: string): MonthHistory {
  return {
    month,
    currentMonth: DEMO_CURRENT_MONTH,
    previousMonth: shiftMonth(month, -1),
    nextMonth: month === DEMO_CURRENT_MONTH ? null : shiftMonth(month, 1),
    asOf: '',
    totalCents: 0,
    salesCount: 0,
    byPaymentMethod: DEMO_NO_PAYMENTS,
    days: monthDays(month)
      .filter((date) => date <= DEMO_TODAY)
      .map((date) => ({ date, totalCents: 0, salesCount: 0 })),
  };
}

export function createHistoryDemoClient(initial: HistoryScenarioId): HistoryDemoClient {
  let scenario: HistoryScenarioId = initial;

  // Responde como la API: los escenarios de error primero, después los rechazos de cada operación,
  // y la respuesta validada con el contrato.
  async function respond<T>(answer: () => T, schema: { parse(data: unknown): T }): Promise<T> {
    if (scenario === 'offline') {
      throw new ApiFetchError(null, { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
    }
    if (scenario === 'error') throw rejected(500, 'INTERNAL_ERROR', INTERNAL_ERROR_MESSAGE);
    if (scenario === 'forbidden') throw rejected(403, 'FORBIDDEN', HISTORY_MESSAGES.forbidden);
    if (scenario === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, SLOW_MILLISECONDS));
    }
    return schema.parse(answer());
  }

  const withSales = () => scenario !== 'empty';
  // El momento de los datos es la hora de cada pedido.
  const now = () => new Date().toISOString();

  return {
    get scenario() {
      return scenario;
    },
    setScenario(next) {
      scenario = next;
    },
    day: (date = DEMO_TODAY) =>
      respond(() => {
        if (!boliviaDateSchema.safeParse(date).success) {
          throw rejected(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidDate);
        }
        if (date > DEMO_TODAY) {
          throw rejected(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.futureDate);
        }
        return { ...((withSales() && DEMO_DAYS[date]) || emptyDay(date)), asOf: now() };
      }, dayHistorySchema),
    sale: (text) =>
      respond((): HistorySaleResponse => {
        const number = parseSaleNumber(text);
        if (number === null) {
          throw rejected(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidSaleNumber);
        }
        const sale = withSales() ? DEMO_SALES[number] : undefined;
        if (!sale) throw rejected(404, 'NOT_FOUND', saleNotFoundMessage(number));
        return sale;
      }, historySaleResponseSchema),
    month: (month = DEMO_CURRENT_MONTH) =>
      respond(() => {
        if (!boliviaMonthSchema.safeParse(month).success) {
          throw rejected(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidMonth);
        }
        if (month > DEMO_CURRENT_MONTH) {
          throw rejected(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.futureMonth);
        }
        return { ...((withSales() && DEMO_MONTHS[month]) || emptyMonth(month)), asOf: now() };
      }, monthHistorySchema),
  };
}

const STORAGE_KEY = 'kofi:dev:history-scenario';

export function loadStoredHistoryScenario(): HistoryScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in HISTORY_SCENARIOS) return stored as HistoryScenarioId;
  } catch {
    // Sin localStorage, se empieza con ventas.
  }
  return 'withSales';
}

export function storeHistoryScenario(scenario: HistoryScenarioId): void {
  try {
    localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // No es necesario recordarlo.
  }
}
