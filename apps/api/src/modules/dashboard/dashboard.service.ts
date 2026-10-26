import type { Sale, TodaySummary, MonthSummary } from '@kofi/contracts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { boliviaDayRange, boliviaMonthRange } from '../../shared/calendar.ts';
import { summarizeSales, salesByDay } from './dashboard.summary.ts';

export interface DashboardDeps {
  db: Database;
  clock: Clock;
  listSales(db: Database, range: { from?: Date; to?: Date }): Promise<Sale[]>;
}

export function createDashboardService({ db, clock, listSales }: DashboardDeps) {
  return {
    async month(): Promise<MonthSummary> {
      const now = clock.now();
      const { month, days, from, to } = boliviaMonthRange(now);
      const sales = await listSales(db, { from, to });
      return {
        month,
        asOf: now.toISOString(),
        ...summarizeSales(sales),
        days: salesByDay(sales, days),
      };
    },
    async today(): Promise<TodaySummary> {
      const now = clock.now();
      const { date, from, to } = boliviaDayRange(now);
      const sales = await listSales(db, { from, to });
      return { date, asOf: now.toISOString(), ...summarizeSales(sales) };
    },
  };
}
