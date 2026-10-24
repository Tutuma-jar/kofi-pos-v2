// API para las pruebas de punta a punta (playwright.config.ts). Nunca se despliega.
import { buildApp } from '../src/app.ts';
import { createAccountsService } from '../src/modules/auth/index.ts';
import { createFakeClock } from '../src/shared/clock.ts';
import { createTestDatabase } from './test-database.ts';
import { TEST_ACCOUNTS } from '../../../e2e/fixtures.ts';

export async function buildE2eApp() {
  const db = await createTestDatabase();
  try {
    const accounts = createAccountsService(db);
    for (const input of Object.values(TEST_ACCOUNTS)) await accounts.create(input);
    const clock = createFakeClock(new Date('2026-10-24T08:00:00-04:00'));
    const app = buildApp({ db, clock, logger: false });
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
