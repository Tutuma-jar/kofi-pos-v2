import { describe, expect, it } from 'vitest';
import { listedSaleSchema } from '@kofi/contracts';
import { testLine, testSale } from '../../../test/test-sales.ts';
import { listedSales, periodTotals, salesByDay } from './history.report.ts';

describe('cifras históricas (RF-3, RF-4, RF-7, RNF-2)', () => {
  it('suma el ejemplo, conserva instantáneas y ordena sin mutar ni exponer líneas', () => {
    const sales = [
      testSale({ number: 2, lines: [testLine({ quantity: 2 })] }),
      testSale({
        number: 3,
        paymentMethod: 'qr',
        registeredBy: { userId: null, displayName: 'Luis Mamani', role: 'owner' },
        lines: [testLine({ unitPriceCents: 800 }), testLine()],
      }),
    ];
    const before = structuredClone(sales);
    expect(periodTotals(sales)).toEqual({
      totalCents: 4550,
      salesCount: 2,
      byPaymentMethod: [
        { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
        { paymentMethod: 'qr', totalCents: 2050, salesCount: 1 },
      ],
    });
    const listed = listedSales(sales);
    expect(listed.map((sale) => sale.number)).toEqual([3, 2]);
    for (const sale of listed) expect(listedSaleSchema.safeParse(sale).success).toBe(true);
    expect(listed[0]!.registeredBy).toEqual(sales[1]!.registeredBy);
    expect(listed[0]).not.toHaveProperty('lines');
    expect(sales).toEqual(before);
  });
  it('devuelve ceros y ambos medios sin ventas', () => {
    expect(periodTotals([])).toEqual({
      totalCents: 0,
      salesCount: 0,
      byPaymentMethod: [
        { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
        { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
      ],
    });
    expect(listedSales([])).toEqual([]);
  });
  it('suma exactamente 6000 ventas de 30 líneas de 99 unidades a 100000 centavos', () => {
    const lines = Array.from({ length: 30 }, () =>
      testLine({ quantity: 99, unitPriceCents: 100000 }),
    );
    const sales = Array.from({ length: 6000 }, (_, i) =>
      testSale({ number: i + 1, paymentMethod: i % 2 ? 'cash' : 'qr', lines }),
    );
    const totals = periodTotals(sales);
    expect(totals.totalCents).toBe(1782000000000);
    expect(totals.salesCount).toBe(6000);
    expect(totals.byPaymentMethod.map((payment) => payment.totalCents)).toEqual([
      891000000000, 891000000000,
    ]);
    expect(totals.byPaymentMethod.map((payment) => payment.salesCount)).toEqual([3000, 3000]);
  });
});

describe('ventas por día del mes (T023, RF-13, RNF-2)', () => {
  it('devuelve todos los días pedidos en orden, con ceros y sumas exactas sin mutar ventas', () => {
    const sales = [
      testSale({ number: 3, registeredAt: '2026-10-03T14:00:00Z', totalCents: 800 }),
      testSale({ number: 1, registeredAt: '2026-10-01T12:00:00Z', totalCents: 1250 }),
      testSale({ number: 2, registeredAt: '2026-10-01T13:00:00Z', totalCents: 2500 }),
    ];
    const before = structuredClone(sales);
    const days = ['2026-10-01', '2026-10-02', '2026-10-03'];
    const rows = salesByDay(sales, days);
    expect(rows).toEqual([
      { date: '2026-10-01', totalCents: 3750, salesCount: 2 },
      { date: '2026-10-02', totalCents: 0, salesCount: 0 },
      { date: '2026-10-03', totalCents: 800, salesCount: 1 },
    ]);
    expect(rows.reduce((sum, day) => sum + day.totalCents, 0)).toBe(periodTotals(sales).totalCents);
    expect(rows.reduce((sum, day) => sum + day.salesCount, 0)).toBe(sales.length);
    expect(sales).toEqual(before);
    expect(days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  it('separa las 23:59 y las 00:00 de Bolivia y omite fechas fuera de los días pedidos', () => {
    const rows = salesByDay(
      [
        testSale({ registeredAt: '2026-10-01T03:59:00Z', totalCents: 999 }),
        testSale({ registeredAt: '2026-10-02T03:59:00Z', totalCents: 1250 }),
        testSale({ registeredAt: '2026-10-02T04:00:00Z', totalCents: 800 }),
      ],
      ['2026-10-01', '2026-10-02'],
    );
    expect(rows).toEqual([
      { date: '2026-10-01', totalCents: 1250, salesCount: 1 },
      { date: '2026-10-02', totalCents: 800, salesCount: 1 },
    ]);
  });

  it('conserva los años pequeños y el salto horario histórico de Bolivia', () => {
    expect(
      salesByDay(
        [
          testSale({ registeredAt: '0099-01-01T04:32:36Z' }),
          testSale({ registeredAt: '1931-10-15T04:32:35.999Z' }),
          testSale({ registeredAt: '1931-10-15T04:32:36Z' }),
        ],
        ['0099-01-01', '1931-10-14', '1931-10-15'],
      ),
    ).toEqual([
      { date: '0099-01-01', totalCents: 1250, salesCount: 1 },
      { date: '1931-10-14', totalCents: 1250, salesCount: 1 },
      { date: '1931-10-15', totalCents: 1250, salesCount: 1 },
    ]);
  });

  it('incluye todos los días vacíos y conserva importes grandes exactos', () => {
    expect(salesByDay([], ['2026-10-01'])).toEqual([
      { date: '2026-10-01', totalCents: 0, salesCount: 0 },
    ]);
    const sales = Array.from({ length: 6000 }, () => testSale({ totalCents: 297000000 }));
    expect(salesByDay(sales, ['2026-10-24'])).toEqual([
      { date: '2026-10-24', totalCents: 1782000000000, salesCount: 6000 },
    ]);
  });
});
