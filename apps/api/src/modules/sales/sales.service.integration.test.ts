import { randomUUID } from 'node:crypto';
import { saleQuoteSchema, type SaleQuote } from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { createSalesService } from './sales.service.ts';

let db: Database;
beforeEach(async () => {
  db = await createTestDatabase();
});
afterEach(async () => {
  await db.close();
});

describe('calcular la venta con el menú inyectado (RF-2 a RF-5)', () => {
  it('devuelve el mismo menú y las líneas calculadas, sin persistir', async () => {
    const id = randomUUID();
    const menu: SaleQuote['menu'] = [
      { id: randomUUID(), name: 'Bebidas', products: [{ id, name: 'Café', priceCents: 1250 }] },
    ];
    const currentMenu = vi.fn(async () => menu);
    const service = createSalesService({
      db,
      clock: createFakeClock(new Date('2026-10-24T18:05:12Z')),
      currentMenu,
    });
    const quote = await service.quote({
      lines: [{ productId: id, productName: 'Café', quantity: 2 }],
    });
    expect(saleQuoteSchema.parse(quote)).toEqual(quote);
    expect(currentMenu).toHaveBeenCalledExactlyOnceWith(db);
    expect(quote.menu).toBe(menu);
    expect(quote).toMatchObject({
      totalCents: 2500,
      notices: [],
      lines: [{ productName: 'Café', subtotalCents: 2500 }],
    });
    expect((await db.query('SELECT * FROM sales')).rows).toEqual([]);
  });
  it('devuelve menú y líneas vacíos cuando no hay productos', async () => {
    const service = createSalesService({
      db,
      clock: createFakeClock(new Date()),
      currentMenu: async () => [],
    });
    const quote = await service.quote({ lines: [] });
    expect(saleQuoteSchema.parse(quote)).toEqual({
      menu: [],
      lines: [],
      notices: [],
      totalCents: 0,
    });
  });
});
