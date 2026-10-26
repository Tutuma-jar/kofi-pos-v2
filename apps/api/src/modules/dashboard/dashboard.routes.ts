import { todaySummarySchema } from '@kofi/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { createAuthService, requireSession } from '../auth/index.ts';
import { createDashboardService, type DashboardDeps } from './dashboard.service.ts';

export const dashboardPlugin: FastifyPluginAsync<DashboardDeps & { production?: boolean }> = async (
  app,
  deps,
) => {
  const service = createDashboardService(deps);
  app.addHook('preHandler', requireSession(createAuthService(deps), deps.production));
  app.get('/api/dashboard/today', async () => todaySummarySchema.parse(await service.today()));
};
