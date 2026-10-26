import { describe, expect, it } from 'vitest';
import { listedSaleSchema } from '@kofi/contracts';
import { testLine, testSale } from '../../../test/test-sales.ts';
import { listedSales, periodTotals } from './history.report.ts';

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
