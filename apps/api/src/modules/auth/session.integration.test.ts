import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createFakeClock, type FakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAuthService } from './auth.service.ts';
import { requireSession } from './auth.hook.ts';
import { hashPassword } from './passwords.service.ts';
import { revokeSession } from './sessions.repository.ts';

const NOW = new Date('2026-10-24T12:00:00Z');
describe('sesión y guarda (RF-4, RF-5, RF-6, RF-8)', () => {
  let app: FastifyInstance;
  let db: Database;
  let auth: ReturnType<typeof createAuthService>;
  let clock: FakeClock;
  const handler = vi.fn(async () => ({ saved: true }));
  beforeEach(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO users (username, display_name, role, password_hash)
      VALUES ('ana', 'Ana Quispe', 'owner', $1)`,
      [await hashPassword('prueba de cafe')],
    );
    clock = createFakeClock(NOW);
    auth = createAuthService({ db, clock });
    app = buildApp({ db, clock, logger: false });
    app.post('/api/protected', { preHandler: requireSession(auth) }, handler);
    handler.mockClear();
  });
  afterEach(async () => {
    await app.close();
    await db.close();
  });
  const login = () => auth.login({ username: 'ana', password: 'prueba de cafe' });
  const session = (token?: string) =>
    app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: token ? { cookie: `kofi_session=${token}` } : {},
    });

  it('vence exactamente a las doce horas pese a la actividad y no ejecuta cambios (RF-10, RF-11)', async () => {
    const { token, user } = await login();
    clock.advance((11 * 60 + 59) * 60_000);
    expect((await session(token)).statusCode).toBe(200);
    clock.advance(60_000);
    const response = await session(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Tu sesión venció. Vuelve a iniciar sesión',
        userId: user.id,
      },
    });
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');
    const operation = await app.inject({
      method: 'POST',
      url: '/api/protected',
      headers: { cookie: `kofi_session=${token}` },
    });
    expect(operation.statusCode).toBe(401);
    expect(operation.json().error.code).toBe('SESSION_EXPIRED');
    expect(handler).not.toHaveBeenCalled();
    expect((await session()).json().error).not.toHaveProperty('userId');
  });

  it('devuelve solo la identidad pública de la sesión', async () => {
    const { token, user } = await login();
    const response = await session(token);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user });
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it.each(['missing', 'unknown', 'revoked'])('rechaza %s y borra la cookie', async (kind) => {
    let token: string | undefined;
    if (kind === 'unknown') token = 'unknown';
    if (kind === 'revoked') {
      token = (await login()).token;
      await revokeSession(db, token, NOW);
    }
    const response = await session(token);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'SESSION_MISSING', message: 'Inicia sesión para continuar' },
    });
    expect(String(response.headers['set-cookie'])).toContain('kofi_session=;');
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');
  });
  it('dos navegadores mantienen sesiones independientes', async () => {
    const first = await login();
    const second = await login();
    expect(first.token).not.toBe(second.token);
    expect((await session(first.token)).statusCode).toBe(200);
    expect((await session(second.token)).statusCode).toBe(200);
  });
  it('cerrar es inmediato e idempotente y no afecta a otras sesiones (RF-7, RF-8)', async () => {
    const first = await login();
    const second = await login();
    const close = (token?: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: token ? { cookie: `kofi_session=${token}` } : {},
      });
    const response = await close(first.token);
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');
    expect((await session(first.token)).json().error.code).toBe('SESSION_MISSING');
    expect((await session(second.token)).statusCode).toBe(200);
    expect((await close(first.token)).statusCode).toBe(204);
    expect((await close()).statusCode).toBe(204);
    expect((await close('unknown')).statusCode).toBe(204);
  });
  it('el hook impide ejecutar una operación sin sesión y permite la válida', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/protected' })).statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    const { token } = await login();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/protected',
          headers: { cookie: `kofi_session=${token}` },
        })
      ).statusCode,
    ).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
