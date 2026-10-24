import {
  apiErrorSchema,
  DASHBOARD_MESSAGES,
  monthSummarySchema,
  todaySummarySchema,
} from '@kofi/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import {
  createDashboardDemoClient,
  DASHBOARD_SCENARIOS,
  loadStoredDashboardScenario,
  storeDashboardScenario,
} from './dashboard-demo-client.ts';
import { DEMO_EMPTY_MONTH, DEMO_EMPTY_TODAY, DEMO_MONTH, DEMO_TODAY } from './fixtures.ts';

async function rejection(promise: Promise<unknown>): Promise<ApiFetchError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiFetchError);
  // Los errores simulados tienen el formato de la API.
  apiErrorSchema.parse({ error: (error as ApiFetchError).error });
  return error as ApiFetchError;
}

describe('fixtures del dashboard', () => {
  it('cumplen el contrato', () => {
    expect(todaySummarySchema.parse(DEMO_TODAY)).toEqual(DEMO_TODAY);
    expect(todaySummarySchema.parse(DEMO_EMPTY_TODAY)).toEqual(DEMO_EMPTY_TODAY);
    expect(monthSummarySchema.parse(DEMO_MONTH)).toEqual(DEMO_MONTH);
    expect(monthSummarySchema.parse(DEMO_EMPTY_MONTH)).toEqual(DEMO_EMPTY_MONTH);
  });
});

describe('createDashboardDemoClient (plan D-8)', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('tiene los cinco escenarios del plan', () => {
    expect(Object.values(DASHBOARD_SCENARIOS).map((s) => s.label)).toEqual([
      'Con ventas',
      'Sin ventas',
      'Sin conexión',
      'Sin permiso',
      'Lento',
    ]);
  });

  it('con ventas devuelve los resúmenes fijos, con asOf de cada pedido', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-24T15:30:00.000Z') });
    const client = createDashboardDemoClient('withSales');

    const today = await client.today();
    const month = await client.month();

    expect(todaySummarySchema.parse(today)).toEqual({
      ...DEMO_TODAY,
      asOf: '2026-10-24T15:30:00.000Z',
    });
    expect(monthSummarySchema.parse(month)).toEqual({
      ...DEMO_MONTH,
      asOf: '2026-10-24T15:30:00.000Z',
    });
  });

  it('sin ventas devuelve los resúmenes vacíos', async () => {
    const client = createDashboardDemoClient('empty');

    expect(await client.today()).toMatchObject({ ...DEMO_EMPTY_TODAY, asOf: expect.any(String) });
    expect(await client.month()).toMatchObject({ ...DEMO_EMPTY_MONTH, asOf: expect.any(String) });
  });

  it('sin conexión falla con NETWORK_ERROR', async () => {
    const client = createDashboardDemoClient('offline');

    expect(await rejection(client.today())).toMatchObject({ status: null, code: 'NETWORK_ERROR' });
    expect(await rejection(client.month())).toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('sin permiso falla con 403 FORBIDDEN y el mensaje del contrato', async () => {
    const client = createDashboardDemoClient('forbidden');

    const error = await rejection(client.today());
    expect(error.status).toBe(403);
    expect(error.error).toEqual({ code: 'FORBIDDEN', message: DASHBOARD_MESSAGES.forbidden });
    expect(await rejection(client.month())).toMatchObject({ status: 403 });
  });

  it('lento responde después de 1,5 s', async () => {
    vi.useFakeTimers();
    const client = createDashboardDemoClient('slow');
    const resolved = vi.fn();

    void client.today().then(resolved);
    await vi.advanceTimersByTimeAsync(1499);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledWith(expect.objectContaining({ totalCents: 4550 }));
  });

  it('cambia de escenario', async () => {
    const client = createDashboardDemoClient('withSales');
    client.setScenario('empty');

    expect(client.scenario).toBe('empty');
    expect(await client.today()).toMatchObject({ salesCount: 0 });
  });

  it('recuerda el escenario elegido', () => {
    expect(loadStoredDashboardScenario()).toBe('withSales');
    storeDashboardScenario('forbidden');
    expect(loadStoredDashboardScenario()).toBe('forbidden');
    localStorage.setItem('kofi:dev:dashboard-scenario', 'otro');
    expect(loadStoredDashboardScenario()).toBe('withSales');
  });
});
