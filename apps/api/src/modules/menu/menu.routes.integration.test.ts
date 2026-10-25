import {
  adminMenuResponseSchema,
  apiErrorSchema,
  categoryResponseSchema,
  productResponseSchema,
} from '@kofi/contracts';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAccountsService } from '../auth/index.ts';

const missingId = '11111111-1111-4111-8111-111111111111';
const adminRoutes = [
  { method: 'GET', url: '/api/menu/admin' },
  { method: 'POST', url: `/api/menu/categories/${missingId}/deactivate` },
  { method: 'POST', url: `/api/menu/categories/${missingId}/reactivate` },
  { method: 'POST', url: `/api/menu/products/${missingId}/deactivate` },
  { method: 'POST', url: `/api/menu/products/${missingId}/reactivate` },
  { method: 'POST', url: '/api/menu/categories', payload: { name: 'Bebidas' } },
  { method: 'PUT', url: `/api/menu/categories/${missingId}`, payload: { name: 'Bebidas' } },
  {
    method: 'POST',
    url: '/api/menu/products',
    payload: { name: 'Café', categoryId: missingId, price: '12' },
  },
  {
    method: 'PUT',
    url: `/api/menu/products/${missingId}`,
    payload: { name: 'Café', categoryId: missingId, price: '12' },
  },
] as const;

describe('rutas del menú (RF-1 a RF-7)', () => {
  let db: Database;
  let app: FastifyInstance;
  let ownerCookie: string;
  let cashierCookie: string;
  beforeEach(async () => {
    db = await createTestDatabase();
    const accounts = createAccountsService(db);
    for (const role of ['owner', 'cashier'] as const)
      await accounts.create({
        username: role,
        displayName: role === 'owner' ? 'Ana' : 'Luis',
        role,
        password: 'solo pruebas de menu',
      });
    app = buildApp({ db, logger: false });
    const login = async (username: string) =>
      String(
        (
          await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { username, password: 'solo pruebas de menu' },
          })
        ).headers['set-cookie'],
      ).split(';')[0]!;
    ownerCookie = await login('owner');
    cashierCookie = await login('cashier');
  });
  afterEach(async () => {
    await app.close();
    await db.close();
  });

  it('crea, renombra, crea producto y edita sus datos con respuestas del contrato', async () => {
    const request = (method: 'POST' | 'PUT' | 'GET', url: string, payload?: object) =>
      app.inject({ method, url, payload, headers: { cookie: ownerCookie } });
    let response = await request('POST', '/api/menu/categories', { name: 'Bebidas' });
    expect(response.statusCode).toBe(201);
    const category = categoryResponseSchema.parse(response.json()).category;
    response = await request('PUT', `/api/menu/categories/${category.id}`, {
      name: 'Bebidas calientes',
    });
    expect(response.statusCode).toBe(200);
    expect(categoryResponseSchema.parse(response.json()).category.name).toBe('Bebidas calientes');
    response = await request('POST', '/api/menu/products', {
      name: 'Café',
      categoryId: category.id,
      price: '12,5',
    });
    expect(response.statusCode).toBe(201);
    const product = productResponseSchema.parse(response.json()).product;
    response = await request('PUT', `/api/menu/products/${product.id}`, {
      name: 'Café grande',
      categoryId: category.id,
      price: '13',
    });
    expect(response.statusCode).toBe(200);
    expect(productResponseSchema.parse(response.json()).product).toMatchObject({
      name: 'Café grande',
      priceCents: 1300,
    });
    response = await request('GET', '/api/menu/admin');
    expect(response.statusCode).toBe(200);
    expect(
      adminMenuResponseSchema.parse(response.json()).categories[0]!.products[0]!.priceCents,
    ).toBe(1300);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each(adminRoutes)(
    'protege $method $url sin sesión y ante el cajero, sin cambios',
    async (route) => {
      expect((await app.inject(route)).statusCode).toBe(401);
      const response = await app.inject({ ...route, headers: { cookie: cashierCookie } });
      expect(response.statusCode).toBe(403);
      expect(apiErrorSchema.parse(response.json()).error).toEqual({
        code: 'FORBIDDEN',
        message: 'No tienes permiso para administrar el menú',
      });
      expect((await db.query('SELECT * FROM categories')).rows).toEqual([]);
      expect((await db.query('SELECT * FROM products')).rows).toEqual([]);
    },
  );

  it.each(['categories', 'products'])(
    'responde 404 para ids inexistentes o inválidos en %s',
    async (entity) => {
      for (const id of [missingId, 'no-es-uuid']) {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/menu/${entity}/${id}`,
          headers: { cookie: ownerCookie },
          payload: { name: 'Nuevo', categoryId: missingId, price: '12' },
        });
        expect(response.statusCode).toBe(404);
        expect(response.json().error.code).toBe('NOT_FOUND');
      }
    },
  );

  it('rechaza el cuerpo vacío y los datos inválidos con errores de campo', async () => {
    for (const entity of ['categories', 'products']) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/menu/${entity}`,
        headers: { cookie: ownerCookie },
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.fields.name).toBeTruthy();
    }
  });
  it('expone las cuatro acciones y sus conflictos con respuestas del contrato (RF-9, RF-10)', async () => {
    const post = (url: string, payload?: object) =>
      app.inject({ method: 'POST', url, payload, headers: { cookie: ownerCookie } });
    const category = (await post('/api/menu/categories', { name: 'Bebidas' })).json().category;
    const product = (
      await post('/api/menu/products', { name: 'Café', categoryId: category.id, price: '12,5' })
    ).json().product;
    expect((await post(`/api/menu/categories/${category.id}/deactivate`)).json().error.code).toBe(
      'CATEGORY_HAS_ACTIVE_PRODUCTS',
    );
    let response = await post(`/api/menu/products/${product.id}/deactivate`);
    expect(response.statusCode).toBe(200);
    expect(productResponseSchema.parse(response.json()).product.active).toBe(false);
    response = await post(`/api/menu/categories/${category.id}/deactivate`);
    expect(response.statusCode).toBe(200);
    expect(categoryResponseSchema.parse(response.json()).category.active).toBe(false);
    response = await post(`/api/menu/products/${product.id}/reactivate`);
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CATEGORY_INACTIVE');
    response = await post(`/api/menu/categories/${category.id}/reactivate`);
    expect(response.statusCode).toBe(200);
    expect(categoryResponseSchema.parse(response.json()).category.active).toBe(true);
    response = await post(`/api/menu/products/${product.id}/reactivate`);
    expect(response.statusCode).toBe(200);
    expect(productResponseSchema.parse(response.json()).product.active).toBe(true);
  });
  it.each(['categories', 'products'])(
    'responde 404 para los ids desconocidos en acciones de %s',
    async (entity) => {
      for (const id of [missingId, 'no-es-uuid'])
        for (const action of ['deactivate', 'reactivate']) {
          const response = await app.inject({
            method: 'POST',
            url: `/api/menu/${entity}/${id}/${action}`,
            headers: { cookie: ownerCookie },
          });
          expect(response.statusCode).toBe(404);
          expect(response.json().error.code).toBe('NOT_FOUND');
        }
    },
  );
});
