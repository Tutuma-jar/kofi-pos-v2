import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cookie from '@fastify/cookie';
import { registerErrorHandler } from './shared/http/errors.ts';
import { authPlugin } from './modules/auth/index.ts';
import { getCurrentMenu, menuPlugin } from './modules/menu/index.ts';
import { salesPlugin, listRegisteredSales } from './modules/sales/index.ts';
import { dashboardPlugin } from './modules/dashboard/index.ts';
import { systemClock, type Clock } from './shared/clock.ts';
import type { Database } from './shared/database/database.ts';

export interface AppDeps {
  logger?: FastifyServerOptions['logger'];
  db?: Database;
  clock?: Clock;
  production?: boolean;
}

// Arma la API con sus dependencias. La usan server.ts y las pruebas (con app.inject).
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? true });

  registerErrorHandler(app);
  app.register(cookie);
  app.decorateRequest('sessionUser', null);
  // Ninguna respuesta de la API se guarda en caché (D-4): tienen datos de la sesión.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/api/health', async () => ({ status: 'ok' }));
  if (deps.db) {
    app.register(authPlugin, {
      db: deps.db,
      clock: deps.clock ?? systemClock,
      production: deps.production ?? false,
    });
    app.register(menuPlugin, {
      db: deps.db,
      clock: deps.clock ?? systemClock,
      production: deps.production ?? false,
    });
    app.register(salesPlugin, {
      db: deps.db,
      clock: deps.clock ?? systemClock,
      production: deps.production ?? false,
      currentMenu: getCurrentMenu,
    });
    app.register(dashboardPlugin, {
      db: deps.db,
      clock: deps.clock ?? systemClock,
      production: deps.production ?? false,
      listSales: listRegisteredSales,
    });
  }

  return app;
}
