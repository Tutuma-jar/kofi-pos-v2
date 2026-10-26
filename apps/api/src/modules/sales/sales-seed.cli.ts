import { randomUUID } from 'node:crypto';
import { createAccountsService } from '../auth/index.ts';
import { getCurrentMenu } from '../menu/index.ts';
import { systemClock, type Clock } from '../../shared/clock.ts';
import { boliviaMonthRange, startOfBoliviaDay } from '../../shared/calendar.ts';
import { createPgDatabase, type Database } from '../../shared/database/database.ts';
import { loadEnv } from '../../shared/config/env.ts';
import { migrate } from '../../shared/database/migrate.ts';
import { insertSale, nextSaleNumber, listRegisteredSales } from './sales.repository.ts';

const messages = {
  production: 'No se cargan ventas de prueba en producción',
  existing: 'La base ya tiene ventas. Usa una base de comprobación nueva',
  products:
    'Se necesitan 200 productos vigentes. Carga primero seed:menu en una base de comprobación nueva',
  account: 'Crea primero una cuenta de prueba con accounts',
  productsComplete: 'Se necesitan al menos 200 productos vigentes para completar la carga',
  tooMany: 'El mes ya supera las 6000 ventas. No se modifica la base',
  usage: 'Uso: npm run seed:sales -w @kofi/api -- [--complete]',
} as const;
function allowSeed() {
  if (process.env.NODE_ENV === 'production') throw new Error(messages.production);
}

// Solo para RNF-3: toda la carga, incluido el contador, se confirma o se revierte junta.
export async function seedSales(
  db: Database,
  clock: Clock = systemClock,
  options: { complete?: boolean; onProgress?: (prepared: number, total: number) => void } = {},
) {
  allowSeed();
  const now = clock.now();
  const { days, from, to } = boliviaMonthRange(now);
  return db.transaction(async (tx) => {
    // Serializar dos intentos de carga antes de comprobar si existen ventas.
    await tx.query('SELECT id FROM sale_counter FOR UPDATE');
    const existing = await listRegisteredSales(tx);
    if (!options.complete && existing.length > 0) throw new Error(messages.existing);
    const currentCount = options.complete
      ? existing.filter((sale) => {
          const instant = new Date(sale.registeredAt).getTime();
          return instant >= from.getTime() && instant < to.getTime();
        }).length
      : 0;
    if (currentCount > 6000) throw new Error(messages.tooMany);
    const count = 6000 - currentCount;
    if (count === 0) return { salesCount: 0, totalCents: 0 };
    const batch: Database = { ...db, ...tx, transaction: async (work) => work(tx) };
    const products = (await getCurrentMenu(batch)).flatMap((category) =>
      category.products.map((product) => ({ ...product, categoryName: category.name })),
    );
    if (options.complete ? products.length < 200 : products.length !== 200)
      throw new Error(options.complete ? messages.productsComplete : messages.products);
    const accounts = await createAccountsService(batch).list();
    const account = accounts.find((user) => user.role === 'cashier') ?? accounts[0];
    if (!account) throw new Error(messages.account);
    let totalCents = 0;
    for (let index = 0; index < count; index++) {
      const product = products[index % products.length]!;
      const quantity = (index % 3) + 1;
      const subtotalCents = quantity * product.priceCents;
      const date = days[Math.floor((index * days.length) / count)]!;
      const registeredAt = new Date(
        Math.min(startOfBoliviaDay(date).getTime() + 8 * 3600000, now.getTime()),
      );
      await insertSale(tx, {
        number: await nextSaleNumber(tx),
        draftId: randomUUID(),
        registeredAt,
        registeredBy: { userId: account.id, displayName: account.displayName, role: account.role },
        paymentMethod: index % 2 === 0 ? 'cash' : 'qr',
        lines: [
          {
            productId: product.id,
            productName: product.name,
            categoryName: product.categoryName,
            unitPriceCents: product.priceCents,
            quantity,
            subtotalCents,
          },
        ],
        totalCents: subtotalCents,
      });
      totalCents += subtotalCents;
      if ((index + 1) % 250 === 0 || index + 1 === count) options.onProgress?.(index + 1, count);
    }
    return { salesCount: count, totalCents };
  });
}

if (import.meta.main) {
  void (async () => {
    allowSeed();
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--complete'))
      throw new Error(messages.usage);
    const db = createPgDatabase(loadEnv().DATABASE_URL);
    try {
      await migrate(db);
      const { salesCount } = await seedSales(db, systemClock, {
        complete: args[0] === '--complete',
        onProgress: (prepared, total) =>
          console.log(
            `Ventas preparadas: ${prepared}/${total}; pendientes de confirmar la transacción`,
          ),
      });
      console.log(`Ventas de prueba cargadas: ${salesCount}`);
    } finally {
      await db.close();
    }
  })().catch((error: unknown) => {
    const known =
      error instanceof Error &&
      Object.values(messages).some((message) => message === error.message);
    console.error(
      known
        ? (error as Error).message
        : 'No se pudieron cargar las ventas de prueba. Comprueba la configuración y la conexión a la base',
    );
    process.exitCode = 1;
  });
}
