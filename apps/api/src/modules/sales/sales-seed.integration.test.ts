import { afterEach, describe, expect, it, vi } from 'vitest';
import { saleSchema } from '@kofi/contracts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { seedMenu } from '../../../test/seed-menu.ts';
import { createAccountsService } from '../auth/index.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { boliviaDate, boliviaMonthRange } from '../../shared/calendar.ts';
import type { Database } from '../../shared/database/database.ts';
import { seedSales, parseSalesSeedArgs } from './sales-seed.cli.ts';
import { listRegisteredSales, insertSale, nextSaleNumber } from './sales.repository.ts';
import { getCurrentMenu, saveProduct } from '../menu/index.ts';
import { randomUUID } from 'node:crypto';

afterEach(() => vi.unstubAllEnvs());
const clock = createFakeClock(new Date('2026-10-24T15:00:00.000Z'));
async function fixture() {
  const db = await createTestDatabase();
  await seedMenu(db);
  await createAccountsService(db).create({
    username: 'cajero',
    displayName: 'Cajero de prueba',
    role: 'cashier',
    password: 'solo prueba de carga',
  });
  return db;
}
describe('carga de ventas ficticias (T021, RNF-3)', () => {
  it('prepara un mes pasado con 6000 ventas válidas y exactamente 400 en el día elegido (SPEC-005 T027)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await fixture();
    try {
      expect(
        (await seedSales(db, clock, { complete: true, historyDay: '2026-09-15' })).salesCount,
      ).toBe(6000);
      const sales = await listRegisteredSales(db);
      expect(sales).toHaveLength(6000);
      for (const sale of sales) {
        expect(saleSchema.safeParse(sale).success).toBe(true);
        expect(boliviaDate(new Date(sale.registeredAt)).startsWith('2026-09')).toBe(true);
      }
      expect(
        sales.filter((sale) => boliviaDate(new Date(sale.registeredAt)) === '2026-09-15'),
      ).toHaveLength(400);
      expect(new Set(sales.map((sale) => boliviaDate(new Date(sale.registeredAt)))).size).toBe(30);
      expect(await seedSales(db, clock, { complete: true, historyDay: '2026-09-15' })).toEqual({
        salesCount: 0,
        totalCents: 0,
      });
      await expect(
        seedSales(db, clock, { complete: true, historyDay: '2026-09-16' }),
      ).rejects.toThrow('No se puede completar el día con 400 ventas sin superar 6000 en el mes');
      expect(await listRegisteredSales(db)).toEqual(sales);
    } finally {
      await db.close();
    }
  }, 120000);
  it('completa el día y el mes contando ventas previas sin modificarlas (SPEC-005 T027)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await fixture();
    try {
      const menu = await getCurrentMenu(db);
      const product = menu[0]!.products[0]!;
      const account = (await createAccountsService(db).list())[0]!;
      for (const registeredAt of ['2026-09-15T14:00:00Z', '2026-10-24T14:00:00Z'])
        await db.transaction(async (tx) =>
          insertSale(tx, {
            number: await nextSaleNumber(tx),
            draftId: randomUUID(),
            registeredAt: new Date(registeredAt),
            registeredBy: {
              userId: account.id,
              displayName: account.displayName,
              role: account.role,
            },
            paymentMethod: 'cash',
            totalCents: 1000,
            lines: [
              {
                productId: product.id,
                productName: product.name,
                categoryName: menu[0]!.name,
                unitPriceCents: 1000,
                quantity: 1,
                subtotalCents: 1000,
              },
            ],
          }),
        );
      const before = await listRegisteredSales(db);
      expect(
        (await seedSales(db, clock, { complete: true, historyDay: '2026-09-15' })).salesCount,
      ).toBe(5999);
      const after = await listRegisteredSales(db);
      expect(after).toHaveLength(6001);
      expect(after.slice(0, 2)).toEqual(before);
      expect(
        after.filter((sale) => boliviaDate(new Date(sale.registeredAt)) === '2026-09-15'),
      ).toHaveLength(400);
      expect(await getCurrentMenu(db)).toEqual(menu);
    } finally {
      await db.close();
    }
  }, 120000);
  it.each(['2026-02-30', '2026-10-25', '0000-01-01'])(
    'rechaza el día %s antes de consultar (SPEC-005 T027)',
    async (historyDay) => {
      const db = await createTestDatabase();
      try {
        const transaction = vi.spyOn(db, 'transaction');
        await expect(seedSales(db, clock, { complete: true, historyDay })).rejects.toThrow(
          'El día de comprobación debe ser válido y no futuro',
        );
        expect(transaction).not.toHaveBeenCalled();
      } finally {
        await db.close();
      }
    },
  );
  it('completa el mes conservando productos y ventas previas; repetir no escribe (T028)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await fixture();
    try {
      const menu = await getCurrentMenu(db);
      await saveProduct(db, {
        categoryId: menu[0]!.id,
        name: 'Producto adicional 201',
        price: '12,00',
      });
      await saveProduct(db, {
        categoryId: menu[0]!.id,
        name: 'Producto adicional 202',
        price: '15,00',
      });
      await seedSales(db, clock, { complete: true });
      const base = await listRegisteredSales(db);
      // Las ventas de octubre no cuentan en el nuevo mes; se preservan igualmente.
      const november = createFakeClock(new Date('2026-11-02T15:00:00Z'));
      const account = (await createAccountsService(db).list())[0]!;
      const product = menu[0]!.products[0]!;
      await db.transaction(async (tx) =>
        insertSale(tx, {
          number: await nextSaleNumber(tx),
          draftId: randomUUID(),
          registeredAt: new Date('2026-11-01T15:00:00Z'),
          registeredBy: {
            userId: account.id,
            displayName: account.displayName,
            role: account.role,
          },
          paymentMethod: 'cash',
          totalCents: 1000,
          lines: [
            {
              productId: product.id,
              productName: product.name,
              categoryName: menu[0]!.name,
              unitPriceCents: 1000,
              quantity: 1,
              subtotalCents: 1000,
            },
          ],
        }),
      );
      const before = await listRegisteredSales(db);
      const productsBefore = await getCurrentMenu(db);
      const result = await seedSales(db, november, { complete: true });
      expect(result.salesCount).toBe(5999);
      const after = await listRegisteredSales(db);
      expect(after).toHaveLength(12000);
      expect(after.slice(0, before.length)).toEqual(before);
      expect(after.slice(0, base.length)).toEqual(base);
      expect(after.map((sale) => sale.number)).toEqual(
        Array.from({ length: 12000 }, (_, index) => index + 1),
      );
      expect(
        after.filter((sale) => boliviaDate(new Date(sale.registeredAt)).startsWith('2026-11')),
      ).toHaveLength(6000);
      expect(await getCurrentMenu(db)).toEqual(productsBefore);
      expect(productsBefore.flatMap((category) => category.products)).toHaveLength(202);
      expect(await seedSales(db, november, { complete: true })).toEqual({
        salesCount: 0,
        totalCents: 0,
      });
      expect(await listRegisteredSales(db)).toEqual(after);
      await expect(seedSales(db, november)).rejects.toThrow('La base ya tiene ventas');
      const future = createFakeClock(new Date('2026-10-31T15:00:00Z'));
      // Una venta adicional en el mes con 6000 impide la carga sin tocar los datos.
      await db.transaction(async (tx) =>
        insertSale(tx, {
          number: await nextSaleNumber(tx),
          draftId: randomUUID(),
          registeredAt: clock.now(),
          registeredBy: {
            userId: account.id,
            displayName: account.displayName,
            role: account.role,
          },
          paymentMethod: 'qr',
          totalCents: 1000,
          lines: [
            {
              productId: product.id,
              productName: product.name,
              categoryName: menu[0]!.name,
              unitPriceCents: 1000,
              quantity: 1,
              subtotalCents: 1000,
            },
          ],
        }),
      );
      await expect(seedSales(db, future, { complete: true })).rejects.toThrow(
        'El mes ya supera las 6000 ventas',
      );
    } finally {
      await db.close();
    }
  }, 120000);
  it('carga 6000 ventas válidas, por todos los días hasta hoy, con números y sumas exactas; impide duplicar', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await fixture();
    try {
      expect(await seedSales(db, clock)).toEqual({ salesCount: 6000, totalCents: 12000000 });
      const sales = await listRegisteredSales(db);
      expect(sales).toHaveLength(6000);
      for (const [i, sale] of sales.entries()) {
        expect(saleSchema.safeParse(sale).success).toBe(true);
        expect(sale.number).toBe(i + 1);
        expect(new Date(sale.registeredAt).getTime()).toBeLessThanOrEqual(clock.now().getTime());
      }
      expect([...new Set(sales.map((sale) => boliviaDate(new Date(sale.registeredAt))))]).toEqual(
        boliviaMonthRange(clock.now()).days,
      );
      expect(sales.reduce((sum, sale) => sum + sale.totalCents, 0)).toBe(12000000);
      expect(sales.filter((sale) => sale.paymentMethod === 'cash')).toHaveLength(3000);
      expect(new Set(sales.flatMap((sale) => sale.lines.map((line) => line.productId))).size).toBe(
        200,
      );
      await expect(seedSales(db, clock)).rejects.toThrow('La base ya tiene ventas');
      expect(await listRegisteredSales(db)).toEqual(sales);
    } finally {
      await db.close();
    }
  }, 120000);
  it('en producción se niega antes de consultar o escribir', async () => {
    const db = await createTestDatabase();
    try {
      vi.stubEnv('NODE_ENV', 'production');
      const transaction = vi.spyOn(db, 'transaction');
      const query = vi.spyOn(db, 'query');
      await expect(seedSales(db, clock)).rejects.toThrow(
        'No se cargan ventas de prueba en producción',
      );
      await expect(seedSales(db, clock, { complete: true })).rejects.toThrow(
        'No se cargan ventas de prueba en producción',
      );
      await expect(
        seedSales(db, clock, { complete: true, historyDay: '2026-09-15' }),
      ).rejects.toThrow('No se cargan ventas de prueba en producción');
      expect(transaction).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      expect(await listRegisteredSales(db)).toEqual([]);
    } finally {
      await db.close();
    }
  });
  it('revierte ventas, líneas y contador si una inserción intermedia falla', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await fixture();
    try {
      let lines = 0;
      const failing: Database = {
        ...db,
        transaction: (work) =>
          db.transaction((tx) =>
            work({
              ...tx,
              async query<Row>(sql: string, params?: unknown[]) {
                if (sql.includes('INSERT INTO sale_lines') && ++lines === 20)
                  throw new Error('fallo ficticio');
                return tx.query<Row>(sql, params);
              },
            }),
          ),
      };
      await expect(seedSales(failing, clock)).rejects.toThrow('fallo ficticio');
      expect(await listRegisteredSales(db)).toEqual([]);
      expect(
        (await db.query<{ last_number: number }>('SELECT last_number FROM sale_counter')).rows[0]!
          .last_number,
      ).toBe(0);
    } finally {
      await db.close();
    }
  });
  it('rechaza una base sin los 200 productos de comprobación', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const db = await createTestDatabase();
    try {
      await expect(seedSales(db, clock)).rejects.toThrow('Se necesitan 200 productos vigentes');
      expect(await listRegisteredSales(db)).toEqual([]);
    } finally {
      await db.close();
    }
  });
});

it('acepta solo las opciones documentadas del cargador (SPEC-005 T027)', () => {
  expect(parseSalesSeedArgs(['--complete', '--history-day', '2026-09-15'])).toEqual({
    complete: true,
    historyDay: '2026-09-15',
  });
  expect(parseSalesSeedArgs(['--history-day', '2026-09-15', '--complete'])).toEqual({
    complete: true,
    historyDay: '2026-09-15',
  });
  expect(parseSalesSeedArgs([])).toEqual({});
  for (const args of [
    ['--history-day'],
    ['--complete', '--complete'],
    ['--history-day', '2026-09-15', '--history-day', '2026-09-16'],
    ['otro'],
    ['--history-day', '--complete'],
  ])
    expect(() => parseSalesSeedArgs(args)).toThrow('Uso:');
});
