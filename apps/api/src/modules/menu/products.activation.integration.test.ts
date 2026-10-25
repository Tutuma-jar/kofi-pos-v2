import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AdminProduct } from '@kofi/contracts';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { saveCategory } from './categories.service.ts';
import { setCategoryActive } from './categories.repository.ts';
import { saveProduct, deactivateProduct, reactivateProduct } from './products.service.ts';

describe('activar productos (RF-9, RF-11)', () => {
  let db: Database;
  let product: AdminProduct;
  beforeEach(async () => {
    db = await createTestDatabase();
    const category = await saveCategory(db, { name: 'Bebidas calientes' });
    product = await saveProduct(db, { name: 'Café', categoryId: category.id, price: '12,5' });
  });
  afterEach(async () => {
    await db.close();
  });
  it('desactiva y reactiva conservando todos los datos y hace idempotentes ambas acciones', async () => {
    expect(await deactivateProduct(db, product.id)).toEqual({ ...product, active: false });
    await db.query("UPDATE products SET updated_at = '2026-01-01T00:00:00Z' WHERE id = $1", [
      product.id,
    ]);
    expect(await deactivateProduct(db, product.id)).toEqual({ ...product, active: false });
    expect(
      (
        await db.query<{ updated_at: Date }>('SELECT updated_at FROM products WHERE id = $1', [
          product.id,
        ])
      ).rows[0]!.updated_at.toISOString(),
    ).toBe('2026-01-01T00:00:00.000Z');
    expect(await reactivateProduct(db, product.id)).toEqual(product);
    expect(await reactivateProduct(db, product.id)).toEqual(product);
  });
  it('rechaza reactivar si su categoría está inactiva y devuelve su nombre', async () => {
    await deactivateProduct(db, product.id);
    await setCategoryActive(db, product.categoryId, false);
    await expect(reactivateProduct(db, product.id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CATEGORY_INACTIVE',
      message:
        'Reactiva la categoría “Bebidas calientes” o mueve el producto a otra antes de reactivarlo',
    });
  });
  it.each([deactivateProduct, reactivateProduct])(
    'responde 404 si no existe el producto',
    async (action) => {
      await expect(action(db, '11111111-1111-4111-8111-111111111111')).rejects.toMatchObject({
        statusCode: 404,
      });
    },
  );
});
