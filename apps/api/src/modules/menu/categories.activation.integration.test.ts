import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Category } from '@kofi/contracts';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { saveCategory, deactivateCategory, reactivateCategory } from './categories.service.ts';
import { saveProduct, deactivateProduct } from './products.service.ts';
import { listProducts } from './products.repository.ts';

describe('activar categorías (RF-8, RF-10, RF-11)', () => {
  let db: Database;
  let category: Category;
  beforeEach(async () => {
    db = await createTestDatabase();
    category = await saveCategory(db, { name: 'Bebidas' });
  });
  afterEach(async () => {
    await db.close();
  });
  it('desactiva sin productos activos, renombra inactiva y reactiva sin tocar productos', async () => {
    const product = await saveProduct(db, { name: 'Café', categoryId: category.id, price: '12' });
    await deactivateProduct(db, product.id);
    expect(await deactivateCategory(db, category.id)).toEqual({ ...category, active: false });
    expect(await deactivateCategory(db, category.id)).toEqual({ ...category, active: false });
    await saveCategory(db, { name: 'Cafés' }, category.id);
    expect(await reactivateCategory(db, category.id)).toEqual({ ...category, name: 'Cafés' });
    expect(await reactivateCategory(db, category.id)).toEqual({ ...category, name: 'Cafés' });
    expect(await listProducts(db)).toEqual([{ ...product, active: false }]);
  });
  it('desactiva también una categoría vacía', async () => {
    expect((await deactivateCategory(db, category.id)).active).toBe(false);
  });
  it.each([1, 3])(
    'rechaza una categoría con %s productos activos y conserva su estado',
    async (count) => {
      for (let i = 0; i < count; i++)
        await saveProduct(db, { name: `Producto ${i}`, categoryId: category.id, price: '12' });
      await expect(deactivateCategory(db, category.id)).rejects.toMatchObject({
        statusCode: 409,
        code: 'CATEGORY_HAS_ACTIVE_PRODUCTS',
        message: `Esta categoría tiene ${count} ${count === 1 ? 'producto activo' : 'productos activos'}. Desactívalos o muévelos a otra categoría antes`,
      });
    },
  );
  it('traduce KM002 tras una comprobación desactualizada al 409 con el recuento vigente', async () => {
    await saveProduct(db, { name: 'Café', categoryId: category.id, price: '12' });
    const racing: Database = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            ...tx,
            query: async (sql, params) => {
              if (sql.includes('count(*)')) return tx.query(sql + ' AND false', params);
              if (sql.startsWith('UPDATE categories SET active'))
                throw Object.assign(new Error('carrera simulada'), { code: 'KM002' });
              return tx.query(sql, params);
            },
          }),
        ),
    };
    await expect(deactivateCategory(racing, category.id)).rejects.toMatchObject({
      statusCode: 409,
      message:
        'Esta categoría tiene 1 producto activo. Desactívalos o muévelos a otra categoría antes',
    });
  });
  it.each([deactivateCategory, reactivateCategory])(
    'responde 404 para una categoría inexistente',
    async (action) => {
      await expect(action(db, '11111111-1111-4111-8111-111111111111')).rejects.toMatchObject({
        statusCode: 404,
      });
    },
  );
});
