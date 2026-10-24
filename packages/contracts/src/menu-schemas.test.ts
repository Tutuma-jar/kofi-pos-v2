import { describe, expect, it } from 'vitest';
import {
  adminMenuResponseSchema,
  categoryInputSchema,
  categoryResponseSchema,
  currentMenuResponseSchema,
  productInputSchema,
  productResponseSchema,
} from './index.ts';

// Ejemplos de §6.2 del plan, con identificadores completos.
const HOT_DRINKS = '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2';
const SEASON = '88b2d1e4-5f6a-4b7c-9d8e-0f1a2b3c4d41';
const AMERICANO = 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07';
const API_WITH_CAKE = '2b6d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4ee8';

const americano = {
  id: AMERICANO,
  name: 'café americano',
  categoryId: HOT_DRINKS,
  priceCents: 1250,
  active: true,
};

describe('categoryInputSchema (RF-3)', () => {
  it('normaliza el nombre', () => {
    expect(categoryInputSchema.parse({ name: '  Bebidas   calientes ' })).toEqual({
      name: 'Bebidas calientes',
    });
  });

  it('rechaza un nombre vacío con su mensaje', () => {
    const result = categoryInputSchema.safeParse({ name: '' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['name'],
      message: 'Escribe el nombre de la categoría',
    });
  });
});

describe('productInputSchema (RF-4 a RF-6)', () => {
  it('normaliza el nombre y convierte el precio en priceCents', () => {
    expect(
      productInputSchema.parse({
        name: '  café   americano ',
        categoryId: HOT_DRINKS,
        price: '12,5',
      }),
    ).toEqual({ name: 'café americano', categoryId: HOT_DRINKS, priceCents: 1250 });
  });

  it('indica cada campo que falla', () => {
    const result = productInputSchema.safeParse({ name: ' ', categoryId: '', price: '12,505' });
    const fields = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
    );
    expect(fields).toEqual({
      name: 'Escribe el nombre del producto',
      categoryId: 'Elige una categoría',
      price: 'Escribe el precio en bolivianos, con hasta 2 decimales (por ejemplo, 12,50)',
    });
  });
});

describe('respuestas (plan §6.2)', () => {
  it('POST /api/menu/products → { product }', () => {
    expect(productResponseSchema.parse({ product: americano })).toEqual({ product: americano });
  });

  it('las rutas de categorías → { category }', () => {
    const category = { id: HOT_DRINKS, name: 'Bebidas calientes', active: true };
    expect(categoryResponseSchema.parse({ category })).toEqual({ category });
  });

  it('GET /api/menu/admin → categorías con sus productos, activos e inactivos (RF-2)', () => {
    const body = {
      categories: [
        { id: HOT_DRINKS, name: 'Bebidas calientes', active: true, products: [americano] },
        {
          id: SEASON,
          name: 'Temporada',
          active: false,
          products: [
            {
              id: API_WITH_CAKE,
              name: 'Api con pastel',
              categoryId: SEASON,
              priceCents: 1800,
              active: false,
            },
          ],
        },
      ],
    };
    expect(adminMenuResponseSchema.parse(body)).toEqual(body);
  });

  it('GET /api/menu → menú vigente sin estados (RF-14, RF-15)', () => {
    const body = {
      categories: [
        {
          id: HOT_DRINKS,
          name: 'Bebidas calientes',
          products: [{ id: AMERICANO, name: 'Café americano', priceCents: 1250 }],
        },
      ],
    };
    expect(currentMenuResponseSchema.parse(body)).toEqual(body);
  });

  it.each([0, 100001, 12.5])('rechaza un priceCents de %s', (priceCents) => {
    expect(productResponseSchema.safeParse({ product: { ...americano, priceCents } }).success).toBe(
      false,
    );
  });

  it('rechaza un identificador que no es un uuid', () => {
    expect(
      productResponseSchema.safeParse({ product: { ...americano, categoryId: 'bebidas' } }).success,
    ).toBe(false);
  });
});
