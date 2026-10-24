import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from './database.ts';

// 002_menu.sql (SPEC-002, plan §4): tablas del menú y disparadores de activación (D-5).

async function insertCategory(db: Database, name = 'Bebidas calientes', active = true) {
  const result = await db.query<{ id: string }>(
    `INSERT INTO categories (name, name_key, active) VALUES ($1, lower($1), $2) RETURNING id`,
    [name, active],
  );
  return result.rows[0]!.id;
}

async function insertProduct(
  db: Database,
  categoryId: string,
  { name = 'Café americano', priceCents = 1250, active = true } = {},
) {
  const result = await db.query<{ id: string }>(
    `INSERT INTO products (name, name_key, category_id, price_cents, active)
     VALUES ($1, lower($1), $2, $3, $4) RETURNING id`,
    [name, categoryId, priceCents, active],
  );
  return result.rows[0]!.id;
}

describe('002_menu.sql', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('crea categorías y productos activos por defecto', async () => {
    const categoryId = await insertCategory(db);
    await insertProduct(db, categoryId);

    const rows = await db.query<{ active: boolean; price_cents: number }>(
      'SELECT p.active, p.price_cents FROM products p',
    );
    expect(rows.rows).toEqual([{ active: true, price_cents: 1250 }]);
  });

  it.each([0, 100001])('rechaza un precio de %i centavos', async (priceCents) => {
    const categoryId = await insertCategory(db);
    await expect(insertProduct(db, categoryId, { priceCents })).rejects.toThrow(/check/i);
  });

  it('acepta los precios límite de 1 y 100000 centavos', async () => {
    const categoryId = await insertCategory(db);
    await insertProduct(db, categoryId, { name: 'Uno', priceCents: 1 });
    await insertProduct(db, categoryId, { name: 'Mil', priceCents: 100000 });
  });

  it('rechaza un nombre de categoría vacío o de 31 caracteres', async () => {
    await expect(insertCategory(db, '')).rejects.toThrow(/check/i);
    await expect(insertCategory(db, 'c'.repeat(31))).rejects.toThrow(/check/i);
  });

  it('rechaza un nombre de producto vacío o de 41 caracteres', async () => {
    const categoryId = await insertCategory(db);
    await expect(insertProduct(db, categoryId, { name: '' })).rejects.toThrow(/check/i);
    await expect(insertProduct(db, categoryId, { name: 'p'.repeat(41) })).rejects.toThrow(/check/i);
  });

  it('rechaza un name_key repetido de categoría y de producto, también entre categorías', async () => {
    const hot = await insertCategory(db);
    const juices = await insertCategory(db, 'Jugos');
    await expect(insertCategory(db, 'Jugos')).rejects.toThrow(/unique|duplicate/i);

    await insertProduct(db, hot, { active: false });
    await expect(insertProduct(db, juices)).rejects.toThrow(/unique|duplicate/i);
  });

  describe('products_require_active_category (KM001)', () => {
    it('no deja crear un producto activo en una categoría inactiva', async () => {
      const categoryId = await insertCategory(db, 'Temporada', false);
      await expect(insertProduct(db, categoryId)).rejects.toMatchObject({ code: 'KM001' });
    });

    it('sí deja crear un producto inactivo en una categoría inactiva', async () => {
      const categoryId = await insertCategory(db, 'Temporada', false);
      await insertProduct(db, categoryId, { active: false });
    });

    it('no deja reactivar ni mover a una categoría inactiva un producto activo', async () => {
      const season = await insertCategory(db, 'Temporada', false);
      const hot = await insertCategory(db);
      const inactiveId = await insertProduct(db, season, { active: false });
      const activeId = await insertProduct(db, hot, { name: 'Té' });

      await expect(
        db.query('UPDATE products SET active = true WHERE id = $1', [inactiveId]),
      ).rejects.toMatchObject({ code: 'KM001' });
      await expect(
        db.query('UPDATE products SET category_id = $1 WHERE id = $2', [season, activeId]),
      ).rejects.toMatchObject({ code: 'KM001' });
    });

    it('deja cambiar el precio de un producto inactivo de una categoría inactiva', async () => {
      const season = await insertCategory(db, 'Temporada', false);
      const id = await insertProduct(db, season, { active: false });
      await db.query('UPDATE products SET price_cents = 1300 WHERE id = $1', [id]);
    });
  });

  describe('categories_keep_active_products (KM002)', () => {
    it('no deja desactivar una categoría con productos activos', async () => {
      const categoryId = await insertCategory(db);
      await insertProduct(db, categoryId);

      await expect(
        db.query('UPDATE categories SET active = false WHERE id = $1', [categoryId]),
      ).rejects.toMatchObject({ code: 'KM002' });
    });

    it('sí deja desactivar una categoría que solo tiene productos inactivos, y renombrarla', async () => {
      const categoryId = await insertCategory(db);
      await insertProduct(db, categoryId, { active: false });

      await db.query('UPDATE categories SET active = false WHERE id = $1', [categoryId]);
      await db.query("UPDATE categories SET name = 'Otra', name_key = 'otra' WHERE id = $1", [
        categoryId,
      ]);
    });
  });

  it('no deja borrar una categoría con productos (ON DELETE RESTRICT)', async () => {
    const categoryId = await insertCategory(db);
    await insertProduct(db, categoryId, { active: false });

    await expect(db.query('DELETE FROM categories WHERE id = $1', [categoryId])).rejects.toThrow(
      /foreign key/i,
    );
  });
});
