import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { httpSalesClient } from './sales-client.ts';

const HOT = '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2';
const AMERICANO = 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07';
const DRAFT = '4f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e11';
const SALE = '9b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3da0';
const ANA = '7d3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5bc9';

const draftLine = {
  productId: AMERICANO,
  productName: 'Café americano',
  quantity: 2,
  unitPriceCents: 1250,
};
const line = { ...draftLine, categoryName: 'Bebidas calientes', subtotalCents: 2500 };
const quote = {
  lines: [line],
  totalCents: 2500,
  notices: [],
  menu: [
    {
      id: HOT,
      name: 'Bebidas calientes',
      products: [{ id: AMERICANO, name: 'Café americano', priceCents: 1250 }],
    },
  ],
};
const sale = {
  id: SALE,
  number: 1,
  registeredAt: '2026-10-24T18:05:12.000Z',
  registeredBy: { userId: ANA, displayName: 'Ana', role: 'cashier' },
  lines: [line],
  totalCents: 2500,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpSalesClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('quote usa POST /api/sales/quote con las líneas', async () => {
    fetchMock.mockResolvedValue(json(200, quote));

    expect(await httpSalesClient.quote({ lines: [draftLine] })).toEqual(quote);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sales/quote',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ lines: [draftLine] }) }),
    );
  });

  it.each([201, 200])('register usa POST /api/sales y acepta %i', async (status) => {
    fetchMock.mockResolvedValue(json(status, { sale }));
    const request = { draftId: DRAFT, lines: [draftLine] };

    expect(await httpSalesClient.register(request)).toEqual(sale);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sales',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
    );
  });

  it.each([
    ['quote', () => httpSalesClient.quote({ lines: [] }), { lines: [], totalCents: -1 }],
    [
      'register',
      () => httpSalesClient.register({ draftId: DRAFT, lines: [draftLine] }),
      { sale: { ...sale, lines: [] } },
    ],
  ])('%s valida la respuesta con el esquema del contrato', async (_name, call, response) => {
    fetchMock.mockResolvedValue(json(200, response));

    await expect(call()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('propaga el error de la API', async () => {
    fetchMock.mockResolvedValue(
      json(409, {
        error: {
          code: 'MENU_CHANGED',
          message: 'El menú cambió. Revisa la venta antes de registrarla',
        },
      }),
    );

    const error = await httpSalesClient
      .register({ draftId: DRAFT, lines: [draftLine] })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiFetchError);
    expect(error).toMatchObject({ status: 409, code: 'MENU_CHANGED' });
  });
});
