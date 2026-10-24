import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';
import {
  apiErrorSchema,
  boliviaDateSchema,
  boliviaMonthSchema,
  DASHBOARD_MESSAGES,
  DASHBOARD_MONTH_ROLES,
  DASHBOARD_TOP_PRODUCTS,
  ERROR_CODES,
  monthSummarySchema,
  periodSummarySchema,
  todaySummarySchema,
} from './index.ts';

const COFFEE = 'c4e1a2b3-0000-4000-8000-000000000007';
const EMPANADA = 'a3f0c1d2-0000-4000-8000-00000000005d';

// Ejemplos de §6.2 del plan (con el reloj en 2026-10-24 11:00 de Bolivia).
const today = {
  date: '2026-10-24',
  asOf: '2026-10-24T15:00:00.000Z',
  totalCents: 4550,
  salesCount: 2,
  averageTicketCents: 2275,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 2050, salesCount: 1 },
  ],
  topProducts: [
    { productId: COFFEE, productName: 'Café americano', quantity: 3, totalCents: 3750 },
    { productId: EMPANADA, productName: 'Empanada', quantity: 1, totalCents: 800 },
  ],
};

const emptyToday = {
  date: '2026-10-24',
  asOf: '2026-10-24T15:00:00.000Z',
  totalCents: 0,
  salesCount: 0,
  averageTicketCents: null,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
  topProducts: [],
};

const days = Array.from({ length: 24 }, (_, index) => {
  const date = `2026-10-${String(index + 1).padStart(2, '0')}`;
  if (date === '2026-10-01') return { date, totalCents: 800, salesCount: 1 };
  if (date === '2026-10-15') return { date, totalCents: 2500, salesCount: 1 };
  if (date === '2026-10-24') return { date, totalCents: 1250, salesCount: 1 };
  return { date, totalCents: 0, salesCount: 0 };
});

const month = {
  month: '2026-10',
  asOf: '2026-10-24T15:00:00.000Z',
  totalCents: 4550,
  salesCount: 3,
  averageTicketCents: 1517,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2050, salesCount: 2 },
    { paymentMethod: 'qr', totalCents: 2500, salesCount: 1 },
  ],
  topProducts: [
    { productId: COFFEE, productName: 'Café americano', quantity: 3, totalCents: 3750 },
    { productId: EMPANADA, productName: 'Empanada', quantity: 1, totalCents: 800 },
  ],
  days,
};

describe('contrato del Dashboard (plan §6)', () => {
  it('el resumen del mes es solo del dueño; el de hoy, de los dos roles (D-6)', () => {
    expect(DASHBOARD_MONTH_ROLES).toEqual(['owner']);
    expect(contracts).not.toHaveProperty('DASHBOARD_ROLES');
    expect(DASHBOARD_TOP_PRODUCTS).toBe(5);
  });

  it('tiene los textos de la especificación', () => {
    expect(DASHBOARD_MESSAGES).toEqual({
      forbiddenMonth: 'No tienes permiso para ver el resumen del mes',
      emptyToday: 'Todavía no hay ventas hoy',
      emptyMonth: 'Todavía no hay ventas este mes',
    });
  });

  it('valida las respuestas de los ejemplos de §6.2', () => {
    expect(todaySummarySchema.parse(today)).toEqual(today);
    expect(todaySummarySchema.parse(emptyToday)).toEqual(emptyToday);
    expect(monthSummarySchema.parse(month)).toEqual(month);
    expect(periodSummarySchema.safeParse(emptyToday).success).toBe(true);
  });

  it('valida el 403 del mes con el formato común de errores', () => {
    const forbidden = {
      error: { code: ERROR_CODES.FORBIDDEN, message: DASHBOARD_MESSAGES.forbiddenMonth },
    };
    expect(apiErrorSchema.parse(forbidden)).toEqual(forbidden);
  });

  it.each([
    ['los medios de pago en otro orden', { byPaymentMethod: [...today.byPaymentMethod].reverse() }],
    ['un solo medio de pago', { byPaymentMethod: [today.byPaymentMethod[0]] }],
    [
      'más de 5 productos',
      {
        topProducts: Array.from({ length: 6 }, (_, index) => ({
          productId: `c4e1a2b3-0000-4000-8000-00000000000${index}`,
          productName: `Producto ${index}`,
          quantity: 1,
          totalCents: 100,
        })),
      },
    ],
    ['un promedio null con ventas', { averageTicketCents: null }],
    ['un asOf sin zona horaria', { asOf: '2026-10-24T15:00:00' }],
    ['un importe negativo', { totalCents: -1 }],
    ['un importe con decimales', { totalCents: 45.5 }],
  ])('rechaza %s', (_, change) => {
    expect(todaySummarySchema.safeParse({ ...today, ...change }).success).toBe(false);
  });

  it('rechaza un promedio sin ventas', () => {
    expect(todaySummarySchema.safeParse({ ...emptyToday, averageTicketCents: 0 }).success).toBe(
      false,
    );
  });

  it.each(['2026-02-30', '2026-13-01', '24/10/2026', '2026-10-24T00:00:00Z'])(
    'rechaza la fecha %s',
    (date) => {
      expect(boliviaDateSchema.safeParse(date).success).toBe(false);
    },
  );

  it.each(['2026-13', '2026-00', '2026-1', '2026-10-01'])('rechaza el mes %s', (value) => {
    expect(boliviaMonthSchema.safeParse(value).success).toBe(false);
  });

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(boliviaDateSchema.parse('2028-02-29')).toBe('2028-02-29');
  });

  it('rechaza un mes sin días o con 32', () => {
    expect(monthSummarySchema.safeParse({ ...month, days: [] }).success).toBe(false);
    const tooMany = Array.from({ length: 32 }, () => days[1]);
    expect(monthSummarySchema.safeParse({ ...month, days: tooMany }).success).toBe(false);
  });
});
