import { Writable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { hashPassword } from './passwords.service.ts';
import * as passwords from './passwords.service.ts';

const PASSWORD = 'solo prueba Leche';
describe('POST /api/auth/login (RF-1, RF-2, RF-3, RNF-1)', () => {
  let db: Database;
  let app: FastifyInstance;
  let logs: string;
  beforeEach(async () => {
    db = await createTestDatabase();
    await db.query(
      `INSERT INTO users (username, display_name, role, password_hash)
      VALUES ('ana', 'Ana Quispe', 'owner', $1)`,
      [await hashPassword(PASSWORD)],
    );
    logs = '';
    app = buildApp({
      db,
      clock: createFakeClock(new Date('2026-10-24T12:00:00Z')),
      production: true,
      logger: {
        stream: new Writable({
          write(chunk, _encoding, done) {
            logs += chunk.toString();
            done();
          },
        }),
      },
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    await db.close();
  });
  const login = (username = '  Ana ', password = PASSWORD) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });

  it('responde identidad pública y cookie con todos los atributos de producción', async () => {
    const response = await login();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: expect.any(String),
        username: 'ana',
        displayName: 'Ana Quispe',
        role: 'owner',
      },
    });
    const cookie = String(response.headers['set-cookie']);
    for (const attribute of [
      'kofi_session=',
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      'Secure',
      'Max-Age=648000',
    ]) {
      expect(cookie).toContain(attribute);
    }
    expect(response.headers['cache-control']).toBe('no-store');
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain(cookie.split(';')[0]!.split('=')[1]);
  });
  it('no marca Secure en desarrollo local', async () => {
    await app.close();
    app = buildApp({ db, logger: false });
    expect(String((await login()).headers['set-cookie'])).not.toContain('Secure');
  });
  it.each(['ana', 'nadie'])('responde el mismo 401 para %s', async (username) => {
    const response = await login(username, 'incorrecta');
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' },
    });
    expect(logs).not.toContain('incorrecta');
  });
  it.each([
    ['', ''],
    ['   ', '   '],
  ])('rechaza campos vacíos antes de verificar o contar', async (username, password) => {
    const verify = vi.spyOn(passwords, 'verifyPassword');
    const response = await login(username, password);
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: {
        username: 'Escribe tu usuario',
        password: 'Escribe tu contraseña',
      },
    });
    expect(verify).not.toHaveBeenCalled();
    expect((await db.query('SELECT * FROM failed_logins')).rows).toHaveLength(0);
  });
});
