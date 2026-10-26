import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { todaySummarySchema } from '@kofi/contracts';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.ts';
import { authPlugin, createAccountsService } from '../auth/index.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { testSale } from '../../../test/test-sales.ts';
import type { Database } from '../../shared/database/database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { dashboardPlugin } from './index.ts';

describe('rutas del dashboard (RF-1, RF-8)', () => {
  let db: Database;
  let app: FastifyInstance;
  const listSales = vi.fn();
  const cookies: Record<string, string> = {};
  beforeEach(async () => {
    db = await createTestDatabase();
    const clock = createFakeClock(new Date('2026-10-24T15:00:00Z'));
    const accounts = createAccountsService(db);
    for (const role of ['owner', 'cashier'] as const)
      await accounts.create({
        username: role,
        displayName: role,
        role,
        password: 'dashboard de prueba',
      });
    listSales.mockReset().mockResolvedValue([testSale()]);
    app = buildApp({ logger: false });
    app.register(authPlugin, { db, clock });
    app.register(dashboardPlugin, { db, clock, listSales });
    for (const role of ['owner', 'cashier']) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: role, password: 'dashboard de prueba' },
      });
      cookies[role] = String(response.headers['set-cookie']).split(';')[0]!;
    }
  });
  afterEach(async () => {
    await app?.close();
    await db?.close();
  });
  it.each(['owner', 'cashier'])('responde 200 a %s con contrato válido', async (role) => {
    const response = await app.inject({
      url: '/api/dashboard/today',
      headers: { cookie: cookies[role]! },
    });
    expect(response.statusCode).toBe(200);
    expect(todaySummarySchema.parse(response.json())).toMatchObject({
      date: '2026-10-24',
      totalCents: 1250,
      salesCount: 1,
    });
    expect(listSales).toHaveBeenCalledOnce();
  });
  it('rechaza sin sesión antes de leer las ventas y no acepta POST', async () => {
    expect((await app.inject('/api/dashboard/today')).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/dashboard/today',
          headers: { cookie: cookies.owner! },
        })
      ).statusCode,
    ).toBe(404);
    expect(listSales).not.toHaveBeenCalled();
  });
});
