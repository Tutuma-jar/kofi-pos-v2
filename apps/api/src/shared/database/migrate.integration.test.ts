import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyTestDatabase } from '../../../test/test-database.ts';
import type { Database } from './database.ts';
import { migrate } from './migrate.ts';

const ANA = {
  username: 'ana',
  displayName: 'Ana Quispe',
  role: 'owner',
  passwordHash: 'scrypt$32768$8$3$sal$hash',
};

async function insertUser(db: Database, user: Partial<typeof ANA> = {}) {
  const { username, displayName, role, passwordHash } = { ...ANA, ...user };
  const result = await db.query<{ id: string; session_version: number }>(
    `INSERT INTO users (username, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING id, session_version`,
    [username, displayName, role, passwordHash],
  );
  return result.rows[0]!;
}

async function sessionVersion(db: Database, id: string) {
  const result = await db.query<{ session_version: number }>(
    'SELECT session_version FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0]!.session_version;
}

describe('migrate', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createEmptyTestDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('aplica las migraciones una sola vez, aunque se ejecute dos veces', async () => {
    expect(await migrate(db)).toEqual(['001_auth.sql', '002_menu.sql', '003_sales.sql']);
    expect(await migrate(db)).toEqual([]);

    const applied = await db.query<{ name: string }>(
      'SELECT name FROM schema_migrations ORDER BY name',
    );
    expect(applied.rows).toEqual([
      { name: '001_auth.sql' },
      { name: '002_menu.sql' },
      { name: '003_sales.sql' },
    ]);
  });

  describe('con una carpeta de migraciones propia', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'kofi-migrations-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('aplica en orden solo las pendientes e ignora otros archivos', async () => {
      writeFileSync(join(dir, '002_b.sql'), 'INSERT INTO log (step) VALUES (2);');
      writeFileSync(
        join(dir, '001_a.sql'),
        'CREATE TABLE log (step int); INSERT INTO log VALUES (1);',
      );
      writeFileSync(join(dir, 'notas.txt'), 'no es una migración');

      expect(await migrate(db, dir)).toEqual(['001_a.sql', '002_b.sql']);

      writeFileSync(join(dir, '003_c.sql'), 'INSERT INTO log (step) VALUES (3);');
      expect(await migrate(db, dir)).toEqual(['003_c.sql']);

      const steps = await db.query<{ step: number }>('SELECT step FROM log');
      expect(steps.rows.map((r) => r.step)).toEqual([1, 2, 3]);
    });

    it('deshace una migración que falla y no la registra', async () => {
      writeFileSync(
        join(dir, '001_a.sql'),
        'CREATE TABLE log (step int); SELECT * FROM no_existe;',
      );

      await expect(migrate(db, dir)).rejects.toThrow();

      const tables = await db.query("SELECT 1 FROM pg_tables WHERE tablename = 'log'");
      expect(tables.rowCount).toBe(0);
      expect((await db.query('SELECT * FROM schema_migrations')).rowCount).toBe(0);
    });
  });

  describe('001_auth.sql', () => {
    beforeEach(async () => {
      await migrate(db);
    });

    it.each(['Ana', 'an', 'ana maría', 'josé', 'x'.repeat(31)])(
      'rechaza el username %j, que no cumple el CHECK',
      async (username) => {
        await expect(insertUser(db, { username })).rejects.toThrow(/check/i);
      },
    );

    it('rechaza un username repetido', async () => {
      await insertUser(db);
      await expect(insertUser(db)).rejects.toThrow(/unique|duplicate/i);
    });

    it('rechaza un rol desconocido y un nombre visible vacío o de más de 40 caracteres', async () => {
      await expect(insertUser(db, { role: 'admin' })).rejects.toThrow(/check/i);
      await expect(insertUser(db, { displayName: '' })).rejects.toThrow(/check/i);
      await expect(insertUser(db, { displayName: 'A'.repeat(41) })).rejects.toThrow(/check/i);
    });

    it('crea la cuenta con session_version 1', async () => {
      expect((await insertUser(db)).session_version).toBe(1);
    });

    it('sube session_version al cambiar el rol', async () => {
      const { id } = await insertUser(db);
      await db.query("UPDATE users SET role = 'cashier' WHERE id = $1", [id]);
      expect(await sessionVersion(db, id)).toBe(2);
    });

    it('sube session_version al cambiar el password_hash', async () => {
      const { id } = await insertUser(db);
      await db.query("UPDATE users SET password_hash = 'scrypt$otro' WHERE id = $1", [id]);
      expect(await sessionVersion(db, id)).toBe(2);
    });

    it('no sube session_version al cambiar solo el display_name o locked_until', async () => {
      const { id } = await insertUser(db);
      await db.query("UPDATE users SET display_name = 'Ana Q.' WHERE id = $1", [id]);
      await db.query('UPDATE users SET locked_until = now() WHERE id = $1', [id]);
      expect(await sessionVersion(db, id)).toBe(1);
    });

    it('no sube session_version si el rol se escribe con el mismo valor', async () => {
      const { id } = await insertUser(db);
      await db.query("UPDATE users SET role = 'owner' WHERE id = $1", [id]);
      expect(await sessionVersion(db, id)).toBe(1);
    });

    it('al eliminar la cuenta, sus sesiones quedan con user_id NULL y sus intentos se borran', async () => {
      const { id } = await insertUser(db);
      await db.query(
        `INSERT INTO sessions (id, token_hash, user_id, user_session_version, created_at, expires_at)
         VALUES (gen_random_uuid(), 'hash', $1, 1, now(), now() + interval '12 hours')`,
        [id],
      );
      await db.query('INSERT INTO failed_logins (user_id, attempted_at) VALUES ($1, now())', [id]);

      await db.query('DELETE FROM users WHERE id = $1', [id]);

      const sessions = await db.query<{ user_id: string | null }>('SELECT user_id FROM sessions');
      expect(sessions.rows).toEqual([{ user_id: null }]);
      expect((await db.query('SELECT * FROM failed_logins')).rowCount).toBe(0);
    });
  });
});
