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
import {
  findProductById,
  findProductByNameKey,
  insertProduct,
  listCurrentMenuRows,
  listProducts,
  setProductActive,
  updateProduct,
} from './products.repository.ts';

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

describe('products.repository', () => {
  let db: Database;
  let hot: string;
  let juices: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    hot = (await insertCategory(db, { name: 'Bebidas calientes', nameKey: 'bebidas calientes' }))
      .id;
    juices = (await insertCategory(db, { name: 'Jugos', nameKey: 'jugos' })).id;
  });

  afterEach(async () => {
    await db.close();
  });

  const americano = () =>
    insertProduct(db, {
      name: 'Café americano',
      nameKey: 'cafe americano',
      categoryId: hot,
      priceCents: 1250,
    });

  it('inserta un producto activo con su precio en centavos y lo encuentra por su id', async () => {
    const created = await americano();

    expect(created).toEqual({
      id: expect.any(String),
      name: 'Café americano',
      categoryId: hot,
      priceCents: 1250,
      active: true,
    });
    expect(await findProductById(db, created.id)).toEqual(created);
    expect(await findProductById(db, UNKNOWN_ID)).toBeNull();
  });

  it('busca por id bloqueando la fila (FOR UPDATE)', async () => {
    const created = await americano();

    const found = await db.transaction((tx) =>
      findProductById(tx, created.id, { forUpdate: true }),
    );

    expect(found).toEqual(created);
  });

  it('actualiza nombre, categoría y precio sin cambiar active', async () => {
    const created = await americano();
    await setProductActive(db, created.id, false);

    const updated = await updateProduct(db, created.id, {
      name: 'Café americano grande',
      nameKey: 'cafe americano grande',
      categoryId: juices,
      priceCents: 1300,
    });

    expect(updated).toEqual({
      id: created.id,
      name: 'Café americano grande',
      categoryId: juices,
      priceCents: 1300,
      active: false,
    });
    expect(
      await updateProduct(db, UNKNOWN_ID, {
        name: 'X',
        nameKey: 'x',
        categoryId: hot,
        priceCents: 100,
      }),
    ).toBeNull();
  });

  it('cambia active y devuelve el producto actualizado', async () => {
    const created = await americano();

    expect(await setProductActive(db, created.id, false)).toEqual({ ...created, active: false });
    expect(await setProductActive(db, created.id, true)).toEqual(created);
    expect(await setProductActive(db, UNKNOWN_ID, false)).toBeNull();
  });

  it('encuentra otro producto por name_key en cualquier categoría, también inactivo', async () => {
    const created = await americano();
    await setProductActive(db, created.id, false);

    expect(await findProductByNameKey(db, 'cafe americano')).toEqual({
      ...created,
      active: false,
    });
    expect(await findProductByNameKey(db, 'cafe americano', { excludeId: created.id })).toBeNull();
    expect(await findProductByNameKey(db, 'te')).toBeNull();
  });

  it('lista todos los productos, activos e inactivos', async () => {
    const created = await americano();
    const pina = await insertProduct(db, {
      name: 'Jugo de piña',
      nameKey: 'jugo de piña',
      categoryId: juices,
      priceCents: 1500,
    });
    await setProductActive(db, pina.id, false);

    expect(await listProducts(db)).toEqual(
      expect.arrayContaining([created, { ...pina, active: false }]),
    );
    expect(await listProducts(db)).toHaveLength(2);
  });

  it('lista los vigentes con su categoría: sin inactivos ni categorías inactivas', async () => {
    const created = await americano();
    const tea = await insertProduct(db, {
      name: 'Té',
      nameKey: 'te',
      categoryId: hot,
      priceCents: 800,
    });
    await setProductActive(db, tea.id, false);
    const season = await insertCategory(db, { name: 'Temporada', nameKey: 'temporada' });
    const api = await insertProduct(db, {
      name: 'Api',
      nameKey: 'api',
      categoryId: season.id,
      priceCents: 900,
    });
    await setProductActive(db, api.id, false);
    await setCategoryActive(db, season.id, false);

    expect(await listCurrentMenuRows(db)).toEqual([
      {
        id: created.id,
        name: 'Café americano',
        priceCents: 1250,
        categoryId: hot,
        categoryName: 'Bebidas calientes',
      },
    ]);
  });
});
