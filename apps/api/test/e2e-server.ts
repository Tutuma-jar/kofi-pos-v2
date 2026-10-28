// API para las pruebas de punta a punta (playwright.config.ts). Nunca se despliega.
import { buildApp } from '../src/app.ts';
import { createAccountsService } from '../src/modules/auth/index.ts';
import { loadOfficialMenu, saveCategory, saveProduct } from '../src/modules/menu/index.ts';
import { listRegisteredSales } from '../src/modules/sales/index.ts';
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
const menuFixtureSchema = z
  .object({
    categories: z.array(
      z
        .object({
          name: z.string(),
          products: z.array(z.object({ name: z.string(), price: z.string() }).strict()).default([]),
        })
        .strict(),
    ),
  })
  .strict();

export async function buildE2eApp() {
  const db = await createTestDatabase();
  try {
    const accounts = createAccountsService(db);
    for (const input of Object.values(TEST_ACCOUNTS)) await accounts.create(input);
    const clock = createFakeClock(new Date('2026-10-24T08:00:00-04:00'));
    const app = buildApp({ db, clock, logger: false });
    // Restablecer solo datos efímeros de E2E; cada alta recorre los servicios del módulo.
    app.post('/api/__test/menu', async (request) => {
      const fixture = validate(menuFixtureSchema, request.body);
      // El fixture reinicia también las ventas de E2E para respetar sus FK al sustituir el menú.
      await db.transaction((tx) =>
        tx.exec(
          'TRUNCATE sale_lines, sales; UPDATE sale_counter SET last_number = 0; DELETE FROM products; DELETE FROM categories;',
        ),
      );
      for (const input of fixture.categories) {
        const category = await saveCategory(db, { name: input.name });
        for (const product of input.products)
          await saveProduct(db, { ...product, categoryId: category.id });
      }
      return { ok: true };
    });
    // Sustituye el menú de E2E por el oficial con la carga real de SPEC-006 (D-8).
    app.post('/api/__test/official-menu', async () => {
      await db.transaction((tx) =>
        tx.exec(
          'TRUNCATE sale_lines, sales; UPDATE sale_counter SET last_number = 0; DELETE FROM products; DELETE FROM categories;',
        ),
      );
      return loadOfficialMenu(db);
    });
    app.get('/api/__test/sales', async () => ({ sales: await listRegisteredSales(db) }));
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
