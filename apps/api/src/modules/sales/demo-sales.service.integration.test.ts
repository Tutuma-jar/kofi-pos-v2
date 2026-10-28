import { afterEach, describe, expect, it } from 'vitest';
import { TEST_ACCOUNTS } from '../../../../../e2e/fixtures.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { loadOfficialMenuFixture } from '../../../test/official-menu-fixture.ts';
import { createAccountsService } from '../auth/index.ts';
import { getAdminMenu, OFFICIAL_MENU, saveCategory, saveProduct } from '../menu/index.ts';
import type { Database, Queryable } from '../../shared/database/database.ts';
import {
  DemoSalesHasSalesError,
  DemoSalesMenuError,
  DemoSalesNoAccountsError,
  inspectDemoSales,
} from './demo-sales.service.ts';
import { insertSale, listRegisteredSales, nextSaleNumber } from './sales.repository.ts';

const NOW = new Date('2026-10-28T11:00:00-04:00');
const officialNames = OFFICIAL_MENU.flatMap((category) => category.products.map((p) => p.name));
const databases: Database[] = [];
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.close()));
});

async function base({ menu = true, accounts = true } = {}): Promise<Database> {
  const db = await createTestDatabase();
  databases.push(db);
  if (menu) await loadOfficialMenuFixture(db);
  if (accounts)
    for (const input of Object.values(TEST_ACCOUNTS)) await createAccountsService(db).create(input);
  return db;
}

async function productId(db: Database, name: string) {
  const menu = await getAdminMenu(db);
  return menu.flatMap((c) => c.products).find((product) => product.name === name)!;
}

// Desactivar con SQL: los servicios de activación no forman parte de la superficie del menú.
const deactivateProduct = (db: Database, id: string) =>
  db.query('UPDATE products SET active = false WHERE id = $1', [id]);
const deactivateCategory = (db: Database, id: string) =>
  db.query('UPDATE categories SET active = false WHERE id = $1', [id]);

async function categoryId(db: Database, name: string) {
  return (await getAdminMenu(db)).find((category) => category.name === name)!.id;
}

// Lo que la carga nunca debe cambiar antes de confirmar: ventas, contador, menú y cuentas.
async function snapshot(db: Database) {
  const counter = await db.query<{ last_number: number }>('SELECT last_number FROM sale_counter');
  return {
    sales: await listRegisteredSales(db),
    counter: counter.rows[0]!.last_number,
    menu: await getAdminMenu(db),
    accounts: await createAccountsService(db).list(),
  };
}

async function registerOneSale(db: Database) {
  const americano = await productId(db, 'Americano');
  const [account] = await createAccountsService(db).list();
  await db.transaction(async (tx) => {
    await insertSale(tx, {
      number: await nextSaleNumber(tx),
      draftId: '00000000-0000-4000-8000-000000000001',
      registeredAt: new Date('2026-10-27T10:00:00-04:00'),
      registeredBy: { userId: account!.id, displayName: account!.displayName, role: account!.role },
      paymentMethod: 'cash',
      lines: [
        {
          productId: americano.id,
          productName: 'Americano',
          categoryName: 'Cafés',
          unitPriceCents: americano.priceCents,
          quantity: 1,
          subtotalCents: americano.priceCents,
        },
      ],
      totalCents: americano.priceCents,
    });
  });
}

// Base cuya consulta de «ahora» devuelve `now`, para comprobar que se lee de PostgreSQL.
function withDatabaseNow(db: Database, now: Date): Database {
  const wrap = (queryable: Queryable): Queryable => ({
    ...queryable,
    query: async <Row>(sql: string, params?: unknown[]) =>
      /now\(\)/i.test(sql)
        ? { rows: [{ now } as Row], rowCount: 1 }
        : queryable.query<Row>(sql, params),
  });
  return { ...db, ...wrap(db), transaction: (work) => db.transaction((tx) => work(wrap(tx))) };
}

