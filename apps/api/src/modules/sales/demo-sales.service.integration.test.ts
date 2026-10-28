import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { TEST_ACCOUNTS } from '../../../../../e2e/fixtures.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { loadOfficialMenuFixture } from '../../../test/official-menu-fixture.ts';
import { createAccountsService } from '../auth/index.ts';
import {
  getAdminMenu,
  getCurrentMenu,
  OFFICIAL_MENU,
  saveCategory,
  saveProduct,
} from '../menu/index.ts';
import { createFakeClock } from '../../shared/clock.ts';
import type { Database, Queryable } from '../../shared/database/database.ts';
import {
  DemoSalesHasSalesError,
  DemoSalesMenuError,
  DemoSalesNoAccountsError,
  inspectDemoSales,
  loadDemoSales,
} from './demo-sales.service.ts';
import { insertSale, listRegisteredSales, nextSaleNumber } from './sales.repository.ts';
import { createSalesService } from './sales.service.ts';

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

// Registra una venta como «Nueva venta», con el servicio de ventas y una cuenta de cajero.
async function registerFromCounter(db: Database) {
  const cashier = (await createAccountsService(db).list()).find((a) => a.role === 'cashier')!;
  const americano = await productId(db, 'Americano');
  const service = createSalesService({
    db,
    clock: createFakeClock(new Date('2026-10-28T11:05:00-04:00')),
    currentMenu: getCurrentMenu,
  });
  return service.register(
    {
      draftId: randomUUID(),
      paymentMethod: 'qr',
      lines: [
        {
          productId: americano.id,
          productName: 'Americano',
          quantity: 1,
          unitPriceCents: americano.priceCents,
        },
      ],
    },
    cashier,
  );
}

// Base que registra cada sentencia de las transacciones y puede fallar en una de ellas.
function recording(db: Database, failOn?: (sql: string, count: number) => boolean) {
  const statements: string[] = [];
  const wrap = (queryable: Queryable): Queryable => ({
    query: async <Row>(sql: string, params?: unknown[]) => {
      statements.push(sql);
      if (failOn?.(sql, statements.filter((s) => s === sql).length))
        throw new Error('Se cortó la conexión');
      return queryable.query<Row>(sql, params);
    },
    exec: async (sql: string) => {
      statements.push(sql);
      return queryable.exec(sql);
    },
  });
  return {
    statements,
    db: { ...db, transaction: (work) => db.transaction((tx) => work(wrap(tx))) } as Database,
  };
}

