import {
  DASHBOARD_MESSAGES,
  monthSummarySchema,
  todaySummarySchema,
  type MonthSummary,
  type TodaySummary,
} from '@kofi/contracts';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';
import type { DashboardClient } from '../api/dashboard-client.ts';
import { DEMO_EMPTY_MONTH, DEMO_EMPTY_TODAY, DEMO_MONTH, DEMO_TODAY } from './fixtures.ts';

// Cliente simulado de /api/dashboard para trabajar la interfaz sin la API (docs/architecture.md
// §4.5, plan D-8). Devuelve resúmenes fijos ya calculados, sin hacer cuentas (principio 3), y este
// archivo no llega al build.

interface Scenario {
  label: string;
}

export const DASHBOARD_SCENARIOS = {
  withSales: { label: 'Con ventas' },
  empty: { label: 'Sin ventas' },
  offline: { label: 'Sin conexión' },
  // Error inesperado de la API (RF-7).
  error: { label: 'Con error' },
  forbidden: { label: 'Sin permiso' },
  // Como «Con ventas», pero cada respuesta tarda 1,5 s, para ver «Cargando…».
  slow: { label: 'Lento' },
} as const satisfies Record<string, Scenario>;

export type DashboardScenarioId = keyof typeof DASHBOARD_SCENARIOS;

export interface DashboardDemoClient extends DashboardClient {
  readonly scenario: DashboardScenarioId;
  setScenario(scenario: DashboardScenarioId): void;
}

const SLOW_MILLISECONDS = 1500;
// El mensaje de 500 INTERNAL_ERROR de la API (docs/architecture.md §6.3).
const INTERNAL_ERROR_MESSAGE = 'Ocurrió un error. Inténtalo de nuevo';

export function createDashboardDemoClient(initial: DashboardScenarioId): DashboardDemoClient {
  let scenario: DashboardScenarioId = initial;

  // Responde como la API: valida con el contrato y pone en asOf la hora del pedido.
  async function respond<T extends TodaySummary | MonthSummary>(
    withSales: T,
    empty: T,
    schema: { parse(data: unknown): T },
  ): Promise<T> {
    if (scenario === 'offline') {
      throw new ApiFetchError(null, { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
    }
    if (scenario === 'error') {
      throw new ApiFetchError(500, { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE });
    }
    if (scenario === 'forbidden') {
      throw new ApiFetchError(403, { code: 'FORBIDDEN', message: DASHBOARD_MESSAGES.forbidden });
    }
    if (scenario === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, SLOW_MILLISECONDS));
    }
    const summary = scenario === 'empty' ? empty : withSales;
    return schema.parse({ ...summary, asOf: new Date().toISOString() });
  }

  return {
    get scenario() {
      return scenario;
    },
    setScenario(next) {
      scenario = next;
    },
    today: () => respond(DEMO_TODAY, DEMO_EMPTY_TODAY, todaySummarySchema),
    month: () => respond(DEMO_MONTH, DEMO_EMPTY_MONTH, monthSummarySchema),
  };
}

const STORAGE_KEY = 'kofi:dev:dashboard-scenario';

export function loadStoredDashboardScenario(): DashboardScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DASHBOARD_SCENARIOS) return stored as DashboardScenarioId;
  } catch {
    // Sin localStorage, se empieza con ventas.
  }
  return 'withSales';
}

export function storeDashboardScenario(scenario: DashboardScenarioId): void {
  try {
    localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // No es necesario recordarlo.
  }
}
