import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import {
  countActiveProducts,
  findCategoryById,
  findCategoryByNameKey,
  insertCategory,
  setCategoryActive,
  updateCategoryName,
} from './categories.repository.ts';

const UNKNOWN_ID = '9e8d7c6b-5a49-4f38-a271-605f4e3d2c1b';

async function insertProductRow(db: Database, categoryId: string, name: string, active = true) {
  await db.query(
    `INSERT INTO products (name, name_key, category_id, price_cents, active)
     VALUES ($1, lower($1), $2, 1250, $3)`,
    [name, categoryId, active],
  );
}

describe('categories.repository', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('inserta una categoría activa y la encuentra por su id', async () => {
    const created = await insertCategory(db, {
      name: 'Bebidas calientes',
      nameKey: 'bebidas calientes',
    });

    expect(created).toEqual({ id: expect.any(String), name: 'Bebidas calientes', active: true });
    expect(await findCategoryById(db, created.id)).toEqual(created);
  });

  it('devuelve null para un id que no existe', async () => {
    expect(await findCategoryById(db, UNKNOWN_ID)).toBeNull();
  });

  it.each(['update', 'share'] as const)(
    'busca por id bloqueando la fila (FOR %s)',
    async (lock) => {
      const created = await insertCategory(db, { name: 'Jugos', nameKey: 'jugos' });

      const found = await db.transaction((tx) => findCategoryById(tx, created.id, { lock }));

      expect(found).toEqual(created);
    },
  );

  it('cambia el nombre y devuelve la categoría actualizada', async () => {
    const created = await insertCategory(db, { name: 'bebidas', nameKey: 'bebidas' });

    const renamed = await updateCategoryName(db, created.id, {
      name: 'Bebidas',
      nameKey: 'bebidas',
    });

    expect(renamed).toEqual({ ...created, name: 'Bebidas' });
    expect(await updateCategoryName(db, UNKNOWN_ID, { name: 'X', nameKey: 'x' })).toBeNull();
  });

  it('cambia active y devuelve la categoría actualizada', async () => {
    const created = await insertCategory(db, { name: 'Temporada', nameKey: 'temporada' });

    expect(await setCategoryActive(db, created.id, false)).toEqual({ ...created, active: false });
    expect(await setCategoryActive(db, created.id, true)).toEqual(created);
    expect(await setCategoryActive(db, UNKNOWN_ID, false)).toBeNull();
  });

  describe('findCategoryByNameKey', () => {
    it('encuentra otra categoría con la misma clave, también si está inactiva', async () => {
      const created = await insertCategory(db, { name: 'Jugos', nameKey: 'jugos' });
      await setCategoryActive(db, created.id, false);

      expect(await findCategoryByNameKey(db, 'jugos')).toEqual({ ...created, active: false });
      expect(await findCategoryByNameKey(db, 'tes')).toBeNull();
    });

    it('excluye la propia categoría', async () => {
      const created = await insertCategory(db, { name: 'Jugos', nameKey: 'jugos' });

      expect(await findCategoryByNameKey(db, 'jugos', { excludeId: created.id })).toBeNull();
    });
  });

  it('cuenta solo los productos activos de la categoría', async () => {
    const hot = await insertCategory(db, {
      name: 'Bebidas calientes',
      nameKey: 'bebidas calientes',
    });
    const juices = await insertCategory(db, { name: 'Jugos', nameKey: 'jugos' });
    await insertProductRow(db, hot.id, 'Café americano');
    await insertProductRow(db, hot.id, 'Té');
    await insertProductRow(db, hot.id, 'Api', false);
    await insertProductRow(db, juices.id, 'Jugo de piña');

    expect(await countActiveProducts(db, hot.id)).toBe(2);
    expect(await countActiveProducts(db, UNKNOWN_ID)).toBe(0);
  });
});
