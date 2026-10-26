import { randomUUID } from 'node:crypto';
import { saleSchema, type Sale, type SaleLine } from '@kofi/contracts';

export function testLine(overrides: Partial<SaleLine> = {}): SaleLine {
  const line = {
    productId: randomUUID(),
    productName: 'Café',
    categoryName: 'Bebidas',
    quantity: 1,
    unitPriceCents: 1250,
    ...overrides,
  };
  return { ...line, subtotalCents: overrides.subtotalCents ?? line.quantity * line.unitPriceCents };
}

export function testSale(overrides: Partial<Sale> = {}): Sale {
  const lines = overrides.lines ?? [testLine()];
  return saleSchema.parse({
    id: randomUUID(),
    number: 1,
    registeredAt: '2026-10-24T15:00:00.000Z',
    registeredBy: { userId: null, displayName: 'Cajero de prueba', role: 'cashier' },
    paymentMethod: 'cash',
    ...overrides,
    lines,
    totalCents: overrides.totalCents ?? lines.reduce((sum, line) => sum + line.subtotalCents, 0),
  });
}
