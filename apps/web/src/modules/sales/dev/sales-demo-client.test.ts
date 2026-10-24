import {
  apiErrorSchema,
  saleQuoteSchema,
  saleSchema,
  SALE_MESSAGES,
  type SaleDraftLine,
} from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { DEMO_IDS, DEMO_MENU } from './fixtures.ts';
import { createSalesDemoClient, SALES_SCENARIOS } from './sales-demo-client.ts';

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

const DRAFT_1 = '4f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e11';
const DRAFT_2 = 'c8a9b0c1-d2e3-4f4a-8b5c-6d7e8f9a0b02';

const shownAmericano = {
  productId: DEMO_IDS.americano,
  productName: 'Café americano',
  quantity: 2,
  unitPriceCents: 1250,
} satisfies SaleDraftLine;
const newEmpanada = {
  productId: DEMO_IDS.empanada,
  productName: 'Empanada',
  quantity: 1,
} satisfies SaleDraftLine;

describe('createSalesDemoClient (plan D-10)', () => {
  it('tiene los seis escenarios del plan', () => {
    expect(Object.values(SALES_SCENARIOS).map((s) => s.label)).toEqual([
      'Menú cargado',
      'Menú vacío',
      'Cambió un precio',
      'Producto retirado',
      'Sin conexión',
      'Respuesta perdida',
    ]);
  });

  it('quote calcula las líneas con el menú en memoria y devuelve los productos para vender', async () => {
    const client = createSalesDemoClient('loaded');

    const quote = await client.quote({ lines: [shownAmericano, newEmpanada] });

    expect(saleQuoteSchema.parse(quote)).toEqual(quote);
    expect(quote).toEqual({
      lines: [
        {
          ...shownAmericano,
          categoryName: 'Bebidas calientes',
          subtotalCents: 2500,
        },
        {
          ...newEmpanada,
          categoryName: 'Salados',
          unitPriceCents: 800,
          subtotalCents: 800,
        },
      ],
      totalCents: 3300,
      notices: [],
      menu: DEMO_MENU,
    });
  });

  it('una venta vacía da total 0', async () => {
    const quote = await createSalesDemoClient('loaded').quote({ lines: [] });
    expect(quote).toMatchObject({ lines: [], totalCents: 0, notices: [] });
  });

  it('con el menú vacío no hay productos para vender y avisa de lo que ya no está', async () => {
    const quote = await createSalesDemoClient('empty').quote({ lines: [newEmpanada] });
    expect(quote).toEqual({
      lines: [],
      totalCents: 0,
      notices: ['“Empanada” ya no está en el menú'],
      menu: [],
    });
  });

  it('rechaza un límite con 400 y el mensaje en fields.lines', async () => {
    const error = await rejection(
      createSalesDemoClient('loaded').quote({ lines: [{ ...shownAmericano, quantity: 100 }] }),
    );
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      error: { fields: { lines: SALE_MESSAGES.maxQuantity } },
    });
  });

  it('registra ventas numeradas con el formato del contrato', async () => {
    const client = createSalesDemoClient('loaded');

    const first = await client.register({
      draftId: DRAFT_1,
      paymentMethod: 'cash',
      lines: [shownAmericano],
    });
    const second = await client.register({
      draftId: DRAFT_2,
      paymentMethod: 'cash',
      lines: [{ ...newEmpanada, unitPriceCents: 800 }],
    });

    expect(saleSchema.parse(first)).toEqual(first);
    expect(first).toMatchObject({ number: 1, totalCents: 2500, paymentMethod: 'cash' });
    expect(second).toMatchObject({ number: 2, totalCents: 800 });
    expect(
      await client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
    ).toEqual(first);
  });

  it('«Cambió un precio» rechaza el registro y después avisa del precio nuevo', async () => {
    const client = createSalesDemoClient('priceChanged');

    const error = await rejection(
      client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
    );
    expect(error).toMatchObject({
      status: 409,
      code: 'MENU_CHANGED',
      message: SALE_MESSAGES.menuChanged,
    });

    const quote = await client.quote({ lines: [shownAmericano] });
    expect(quote.notices).toEqual(['Cambió el precio de “Café americano”: ahora cuesta Bs 13,00']);
    expect(quote.lines[0]).toMatchObject({ unitPriceCents: 1300, subtotalCents: 2600 });

    const sale = await client.register({
      draftId: DRAFT_1,
      paymentMethod: 'cash',
      lines: [{ ...shownAmericano, unitPriceCents: 1300 }],
    });
    expect(sale.totalCents).toBe(2600);
  });

  it('«Producto retirado» rechaza el registro y después quita la línea con aviso', async () => {
    const client = createSalesDemoClient('productRemoved');

    expect(
      await rejection(
        client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
      ),
    ).toMatchObject({ status: 409, code: 'MENU_CHANGED' });

    const quote = await client.quote({ lines: [shownAmericano] });
    expect(quote.notices).toEqual(['Se quitó “Café americano”: ya no está en el menú']);
    expect(quote.lines).toEqual([]);
    expect(quote.menu.flatMap((c) => c.products).map((p) => p.name)).not.toContain(
      'Café americano',
    );
  });

  it('«Respuesta perdida» falla el primer registro y el reintento devuelve la misma venta', async () => {
    const client = createSalesDemoClient('lostResponse');

    expect(
      await rejection(
        client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
      ),
    ).toMatchObject({ status: null, code: 'NETWORK_ERROR' });

    const sale = await client.register({
      draftId: DRAFT_1,
      paymentMethod: 'cash',
      lines: [shownAmericano],
    });
    expect(sale.number).toBe(1);
    const next = await client.register({
      draftId: DRAFT_2,
      paymentMethod: 'cash',
      lines: [shownAmericano],
    });
    expect(next.number).toBe(2);
  });

  it('«Sin conexión» rechaza el cálculo y el registro', async () => {
    const client = createSalesDemoClient('offline');
    expect(await rejection(client.quote({ lines: [] }))).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(
      await rejection(
        client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
      ),
    ).toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('cambiar de escenario cambia sus respuestas', async () => {
    const client = createSalesDemoClient('loaded');
    client.setScenario('empty');
    expect(client.scenario).toBe('empty');
    expect((await client.quote({ lines: [] })).menu).toEqual([]);
  });
});

