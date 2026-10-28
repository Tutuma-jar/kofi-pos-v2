import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyTestDatabase, createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAccountsService } from '../auth/index.ts';
import { OFFICIAL_MENU } from './official-menu.data.ts';
import { getAdminMenu, getCurrentMenu, loadOfficialMenu } from './index.ts';

// Precio de la tabla en centavos, calculado aparte de priceSchema (RNF-2): «15,00» → 1500.
const cents = (price: string) => Math.round(Number(price.replace(',', '.')) * 100);

// Filas comparables sin depender del orden: categoría, producto, centavos y si están activos.
const officialRows = OFFICIAL_MENU.flatMap((category) =>
  category.products.map((product) => [category.name, product.name, cents(product.price), true]),
).sort();

async function loadedRows(db: Database) {
  return (await getAdminMenu(db))
    .flatMap((category) =>
      category.products.map((product) => [
        category.name,
        product.name,
        product.priceCents,
        category.active && product.active,
      ]),
    )
    .sort();
}

// Falla al insertar un producto intermedio, dentro de la transacción de la carga (RF-4).
function failingOnProduct(db: Database, name: string): Database {
  return {
    ...db,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          ...tx,
          query: async (sql, params) => {
            if (sql.startsWith('INSERT INTO products') && params?.[0] === name)
              throw new Error('fallo de prueba');
            return tx.query(sql, params);
          },
        }),
      ),
  };
}

describe('loadOfficialMenu (RF-2, RF-4, RNF-2)', () => {
  let db: Database;
  afterEach(async () => {
    await db.close();
  });

  it('carga las 6 categorías y los 37 productos activos en una base migrada sin menú', async () => {
    db = await createTestDatabase();
    expect(await loadOfficialMenu(db)).toEqual({ categories: 6, products: 37 });
    const admin = await getAdminMenu(db);
    expect(admin).toHaveLength(6);
    expect(await loadedRows(db)).toEqual(officialRows);
    const coffee = admin.find((category) => category.name === 'Cafés')!;
    expect(coffee.products.find((product) => product.name === 'Café con leche')).toMatchObject({
      priceCents: 1500,
      active: true,
    });
    expect((await getCurrentMenu(db)).flatMap((category) => category.products)).toHaveLength(37);
  });

  it('prepara una base sin tablas y carga lo mismo', async () => {
    db = await createEmptyTestDatabase();
    expect(await loadOfficialMenu(db)).toEqual({ categories: 6, products: 37 });
    expect(await loadedRows(db)).toEqual(officialRows);
    const migrations = await db.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY name',
    );
    expect(migrations.rows.map((row) => row.name)).toEqual([
      '001_auth.sql',
      '002_menu.sql',
      '003_sales.sql',
    ]);
  });

  it('carga sin tocar las cuentas del dueño y del cajero', async () => {
    db = await createTestDatabase();
    const accounts = createAccountsService(db);
    await accounts.create({
      username: 'dueno',
      displayName: 'Dueño',
      role: 'owner',
      password: 'cafe de prueba',
    });
    await accounts.create({
      username: 'cajero',
      displayName: 'Cajero',
      role: 'cashier',
      password: 'cafe de prueba',
    });
    const before = await accounts.list();
    expect(await loadOfficialMenu(db)).toEqual({ categories: 6, products: 37 });
    expect(await accounts.list()).toEqual(before);
    expect(await loadedRows(db)).toEqual(officialRows);
  });

  it('no deja nada del menú si falla un producto intermedio en una base migrada', async () => {
    db = await createTestDatabase();
    await expect(loadOfficialMenu(failingOnProduct(db, 'Chai latte'))).rejects.toThrow(
      'fallo de prueba',
    );
    expect(await getAdminMenu(db)).toEqual([]);
  });

  it('no deja tablas ni migraciones si falla un producto intermedio en una base sin tablas', async () => {
    db = await createEmptyTestDatabase();
    await expect(loadOfficialMenu(failingOnProduct(db, 'Chai latte'))).rejects.toThrow(
      'fallo de prueba',
    );
    const tables = await db.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('categories', 'products', 'schema_migrations')`,
    );
    expect(tables.rows).toEqual([]);
  });
});