describe('carga de las ventas de demostración (RF-3, RF-5, RF-7 a RF-10, RNF-2)', () => {
  it('carga las ventas anunciadas con el menú y las cuentas vigentes, sin cambiarlos', async () => {
    const db = await base();
    const { calendar } = await inspectDemoSales(db, { seed: 7, now: NOW });
    const before = await snapshot(db);
    const result = await loadDemoSales(db, { seed: 7, now: NOW });
    expect(result).toEqual({ count: calendar.total, from: '2026-07-28', to: '2026-10-27' });
    const after = await snapshot(db);
    expect(after.counter).toBe(calendar.total);
    expect(after.sales).toHaveLength(calendar.total);
    expect(after.menu).toEqual(before.menu);
    expect(after.accounts).toEqual(before.accounts);
    const prices = new Map(before.menu.flatMap((c) => c.products.map((p) => [p.id, p])));
    const categories = new Map(before.menu.map((c) => [c.id, c.name]));
    for (const sale of after.sales) {
      const account = before.accounts.find((a) => a.id === sale.registeredBy.userId)!;
      expect([sale.registeredBy.displayName, sale.registeredBy.role]).toEqual([
        account.displayName,
        account.role,
      ]);
      for (const line of sale.lines) {
        const product = prices.get(line.productId)!;
        expect([line.productName, line.categoryName, line.unitPriceCents]).toEqual([
          product.name,
          categories.get(product.categoryId),
          product.priceCents,
        ]);
        expect(line.subtotalCents).toBe(line.unitPriceCents * line.quantity);
      }
      expect(sale.totalCents).toBe(sale.lines.reduce((sum, line) => sum + line.subtotalCents, 0));
    }
  }, 60_000);

  it('deja que la siguiente venta de «Nueva venta» tome el número siguiente', async () => {
    const db = await base();
    const { count } = await loadDemoSales(db, { seed: 7, now: NOW });
    const { sale } = await registerFromCounter(db);
    expect(sale.number).toBe(count + 1);
  }, 60_000);

  it('vuelve a comprobar al cargar: rechaza una venta o un producto desactivado nuevos', async () => {
    const withSale = await base();
    await inspectDemoSales(withSale, { seed: 7, now: NOW });
    await registerOneSale(withSale);
    const beforeSale = await snapshot(withSale);
    await expect(loadDemoSales(withSale, { seed: 7, now: NOW })).rejects.toBeInstanceOf(
      DemoSalesHasSalesError,
    );
    expect(await snapshot(withSale)).toEqual(beforeSale);

    const inactive = await base();
    await inspectDemoSales(inactive, { seed: 7, now: NOW });
    await deactivateProduct(inactive, (await productId(inactive, 'Mocochinchi')).id);
    const beforeMenu = await snapshot(inactive);
    await expect(loadDemoSales(inactive, { seed: 7, now: NOW })).rejects.toBeInstanceOf(
      DemoSalesMenuError,
    );
    expect(await snapshot(inactive)).toEqual(beforeMenu);
  });

  it('carga con el precio cambiado después de la inspección', async () => {
    const db = await base();
    await inspectDemoSales(db, { seed: 7, now: NOW });
    const americano = await productId(db, 'Americano');
    await saveProduct(
      db,
      { name: 'Americano', categoryId: americano.categoryId, price: '14,00' },
      americano.id,
    );
    await loadDemoSales(db, { seed: 7, now: NOW });
    const lines = (await listRegisteredSales(db))
      .flatMap((sale) => sale.lines)
      .filter((line) => line.productName === 'Americano');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.unitPriceCents === 1400)).toBe(true);
  }, 60_000);

  it('si falla un lote intermedio, no deja ventas y el contador sigue en 0', async () => {
    const db = await base();
    const before = await snapshot(db);
    const failing = recording(
      db,
      (sql, count) => sql.includes('jsonb_array_elements') && count === 2,
    );
    await expect(loadDemoSales(failing.db, { seed: 7, now: NOW })).rejects.toThrow(
      'Se cortó la conexión',
    );
    expect(await snapshot(db)).toEqual(before);
  }, 60_000);

  it('con dos cargas a la vez, completa una y rechaza la otra', async () => {
    const db = await base();
    const results = await Promise.allSettled([
      loadDemoSales(db, { seed: 7, now: NOW }),
      loadDemoSales(db, { seed: 8, now: NOW }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DemoSalesHasSalesError);
    const { count } = (fulfilled[0] as PromiseFulfilledResult<{ count: number }>).value;
    expect(await listRegisteredSales(db)).toHaveLength(count);
  }, 60_000);

  it('con una carga y una venta de «Nueva venta» a la vez, completa solo una de las dos', async () => {
    const db = await base();
    const [load, sale] = await Promise.allSettled([
      loadDemoSales(db, { seed: 7, now: NOW }),
      registerFromCounter(db),
    ]);
    expect(sale.status).toBe('fulfilled');
    const registered = (sale as PromiseFulfilledResult<{ sale: { number: number } }>).value.sale;
    const sales = await listRegisteredSales(db);
    if (load.status === 'rejected') {
      expect(load.reason).toBeInstanceOf(DemoSalesHasSalesError);
      expect(sales).toHaveLength(1);
      expect(registered.number).toBe(1);
    } else {
      expect(registered.number).toBe(load.value.count + 1);
      expect(sales).toHaveLength(load.value.count + 1);
    }
  }, 60_000);

  it('bloquea antes de migrar y bloquea el contador antes de comprobar las ventas', async () => {
    const db = await base();
    const traced = recording(db);
    await loadDemoSales(traced.db, { seed: 7, now: NOW });
    const index = (match: (sql: string) => boolean) => traced.statements.findIndex(match);
    const lock = index((sql) => sql.includes('pg_advisory_xact_lock'));
    const migration = index((sql) => sql.includes('schema_migrations'));
    const counter = index((sql) => /sale_counter\s+FOR UPDATE/i.test(sql));
    const check = index((sql) => sql.includes('SELECT EXISTS (SELECT 1 FROM sales)'));
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(lock).toBeLessThan(migration);
    expect(migration).toBeLessThan(counter);
    expect(counter).toBeLessThan(check);
  }, 60_000);
});
