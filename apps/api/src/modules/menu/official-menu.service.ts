import type { Database } from '../../shared/database/database.ts';
import { migrate } from '../../shared/database/migrate.ts';
import { saveCategory } from './categories.service.ts';
import { OFFICIAL_MENU, type OfficialCategory } from './official-menu.data.ts';
import { saveProduct } from './products.service.ts';

export class OfficialMenuNotEmptyError extends Error {
  constructor() {
    super('La base ya tiene categorías o productos');
    this.name = 'OfficialMenuNotEmptyError';
  }
}

// Carga el menú oficial en una base nueva (SPEC-006, plan §5.1): migraciones, comprobación y alta
// en una sola transacción, así que un fallo o una cancelación dejan la base como estaba (RF-4).
export async function loadOfficialMenu(
  db: Database,
  menu: readonly OfficialCategory[] = OFFICIAL_MENU,
): Promise<{ categories: number; products: number }> {
  return db.transaction(async (tx) => {
    // Los servicios y las migraciones participan en esta transacción, como en seed-menu.ts (D-3).
    const batch: Database = { ...db, ...tx, transaction: async (work) => work(tx) };
    // Dos cargas a la vez esperan una a la otra, aun sobre una base sin tablas (D-5).
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('kofi:official-menu'))");
    // Una base recién creada se prepara dentro de la misma transacción (RF-2, D-4).
    await migrate(batch);
    // Nadie crea categorías ni productos mientras se comprueba y se carga (D-5).
    await tx.query('LOCK TABLE categories, products IN SHARE ROW EXCLUSIVE MODE');
    // Solo en una base sin menú: los inactivos también cuentan, y nada se reemplaza (RF-3).
    const existing = await tx.query<{ hasMenu: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM categories) OR EXISTS (SELECT 1 FROM products) AS "hasMenu"`,
    );
    if (existing.rows[0]!.hasMenu) throw new OfficialMenuNotEmptyError();
    let products = 0;
    for (const category of menu) {
      const saved = await saveCategory(batch, { name: category.name });
      for (const product of category.products) {
        await saveProduct(batch, { ...product, categoryId: saved.id });
        products++;
      }
    }
    return { categories: menu.length, products };
  });
}
