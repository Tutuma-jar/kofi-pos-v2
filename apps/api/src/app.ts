import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandler } from './shared/http/errors.ts';

export interface AppDeps {
  logger?: FastifyServerOptions['logger'];
}

// Arma la API con sus dependencias. La usan server.ts y las pruebas (con app.inject).
export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? true });

  registerErrorHandler(app);
  // Ninguna respuesta de la API se guarda en caché (D-4): tienen datos de la sesión.
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  return app;
}
