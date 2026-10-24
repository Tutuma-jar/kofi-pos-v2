import { scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords.service.ts';

const PASSWORD = 'cafe con leche';

describe('passwords.service', () => {
  it('guarda el hash con sus parámetros y sin la contraseña', async () => {
    const stored = await hashPassword(PASSWORD);

    expect(stored).toMatch(/^scrypt\$32768\$8\$3\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(stored).not.toContain(PASSWORD);
    expect(stored).not.toContain(Buffer.from(PASSWORD).toString('base64url'));
  });

  it('da hashes distintos para la misma contraseña (sal aleatoria)', async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });

  it('verifica la contraseña correcta', async () => {
    expect(await verifyPassword(PASSWORD, await hashPassword(PASSWORD))).toBe(true);
  });

  it.each(['Cafe con leche', 'cafe con lech', ' cafe con leche', 'otra cosa', ''])(
    'rechaza %j',
    async (attempt) => {
      expect(await verifyPassword(attempt, await hashPassword(PASSWORD))).toBe(false);
    },
  );

  it('verifica con los parámetros guardados en el hash, no con los actuales', async () => {
    const salt = Buffer.from('sal-de-16-bytes!');
    const hash = scryptSync(PASSWORD, salt, 64, { N: 1024, r: 8, p: 1 });
    const stored = `scrypt$1024$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;

    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
    expect(await verifyPassword('otra', stored)).toBe(false);
  });

  it.each(['', 'texto', 'bcrypt$10$abc', 'scrypt$x$8$3$abc$def', 'scrypt$1024$8$1$abc'])(
    'rechaza un hash guardado mal formado (%j)',
    async (stored) => {
      expect(await verifyPassword(PASSWORD, stored)).toBe(false);
    },
  );
});