describe('inspección de la base para las ventas de demostración (RF-1, RF-2)', () => {
  it('devuelve el calendario del período sin cambiar nada', async () => {
    const db = await base();
    const before = await snapshot(db);
    const { calendar, now } = await inspectDemoSales(db, { seed: 7, now: NOW });
    expect(now).toEqual(NOW);
    expect([calendar.from, calendar.to]).toEqual(['2026-07-28', '2026-10-27']);
    expect(calendar.total).toBe(calendar.days.reduce((sum, day) => sum + day.salesCount, 0));
    expect(calendar.total).toBeGreaterThan(0);
    expect(await snapshot(db)).toEqual(before);
  });

  it('sin «ahora» de la prueba, toma la hora de PostgreSQL', async () => {
    const db = withDatabaseNow(await base(), new Date('2026-12-31T23:30:00-04:00'));
    const { calendar, now } = await inspectDemoSales(db, { seed: 7 });
    expect(now).toEqual(new Date('2026-12-31T23:30:00-04:00'));
    expect([calendar.from, calendar.to]).toEqual(['2026-09-30', '2026-12-30']);
  });

  it('rechaza sin cambios una base con una venta registrada, antes que el menú', async () => {
    const db = await base();
    await registerOneSale(db);
    await deactivateProduct(db, (await productId(db, 'Mocochinchi')).id);
    const before = await snapshot(db);
    await expect(inspectDemoSales(db, { seed: 7, now: NOW })).rejects.toBeInstanceOf(
      DemoSalesHasSalesError,
    );
    expect(await snapshot(db)).toEqual(before);
  });

  it('rechaza una base sin menú, con los 37 productos en el orden del menú oficial', async () => {
    const db = await base({ menu: false });
    const error = await inspectDemoSales(db, { seed: 7, now: NOW }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DemoSalesMenuError);
    expect((error as DemoSalesMenuError).missing).toEqual(officialNames);
  });

  it.each([
    [
      'con «Mocochinchi» inactivo',
      async (db: Database) => deactivateProduct(db, (await productId(db, 'Mocochinchi')).id),
      ['Mocochinchi'],
    ],
    [
      'con «Cuñapé» renombrado',
      async (db: Database) => {
        const cunape = await productId(db, 'Cuñapé');
        await saveProduct(
          db,
          { name: 'Cuñapé horneado', categoryId: cunape.categoryId, price: '4,00' },
          cunape.id,
        );
      },
      ['Cuñapé'],
    ],
    [
      'con «Brownie» en «Salados»',
      async (db: Database) => {
        const brownie = await productId(db, 'Brownie');
        await saveProduct(
          db,
          { name: 'Brownie', categoryId: await categoryId(db, 'Salados'), price: '12,00' },
          brownie.id,
        );
      },
      ['Brownie'],
    ],
    [
      'con «Repostería» inactiva',
      async (db: Database) => {
        const pastries = OFFICIAL_MENU.find((c) => c.name === 'Repostería')!.products;
        for (const { name } of pastries)
          await deactivateProduct(db, (await productId(db, name)).id);
        await deactivateCategory(db, await categoryId(db, 'Repostería'));
      },
      OFFICIAL_MENU.find((c) => c.name === 'Repostería')!.products.map((p) => p.name),
    ],
  ])('rechaza sin cambios una base %s y nombra los productos', async (_, change, missing) => {
    const db = await base();
    await change(db);
    const before = await snapshot(db);
    const error = await inspectDemoSales(db, { seed: 7, now: NOW }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DemoSalesMenuError);
    expect((error as DemoSalesMenuError).missing).toEqual(missing);
    expect(await snapshot(db)).toEqual(before);
  });

  it('rechaza una base con el menú oficial y sin cuentas, después del menú', async () => {
    await expect(
      inspectDemoSales(await base({ accounts: false }), { seed: 7, now: NOW }),
    ).rejects.toBeInstanceOf(DemoSalesNoAccountsError);
    const neither = await base({ menu: false, accounts: false });
    await expect(inspectDemoSales(neither, { seed: 7, now: NOW })).rejects.toBeInstanceOf(
      DemoSalesMenuError,
    );
  });

  it('no rechaza productos propios ni un precio cambiado', async () => {
    const db = await base();
    const own = await saveCategory(db, { name: 'Especiales' });
    await saveProduct(db, { name: 'Tostado de la casa', categoryId: own.id, price: '9,00' });
    const americano = await productId(db, 'Americano');
    await saveProduct(
      db,
      { name: 'Americano', categoryId: americano.categoryId, price: '14,00' },
      americano.id,
    );
    await expect(inspectDemoSales(db, { seed: 7, now: NOW })).resolves.toMatchObject({
      calendar: { from: '2026-07-28', to: '2026-10-27' },
    });
  });
});
