import { accountInputSchema } from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';
import { buildE2eApp } from './e2e-server.ts';

describe('API real de E2E (RF-1, RF-5, RF-7, RF-13)', () => {
  it('crea las cuentas con el servicio y permite ingresar, comprobar y cerrar', async () => {
    const app = await buildE2eApp();
    try {
      for (const account of Object.values(TEST_ACCOUNTS)) {
        expect(accountInputSchema.safeParse(account).success).toBe(true);
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: {
            username: account.username,
            password: account.password,
          },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().user).toMatchObject({
          username: account.username,
          role: account.role,
          displayName: account.displayName,
        });
        const cookie = String(response.headers['set-cookie']).split(';')[0]!;
        expect(
          (await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } }))
            .statusCode,
        ).toBe(200);
        expect(
          (await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } }))
            .statusCode,
        ).toBe(204);
        expect(
          (await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } }))
            .statusCode,
        ).toBe(401);
      }
    } finally {
      await app.close();
    }
  });
});
