import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { saleSchema } from '@kofi/contracts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createAccountsService } from '../auth/index.ts';
import { saveCategory, saveProduct } from '../menu/index.ts';
import {
  reserveSaleNumbers,
  insertSalesBatch,
  listRegisteredSales,
  type NewSale,
} from './sales.repository.ts';

it('los lotes conservan contrato, números y atomicidad (T029)', async () => {
  const db = await createTestDatabase();
  try {
    const user = await createAccountsService(db).create({
      username: 'cajero',
      displayName: 'Cajero de prueba',
      role: 'cashier',
      password: 'solo pruebas de lotes',
    });
    const category = await saveCategory(db, { name: 'Bebidas' });
    const product = await saveProduct(db, {
      categoryId: category.id,
      name: 'Café',
      price: '12,50',
    });
    const sales = (first: number): NewSale[] =>
      Array.from({ length: 3 }, (_, i) => ({
        number: first + i,
        draftId: randomUUID(),
        registeredAt: new Date('2026-10-26T05:00:00Z'),
        registeredBy: { userId: user.id, displayName: user.displayName, role: user.role },
        paymentMethod: i % 2 ? 'qr' : 'cash',
        totalCents: 1250 * (i + 1),
        lines: [
          {
            productId: product.id,
            productName: product.name,
            categoryName: category.name,
            quantity: i + 1,
            unitPriceCents: 1250,
            subtotalCents: 1250 * (i + 1),
          },
        ],
      }));
    await expect(
      db.transaction(async (tx) => {
        await insertSalesBatch(tx, sales(await reserveSaleNumbers(tx, 3)));
        throw new Error('interrupción de prueba');
      }),
    ).rejects.toThrow('interrupción de prueba');
    expect(await listRegisteredSales(db)).toEqual([]);
    expect(
      (await db.query<{ last_number: number }>('SELECT last_number FROM sale_counter')).rows[0]!
        .last_number,
    ).toBe(0);
    await db.transaction(async (tx) =>
      insertSalesBatch(tx, sales(await reserveSaleNumbers(tx, 3))),
    );
    const result = await listRegisteredSales(db);
    expect(result.map((sale) => sale.number)).toEqual([1, 2, 3]);
    expect(result.map((sale) => sale.totalCents)).toEqual([1250, 2500, 3750]);
    for (const sale of result) expect(saleSchema.safeParse(sale).success).toBe(true);
  } finally {
    await db.close();
  }
});
