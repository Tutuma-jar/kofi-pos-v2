import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { Database, Queryable } from '../src/shared/database/database.ts';

// Adaptador de PGlite (PostgreSQL en memoria, D-7) para las pruebas y la API de E2E.

function pgliteQueryable(client: PGlite | Transaction): Queryable {
  return {
    async query<Row>(sql: string, params: unknown[] = []) {
      const result = await client.query<Row>(sql, params);
      // Como pg: en una sentencia que devuelve filas, rowCount es la cantidad de filas.
      const rowCount = result.fields.length > 0 ? result.rows.length : (result.affectedRows ?? 0);
      return { rows: result.rows, rowCount };
    },
    async exec(sql) {
      await client.exec(sql);
    },
  };
}

export function createPgliteDatabase(pglite: PGlite): Database {
  return {
    ...pgliteQueryable(pglite),
    transaction: (work) => pglite.transaction((tx) => work(pgliteQueryable(tx))),
    close: () => pglite.close(),
  };
}

// Base nueva en memoria para cada prueba.
export async function createTestDatabase(): Promise<Database> {
  const pglite = await PGlite.create();
  return createPgliteDatabase(pglite);
}
