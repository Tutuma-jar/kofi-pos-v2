import type { Sale, TodaySummary } from '@kofi/contracts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { boliviaDayRange } from '../../shared/calendar.ts';
import { summarizeSales } from './dashboard.summary.ts';

export interface DashboardDeps {
  db: Database;
  clock: Clock;
  listSales(db: Database, range: { from?: Date; to?: Date }): Promise<Sale[]>;
}

export function createDashboardService({ db, clock, listSales }: DashboardDeps) {
  return {
    async today(): Promise<TodaySummary> {
      const now = clock.now();
      const { date, from, to } = boliviaDayRange(now);
      const sales = await listSales(db, { from, to });
      return { date, asOf: now.toISOString(), ...summarizeSales(sales) };
    },
  };
}
