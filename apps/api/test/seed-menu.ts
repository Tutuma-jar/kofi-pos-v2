import { menuNameKey } from '@kofi/contracts';
import { getAdminMenu, saveCategory, saveProduct } from '../src/modules/menu/index.ts';
import { createPgDatabase, type Database } from '../src/shared/database/database.ts';
import { loadEnv } from '../src/shared/config/env.ts';
import { migrate } from '../src/shared/database/migrate.ts';

const existingProducts = 'La base ya tiene productos. No se cargó el menú de prueba';

// Datos ficticios para RNF-3: toda la carga usa los servicios y una única transacción.
export async function seedMenu(db: Database): Promise<number> {
  return db.transaction(async (tx) => {
    const categories = await getAdminMenu(tx);
    if (categories.some((category) => category.products.length)) throw new Error(existingProducts);
    const usedNames = new Set(categories.map((category) => menuNameKey(category.name)));
    let name = 'Pruebas de rendimiento';
    for (let suffix = 2; usedNames.has(menuNameKey(name)); suffix++)
      name = `Pruebas de rendimiento ${suffix}`;
    // Los servicios participan en esta transacción, en lugar de abrir transacciones anidadas.
    const batch: Database = { ...db, ...tx, transaction: async (work) => work(tx) };
    const category = await saveCategory(batch, { name });
    for (let index = 1; index <= 200; index++)
      await saveProduct(batch, {
        name: `Producto de prueba ${String(index).padStart(3, '0')}`,
        categoryId: category.id,
        price: '10,00',
      });
    return 200;
  });
}

if (import.meta.main) {
  void (async () => {
    const db = createPgDatabase(loadEnv().DATABASE_URL);
    try {
      await migrate(db);
      const count = await seedMenu(db);
      console.log(`Menú de prueba cargado: ${count} productos`);
    } finally {
      await db.close();
    }
  })().catch((error: unknown) => {
    // Nunca imprimir configuración, cadenas de conexión ni errores internos con credenciales.
    console.error(
      error instanceof Error && error.message === existingProducts
        ? existingProducts
        : 'No se pudo cargar el menú de prueba. Comprueba la configuración y la conexión a la base',
    );
    process.exitCode = 1;
  });
}
