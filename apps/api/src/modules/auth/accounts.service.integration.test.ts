import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAccountsService } from './accounts.service.ts';
import { verifyPassword } from './passwords.service.ts';
import { createAuthService } from './auth.service.ts';
import { createFakeClock } from '../../shared/clock.ts';

const INPUT = {
  username: '  Ana ',
  password: ' cafe de prueba ',
  displayName: ' Ana Quispe ',
  role: 'owner',
};
describe('preparar cuentas (RF-13)', () => {
  let db: Database;
  let accounts: ReturnType<typeof createAccountsService>;
  beforeAll(async () => {
    db = await createTestDatabase();
    accounts = createAccountsService(db);
  });
  beforeEach(async () => {
    await db.query('TRUNCATE users CASCADE');
  });
  afterAll(async () => {
    await db.close();
  });

  it('crea una cuenta normalizada, guarda solo el hash y lista identidad pública', async () => {
    const user = await accounts.create(INPUT);
    expect(user).toEqual({
      id: expect.any(String),
      username: 'ana',
      displayName: 'Ana Quispe',
      role: 'owner',
    });
    expect(await accounts.list()).toEqual([user]);
    const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM users');
    expect(rows[0]!.password_hash).not.toContain(INPUT.password);
    expect(await verifyPassword(INPUT.password, rows[0]!.password_hash)).toBe(true);
  });
  it.each([
    ['username', 'an'],
    ['username', 'a'.repeat(31)],
    ['username', 'mañana'],
    ['username', 'ana@kofi'],
    ['password', 'a'.repeat(7)],
    ['password', 'a'.repeat(65)],
    ['password', '        '],
    ['displayName', ' '],
    ['displayName', 'a'.repeat(41)],
    ['role', 'admin'],
  ])('rechaza %s inválido indicando el dato', async (field, value) => {
    await expect(accounts.create({ ...INPUT, [field]: value })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { fields: { [field]: expect.any(String) } },
    });
    expect(await accounts.list()).toEqual([]);
  });
  it('rechaza ana si ya existe Ana y conserva la cuenta original', async () => {
    const user = await accounts.create(INPUT);
    await expect(accounts.create({ ...INPUT, username: 'ana' })).rejects.toMatchObject({
      message: 'Ya existe una cuenta con el usuario ana',
      details: { fields: { username: expect.any(String) } },
    });
    expect(await accounts.list()).toEqual([user]);
  });
  it('admite los extremos válidos de cada dato y ambos roles', async () => {
    await accounts.create({
      username: 'a_1',
      password: 'x'.repeat(8),
      displayName: 'A',
      role: 'cashier',
    });
    await accounts.create({
      username: 'z'.repeat(30),
      password: '☕'.repeat(64),
      displayName: 'N'.repeat(40),
      role: 'owner',
    });
    expect(await accounts.list()).toHaveLength(2);
  });
  it('actualiza nombre sin terminar y rol o contraseña terminando todas las sesiones (RF-12)', async () => {
    await accounts.create(INPUT);
    const auth = createAuthService({
      db,
      clock: createFakeClock(new Date('2026-10-24T12:00:00Z')),
    });
    const first = await auth.login({ username: 'ana', password: INPUT.password });
    const second = await auth.login({ username: 'ana', password: INPUT.password });
    expect(await accounts.update(' ANA ', { displayName: ' Ana Nueva ' })).toMatchObject({
      displayName: 'Ana Nueva',
    });
    expect((await auth.resolveSession(first.token)).displayName).toBe('Ana Nueva');
    await accounts.update('ana', { role: 'cashier' });
    for (const { token } of [first, second])
      await expect(auth.resolveSession(token)).rejects.toMatchObject({
        code: 'SESSION_TERMINATED',
      });
    const next = await auth.login({ username: 'ana', password: INPUT.password });
    await accounts.update('ana', { password: 'otra clave de prueba' });
    await expect(auth.resolveSession(next.token)).rejects.toMatchObject({
      code: 'SESSION_TERMINATED',
    });
    await expect(auth.login({ username: 'ana', password: INPUT.password })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    const last = await auth.login({ username: 'ana', password: 'otra clave de prueba' });
    expect(last.user.role).toBe('cashier');
    await accounts.delete('ANA');
    await expect(auth.resolveSession(last.token)).rejects.toMatchObject({
      code: 'SESSION_TERMINATED',
    });
    expect(await accounts.list()).toEqual([]);
  });
  it.each([
    { role: 'admin' },
    { password: 'corta' },
    { password: '        ' },
    { displayName: '' },
    { displayName: 'a'.repeat(41) },
    { username: 'otro' },
    {},
  ])('rechaza cambios inválidos sin tocar la cuenta: %j (RF-13)', async (changes) => {
    const user = await accounts.create(INPUT);
    await expect(accounts.update('ana', changes)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(await accounts.list()).toEqual([user]);
  });
  it('informa cuentas inexistentes e identificadores inválidos', async () => {
    await expect(accounts.update('nadie', { role: 'cashier' })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(accounts.delete('nadie')).rejects.toMatchObject({ statusCode: 404 });
    await expect(accounts.delete('a')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
