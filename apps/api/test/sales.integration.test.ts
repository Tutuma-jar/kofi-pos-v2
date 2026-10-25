import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { createTestDatabase } from './test-database.ts';
import { buildE2eApp } from './e2e-server.ts';
import { createAccountsService } from '../src/modules/auth/index.ts';
import { saveCategory, saveProduct } from '../src/modules/menu/index.ts';
import { saleQuoteSchema, saleResponseSchema } from '@kofi/contracts';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';
import { randomUUID } from 'node:crypto';
import type { Database } from '../src/shared/database/database.ts';

let app: FastifyInstance;
let db: Database | undefined;
afterEach(async () => {
  await app?.close();
  await db?.close();
  db = undefined;
});
async function cookie(username: string, password: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  expect(response.statusCode).toBe(200);
  return String(response.headers['set-cookie']).split(';')[0]!;
}
describe('integración de ventas con el menú y la sesión (T020)', () => {
  it('buildApp usa el menú real y no expone controles de E2E', async () => {
    db = await createTestDatabase();
    const accounts = createAccountsService(db);
    await accounts.create(TEST_ACCOUNTS.cashier);
    const category = await saveCategory(db, { name: 'Bebidas' });
    const product = await saveProduct(db, {
      categoryId: category.id,
      name: 'Café',
      price: '12,50',
    });
    app = buildApp({ db, logger: false });
    const headers = {
      cookie: await cookie(TEST_ACCOUNTS.cashier.username, TEST_ACCOUNTS.cashier.password),
    };
    const response = await app.inject({
      method: 'POST',
      url: '/api/sales/quote',
      headers,
      payload: { lines: [{ productId: product.id, productName: product.name, quantity: 2 }] },
    });
    expect(response.statusCode).toBe(200);
    const quote = saleQuoteSchema.parse(response.json());
    expect(quote).toMatchObject({
      totalCents: 2500,
      menu: [{ name: 'Bebidas', products: [{ id: product.id }] }],
    });
    const registered = await app.inject({
      method: 'POST',
      url: '/api/sales',
      headers,
      payload: { draftId: randomUUID(), paymentMethod: 'qr', lines: quote.lines },
    });
    expect(registered.statusCode).toBe(201);
    expect(saleResponseSchema.parse(registered.json()).sale.totalCents).toBe(2500);
    for (const [method, url] of [
      ['GET', '/api/__test/sales'],
      ['POST', '/api/__test/menu'],
      ['POST', '/api/__test/clock'],
    ] as const)
      expect(
        (await app.inject({ method, url, headers, payload: method === 'POST' ? {} : undefined }))
          .statusCode,
      ).toBe(404);
  });
  it('solo la API de E2E lista ventas y permite restablecer sus datos entre recorridos', async () => {
    app = await buildE2eApp();
    const fixture = {
      categories: [{ name: 'Bebidas', products: [{ name: 'Café', price: '12,50' }] }],
    };
    expect(
      (await app.inject({ method: 'POST', url: '/api/__test/menu', payload: fixture })).statusCode,
    ).toBe(200);
    const headers = {
      cookie: await cookie(TEST_ACCOUNTS.cashier.username, TEST_ACCOUNTS.cashier.password),
    };
    const quote = (
      await app.inject({ method: 'POST', url: '/api/sales/quote', headers, payload: { lines: [] } })
    ).json();
    const product = quote.menu[0].products[0];
    const result = await app.inject({
      method: 'POST',
      url: '/api/sales',
      headers,
      payload: {
        draftId: randomUUID(),
        paymentMethod: 'cash',
        lines: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPriceCents: product.priceCents,
          },
        ],
      },
    });
    expect(result.statusCode).toBe(201);
    expect((await app.inject('/api/__test/sales')).json()).toEqual({ sales: [result.json().sale] });
    expect(
      (await app.inject({ method: 'POST', url: '/api/__test/menu', payload: fixture })).statusCode,
    ).toBe(200);
    expect((await app.inject('/api/__test/sales')).json()).toEqual({ sales: [] });
  });
});
