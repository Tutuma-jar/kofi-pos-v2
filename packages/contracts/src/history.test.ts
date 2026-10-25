import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';
import {
  apiErrorSchema,
  byPaymentMethodSchema,
  dayHistorySchema,
  ERROR_CODES,
  HISTORY_MESSAGES,
  HISTORY_ROLES,
  historyDayQuerySchema,
  historyMonthQuerySchema,
  historySaleResponseSchema,
  listedSaleSchema,
  monthHistorySchema,
  parseSaleNumber,
  SALE_NUMBER_MAX,
  saleNotFoundMessage,
} from './index.ts';

const OWNER = 'b2c3d4e5-0000-4000-8000-000000000001';
const SALE_2 = 'd1e2f3a4-0000-4000-8000-000000000002';
const SALE_3 = 'd1e2f3a4-0000-4000-8000-000000000003';
const COFFEE = 'c4e1a2b3-0000-4000-8000-000000000007';
const EMPANADA = 'a3f0c1d2-0000-4000-8000-00000000005d';

// Ejemplos de §6.2 del plan (con el reloj en 2026-10-25 11:00 de Bolivia).
const listedSale3 = {
  id: SALE_3,
  number: 3,
  registeredAt: '2026-10-24T14:30:00.000Z',
  registeredBy: { userId: OWNER, displayName: 'Luis Mamani', role: 'owner' },
  totalCents: 2050,
  paymentMethod: 'qr',
};
const listedSale2 = {
  id: SALE_2,
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
  asOf: '2026-10-25T15:00:00.000Z',
  totalCents: 4550,
  salesCount: 2,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 2050, salesCount: 1 },
  ],
  sales: [listedSale3, listedSale2],
};

const emptyToday = {
  date: '2026-10-25',
  today: '2026-10-25',
  previousDate: '2026-10-24',
  nextDate: null,
  asOf: '2026-10-25T15:00:00.000Z',
  totalCents: 0,
  salesCount: 0,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
  sales: [],
};

const saleResponse = {
  date: '2026-10-24',
  sale: {
    ...listedSale3,
    lines: [
      {
        productId: EMPANADA,
        productName: 'Empanada',
        categoryName: 'Salados',
        quantity: 1,
        unitPriceCents: 800,
        subtotalCents: 800,
      },
      {
        productId: COFFEE,
        productName: 'Café americano',
        categoryName: 'Bebidas calientes',
        quantity: 1,
        unitPriceCents: 1250,
        subtotalCents: 1250,
      },
    ],
  },
};

const september = Array.from({ length: 30 }, (_, index) => {
  const date = `2026-09-${String(index + 1).padStart(2, '0')}`;
  return date === '2026-09-30'
    ? { date, totalCents: 1250, salesCount: 1 }
    : { date, totalCents: 0, salesCount: 0 };
});

const month = {
  month: '2026-09',
  currentMonth: '2026-10',
  previousMonth: '2026-08',
  nextMonth: '2026-10',
  asOf: '2026-10-25T15:00:00.000Z',
  totalCents: 1250,
  salesCount: 1,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 1250, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
  days: september,
};

const errorBody = (code: string, message: string) => ({ error: { code, message } });

