import pg from 'pg';

// Única puerta de la API a PostgreSQL (principio 5, docs/architecture.md §6.4). Producción usa el
// adaptador de pg; las pruebas, el de PGlite (apps/api/test/test-database.ts).

export interface QueryResult<Row> {
  rows: Row[];
  rowCount: number;
}

export interface Queryable {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
  // Ejecuta un script con varias sentencias y sin parámetros (las migraciones).
  exec(sql: string): Promise<void>;
}

export interface Database extends Queryable {
  // Ejecuta `work` en una transacción: la confirma si termina bien y la deshace si lanza un error.
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function pgQueryable(client: pg.Pool | pg.PoolClient): Queryable {
  return {
    async query<Row>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return { rows: result.rows as Row[], rowCount: result.rowCount ?? 0 };
    },
    async exec(sql) {
      await client.query(sql);
    },
  };
}

export function createPgDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString });

  return {
    ...pgQueryable(pool),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(pgQueryable(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
