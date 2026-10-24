import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAuthService } from './auth.service.ts';
import * as passwords from './passwords.service.ts';
import { findSessionByToken } from './sessions.repository.ts';

const PASSWORD = ' cafe con Leche ';
const NOW = new Date('2026-10-24T08:00:00-04:00');

describe('ingreso (RF-1, RF-2, RF-6, RNF-2)', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuthService>;
  beforeEach(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO users (username, display_name, role, password_hash)
       VALUES ('ana', 'Ana Quispe', 'owner', $1)`,
      [await passwords.hashPassword(PASSWORD)],
    );
    auth = createAuthService({ db, clock: createFakeClock(NOW) });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.close();
  });

  it('normaliza el usuario y crea una sesión de 12 horas con identidad pública', async () => {
    const result = await auth.login({ username: '  Ana ', password: PASSWORD });
    expect(result.user).toEqual({
      id: expect.any(String),
      username: 'ana',
      displayName: 'Ana Quispe',
      role: 'owner',
    });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await findSessionByToken(db, result.token)).toMatchObject({
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 12 * 60 * 60 * 1000),
      revokedAt: null,
    });
  });

  it.each([
    ['ana', ' cafe con leche '],
    ['ana', 'incorrecta'],
    ['nadie', PASSWORD],
    ['ana', PASSWORD.trim()],
  ])('rechaza %s sin revelar si existe y verifica una sola vez', async (username, password) => {
    const verify = vi.spyOn(passwords, 'verifyPassword');
    await expect(auth.login({ username, password })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Usuario o contraseña incorrectos',
    });
    expect(verify).toHaveBeenCalledTimes(1);
    expect((await db.query('SELECT * FROM sessions')).rows).toHaveLength(0);
  });

  it('verifica una sola vez también con credenciales correctas', async () => {
    const verify = vi.spyOn(passwords, 'verifyPassword');
    await auth.login({ username: 'ana', password: PASSWORD });
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('reemplaza solo la sesión anterior del navegador y no la revoca si falla el ingreso', async () => {
    const first = await auth.login({ username: 'ana', password: PASSWORD });
    const other = await auth.login({ username: 'ana', password: PASSWORD });
    await expect(
      auth.login({ username: 'ana', password: 'incorrecta' }, first.token),
    ).rejects.toThrow();
    expect((await findSessionByToken(db, first.token))?.revokedAt).toBeNull();
    const next = await auth.login({ username: 'ana', password: PASSWORD }, first.token);
    expect((await findSessionByToken(db, first.token))?.revokedAt).toEqual(NOW);
    expect((await findSessionByToken(db, other.token))?.revokedAt).toBeNull();
    expect((await findSessionByToken(db, next.token))?.revokedAt).toBeNull();
  });
});
