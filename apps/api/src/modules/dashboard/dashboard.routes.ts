import {
  todaySummarySchema,
  monthSummarySchema,
  DASHBOARD_MONTH_ROLES,
  DASHBOARD_MESSAGES,
} from '@kofi/contracts';
import { AppError } from '../../shared/http/errors.ts';
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
  app.get('/api/dashboard/month', async (request) => {
    if (!DASHBOARD_MONTH_ROLES.some((role) => role === request.sessionUser!.role)) {
      throw new AppError(403, 'FORBIDDEN', DASHBOARD_MESSAGES.forbiddenMonth);
    }
    return monthSummarySchema.parse(await service.month());
  });
};
