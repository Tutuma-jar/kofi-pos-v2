import { describe, expect, it, vi } from 'vitest';
import { todaySummarySchema, monthSummarySchema } from '@kofi/contracts';
import { createFakeClock } from '../../shared/clock.ts';
import { boliviaDayRange, boliviaMonthRange } from '../../shared/calendar.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { testSale } from '../../../test/test-sales.ts';
import { createDashboardService } from './dashboard.service.ts';

describe('servicio de dashboard (RF-2, RF-6, RF-8)', () => {
  it('consulta el mes hasta hoy con rango y días de Bolivia (RF-9, RF-10)', async () => {
    const db = await createTestDatabase();
    try {
      const clock = createFakeClock(new Date('2026-10-25T03:59:59.999Z'));
      const listSales = vi.fn().mockResolvedValue([testSale()]);
      const service = createDashboardService({ db, clock, listSales });
      const summary = monthSummarySchema.parse(await service.month());
      const range = boliviaMonthRange(clock.now());
      expect(listSales).toHaveBeenCalledWith(db, { from: range.from, to: range.to });
      expect(summary).toMatchObject({
        month: '2026-10',
        asOf: clock.now().toISOString(),
        totalCents: 1250,
        salesCount: 1,
      });
      expect(summary.days.map((day) => day.date)).toEqual(range.days);
      expect(summary.days[0]).toEqual({ date: '2026-10-01', totalCents: 0, salesCount: 0 });
      expect(summary.days[23]).toEqual({ date: '2026-10-24', totalCents: 1250, salesCount: 1 });
      clock.set(new Date('2026-11-01T04:00:00Z'));
      listSales.mockResolvedValue([]);
      expect(monthSummarySchema.parse(await service.month())).toMatchObject({
        month: '2026-11',
        days: [{ date: '2026-11-01', totalCents: 0, salesCount: 0 }],
      });
    } finally {
      await db.close();
    }
  });
  it('consulta el rango de Bolivia hasta el instante del reloj y cambia de día a medianoche', async () => {
    const db = await createTestDatabase();
    try {
      const clock = createFakeClock(new Date('2026-10-25T03:59:59.999Z'));
      const listSales = vi.fn().mockResolvedValue([testSale()]);
      const service = createDashboardService({ db, clock, listSales });
      const first = todaySummarySchema.parse(await service.today());
      expect(first).toMatchObject({
        date: '2026-10-24',
        asOf: clock.now().toISOString(),
        totalCents: 1250,
        salesCount: 1,
      });
      const { from, to } = boliviaDayRange(clock.now());
      expect(listSales).toHaveBeenLastCalledWith(db, { from, to });
      clock.advance(1);
      listSales.mockResolvedValue([]);
      expect(todaySummarySchema.parse(await service.today())).toMatchObject({
        date: '2026-10-25',
        asOf: '2026-10-25T04:00:00.000Z',
        salesCount: 0,
      });
      expect(listSales).toHaveBeenLastCalledWith(db, {
        from: new Date('2026-10-25T04:00:00.000Z'),
        to: new Date('2026-10-25T04:00:00.001Z'),
      });
    } finally {
      await db.close();
    }
  });
});
