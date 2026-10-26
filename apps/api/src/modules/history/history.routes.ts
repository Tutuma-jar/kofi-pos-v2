import {
  dayHistorySchema,
  historyDayQuerySchema,
  historySaleResponseSchema,
  HISTORY_MESSAGES,
  HISTORY_ROLES,
} from '@kofi/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../shared/http/errors.ts';
import { createAuthService, requireSession } from '../auth/index.ts';
import { createHistoryService, type HistoryDeps } from './history.service.ts';

export const historyPlugin: FastifyPluginAsync<HistoryDeps & { production?: boolean }> = async (
  app,
  deps,
) => {
  const service = createHistoryService(deps);
  app.addHook('preHandler', requireSession(createAuthService(deps), deps.production));
  app.addHook('preHandler', async (request) => {
    if (!HISTORY_ROLES.some((role) => role === request.sessionUser!.role)) {
      throw new AppError(403, 'FORBIDDEN', HISTORY_MESSAGES.forbidden);
    }
  });
  app.get('/api/history/day', async (request) => {
    const query = request.query as { date?: string | string[] };
    const { date } = historyDayQuerySchema.parse({
      date: Array.isArray(query.date) ? query.date[0] : query.date,
    });
    return dayHistorySchema.parse(await service.day(date));
  });
  const readSale = async (number: string) =>
    historySaleResponseSchema.parse(await service.sale(number));
  app.get<{ Params: { number: string } }>('/api/history/sales/:number', async (request) =>
    readSale(request.params.number),
  );
  // Respaldo del mismo endpoint: los parámetros de más de 100 caracteres también deben pasar
  // por sesión, rol y normalización, sin elevar los límites globales de otras rutas.
  app.get<{ Params: { '*': string } }>('/api/history/sales/*', async (request, reply) => {
    const number = request.params['*'];
    if (!number || number.includes('/')) return reply.callNotFound();
    return readSale(number);
  });
};
