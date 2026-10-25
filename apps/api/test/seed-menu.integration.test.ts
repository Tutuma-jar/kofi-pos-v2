import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from './test-database.ts';
import type { Database } from '../src/shared/database/database.ts';
import {
  getAdminMenu,
  getCurrentMenu,
  saveCategory,
  saveProduct,
} from '../src/modules/menu/index.ts';
import { seedMenu } from './seed-menu.ts';

describe('menú de prueba para T035 (RNF-3)', () => {
  let db: Database;
  beforeEach(async () => {
    db = await createTestDatabase();
  });
  afterEach(async () => {
    await db.close();
  });
  it('carga exactamente 200 productos vendibles mediante los servicios', async () => {
    expect(await seedMenu(db)).toBe(200);
    const current = await getCurrentMenu(db);
    expect(current.flatMap((category) => category.products)).toHaveLength(200);
    expect(current[0]!.products[0]).toMatchObject({
      name: 'Producto de prueba 001',
      priceCents: 1000,
    });
  }, 15_000);
  it('no carga nada si ya hay productos, incluso si están inactivos', async () => {
    const category = await saveCategory(db, { name: 'Propia' });
    await saveProduct(db, { name: 'Existente', categoryId: category.id, price: '12' });
    await db.query('UPDATE products SET active = false');
    const before = await getAdminMenu(db);
    await expect(seedMenu(db)).rejects.toThrow(
      'La base ya tiene productos. No se cargó el menú de prueba',
    );
    expect(await getAdminMenu(db)).toEqual(before);
  });
  it('revierte toda la carga si falla un producto intermedio', async () => {
    const failing: Database = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            ...tx,
            query: async (sql, params) => {
              if (
                sql.startsWith('INSERT INTO products') &&
                params?.[0] === 'Producto de prueba 100'
              )
                throw new Error('fallo de prueba');
              return tx.query(sql, params);
            },
          }),
        ),
    };
    await expect(seedMenu(failing)).rejects.toThrow('fallo de prueba');
    expect(await getAdminMenu(db)).toEqual([]);
  }, 15_000);
});
