import { randomUUID } from 'node:crypto';
import {
  saleQuoteSchema,
  saleResponseSchema,
  SALE_MESSAGES,
  type SaleQuote,
} from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { authPlugin, createAccountsService } from '../auth/index.ts';
import { salesPlugin, listRegisteredSales } from './index.ts';

describe('rutas de ventas (RF-1, RF-3, RF-6 a RF-11)', () => {
  let db: Database;
  let app: FastifyInstance;
  let menu: SaleQuote['menu'];
  const cookies: Record<string, string> = {};
  beforeEach(async () => {
    db = await createTestDatabase();
    const accounts = createAccountsService(db);
    for (const role of ['owner', 'cashier'] as const)
      await accounts.create({
        username: role,
        displayName: role,
        role,
        password: 'solo pruebas de ventas',
      });
    const category = (
      await db.query<{ id: string }>(
        "INSERT INTO categories (name, name_key) VALUES ('Bebidas', 'bebidas') RETURNING id",
      )
    ).rows[0]!.id;
    const id = (
      await db.query<{ id: string }>(
        "INSERT INTO products (name, name_key, category_id, price_cents) VALUES ('Café', 'cafe', $1, 1250) RETURNING id",
        [category],
      )
    ).rows[0]!.id;
    menu = [{ id: category, name: 'Bebidas', products: [{ id, name: 'Café', priceCents: 1250 }] }];
    const clock = createFakeClock(new Date('2026-10-24T18:05:12Z'));
    app = buildApp({ logger: false });
    app.register(authPlugin, { db, clock });
    app.register(salesPlugin, { db, clock, currentMenu: async () => menu });
    for (const role of ['owner', 'cashier']) {
      const result = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: role, password: 'solo pruebas de ventas' },
      });
      cookies[role] = String(result.headers['set-cookie']).split(';')[0]!;
    }
  });
  afterEach(async () => {
    await app?.close();
    await db.close();
  });
  const draft = () => ({
    draftId: randomUUID(),
    paymentMethod: 'cash',
    lines: [
      {
        productId: menu[0]!.products[0]!.id,
        productName: 'Café',
        quantity: 1,
        unitPriceCents: 1250,
      },
    ],
  });
  const post = (url: string, payload: unknown, role = 'cashier') =>
    app.inject({
      method: 'POST',
      url,
      payload: payload as object,
      headers: { cookie: cookies[role]! },
    });

  it.each(['owner', 'cashier'])(
    'permite cotizar y registrar a %s, con 201 y 200 y sin duplicados',
    async (role) => {
      const request = draft();
      const quote = await post('/api/sales/quote', { lines: request.lines }, role);
      expect(quote.statusCode).toBe(200);
      expect(saleQuoteSchema.parse(quote.json())).toMatchObject({ totalCents: 1250, menu });
      const first = await post('/api/sales', request, role);
      expect(first.statusCode).toBe(201);
      const sale = saleResponseSchema.parse(first.json()).sale;
      expect(sale.registeredBy.role).toBe(role);
      const retry = await post('/api/sales', { ...request, paymentMethod: 'qr' }, role);
      expect(retry.statusCode).toBe(200);
      expect(saleResponseSchema.parse(retry.json()).sale).toEqual(sale);
      expect(await listRegisteredSales(db)).toEqual([sale]);
      expect(
        (await post('/api/sales', request, role === 'owner' ? 'cashier' : 'owner')).json(),
      ).toMatchObject({
        error: { code: 'VALIDATION_ERROR', fields: { draftId: SALE_MESSAGES.draftTaken } },
      });
    },
  );
  it('devuelve 400 con fields.lines o paymentMethod por límites, repetidos, vacía y pago', async () => {
    const request = draft();
    const cases = [
      {
        url: '/api/sales/quote',
        payload: { lines: [{ ...request.lines[0], quantity: 100 }] },
        field: 'lines',
        message: SALE_MESSAGES.maxQuantity,
      },
      {
        url: '/api/sales/quote',
        payload: {
          lines: Array.from({ length: 31 }, () => ({
            ...request.lines[0],
            productId: randomUUID(),
          })),
        },
        field: 'lines',
        message: SALE_MESSAGES.maxLines,
      },
      {
        url: '/api/sales/quote',
        payload: { lines: [request.lines[0], request.lines[0]] },
        field: 'lines',
        message: SALE_MESSAGES.invalidLine,
      },
      {
        url: '/api/sales',
        payload: { ...request, lines: [] },
        field: 'lines',
        message: SALE_MESSAGES.empty,
      },
      {
        url: '/api/sales',
        payload: { draftId: request.draftId, lines: request.lines },
        field: 'paymentMethod',
        message: SALE_MESSAGES.paymentMethod,
      },
    ];
    for (const item of cases) {
      const response = await post(item.url, item.payload);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR', fields: { [item.field]: item.message } },
      });
    }
  });
  it('rechaza cambios del menú con 409 y peticiones sin sesión con 401', async () => {
    const request = draft();
    menu[0]!.products[0]!.priceCents = 1300;
    const changed = await post('/api/sales', request);
    expect(changed.statusCode).toBe(409);
    expect(changed.json()).toEqual({
      error: { code: 'MENU_CHANGED', message: SALE_MESSAGES.menuChanged },
    });
    for (const url of ['/api/sales/quote', '/api/sales']) {
      const response = await app.inject({ method: 'POST', url, payload: request });
      expect(response.statusCode).toBe(401);
    }
    expect(await listRegisteredSales(db)).toEqual([]);
  });
});
