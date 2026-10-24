import { buildApp } from './app.ts';
import { loadEnv } from './shared/config/env.ts';
import { createPgDatabase } from './shared/database/database.ts';

const env = loadEnv();
const db = createPgDatabase(env.DATABASE_URL);
const app = buildApp({ db, production: env.NODE_ENV === 'production' });
app.addHook('onClose', async () => db.close());

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
