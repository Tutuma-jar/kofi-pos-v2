import { describe, expect, it } from 'vitest';
import { compareMenuNames } from '@kofi/contracts';
import { testSale, testLine } from '../../../test/test-sales.ts';
import { summarizeSales, salesByDay } from './dashboard.summary.ts';

describe('resumen de ventas (RF-3, RF-4, RF-5, RF-8, RNF-2)', () => {
  it('resume el ejemplo sin alterar las ventas', () => {
    const coffee = testLine({ productName: 'Café americano', quantity: 2 });
    const pie = testLine({ productName: 'Empanada', unitPriceCents: 800 });
    const sales = [
      testSale({ lines: [coffee] }),
      testSale({
        number: 2,
        paymentMethod: 'qr',
        lines: [pie, testLine({ ...coffee, quantity: 1, subtotalCents: 1250 })],
      }),
    ];
    const before = structuredClone(sales);
    expect(summarizeSales(sales)).toEqual({
      totalCents: 4550,
      salesCount: 2,
      averageTicketCents: 2275,
      byPaymentMethod: [
        { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
        { paymentMethod: 'qr', totalCents: 2050, salesCount: 1 },
      ],
      topProducts: [
        {
          productId: coffee.productId,
          productName: 'Café americano',
          quantity: 3,
          totalCents: 3750,
        },
        { productId: pie.productId, productName: 'Empanada', quantity: 1, totalCents: 800 },
      ],
    });
    expect(sales).toEqual(before);
  });
  it('devuelve ceros, ambos medios, promedio null y lista vacía sin ventas', () => {
    expect(summarizeSales([])).toEqual({
      totalCents: 0,
      salesCount: 0,
      averageTicketCents: null,
      byPaymentMethod: [
        { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
        { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
      ],
      topProducts: [],
    });
  });
  it.each([
    [4550, 3, 1517],
    [75, 2, 38],
  ])('redondea %i/%i a %i', (total, count, average) => {
    const sales = Array.from({ length: count }, (_, i) =>
      testSale({ lines: [testLine({ unitPriceCents: i === 0 ? total - count + 1 : 1 })] }),
    );
    expect(summarizeSales(sales).averageTicketCents).toBe(average);
  });
  it('ordena por unidades, importe, nombre y limita a cinco', () => {
    const lines = [
      testLine({ productName: 'Zeta', quantity: 3, unitPriceCents: 1 }),
      testLine({ productName: 'B', quantity: 2, unitPriceCents: 100 }),
      ...['Árbol', 'Cafe', 'café', 'D', 'E'].map((productName) =>
        testLine({ productName, unitPriceCents: 50 }),
      ),
    ];
    const result = summarizeSales([testSale({ lines })]);
    const expected = [...lines].sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.subtotalCents - a.subtotalCents ||
        compareMenuNames(a.productName, b.productName) ||
        a.productId.localeCompare(b.productId),
    );
    expect(result.topProducts.map((p) => p.productId)).toEqual(
      expected.slice(0, 5).map((p) => p.productId),
    );
    expect(result.byPaymentMethod.reduce((n, p) => n + p.totalCents, 0)).toBe(result.totalCents);
  });
  it('agrupa por ID, usa el nombre de mayor número y conserva precios históricos', () => {
    const old = testLine({ productName: 'Antes' });
    const recent = testLine({
      ...old,
      productName: 'Ahora',
      unitPriceCents: 1500,
      subtotalCents: 1500,
    });
    const other = testLine({ productName: 'Ahora' });
    const result = summarizeSales([
      testSale({ number: 3, lines: [recent, other] }),
      testSale({ number: 1, lines: [old] }),
    ]);
    expect(result.topProducts).toEqual([
      { productId: old.productId, productName: 'Ahora', quantity: 2, totalCents: 2750 },
      { productId: other.productId, productName: 'Ahora', quantity: 1, totalCents: 1250 },
    ]);
  });
  it('suma exactamente 6000 ventas de 30 líneas máximas', () => {
    const lines = Array.from({ length: 30 }, () =>
      testLine({ quantity: 99, unitPriceCents: 100000 }),
    );
    const sales = Array.from({ length: 6000 }, (_, i) =>
      testSale({ number: i + 1, paymentMethod: i % 2 ? 'qr' : 'cash', lines }),
    );
    const result = summarizeSales(sales);
    expect(result.totalCents).toBe(1782000000000);
    expect(result.byPaymentMethod.map((p) => p.totalCents)).toEqual([891000000000, 891000000000]);
  });
});

describe('ventas por día (RF-10, RNF-2)', () => {
  it('separa medianoche de Bolivia, rellena ceros y conserva sumas y orden', () => {
    const sales = [
      testSale({ registeredAt: '2026-10-25T03:59:59.999Z' }),
      testSale({
        number: 2,
        registeredAt: '2026-10-25T04:00:00.000Z',
        paymentMethod: 'qr',
        lines: [testLine({ unitPriceCents: 800 })],
      }),
    ];
    const days = ['2026-10-23', '2026-10-24', '2026-10-25'];
    const result = salesByDay(sales, days);
    expect(result).toEqual([
      { date: days[0], totalCents: 0, salesCount: 0 },
      { date: days[1], totalCents: 1250, salesCount: 1 },
      { date: days[2], totalCents: 800, salesCount: 1 },
    ]);
    const summary = summarizeSales(sales);
    expect(result.reduce((sum, day) => sum + day.totalCents, 0)).toBe(summary.totalCents);
    expect(result.reduce((sum, day) => sum + day.salesCount, 0)).toBe(summary.salesCount);
    expect(salesByDay([], days)).toEqual(
      days.map((date) => ({ date, totalCents: 0, salesCount: 0 })),
    );
  });
});
