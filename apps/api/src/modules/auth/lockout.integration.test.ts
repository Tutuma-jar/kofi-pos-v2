import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createFakeClock, type FakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { hashPassword } from './passwords.service.ts';

const PASSWORD = 'solo prueba Leche';
const MINUTE = 60_000;
describe('bloqueo por cuenta (RF-9)', () => {
  let db: Database;
  let app: FastifyInstance;
  let clock: FakeClock;
  beforeEach(async () => {
    db = await createTestDatabase();
    clock = createFakeClock(new Date('2026-10-24T12:00:00Z'));
    await db.query(
      `INSERT INTO users (username, display_name, role, password_hash)
      VALUES ('ana', 'Ana', 'owner', $1)`,
      [await hashPassword(PASSWORD)],
    );
    app = buildApp({ db, clock, logger: false });
  });
  afterEach(async () => {
    await app.close();
    await db.close();
  });
  const login = (password = 'incorrecta', username = 'ana') =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  async function failures(count: number) {
    for (let i = 0; i < count; i++) expect((await login()).statusCode).toBe(401);
  }
  it('el quinto fallo sigue siendo incorrecto; bloquea cinco minutos sin contar ni prolongar', async () => {
    await failures(5);
    const blocked = await login(PASSWORD);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Demasiados intentos. Vuelve a intentarlo en 5 minutos',
        retryAfterMinutes: 5,
      },
    });
    expect((await db.query('SELECT * FROM failed_logins')).rows).toHaveLength(0);
    clock.advance(4 * MINUTE + 1);
    const last = await login();
    expect(last.statusCode).toBe(429);
    expect(last.json().error).toMatchObject({
      retryAfterMinutes: 1,
      message: 'Demasiados intentos. Vuelve a intentarlo en 1 minuto',
    });
    clock.advance(MINUTE - 1);
    await failures(4);
    expect((await login(PASSWORD)).statusCode).toBe(200);
  });
  it('un ingreso correcto reinicia los fallos', async () => {
    await failures(4);
    expect((await login(PASSWORD)).statusCode).toBe(200);
    await failures(4);
    expect((await login(PASSWORD)).statusCode).toBe(200);
  });
  it('solo cuenta la ventana de quince minutos, con límite abierto', async () => {
    await failures(4);
    clock.advance(15 * MINUTE);
    await failures(1);
    expect((await login(PASSWORD)).statusCode).toBe(200);
    await failures(4);
    clock.advance(20 * MINUTE);
    await failures(1);
    expect((await login(PASSWORD)).statusCode).toBe(200);
  });
  it('no bloquea usuarios inexistentes ni cuenta cuerpos inválidos', async () => {
    for (let i = 0; i < 7; i++) {
      expect((await login(PASSWORD, 'nadie')).json().error.code).toBe('INVALID_CREDENTIALS');
      expect((await login('   ')).statusCode).toBe(400);
    }
    expect((await db.query('SELECT * FROM failed_logins')).rows).toHaveLength(0);
    expect((await login(PASSWORD)).statusCode).toBe(200);
  });
  it('serializa dos fallos simultáneos y conserva ambos', async () => {
    await failures(3);
    const results = await Promise.all([login(), login()]);
    expect(results.map((r) => r.statusCode)).toEqual([401, 401]);
    expect((await login(PASSWORD)).statusCode).toBe(429);
  });
});
