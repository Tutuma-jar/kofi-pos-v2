import {
  apiErrorSchema,
  dayHistorySchema,
  HISTORY_MESSAGES,
  historySaleResponseSchema,
  monthHistorySchema,
  saleNotFoundMessage,
} from '@kofi/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import {
  createHistoryDemoClient,
  HISTORY_SCENARIOS,
  loadStoredHistoryScenario,
  storeHistoryScenario,
  type HistoryDemoClient,
} from './history-demo-client.ts';
import { DEMO_CURRENT_MONTH, DEMO_DAYS, DEMO_MONTHS, DEMO_SALES, DEMO_TODAY } from './fixtures.ts';

// El error que lanza una operación del cliente simulado, comprobado con el formato común.
async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiFetchError);
  const { status, error: body } = error as ApiFetchError;
  expect(apiErrorSchema.safeParse({ error: body }).success).toBe(true);
  return { status, code: body.code, message: body.message };
}

describe('fixtures del historial (plan D-9)', () => {
  it('cumplen el contrato', () => {
    for (const day of Object.values(DEMO_DAYS)) {
      expect(dayHistorySchema.safeParse(day).success).toBe(true);
    }
    for (const month of Object.values(DEMO_MONTHS)) {
      expect(monthHistorySchema.safeParse(month).success).toBe(true);
    }
    for (const sale of Object.values(DEMO_SALES)) {
      expect(historySaleResponseSchema.safeParse(sale).success).toBe(true);
    }
  });

  it('hoy es el 25/10/2026', () => {
    expect(DEMO_TODAY).toBe('2026-10-25');
    expect(DEMO_CURRENT_MONTH).toBe('2026-10');
  });
});

describe('createHistoryDemoClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('day sin fecha responde hoy y con fecha el día pedido, con asOf del pedido', async () => {
    const client = createHistoryDemoClient('withSales');
    const before = Date.now();

    const today = await client.day();
    expect(today.date).toBe('2026-10-25');
    expect(today.nextDate).toBeNull();
    expect(Date.parse(today.asOf)).toBeGreaterThanOrEqual(before);

    const day = await client.day('2026-10-24');
    expect(day).toMatchObject({ date: '2026-10-24', totalCents: 4550, salesCount: 2 });
    expect(day.sales.map((sale) => sale.number)).toEqual([3, 2]);
  });

  it('un día sin datos en los fixtures responde vacío, con su navegación', async () => {
    const day = await createHistoryDemoClient('withSales').day('2026-03-01');

    expect(dayHistorySchema.safeParse(day).success).toBe(true);
    expect(day).toMatchObject({
      date: '2026-03-01',
      previousDate: '2026-02-28',
      nextDate: '2026-03-02',
      salesCount: 0,
      sales: [],
    });
  });

  it('month responde el mes en curso o el pedido; uno sin datos, vacío con todos sus días', async () => {
    const client = createHistoryDemoClient('withSales');

    expect(await client.month()).toMatchObject({ month: '2026-10', nextMonth: null });
    const february = await client.month('2024-02');
    expect(monthHistorySchema.safeParse(february).success).toBe(true);
    expect(february).toMatchObject({ previousMonth: '2024-01', nextMonth: '2024-03' });
    expect(february.days).toHaveLength(29);
  });

  it('sale responde el detalle por su número normalizado', async () => {
    expect((await createHistoryDemoClient('withSales').sale('003')).sale.number).toBe(3);
  });

  it.each([
    [
      'un día futuro',
      (c: HistoryDemoClient) => c.day('2026-10-26'),
      400,
      HISTORY_MESSAGES.futureDate,
    ],
    [
      'una fecha inválida',
      (c: HistoryDemoClient) => c.day('2026-02-30'),
      400,
      HISTORY_MESSAGES.invalidDate,
    ],
    [
      'un mes futuro',
      (c: HistoryDemoClient) => c.month('2026-11'),
      400,
      HISTORY_MESSAGES.futureMonth,
    ],
    [
      'un mes inválido',
      (c: HistoryDemoClient) => c.month('2026-13'),
      400,
      HISTORY_MESSAGES.invalidMonth,
    ],
    [
      'un número inválido',
      (c: HistoryDemoClient) => c.sale('abc'),
      400,
      HISTORY_MESSAGES.invalidSaleNumber,
    ],
    ['un número sin venta', (c: HistoryDemoClient) => c.sale('99'), 404, saleNotFoundMessage('99')],
  ])('%s responde %i con el mensaje del contrato', async (_, call, status, message) => {
    expect(await rejection(call(createHistoryDemoClient('withSales')))).toMatchObject({
      status,
      message,
    });
  });

  it('sin ventas, los días y los meses vienen vacíos y no hay ventas que abrir', async () => {
    const client = createHistoryDemoClient('empty');

    expect(await client.day('2026-10-24')).toMatchObject({ salesCount: 0, sales: [] });
    expect(await client.month()).toMatchObject({ totalCents: 0, salesCount: 0 });
    expect(await rejection(client.sale('3'))).toMatchObject({ status: 404 });
  });

  it.each([
    ['offline', null, 'NETWORK_ERROR', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 500, 'INTERNAL_ERROR', 'Ocurrió un error. Inténtalo de nuevo'],
    ['forbidden', 403, 'FORBIDDEN', HISTORY_MESSAGES.forbidden],
  ] as const)(
    '«%s» falla en las tres operaciones con %s %s',
    async (scenario, status, code, message) => {
      const client = createHistoryDemoClient(scenario);
      for (const call of [() => client.day(), () => client.month(), () => client.sale('3')]) {
        expect(await rejection(call())).toEqual({ status, code, message });
      }
    },
  );

  it('«Lento» responde después de 1,5 s', async () => {
    vi.useFakeTimers();
    const client = createHistoryDemoClient('slow');
    let done = false;
    const pending = client.day().then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(1499);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });

  it('cambia de escenario', async () => {
    const client = createHistoryDemoClient('withSales');
    client.setScenario('offline');

    expect(client.scenario).toBe('offline');
    await expect(client.day()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('recuerda el escenario elegido', () => {
    storeHistoryScenario('forbidden');
    expect(loadStoredHistoryScenario()).toBe('forbidden');
    localStorage.setItem('kofi:dev:history-scenario', 'otro');
    expect(loadStoredHistoryScenario()).toBe('withSales');
    localStorage.removeItem('kofi:dev:history-scenario');
  });

  it('tiene los seis escenarios del plan', () => {
    expect(Object.keys(HISTORY_SCENARIOS)).toEqual([
      'withSales',
      'empty',
      'offline',
      'error',
      'forbidden',
      'slow',
    ]);
  });
});
