import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

export interface AppDeps {
  logger?: FastifyServerOptions['logger'];
}

// Arma la API con sus dependencias. La usan server.ts y las pruebas (con app.inject).
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? true });

  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