describe('contrato del Historial (SPEC-005 plan §6)', () => {
  it('se exporta desde index.ts', () => {
    expect(contracts.dayHistorySchema).toBe(dayHistorySchema);
    expect(contracts.byPaymentMethodSchema).toBe(byPaymentMethodSchema);
  });

  it('solo el dueño usa el Historial (D-6)', () => {
    expect(HISTORY_ROLES).toEqual(['owner']);
  });

  it('tiene los textos de la especificación', () => {
    expect(HISTORY_MESSAGES).toEqual({
      forbidden: 'No tienes permiso para ver el historial de ventas',
      invalidDate: 'La fecha no es válida',
      futureDate: 'No se pueden consultar fechas futuras',
      invalidMonth: 'El mes no es válido',
      futureMonth: 'No se pueden consultar meses futuros',
      invalidSaleNumber: 'Escribe un número de venta válido',
      emptyDay: 'No hay ventas registradas este día',
      emptyMonth: 'No hay ventas registradas este mes',
    });
    expect(saleNotFoundMessage('99')).toBe('No existe la venta N.º 99');
    expect(SALE_NUMBER_MAX).toBe(2147483647);
  });

  describe('respuestas de §6.2', () => {
    it.each([
      ['un día con ventas', dayHistorySchema, day],
      ['hoy sin ventas', dayHistorySchema, emptyToday],
      ['un mes anterior', monthHistorySchema, month],
      ['el detalle de una venta', historySaleResponseSchema, saleResponse],
    ] as const)('valida %s', (_name, schema, response) => {
      expect(schema.safeParse(response).success).toBe(true);
    });

    it('valida el mes en curso, con nextMonth nulo y los días hasta hoy', () => {
      const current = {
        ...month,
        month: '2026-10',
        previousMonth: '2026-09',
        nextMonth: null,
        days: september.slice(0, 25).map((row, index) => ({
          ...row,
          date: `2026-10-${String(index + 1).padStart(2, '0')}`,
        })),
      };
      expect(monthHistorySchema.safeParse(current).success).toBe(true);
    });

    it.each([
      [ERROR_CODES.VALIDATION_ERROR, HISTORY_MESSAGES.futureDate],
      [ERROR_CODES.VALIDATION_ERROR, HISTORY_MESSAGES.invalidMonth],
      [ERROR_CODES.NOT_FOUND, saleNotFoundMessage('99')],
      [ERROR_CODES.FORBIDDEN, HISTORY_MESSAGES.forbidden],
    ])('los errores %s «%s» cumplen el formato común', (code, message) => {
      expect(apiErrorSchema.safeParse(errorBody(code, message)).success).toBe(true);
    });
  });

  describe('dayHistorySchema rechaza', () => {
    it.each([
      ['un número de ventas distinto de la lista', { ...day, salesCount: 3 }],
      ['una venta de la lista con líneas', { ...day, sales: [saleResponse.sale, listedSale2] }],
      ['un día posterior a hoy', { ...day, date: '2026-10-26', nextDate: '2026-10-27' }],
      ['nextDate no nulo cuando el día es hoy', { ...emptyToday, nextDate: '2026-10-26' }],
      ['nextDate nulo cuando el día es anterior a hoy', { ...day, nextDate: null }],
      [
        'los medios de pago en otro orden',
        { ...day, byPaymentMethod: [...day.byPaymentMethod].reverse() },
      ],
      ['un solo medio de pago', { ...day, byPaymentMethod: [day.byPaymentMethod[0]] }],
      ['una fecha que no existe', { ...day, date: '2026-02-30' }],
      ['un asOf sin zona horaria', { ...day, asOf: '2026-10-25T15:00:00' }],
    ])('%s', (_name, response) => {
      expect(dayHistorySchema.safeParse(response).success).toBe(false);
    });
  });

  describe('monthHistorySchema rechaza', () => {
    it.each([
      ['un mes posterior al mes en curso', { ...month, month: '2026-11', nextMonth: '2026-12' }],
      [
        'nextMonth no nulo en el mes en curso',
        { ...month, month: '2026-10', nextMonth: '2026-11' },
      ],
      ['nextMonth nulo en un mes anterior', { ...month, nextMonth: null }],
      ['un mes 13', { ...month, month: '2026-13' }],
      ['un mes sin días', { ...month, days: [] }],
      ['un mes con 32 días', { ...month, days: [...september, september[0], september[1]] }],
      [
        'los medios de pago en otro orden',
        { ...month, byPaymentMethod: [...month.byPaymentMethod].reverse() },
      ],
      ['un asOf sin zona horaria', { ...month, asOf: '2026-10-25T15:00:00' }],
    ])('%s', (_name, response) => {
      expect(monthHistorySchema.safeParse(response).success).toBe(false);
    });
  });

  it('listedSaleSchema es una venta sin líneas', () => {
    expect(listedSaleSchema.safeParse(listedSale3).success).toBe(true);
    expect(listedSaleSchema.safeParse(saleResponse.sale).success).toBe(false);
  });

  it('historySaleResponseSchema exige el día de la venta', () => {
    expect(historySaleResponseSchema.safeParse({ sale: saleResponse.sale }).success).toBe(false);
  });

  it('las consultas aceptan la fecha y el mes como texto opcional', () => {
    expect(historyDayQuerySchema.parse({})).toEqual({});
    expect(historyDayQuerySchema.parse({ date: '2026-10-24' })).toEqual({ date: '2026-10-24' });
    expect(historyMonthQuerySchema.parse({ month: '2026-09' })).toEqual({ month: '2026-09' });
  });

  describe('parseSaleNumber (D-8)', () => {
    it.each([
      [' 007 ', '7'],
      ['3', '3'],
      ['00000000000000000000123', '123'],
      ['12345678901234567890', '12345678901234567890'],
    ])('lee «%s» como %s', (text, expected) => {
      expect(parseSaleNumber(text)).toBe(expected);
    });

    it.each(['', '   ', '0', '000', '-3', '2,5', '2.5', '1e3', 'abc', '+3', '3 4'])(
      'rechaza «%s»',
      (text) => {
        expect(parseSaleNumber(text)).toBeNull();
      },
    );
  });
});
