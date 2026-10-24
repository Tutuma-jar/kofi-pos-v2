// API para las pruebas de punta a punta (playwright.config.ts). Nunca se despliega.
import { buildApp } from '../src/app.ts';
import { createAccountsService } from '../src/modules/auth/index.ts';
import { createFakeClock } from '../src/shared/clock.ts';
import { createTestDatabase } from './test-database.ts';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';
import { z } from 'zod';
import { validate } from '../src/shared/http/validate.ts';

const clockSchema = z.object({ advanceMilliseconds: z.number().int().nonnegative() }).strict();
const accountActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), changes: z.unknown() }).strict(),
  z.object({ action: z.literal('delete') }).strict(),
]);

export async function buildE2eApp() {
  const db = await createTestDatabase();
  try {
    const accounts = createAccountsService(db);
    for (const input of Object.values(TEST_ACCOUNTS)) await accounts.create(input);
    const clock = createFakeClock(new Date('2026-10-24T08:00:00-04:00'));
    const app = buildApp({ db, clock, logger: false });
    // Controles exclusivos del servidor de pruebas; buildApp nunca los registra.
    app.post('/api/__test/clock', async (request) => {
      const { advanceMilliseconds } = validate(clockSchema, request.body);
      clock.advance(advanceMilliseconds);
      return { now: clock.now().toISOString() };
    });
    app.post<{ Params: { username: string } }>(
      '/api/__test/accounts/:username',
      async (request) => {
        const action = validate(accountActionSchema, request.body);
        return action.action === 'delete'
          ? accounts.delete(request.params.username)
          : accounts.update(request.params.username, action.changes);
      },
    );
    app.addHook('onClose', async () => db.close());
    return app;
  } catch (error) {
    await db.close();
    throw error;
  }
}

if (import.meta.main) {
  const app = await buildE2eApp();
  await app.listen({ port: Number(process.env.PORT ?? 3100), host: '127.0.0.1' });
}