describe('medio de pago en el cliente simulado (RF-6, RF-8; plan D-13)', () => {
  it('registra el medio de pago recibido', async () => {
    const client = createSalesDemoClient('loaded');
    const cash = await client.register({
      draftId: DRAFT_1,
      paymentMethod: 'cash',
      lines: [shownAmericano],
    });
    const qr = await client.register({
      draftId: DRAFT_2,
      paymentMethod: 'qr',
      lines: [shownAmericano],
    });
    expect([saleSchema.parse(cash).paymentMethod, saleSchema.parse(qr).paymentMethod]).toEqual([
      'cash',
      'qr',
    ]);
  });

  it('rechaza un registro sin medio de pago con 400 y fields.paymentMethod', async () => {
    const error = await rejection(
      createSalesDemoClient('loaded').register({
        draftId: DRAFT_1,
        lines: [shownAmericano],
      } as unknown as Parameters<ReturnType<typeof createSalesDemoClient>['register']>[0]),
    );
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      error: { fields: { paymentMethod: SALE_MESSAGES.paymentMethod } },
    });
  });

  it('el reintento con otro medio de pago devuelve la venta original', async () => {
    const client = createSalesDemoClient('lostResponse');
    await rejection(
      client.register({ draftId: DRAFT_1, paymentMethod: 'cash', lines: [shownAmericano] }),
    );

    const retry = await client.register({
      draftId: DRAFT_1,
      paymentMethod: 'qr',
      lines: [shownAmericano],
    });
    expect(retry).toMatchObject({ number: 1, paymentMethod: 'cash' });
  });
});
