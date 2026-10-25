import { saleQuoteSchema, saleResponseSchema } from '@kofi/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { createAuthService, requireSession } from '../auth/index.ts';
import { createSalesService, type SalesDeps } from './sales.service.ts';

export const salesPlugin: FastifyPluginAsync<SalesDeps & { production?: boolean }> = async (
  app,
  deps,
) => {
  const service = createSalesService(deps);
  app.addHook('preHandler', requireSession(createAuthService(deps), deps.production));
  app.post('/api/sales/quote', async (request) =>
    saleQuoteSchema.parse(await service.quote(request.body)),
  );
  app.post('/api/sales', async (request, reply) => {
    const result = await service.register(request.body, request.sessionUser!);
    return reply
      .code(result.created ? 201 : 200)
      .send(saleResponseSchema.parse({ sale: result.sale }));
  });
};
