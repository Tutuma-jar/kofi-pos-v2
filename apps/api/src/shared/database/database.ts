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
      // Una conexión que se corta en plena transacción emite 'error' en el cliente: sin este
      // oyente, el proceso cae; con él, la sentencia en curso rechaza y se deshace (RF-4 de SPEC-006).
      const ignore = () => {};
      client.on('error', ignore);
      let broken = false;
      try {
        await client.query('BEGIN');
        const result = await work(pgQueryable(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        // Si el ROLLBACK también falla, la conexión está rota: se conserva el error original.
        await client.query('ROLLBACK').catch(() => {
          broken = true;
        });
        throw error;
      } finally {
        client.off('error', ignore);
        // Una conexión rota se descarta en lugar de volver al pool.
        client.release(broken);
      }
    },
    async close() {
      await pool.end();
    },
  };
}
