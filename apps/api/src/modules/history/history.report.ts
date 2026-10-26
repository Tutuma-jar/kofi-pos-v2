import type { DayHistory, ListedSale, MonthHistory, Sale } from '@kofi/contracts';
import { boliviaDate } from '../../shared/calendar.ts';

export function periodTotals(
  sales: Sale[],
): Pick<DayHistory, 'totalCents' | 'salesCount' | 'byPaymentMethod'> {
  const byPaymentMethod: DayHistory['byPaymentMethod'] = [
    { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ];
  let totalCents = 0;
  for (const sale of sales) {
    totalCents += sale.totalCents;
    const payment = byPaymentMethod[sale.paymentMethod === 'cash' ? 0 : 1];
    payment.totalCents += sale.totalCents;
    payment.salesCount++;
  }
  return { totalCents, salesCount: sales.length, byPaymentMethod };
}

export function listedSales(sales: Sale[]): ListedSale[] {
  return [...sales]
    .sort((a, b) => b.number - a.number)
    .map((sale) => ({
      id: sale.id,
      number: sale.number,
      registeredAt: sale.registeredAt,
      registeredBy: { ...sale.registeredBy },
      paymentMethod: sale.paymentMethod,
      totalCents: sale.totalCents,
    }));
}

export function salesByDay(sales: Sale[], days: string[]): MonthHistory['days'] {
  const rows = days.map((date) => ({ date, totalCents: 0, salesCount: 0 }));
  const byDate = new Map(rows.map((row) => [row.date, row]));
  for (const sale of sales) {
    const row = byDate.get(boliviaDate(new Date(sale.registeredAt)));
    if (row) {
      row.totalCents += sale.totalCents;
      row.salesCount++;
    }
  }
  return rows;
}
