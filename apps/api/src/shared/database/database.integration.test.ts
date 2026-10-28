import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import { startDroppingPostgres } from '../../../test/dropping-postgres.ts';
import { createPgDatabase, type Database } from './database.ts';

describe('Database (PGlite)', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.exec('CREATE TABLE notes (id integer PRIMARY KEY, body text NOT NULL)');
  });

  afterEach(async () => {
    await db.close();
  });

  it('ejecuta una consulta con parámetros', async () => {
    await db.query('INSERT INTO notes (id, body) VALUES ($1, $2), ($3, $4)', [1, 'uno', 2, 'dos']);

    const result = await db.query<{ id: number; body: string }>(
      'SELECT id, body FROM notes WHERE id > $1 ORDER BY id',
      [0],
    );

    expect(result.rows).toEqual([
      { id: 1, body: 'uno' },
      { id: 2, body: 'dos' },
    ]);
    expect(result.rowCount).toBe(2);
  });

  it('confirma una transacción que termina bien y devuelve su resultado', async () => {
    const value = await db.transaction(async (tx) => {
      await tx.query('INSERT INTO notes (id, body) VALUES ($1, $2)', [1, 'uno']);
      return 'listo';
    });

    expect(value).toBe('listo');
    expect((await db.query('SELECT * FROM notes')).rowCount).toBe(1);
  });

  it('deshace la transacción ante un error y lo propaga', async () => {
    const failure = db.transaction(async (tx) => {
      await tx.query('INSERT INTO notes (id, body) VALUES ($1, $2)', [1, 'uno']);
      throw new Error('falla a propósito');
    });

    await expect(failure).rejects.toThrow('falla a propósito');
    expect((await db.query('SELECT * FROM notes')).rowCount).toBe(0);
  });

  it('deshace la transacción ante un error de la base', async () => {
    const failure = db.transaction(async (tx) => {
      await tx.query('INSERT INTO notes (id, body) VALUES ($1, $2)', [1, 'uno']);
      await tx.query('INSERT INTO notes (id, body) VALUES ($1, $2)', [1, 'repetido']);
    });

    await expect(failure).rejects.toThrow();
    expect((await db.query('SELECT * FROM notes')).rowCount).toBe(0);
  });
});

describe('Database (pg)', () => {
  it('rechaza la transacción si la conexión se corta a mitad, sin un error sin manejar', async () => {
    const server = await startDroppingPostgres();
    const db = createPgDatabase(server.url);
    try {
      await expect(
        db.transaction(async (tx) => {
          await tx.query('SELECT 1');
        }),
      ).rejects.toThrow('Connection terminated unexpectedly');
    } finally {
      await db.close();
      await server.close();
    }
  });
});
