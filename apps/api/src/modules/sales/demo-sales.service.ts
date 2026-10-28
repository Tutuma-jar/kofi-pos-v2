import { menuNameKey } from '@kofi/contracts';
import { createAccountsService } from '../auth/index.ts';
import { getAdminMenu, OFFICIAL_MENU } from '../menu/index.ts';
import type { Database, Queryable } from '../../shared/database/database.ts';
import { migrate } from '../../shared/database/migrate.ts';
import { demoPeriod, planDemoCalendar, type DemoCalendar } from './demo-sales.calendar.ts';
import { generateDemoSales } from './demo-sales.generator.ts';
import type { DemoAccount, DemoProduct } from './demo-sales.rules.ts';
import { insertSalesBatch, reserveSaleNumbers } from './sales.repository.ts';

const BATCH_SIZE = 250; // ventas por sentencia de inserción (D-10)

// Inspección y carga de las ventas de demostración (SPEC-007, RF-1 a RF-3, RF-8 a RF-10;
// plan §5.4, §5.5, D-2, D-3).

export class DemoSalesHasSalesError extends Error {
  constructor() {
    super('La base ya tiene ventas registradas');
    this.name = 'DemoSalesHasSalesError';
  }
}

export class DemoSalesMenuError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super('La base no tiene el menú oficial completo y activo');
    this.name = 'DemoSalesMenuError';
    this.missing = missing;
  }
}

export class DemoSalesNoAccountsError extends Error {
  constructor() {
    super('La base no tiene cuentas de dueño ni de cajero');
    this.name = 'DemoSalesNoAccountsError';
  }
}

export interface DemoSalesInspection {
  calendar: DemoCalendar;
  now: Date;
}

// Los servicios de otros módulos participan en la transacción, como en seed-menu.ts.
const batchOf = (db: Database, tx: Queryable): Database => ({
  ...db,
  ...tx,
  transaction: async (work) => work(tx),
});

// Comprueba la base en el orden de RF-2 y devuelve los productos oficiales y las cuentas vigentes.
export async function checkBase(
  tx: Database,
): Promise<{ products: DemoProduct[]; accounts: DemoAccount[] }> {
  const sales = await tx.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM sales) AS exists',
  );
  if (sales.rows[0]!.exists) throw new DemoSalesHasSalesError();

  const menu = await getAdminMenu(tx);
  const products: DemoProduct[] = [];
  const missing: string[] = [];
  for (const official of OFFICIAL_MENU) {
    const category = menu.find((c) => menuNameKey(c.name) === menuNameKey(official.name));
    for (const { name } of official.products) {
      const product = menu
        .flatMap((c) => c.products)
        .find((p) => menuNameKey(p.name) === menuNameKey(name));
      if (!product?.active || !category?.active || product.categoryId !== category.id)
        missing.push(name);
      else
        products.push({
          id: product.id,
          name: product.name,
          categoryName: category.name,
          priceCents: product.priceCents,
        });
    }
  }
  if (missing.length > 0) throw new DemoSalesMenuError(missing);

  const accounts = (await createAccountsService(tx).list()).map(({ id, displayName, role }) => ({
    id,
    displayName,
    role,
  }));
  if (accounts.length === 0) throw new DemoSalesNoAccountsError();
  return { products, accounts };
}

// Señal para deshacer la inspección: la transacción termina siempre con ROLLBACK (D-2).
class InspectionDone {
  readonly result: DemoSalesInspection;
  constructor(result: DemoSalesInspection) {
    this.result = result;
  }
}

export async function inspectDemoSales(
  db: Database,
  { seed, now }: { seed: number; now?: Date },
): Promise<DemoSalesInspection> {
  try {
    await db.transaction(async (tx) => {
      const batch = batchOf(db, tx);
      // «Ahora» sale de PostgreSQL, no del reloj de la computadora (RF-1, D-3).
      const current = now ?? (await tx.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
      await migrate(batch);
      await checkBase(batch);
      throw new InspectionDone({
        calendar: planDemoCalendar(demoPeriod(new Date(current)), seed),
        now: new Date(current),
      });
    });
  } catch (error) {
    if (error instanceof InspectionDone) return error.result;
    throw error;
  }
  throw new Error('La inspección no terminó');
}

export interface DemoSalesLoad {
  count: number;
  from: string;
  to: string;
}

// Carga confirmada (RF-3): vuelve a comprobar la base y carga todo o nada en una transacción. El
// contador de ventas queda bloqueado hasta el final, así que otra carga o «Nueva venta» esperan:
// si llegaron antes, la comprobación las ve y rechaza; si llegan después, siguen la numeración
// (RF-8, RF-10).
export async function loadDemoSales(
  db: Database,
  { seed, now }: { seed: number; now: Date },
): Promise<DemoSalesLoad> {
  return db.transaction(async (tx) => {
    const batch = batchOf(db, tx);
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('kofi:demo-sales'))");
    await migrate(batch);
    await tx.query('SELECT last_number FROM sale_counter FOR UPDATE');
    const { products, accounts } = await checkBase(batch);
    const calendar = planDemoCalendar(demoPeriod(now), seed);
    const firstNumber = await reserveSaleNumbers(tx, calendar.total);
    const sales = generateDemoSales({ calendar, seed, products, accounts, firstNumber });
    for (let start = 0; start < sales.length; start += BATCH_SIZE)
      await insertSalesBatch(tx, sales.slice(start, start + BATCH_SIZE));
    return { count: calendar.total, from: calendar.from, to: calendar.to };
  });
}
