import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { todaySummarySchema } from '@kofi/contracts';
import { buildApp } from '../src/app.ts';
import { createAccountsService } from '../src/modules/auth/index.ts';
import { saveCategory, saveProduct } from '../src/modules/menu/index.ts';
import { listRegisteredSales } from '../src/modules/sales/index.ts';
import { createFakeClock } from '../src/shared/clock.ts';
import { createTestDatabase } from './test-database.ts';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';

it('buildApp resume solo las ventas de hoy, sin modificar ventas (RF-1, RF-2, RF-8)', async () => {
  const db = await createTestDatabase();
  const clock = createFakeClock(new Date('2026-10-24T15:00:00Z'));
  const app = buildApp({ db, clock, logger: false });
  try {
    const accounts = createAccountsService(db);
    await accounts.create(TEST_ACCOUNTS.cashier);
    const category = await saveCategory(db, { name: 'Bebidas' });
    const product = await saveProduct(db, {
      categoryId: category.id,
      name: 'Café',
      price: '12,50',
    });
    const login = async () =>
      String(
        (
          await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: TEST_ACCOUNTS.cashier,
          })
        ).headers['set-cookie'],
      ).split(';')[0]!;
    let cookie = await login();
    const register = async (quantity: number) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/sales',
        headers: { cookie },
        payload: {
          draftId: randomUUID(),
          paymentMethod: 'cash',
          lines: [
            { productId: product.id, productName: product.name, quantity, unitPriceCents: 1250 },
          ],
        },
      });
      expect(response.statusCode).toBe(201);
    };
    await register(1);
    clock.advance(86400000);
    cookie = await login();
    await register(2);
    const before = await listRegisteredSales(db);
    const response = await app.inject({ url: '/api/dashboard/today', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    expect(todaySummarySchema.parse(response.json())).toMatchObject({
      date: '2026-10-25',
      salesCount: 1,
      totalCents: 2500,
    });
    expect(await listRegisteredSales(db)).toEqual(before);
  } finally {
    await app.close();
    await db.close();
  }
});
