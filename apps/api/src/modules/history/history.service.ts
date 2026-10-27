import {
  historyDateSchema,
  historyMonthSchema,
  HISTORY_MIN_DATE,
  HISTORY_MIN_MONTH,
  HISTORY_MESSAGES,
  parseSaleNumber,
  SALE_NUMBER_MAX,
  saleNotFoundMessage,
  type DayHistory,
  type HistorySaleResponse,
  type MonthHistory,
  type Sale,
} from '@kofi/contracts';
import {
  addDays,
  addMonths,
  boliviaDate,
  boliviaDayBounds,
  boliviaMonthBounds,
} from '../../shared/calendar.ts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { listedSales, periodTotals, salesByDay } from './history.report.ts';

export interface HistoryDeps {
  db: Database;
  clock: Clock;
  listSales(db: Database, range: { from?: Date; to?: Date }): Promise<Sale[]>;
  findSale(db: Database, number: number): Promise<Sale | null>;
}

export function createHistoryService({ db, clock, listSales, findSale }: HistoryDeps) {
  return {
    async month(monthParam?: string): Promise<MonthHistory> {
      const now = clock.now();
      const currentMonth = boliviaDate(now).slice(0, 'YYYY-MM'.length);
      const month = monthParam ?? currentMonth;
      if (!historyMonthSchema.safeParse(month).success) {
        throw new AppError(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidMonth);
      }
      if (month > currentMonth)
        throw new AppError(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.futureMonth);
      const { days, from, to } = boliviaMonthBounds(month, now);
      const sales = await listSales(db, { from, to });
      return {
        month,
        currentMonth,
        previousMonth: month === HISTORY_MIN_MONTH ? null : addMonths(month, -1),
        nextMonth: month < currentMonth ? addMonths(month, 1) : null,
        asOf: now.toISOString(),
        ...periodTotals(sales),
        days: salesByDay(sales, days),
      };
    },
    async sale(numberParam: string): Promise<HistorySaleResponse> {
      const number = parseSaleNumber(numberParam);
      if (number === null)
        throw new AppError(400, 'VALIDATION_ERROR', HISTORY_MESSAGES.invalidSaleNumber);
      const maximum = String(SALE_NUMBER_MAX);
      if (
        number.length > maximum.length ||
        (number.length === maximum.length && number > maximum)
      ) {
        throw new AppError(404, 'NOT_FOUND', saleNotFoundMessage(number));
      }
      const sale = await findSale(db, Number(number));
      if (!sale) throw new AppError(404, 'NOT_FOUND', saleNotFoundMessage(number));
      return { sale, date: boliviaDate(new Date(sale.registeredAt)) };
    },
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
