import {
  compareMenuNames,
  DASHBOARD_TOP_PRODUCTS,
  type Sale,
  type PeriodSummary,
  type TopProduct,
} from '@kofi/contracts';

// Las ventas ya contienen los importes históricos; el resumen nunca consulta el menú actual.
export function summarizeSales(sales: Sale[]): Omit<PeriodSummary, 'asOf'> {
  let totalCents = 0;
  const byPaymentMethod: PeriodSummary['byPaymentMethod'] = [
    { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ];
  const products = new Map<string, TopProduct & { latestNumber: number }>();
  for (const sale of sales) {
    totalCents += sale.totalCents;
    const payment = byPaymentMethod[sale.paymentMethod === 'cash' ? 0 : 1];
    payment.totalCents += sale.totalCents;
    payment.salesCount++;
    for (const line of sale.lines) {
      const product = products.get(line.productId) ?? {
        productId: line.productId,
        productName: line.productName,
        quantity: 0,
        totalCents: 0,
        latestNumber: 0,
      };
      product.quantity += line.quantity;
      product.totalCents += line.subtotalCents;
      if (sale.number > product.latestNumber) {
        product.productName = line.productName;
        product.latestNumber = sale.number;
      }
      products.set(line.productId, product);
    }
  }
  const topProducts = [...products.values()]
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.totalCents - a.totalCents ||
        compareMenuNames(a.productName, b.productName) ||
        a.productId.localeCompare(b.productId),
    )
    .slice(0, DASHBOARD_TOP_PRODUCTS)
    .map(({ productId, productName, quantity, totalCents }) => ({
      productId,
      productName,
      quantity,
      totalCents,
    }));
  return {
    totalCents,
    salesCount: sales.length,
    averageTicketCents:
      sales.length === 0 ? null : Math.floor((2 * totalCents + sales.length) / (2 * sales.length)),
    byPaymentMethod,
    topProducts,
  };
}
