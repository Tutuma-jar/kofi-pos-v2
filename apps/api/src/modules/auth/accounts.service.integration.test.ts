import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAccountsService } from './accounts.service.ts';
import { verifyPassword } from './passwords.service.ts';

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
});
