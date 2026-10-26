import {
  historyDateSchema,
  HISTORY_MIN_DATE,
  HISTORY_MESSAGES,
  type DayHistory,
  type Sale,
} from '@kofi/contracts';
import { addDays, boliviaDate, boliviaDayBounds } from '../../shared/calendar.ts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { listedSales, periodTotals } from './history.report.ts';

export interface HistoryDeps {
  db: Database;
  clock: Clock;
  listSales(db: Database, range: { from?: Date; to?: Date }): Promise<Sale[]>;
}

export function createHistoryService({ db, clock, listSales }: HistoryDeps) {
  return {
    async day(dateParam?: string): Promise<DayHistory> {
      const now = clock.now();
      const today = boliviaDate(now);
      const date = dateParam ?? today;
      if (!historyDateSchema.safeParse(date).success) {
        throw new AppError(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidDate);
      }
      if (date > today) throw new AppError(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.futureDate);
      const sales = await listSales(db, boliviaDayBounds(date, now));
      return {
        date,
        today,
        previousDate: date === HISTORY_MIN_DATE ? null : addDays(date, -1),
        nextDate: date < today ? addDays(date, 1) : null,
        asOf: now.toISOString(),
        ...periodTotals(sales),
        sales: listedSales(sales),
      };
    },
  };
}
