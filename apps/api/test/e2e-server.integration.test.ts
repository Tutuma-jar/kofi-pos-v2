import { accountInputSchema } from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';
import { buildE2eApp } from './e2e-server.ts';
import { buildApp } from '../src/app.ts';
import { createTestDatabase } from './test-database.ts';

describe('API real de E2E (RF-1, RF-5, RF-7, RF-13)', () => {
  it('las rutas de control nunca existen en buildApp, también con base de datos', async () => {
    const db = await createTestDatabase();
    const app = buildApp({ db, logger: false, production: true });
    try {
      for (const url of [
        '/api/__test/clock',
        '/api/__test/accounts/ana',
        '/api/__test/menu',
        '/api/__test/official-menu',
      ])
        expect((await app.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(404);
      expect((await app.inject({ url: '/api/menu/admin' })).statusCode).toBe(401);
    } finally {
      await app.close();
      await db.close();
    }
  }, 15_000);
  it('carga y restablece el menú con los servicios y lo administra mediante la API real (Menú RF-1 a RF-7)', async () => {
    const app = await buildE2eApp();
    try {
      const load = await app.inject({
        method: 'POST',
        url: '/api/__test/menu',
        payload: {
          categories: [
            {
              name: '  Bebidas   calientes ',
              products: [{ name: 'Café americano', price: '12,5' }],
            },
          ],
        },
      });
      expect(load.statusCode).toBe(200);
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_ACCOUNTS.owner.username, password: TEST_ACCOUNTS.owner.password },
      });
      const cookie = String(login.headers['set-cookie']).split(';')[0]!;
      let response = await app.inject({ url: '/api/menu/admin', headers: { cookie } });
      expect(response.statusCode).toBe(200);
      const menu = response.json().categories;
      expect(menu[0]).toMatchObject({
        name: 'Bebidas calientes',
        products: [{ name: 'Café americano', priceCents: 1250, active: true }],
      });
      response = await app.inject({
        method: 'PUT',
        url: `/api/menu/products/${menu[0].products[0].id}`,
        headers: { cookie },
        payload: { name: 'Café americano', categoryId: menu[0].id, price: '13' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().product.priceCents).toBe(1300);
      expect(
        (await app.inject({ method: 'POST', url: '/api/__test/menu', payload: { categories: [] } }))
          .statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ url: '/api/menu/admin', headers: { cookie } })).json().categories,
      ).toEqual([]);
    } finally {
      await app.close();
    }
  }, 15_000);
  it('controla bloqueo, vencimiento y cambios de cuenta en la API de E2E (RF-9, RF-10, RF-12)', async () => {
    const app = await buildE2eApp();
    const login = (password: string = TEST_ACCOUNTS.cashier.password) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'luis', password },
      });
    const advance = (advanceMilliseconds: number) =>
      app.inject({ method: 'POST', url: '/api/__test/clock', payload: { advanceMilliseconds } });
    const change = (changes: unknown) =>
      app.inject({
        method: 'POST',
        url: '/api/__test/accounts/luis',
        payload: { action: 'update', changes },
      });
    try {
      for (let i = 0; i < 5; i++)
        expect((await login('incorrecta de prueba')).statusCode).toBe(401);
      expect((await login()).statusCode).toBe(429);
      expect((await advance(5 * 60_000)).statusCode).toBe(200);
      let response = await login();
      expect(response.statusCode).toBe(200);
      let cookie = String(response.headers['set-cookie']).split(';')[0]!;
      expect((await advance(12 * 60 * 60_000)).statusCode).toBe(200);
      expect(
        (await app.inject({ url: '/api/auth/session', headers: { cookie } })).json().error.code,
      ).toBe('SESSION_EXPIRED');
      response = await login();
      cookie = String(response.headers['set-cookie']).split(';')[0]!;
      expect((await change({ role: 'owner' })).statusCode).toBe(200);
      expect(
        (await app.inject({ url: '/api/auth/session', headers: { cookie } })).json().error.code,
      ).toBe('SESSION_TERMINATED');
      expect((await change({ password: 'nueva clave de prueba' })).statusCode).toBe(200);
      expect((await login()).statusCode).toBe(401);
      response = await login('nueva clave de prueba');
      expect(response.statusCode).toBe(200);
      cookie = String(response.headers['set-cookie']).split(';')[0]!;
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/__test/accounts/luis',
            payload: { action: 'delete' },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ url: '/api/auth/session', headers: { cookie } })).json().error.code,
      ).toBe('SESSION_TERMINATED');
      expect((await advance(-1)).statusCode).toBe(400);
    } finally {
      await app.close();
    }
  }, 15_000);
  it('crea las cuentas con el servicio y permite ingresar, comprobar y cerrar', async () => {
    const app = await buildE2eApp();
    try {
      for (const account of Object.values(TEST_ACCOUNTS)) {
        expect(accountInputSchema.safeParse(account).success).toBe(true);
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: {
            username: account.username,
            password: account.password,
          },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().user).toMatchObject({
          username: account.username,
          role: account.role,
          displayName: account.displayName,
        });
        const cookie = String(response.headers['set-cookie']).split(';')[0]!;
        expect(
          (await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } }))
            .statusCode,
        ).toBe(200);
        expect(
          (await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } }))
            .statusCode,
        ).toBe(204);
        expect(
          (await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } }))
            .statusCode,
        ).toBe(401);
      }
    } finally {
      await app.close();
    }
  }, 15_000);
});
