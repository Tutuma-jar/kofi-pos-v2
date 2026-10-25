import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { httpDashboardClient } from './dashboard-client.ts';

const summary = {
  asOf: '2026-10-24T15:00:00.000Z',
  totalCents: 2500,
  salesCount: 1,
  averageTicketCents: 2500,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
  topProducts: [
    {
      productId: 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07',
      productName: 'Café americano',
      quantity: 2,
      totalCents: 2500,
    },
  ],
};
const today = { date: '2026-10-24', ...summary };
const month = {
  month: '2026-10',
  ...summary,
  days: [{ date: '2026-10-01', totalCents: 2500, salesCount: 1 }],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpDashboardClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('today usa GET /api/dashboard/today', async () => {
    fetchMock.mockResolvedValue(json(200, today));

    expect(await httpDashboardClient.today()).toEqual(today);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/today',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('month usa GET /api/dashboard/month', async () => {
    fetchMock.mockResolvedValue(json(200, month));

    expect(await httpDashboardClient.month()).toEqual(month);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/month',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it.each([
    ['today', () => httpDashboardClient.today(), { ...today, byPaymentMethod: [] }],
    ['month', () => httpDashboardClient.month(), { ...month, days: [] }],
  ])('%s rechaza una respuesta que no cumple el contrato', async (_, call, body) => {
    fetchMock.mockResolvedValue(json(200, body));

    await expect(call()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('propaga el 403 con el mensaje de la API', async () => {
    const forbidden = {
      error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el resumen de ventas' },
    };
    fetchMock.mockResolvedValue(json(403, forbidden));

    const error = await httpDashboardClient.today().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiFetchError);
    expect(error).toMatchObject({ status: 403, error: forbidden.error });
  });

  it('propaga la falta de conexión como NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(httpDashboardClient.month()).rejects.toMatchObject({
      status: null,
      code: 'NETWORK_ERROR',
    });
  });
});
