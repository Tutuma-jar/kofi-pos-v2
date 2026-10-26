import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { dayHistorySchema, saleResponseSchema } from '@kofi/contracts';
import { buildApp } from '../../app.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createAccountsService } from '../auth/index.ts';
import { saveCategory, saveProduct } from '../menu/index.ts';
import { listRegisteredSales } from '../sales/index.ts';

describe('historial integrado con ventas reales (RF-1, RF-3, RF-7)', () => {
  it('la API conserva las ventas del 14 y 15 de octubre de 1931 en su día local (T031)', async () => {
    const db = await createTestDatabase();
    const clock = createFakeClock(new Date('1931-10-15T04:00:00Z'));
    const app = buildApp({ db, clock, logger: false });
    try {
      await createAccountsService(db).create({
        username: 'historial',
        displayName: 'Dueño de prueba',
        role: 'owner',
        password: 'historial ficticio',
      });
      const category = await saveCategory(db, { name: 'Bebidas' });
      const product = await saveProduct(db, {
        categoryId: category.id,
        name: 'Café',
        price: '12,50',
      });
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'historial', password: 'historial ficticio' },
      });
      const headers = { cookie: String(login.headers['set-cookie']).split(';')[0]! };
      for (const instant of ['1931-10-15T04:00:00Z', '1931-10-15T04:32:36Z']) {
        clock.set(new Date(instant));
        const response = await app.inject({
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
                unitPriceCents: product.priceCents,
                quantity: 1,
              },
            ],
          },
        });
        expect(response.statusCode).toBe(201);
      }
      const before = await listRegisteredSales(db);
      for (const [date, number] of [
        ['1931-10-14', 1],
        ['1931-10-15', 2],
      ] as const) {
        const response = await app.inject({ url: `/api/history/day?date=${date}`, headers });
        expect(response.statusCode).toBe(200);
        const day = dayHistorySchema.parse(response.json());
        expect(day.sales.map((sale) => sale.number)).toEqual([number]);
        expect(day.totalCents).toBe(1250);
      }
      expect(await listRegisteredSales(db)).toEqual(before);
    } finally {
      await app.close();
      await db.close();
    }
  });
  it('separa dos días de Bolivia y ninguna consulta modifica las ventas', async () => {
    const db = await createTestDatabase();
    const clock = createFakeClock(new Date('2026-10-25T03:59:00Z'));
    const app = buildApp({ db, clock, logger: false });
    try {
      await createAccountsService(db).create({
        username: 'historial',
        displayName: 'Dueño de prueba',
        role: 'owner',
        password: 'historial ficticio',
      });
      const category = await saveCategory(db, { name: 'Bebidas' });
      const product = await saveProduct(db, {
        categoryId: category.id,
        name: 'Café americano',
        price: '12,50',
      });
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'historial', password: 'historial ficticio' },
      });
      expect(login.statusCode).toBe(200);
      const headers = { cookie: String(login.headers['set-cookie']).split(';')[0]! };
      const register = async (paymentMethod: 'cash' | 'qr') => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/sales',
          headers,
          payload: {
            draftId: randomUUID(),
            paymentMethod,
            lines: [
              {
                productId: product.id,
                productName: product.name,
                unitPriceCents: product.priceCents,
                quantity: 1,
              },
            ],
          },
        });
        expect(response.statusCode).toBe(201);
        return saleResponseSchema.parse(response.json()).sale;
      };
      const first = await register('cash');
      clock.advance(60000);
      const second = await register('qr');
      const before = await listRegisteredSales(db);
      for (const [date, sale] of [
        ['2026-10-24', first],
        ['2026-10-25', second],
      ] as const) {
        const response = await app.inject({ url: `/api/history/day?date=${date}`, headers });
        expect(response.statusCode).toBe(200);
        const day = dayHistorySchema.parse(response.json());
        expect(day.sales.map((row) => row.id)).toEqual([sale.id]);
        expect(day.totalCents).toBe(1250);
        expect(day.sales[0]?.registeredBy).toEqual(sale.registeredBy);
      }
      const today = await app.inject({ url: '/api/history/day', headers });
      expect(dayHistorySchema.parse(today.json()).date).toBe('2026-10-25');
      for (const date of ['0001-01-01', '0099-12-31', '0100-01-01']) {
        const response = await app.inject({ url: `/api/history/day?date=${date}`, headers });
        expect(response.statusCode).toBe(200);
        expect(dayHistorySchema.parse(response.json())).toMatchObject({
          date,
          salesCount: 0,
          sales: [],
        });
      }
      expect(await listRegisteredSales(db)).toEqual(before);
    } finally {
      await app.close();
      await db.close();
    }
  });
});
