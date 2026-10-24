import { createHash, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createSession, findSessionByToken, revokeSession } from './sessions.repository.ts';
import { findUserByUsername } from './users.repository.ts';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-11-03T07:58:00-04:00');

async function insertUser(db: Database, username = 'ana') {
  const result = await db.query<{ id: string }>(
    `INSERT INTO users (username, display_name, role, password_hash)
     VALUES ($1, 'Ana Quispe', 'owner', 'scrypt$hash') RETURNING id`,
    [username],
  );
  return result.rows[0]!.id;
}

const newToken = () => randomBytes(32).toString('base64url');

describe('users.repository', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('encuentra una cuenta por su usuario', async () => {
    const id = await insertUser(db);

    expect(await findUserByUsername(db, 'ana')).toEqual({
      id,
      username: 'ana',
      displayName: 'Ana Quispe',
      role: 'owner',
      passwordHash: 'scrypt$hash',
      sessionVersion: 1,
      lockedUntil: null,
    });
  });

  it('devuelve null si el usuario no existe', async () => {
    expect(await findUserByUsername(db, 'luis')).toBeNull();
  });

  it('puede bloquear la fila dentro de una transacción (FOR UPDATE)', async () => {
    const id = await insertUser(db);

    const found = await db.transaction((tx) => findUserByUsername(tx, 'ana', { forUpdate: true }));

    expect(found?.id).toBe(id);
  });
});

describe('sessions.repository', () => {
  let db: Database;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDatabase();
    userId = await insertUser(db);
  });

  afterEach(async () => {
    await db.close();
  });

  const create = (token: string) =>
    createSession(db, {
      token,
      userId,
      userSessionVersion: 1,
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 12 * HOUR),
    });

  it('crea una sesión y la encuentra por su token, con su cuenta', async () => {
    const token = newToken();
    const { id } = await create(token);

    expect(await findSessionByToken(db, token)).toEqual({
      id,
      userId,
      userSessionVersion: 1,
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 12 * HOUR),
      revokedAt: null,
      user: {
        id: userId,
        username: 'ana',
        displayName: 'Ana Quispe',
        role: 'owner',
        passwordHash: 'scrypt$hash',
        sessionVersion: 1,
        lockedUntil: null,
      },
    });
  });

  it('no guarda el token en claro: solo su SHA-256', async () => {
    const token = newToken();
    await create(token);

    const rows = await db.query<Record<string, unknown>>('SELECT * FROM sessions');
    expect(rows.rows).toHaveLength(1);
    expect(JSON.stringify(rows.rows)).not.toContain(token);
    expect(rows.rows[0]!.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('devuelve null para un token desconocido', async () => {
    await create(newToken());
    expect(await findSessionByToken(db, newToken())).toBeNull();
  });

  it('una sesión revocada se lee con revoked_at; revocarla otra vez no la cambia', async () => {
    const token = newToken();
    await create(token);
    const revokedAt = new Date(NOW.getTime() + HOUR);

    expect(await revokeSession(db, token, revokedAt)).toBe(true);
    expect(await revokeSession(db, token, new Date(NOW.getTime() + 2 * HOUR))).toBe(false);

    expect((await findSessionByToken(db, token))?.revokedAt).toEqual(revokedAt);
  });

  it('revocar una sesión no afecta a otra de la misma cuenta', async () => {
    const first = newToken();
    const second = newToken();
    await create(first);
    await create(second);

    await revokeSession(db, first, NOW);

    expect((await findSessionByToken(db, second))?.revokedAt).toBeNull();
  });

  it('la sesión de una cuenta eliminada se lee sin cuenta', async () => {
    const token = newToken();
    await create(token);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    const session = await findSessionByToken(db, token);
    expect(session?.userId).toBeNull();
    expect(session?.user).toBeNull();
  });
});
