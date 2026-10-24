import { describe, expect, it } from 'vitest';
import {
  registerSaleRequestSchema,
  SALE_MAX_LINES,
  SALE_MAX_QUANTITY,
  SALE_MESSAGES,
  saleDraftLineSchema,
  saleQuoteRequestSchema,
} from './index.ts';

// Ejemplos de §6.2 del plan, con identificadores completos.
const AMERICANO = 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07';
const EMPANADA = 'a3f0b1c2-d3e4-4f5a-8b6c-7d8e9f0a1b5d';
const DRAFT = '4f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e11';

const americano = {
  productId: AMERICANO,
  productName: 'Café americano',
  quantity: 2,
  unitPriceCents: 1250,
};
const empanada = { productId: EMPANADA, productName: 'Empanada', quantity: 1, unitPriceCents: 800 };

// Una línea distinta por posición, para armar ventas con muchas líneas.
const lineAt = (index: number) => ({
  productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  productName: `Producto ${index}`,
  quantity: 1,
  unitPriceCents: 100,
});

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  expect(result.success).toBe(false);
  return result.error?.issues[0]?.message;
}

describe('límites de una venta (RF-3)', () => {
  it('son 30 líneas y 99 unidades por línea', () => {
    expect(SALE_MAX_LINES).toBe(30);
    expect(SALE_MAX_QUANTITY).toBe(99);
  });

  it('tienen los mensajes de la especificación', () => {
    expect(SALE_MESSAGES).toMatchObject({
      maxQuantity: 'Una venta puede tener como máximo 99 unidades de cada producto',
      maxLines: 'Una venta puede tener como máximo 30 productos distintos',
      empty: 'Agrega al menos un producto',
      menuChanged: 'El menú cambió. Revisa la venta antes de registrarla',
      draftTaken: 'Esta venta ya se registró desde otra cuenta',
    });
  });
});

describe('saleDraftLineSchema (RF-3, RF-5)', () => {
  it('acepta una línea recién agregada, sin precio', () => {
    const line = { productId: EMPANADA, productName: 'Empanada', quantity: 1 };
    expect(saleDraftLineSchema.parse(line)).toEqual(line);
  });

  it('rechaza 100 unidades con el mensaje del máximo', () => {
    expect(firstMessage(saleDraftLineSchema.safeParse({ ...americano, quantity: 100 }))).toBe(
      SALE_MESSAGES.maxQuantity,
    );
  });

  it.each([0, -1, 1.5])('rechaza %s unidades', (quantity) => {
    expect(firstMessage(saleDraftLineSchema.safeParse({ ...americano, quantity }))).toBe(
      SALE_MESSAGES.invalidLine,
    );
  });

  it.each([
    ['un productId que no es un uuid', { productId: 'cafe' }],
    ['un nombre vacío', { productName: '' }],
    ['un nombre de más de 40 caracteres', { productName: 'x'.repeat(41) }],
    ['un precio de 0', { unitPriceCents: 0 }],
    ['un precio mayor que Bs 1000,00', { unitPriceCents: 100001 }],
  ])('rechaza %s', (_case, change) => {
    expect(firstMessage(saleDraftLineSchema.safeParse({ ...americano, ...change }))).toBe(
      SALE_MESSAGES.invalidLine,
    );
  });
});

describe('saleQuoteRequestSchema (RF-3, RF-4)', () => {
  it('acepta el ejemplo del plan', () => {
    const request = {
      lines: [
        { ...americano, unitPriceCents: 1200 },
        { productId: EMPANADA, productName: 'Empanada', quantity: 1 },
      ],
    };
    expect(saleQuoteRequestSchema.parse(request)).toEqual(request);
  });

  it('acepta una venta vacía', () => {
    expect(saleQuoteRequestSchema.parse({ lines: [] })).toEqual({ lines: [] });
  });

  it('acepta 30 líneas y rechaza 31 con su mensaje', () => {
    const lines = Array.from({ length: 31 }, (_, index) => lineAt(index));
    expect(saleQuoteRequestSchema.safeParse({ lines: lines.slice(0, 30) }).success).toBe(true);
    expect(firstMessage(saleQuoteRequestSchema.safeParse({ lines }))).toBe(SALE_MESSAGES.maxLines);
  });

  it('rechaza un producto repetido en dos líneas', () => {
    const result = saleQuoteRequestSchema.safeParse({ lines: [americano, { ...americano }] });
    expect(firstMessage(result)).toBe(SALE_MESSAGES.invalidLine);
  });

  it('indica la línea que falla bajo lines', () => {
    const result = saleQuoteRequestSchema.safeParse({ lines: [{ ...americano, quantity: 100 }] });
    expect(result.error?.issues[0]?.path[0]).toBe('lines');
  });
});

describe('registerSaleRequestSchema (RF-6 a RF-8)', () => {
  it('acepta el ejemplo del plan', () => {
    const request = { draftId: DRAFT, lines: [americano, empanada] };
    expect(registerSaleRequestSchema.parse(request)).toEqual(request);
  });

  it('rechaza una venta sin líneas con su mensaje', () => {
    expect(firstMessage(registerSaleRequestSchema.safeParse({ draftId: DRAFT, lines: [] }))).toBe(
      SALE_MESSAGES.empty,
    );
  });

  it('exige el precio que se mostraba en cada línea', () => {
    const withoutPrice = { productId: AMERICANO, productName: 'Café americano', quantity: 2 };
    const result = registerSaleRequestSchema.safeParse({ draftId: DRAFT, lines: [withoutPrice] });
    expect(firstMessage(result)).toBe(SALE_MESSAGES.invalidLine);
  });

  it('rechaza 31 líneas y un producto repetido', () => {
    const lines = Array.from({ length: 31 }, (_, index) => lineAt(index));
    expect(firstMessage(registerSaleRequestSchema.safeParse({ draftId: DRAFT, lines }))).toBe(
      SALE_MESSAGES.maxLines,
    );
    expect(
      firstMessage(
        registerSaleRequestSchema.safeParse({ draftId: DRAFT, lines: [americano, americano] }),
      ),
    ).toBe(SALE_MESSAGES.invalidLine);
  });

  it.each([undefined, 'venta-1'])('rechaza el draftId %s', (draftId) => {
    const result = registerSaleRequestSchema.safeParse({ draftId, lines: [americano] });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['draftId'],
      message: SALE_MESSAGES.invalidSale,
    });
  });
});
