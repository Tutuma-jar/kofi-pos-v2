import { loadEnv } from '../../shared/config/env.ts';
import { createPgDatabase, type Database } from '../../shared/database/database.ts';
import { loadOfficialMenu, OfficialMenuNotEmptyError } from './official-menu.service.ts';

// Mensajes de la carga (SPEC-006, RF-2 a RF-4). Solo se muestran en la terminal (plan §6).
const messages = {
  loaded: (categories: number, products: number) =>
    `Menú oficial cargado: ${categories} categorías y ${products} productos`,
  notEmpty:
    'La base ya tiene categorías o productos. El menú oficial solo se carga en una base nueva',
  failed: 'No se pudo cargar el menú oficial. Comprueba la configuración y la conexión a la base',
};

export interface OfficialMenuLoadDeps {
  env: Record<string, string | undefined>;
  createDatabase: (url: string) => Database;
  write: (message: string) => void;
}

// Devuelve el código de salida. Nunca muestra el error original: los de pg y de loadEnv pueden
// incluir la dirección de la base (RF-4, D-7).
export async function runOfficialMenuLoad({
  env,
  createDatabase,
  write,
}: OfficialMenuLoadDeps): Promise<number> {
  let db: Database;
  try {
    db = createDatabase(loadEnv(env).DATABASE_URL);
  } catch {
    write(messages.failed);
    return 1;
  }
  try {
    const { categories, products } = await loadOfficialMenu(db);
    write(messages.loaded(categories, products));
    return 0;
  } catch (error) {
    write(error instanceof OfficialMenuNotEmptyError ? messages.notEmpty : messages.failed);
    return 1;
  } finally {
    await db.close().catch(() => {});
  }
}

// npm run load:menu -w @kofi/api: carga el menú oficial en la base de DATABASE_URL (D-1).
if (import.meta.main) {
  process.exitCode = await runOfficialMenuLoad({
    env: process.env,
    createDatabase: createPgDatabase,
    write: (message) => process.stdout.write(`${message}\n`),
  });
}
