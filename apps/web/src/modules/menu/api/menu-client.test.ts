import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { httpMenuClient } from './menu-client.ts';

const HOT = '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2';
const AMERICANO = 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07';

const category = { id: HOT, name: 'Bebidas calientes', active: true };
const product = {
  id: AMERICANO,
  name: 'Café americano',
  categoryId: HOT,
  priceCents: 1250,
  active: true,
};
const productInput = { name: 'Café americano', categoryId: HOT, price: '12,5' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpMenuClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([
    {
      name: 'getAdminMenu',
      call: () => httpMenuClient.getAdminMenu(),
      path: '/api/menu/admin',
      method: 'GET',
      body: undefined,
      response: { categories: [{ ...category, products: [product] }] },
      result: [{ ...category, products: [product] }],
    },
    {
      name: 'createCategory',
      call: () => httpMenuClient.createCategory({ name: 'Bebidas calientes' }),
      path: '/api/menu/categories',
      method: 'POST',
      body: { name: 'Bebidas calientes' },
      response: { category },
      result: category,
    },
    {
      name: 'renameCategory',
      call: () => httpMenuClient.renameCategory(HOT, { name: 'Bebidas calientes' }),
      path: `/api/menu/categories/${HOT}`,
      method: 'PUT',
      body: { name: 'Bebidas calientes' },
      response: { category },
      result: category,
    },
    {
      name: 'deactivateCategory',
      call: () => httpMenuClient.deactivateCategory(HOT),
      path: `/api/menu/categories/${HOT}/deactivate`,
      method: 'POST',
      body: undefined,
      response: { category: { ...category, active: false } },
      result: { ...category, active: false },
    },
    {
      name: 'reactivateCategory',
      call: () => httpMenuClient.reactivateCategory(HOT),
      path: `/api/menu/categories/${HOT}/reactivate`,
      method: 'POST',
      body: undefined,
      response: { category },
      result: category,
    },
    {
      name: 'createProduct',
      call: () => httpMenuClient.createProduct(productInput),
      path: '/api/menu/products',
      method: 'POST',
      body: productInput,
      response: { product },
      result: product,
    },
    {
      name: 'updateProduct',
      call: () => httpMenuClient.updateProduct(AMERICANO, productInput),
      path: `/api/menu/products/${AMERICANO}`,
      method: 'PUT',
      body: productInput,
      response: { product },
      result: product,
    },
    {
      name: 'deactivateProduct',
      call: () => httpMenuClient.deactivateProduct(AMERICANO),
      path: `/api/menu/products/${AMERICANO}/deactivate`,
      method: 'POST',
      body: undefined,
      response: { product: { ...product, active: false } },
      result: { ...product, active: false },
    },
    {
      name: 'reactivateProduct',
      call: () => httpMenuClient.reactivateProduct(AMERICANO),
      path: `/api/menu/products/${AMERICANO}/reactivate`,
      method: 'POST',
      body: undefined,
      response: { product },
      result: product,
    },
    {
      name: 'getCurrentMenu',
      call: () => httpMenuClient.getCurrentMenu(),
      path: '/api/menu',
      method: 'GET',
      body: undefined,
      response: {
        categories: [
          {
            id: HOT,
            name: 'Bebidas calientes',
            products: [{ id: AMERICANO, name: 'Café americano', priceCents: 1250 }],
          },
        ],
      },
      result: [
        {
          id: HOT,
          name: 'Bebidas calientes',
          products: [{ id: AMERICANO, name: 'Café americano', priceCents: 1250 }],
        },
      ],
    },
  ])('$name usa $method $path', async ({ call, path, method, body, response, result }) => {
    fetchMock.mockResolvedValue(json(200, response));

    expect(await call()).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  });

  it.each([
    ['getAdminMenu', () => httpMenuClient.getAdminMenu(), { categories: [{ id: 'x' }] }],
    ['createProduct', () => httpMenuClient.createProduct(productInput), { product: {} }],
    ['getCurrentMenu', () => httpMenuClient.getCurrentMenu(), { categories: 'no' }],
  ])('%s valida la respuesta con el esquema del contrato', async (_name, call, response) => {
    fetchMock.mockResolvedValue(json(200, response));

    await expect(call()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('propaga el error de la API, con sus campos', async () => {
    fetchMock.mockResolvedValue(
      json(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Revisa los datos',
          fields: { name: 'Ya existe un producto con ese nombre' },
        },
      }),
    );

    const error = await httpMenuClient.createProduct(productInput).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiFetchError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      error: { fields: { name: 'Ya existe un producto con ese nombre' } },
    });
  });
});
