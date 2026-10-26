import { afterEach, describe, expect, it, vi } from 'vitest';
import { saleSchema } from '@kofi/contracts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { seedMenu } from '../../../test/seed-menu.ts';
import { createAccountsService } from '../auth/index.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { boliviaDate, boliviaMonthRange } from '../../shared/calendar.ts';
import type { Database } from '../../shared/database/database.ts';
import { seedSales } from './sales-seed.cli.ts';
import { listRegisteredSales } from './sales.repository.ts';

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
