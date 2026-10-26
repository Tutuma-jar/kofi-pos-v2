import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { dayHistorySchema, historySaleResponseSchema, HISTORY_MESSAGES } from '@kofi/contracts';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.ts';
import { authPlugin, createAccountsService } from '../auth/index.ts';
import { createFakeClock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { testSale } from '../../../test/test-sales.ts';
import { historyPlugin } from './index.ts';

describe('rutas del historial (RF-1, RF-2, RF-7)', () => {
  let db: Database;
  let app: FastifyInstance;
  const listSales = vi.fn();
  const findSale = vi.fn();
  const cookies: Record<string, string> = {};
  beforeAll(async () => {
    db = await createTestDatabase();
    const clock = createFakeClock(new Date('2026-10-25T15:00:00Z'));
    const accounts = createAccountsService(db);
    for (const role of ['owner', 'cashier'] as const)
      await accounts.create({
        username: role,
        displayName: role,
        role,
        password: 'historial de prueba',
      });
    app = buildApp({ logger: false });
    app.register(authPlugin, { db, clock });
    app.register(historyPlugin, { db, clock, listSales, findSale });
    for (const role of ['owner', 'cashier']) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: role, password: 'historial de prueba' },
      });
      expect(response.statusCode).toBe(200);
      cookies[role] = String(response.headers['set-cookie']).split(';')[0]!;
    }
  });
  beforeEach(() => {
    listSales.mockReset().mockResolvedValue([testSale()]);
    findSale.mockReset().mockResolvedValue(testSale({ number: 3 }));
  });
  afterAll(async () => {
    await app?.close();
    await db?.close();
  });

  it.each(['3', '003', '%203%20'])('devuelve el detalle al dueño para %s', async (number) => {
    const response = await app.inject({
      url: `/api/history/sales/${number}`,
      headers: { cookie: cookies.owner! },
    });
    expect(response.statusCode).toBe(200);
    expect(historySaleResponseSchema.parse(response.json())).toMatchObject({
      sale: { number: 3 },
      date: '2026-10-24',
    });
    expect(findSale).toHaveBeenCalledExactlyOnceWith(db, 3);
    expect(listSales).not.toHaveBeenCalled();
  });
  it.each(['0', '-3', '2,5', 'abc'])('rechaza el número inválido %s', async (number) => {
    const response = await app.inject({
      url: `/api/history/sales/${encodeURIComponent(number)}`,
      headers: { cookie: cookies.owner! },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: HISTORY_MESSAGES.invalidSaleNumber },
    });
    expect(findSale).not.toHaveBeenCalled();
  });
  it.each(['2147483648', '12345678901234567890'])(
    'conserva el número grande %s en su 404 sin buscar',
    async (number) => {
      const response = await app.inject({
        url: `/api/history/sales/${number}`,
        headers: { cookie: cookies.owner! },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: { code: 'NOT_FOUND', message: `No existe la venta N.º ${number}` },
      });
      expect(findSale).not.toHaveBeenCalled();
    },
  );
  it('responde 404 si no existe la venta', async () => {
    findSale.mockResolvedValue(null);
    const response = await app.inject({
      url: '/api/history/sales/99',
      headers: { cookie: cookies.owner! },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe la venta N.º 99' },
    });
  });
  it.each(['3', 'abc', '12345678901234567890'])(
    'rechaza al cajero y a quien no tenga sesión antes de buscar %s',
    async (number) => {
      const url = `/api/history/sales/${number}`;
      expect((await app.inject(url)).statusCode).toBe(401);
      const response = await app.inject({ url, headers: { cookie: cookies.cashier! } });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: { code: 'FORBIDDEN', message: HISTORY_MESSAGES.forbidden },
      });
      expect(findSale).not.toHaveBeenCalled();
    },
  );

  it.each(['', '?date=2026-10-24', '?date=2026-10-24&ignored=yes', '?date=2026-10-24&date=ayer'])(
    'responde al dueño con contrato válido %s',
    async (query) => {
      const response = await app.inject({
        url: `/api/history/day${query}`,
        headers: { cookie: cookies.owner! },
      });
      expect(response.statusCode).toBe(200);
      expect(dayHistorySchema.parse(response.json())).toMatchObject({
        date: query ? '2026-10-24' : '2026-10-25',
        salesCount: 1,
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(listSales).toHaveBeenCalledOnce();
    },
  );
  it.each(['', '?date=ayer', '?date=2026-10-26'])(
    'rechaza al cajero antes de validar o leer %s',
    async (query) => {
      const response = await app.inject({
        url: `/api/history/day${query}`,
        headers: { cookie: cookies.cashier! },
      });
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: { code: 'FORBIDDEN', message: HISTORY_MESSAGES.forbidden },
      });
      expect(listSales).not.toHaveBeenCalled();
    },
  );
  it('rechaza sin sesión y no acepta POST', async () => {
    expect((await app.inject('/api/history/day?date=ayer')).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/history/day',
          headers: { cookie: cookies.owner! },
        })
      ).statusCode,
    ).toBe(404);
    expect(listSales).not.toHaveBeenCalled();
  });
  it.each([
    ['2026-02-30', HISTORY_MESSAGES.invalidDate],
    ['ayer', HISTORY_MESSAGES.invalidDate],
    ['2026-10-26', HISTORY_MESSAGES.futureDate],
  ])('responde 400 para %s', async (date, message) => {
    const response = await app.inject({
      url: `/api/history/day?date=${date}`,
      headers: { cookie: cookies.owner! },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message } });
    expect(listSales).not.toHaveBeenCalled();
  });
});
