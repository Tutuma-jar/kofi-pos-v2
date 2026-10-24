import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from '../config/env.ts';
import { createPgDatabase, type Database } from './database.ts';

// Aplica en orden las migraciones pendientes (NNN_<nombre>.sql) y las registra en schema_migrations.
// Cada migración es atómica: si falla, se deshace y no se registra (principio 5).

export const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');
const MIGRATION_FILE = /^\d{3}_[a-z0-9_]+\.sql$/;

export async function migrate(db: Database, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const applied = new Set(
    (await db.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
      (r) => r.name,
    ),
  );
  const pending = readdirSync(dir)
    .filter((file) => MIGRATION_FILE.test(file) && !applied.has(file))
    .sort();

  for (const file of pending) {
    const sql = readFileSync(join(dir, file), 'utf8');
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
  }
  return pending;
}

// npm run migrate -w @kofi/api: aplica las migraciones contra la base de DATABASE_URL.
if (import.meta.main) {
  const db = createPgDatabase(loadEnv().DATABASE_URL);
  try {
    const applied = await migrate(db);
    console.log(
      applied.length
        ? `Migraciones aplicadas: ${applied.join(', ')}`
        : 'No hay migraciones pendientes.',
    );
  } finally {
    await db.close();
  }
}
