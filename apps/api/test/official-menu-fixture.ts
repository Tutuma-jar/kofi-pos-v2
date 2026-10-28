import { OFFICIAL_MENU, saveCategory, saveProduct } from '../src/modules/menu/index.ts';
import type { Database } from '../src/shared/database/database.ts';

// Menú oficial para las pruebas de SPEC-007 (plan §8.1), sin depender de la carga de SPEC-006.
// Usa los servicios del módulo menu en una única transacción, como seedMenu.
export async function loadOfficialMenuFixture(db: Database): Promise<void> {
  await db.transaction(async (tx) => {
    const batch: Database = { ...db, ...tx, transaction: async (work) => work(tx) };
    for (const { name, products } of OFFICIAL_MENU) {
      const category = await saveCategory(batch, { name });
      for (const product of products)
        await saveProduct(batch, { ...product, categoryId: category.id });
    }
  });
}
