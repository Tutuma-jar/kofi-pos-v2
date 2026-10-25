import { HISTORY_MESSAGES, saleNotFoundMessage } from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { httpHistoryClient } from './history-client.ts';

const totals = {
  asOf: '2026-10-25T15:00:00.000Z',
  totalCents: 2500,
  salesCount: 1,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
};
const listedSale = {
  id: 'd1e2f3a4-0000-4000-8000-000000000002',
  number: 2,
  registeredAt: '2026-10-24T13:15:00.000Z',
  registeredBy: { userId: null, displayName: 'Ana Quispe', role: 'cashier' },
  totalCents: 2500,
  paymentMethod: 'cash',
};
const day = {
  date: '2026-10-24',
  today: '2026-10-25',
  previousDate: '2026-10-23',
  nextDate: '2026-10-25',
  ...totals,
  sales: [listedSale],
};
const month = {
  month: '2026-10',
  currentMonth: '2026-10',
  previousMonth: '2026-09',
  nextMonth: null,
  ...totals,
  days: [{ date: '2026-10-01', totalCents: 2500, salesCount: 1 }],
};
const saleResponse = {
  date: '2026-10-24',
  sale: {
    ...listedSale,
    lines: [
      {
        productId: 'c4e1a2b3-0000-4000-8000-000000000007',
        productName: 'Café americano',
        categoryName: 'Bebidas calientes',
        quantity: 2,
        unitPriceCents: 1250,
        subtotalCents: 2500,
      },
    ],
  },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpHistoryClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([
    ['day sin fecha', () => httpHistoryClient.day(), '/api/history/day', day],
    [
      'day con fecha',
      () => httpHistoryClient.day('2026-10-24'),
      '/api/history/day?date=2026-10-24',
      day,
    ],
    ['month sin mes', () => httpHistoryClient.month(), '/api/history/month', month],
    [
      'month con mes',
      () => httpHistoryClient.month('2026-10'),
      '/api/history/month?month=2026-10',
      month,
    ],
    ['sale', () => httpHistoryClient.sale('2'), '/api/history/sales/2', saleResponse],
  ])('%s usa GET %s', async (_, call, path, body) => {
    fetchMock.mockResolvedValue(json(200, body));

    expect(await call()).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(path, expect.objectContaining({ method: 'GET' }));
  });

  it('codifica la fecha, el mes y el número tal como llegan de la URL', async () => {
    fetchMock.mockResolvedValue(json(200, day));
    await httpHistoryClient.day('2026/10 24').catch(() => undefined);
    await httpHistoryClient.sale('1/2').catch(() => undefined);

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/history/day?date=2026%2F10+24',
      '/api/history/sales/1%2F2',
    ]);
  });

  it.each([
    ['day', () => httpHistoryClient.day(), { ...day, salesCount: 2 }],
    ['month', () => httpHistoryClient.month(), { ...month, days: [] }],
    ['sale', () => httpHistoryClient.sale('2'), { sale: saleResponse.sale }],
  ])('%s rechaza una respuesta que no cumple el contrato', async (_, call, body) => {
    fetchMock.mockResolvedValue(json(200, body));

    await expect(call()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it.each([
    [
      400,
      'VALIDATION_ERROR',
      HISTORY_MESSAGES.futureDate,
      () => httpHistoryClient.day('2026-10-26'),
    ],
    [403, 'FORBIDDEN', HISTORY_MESSAGES.forbidden, () => httpHistoryClient.month()],
    [404, 'NOT_FOUND', saleNotFoundMessage('99'), () => httpHistoryClient.sale('99')],
  ])('propaga el %i %s con el mensaje de la API', async (status, code, message, call) => {
    fetchMock.mockResolvedValue(json(status, { error: { code, message } }));

    const error = await call().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiFetchError);
    expect(error).toMatchObject({ status, error: { code, message } });
  });

  it('propaga la falta de conexión como NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(httpHistoryClient.day()).rejects.toMatchObject({
      status: null,
      code: 'NETWORK_ERROR',
    });
  });
});
