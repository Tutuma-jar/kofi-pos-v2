import {
  historyDateSchema,
  HISTORY_MIN_DATE,
  HISTORY_MESSAGES,
  parseSaleNumber,
  SALE_NUMBER_MAX,
  saleNotFoundMessage,
  type DayHistory,
  type HistorySaleResponse,
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
  // La integración T021 hará obligatoria esta dependencia al conectar el lector real.
  findSale?(db: Database, number: number): Promise<Sale | null>;
}

export function createHistoryService({ db, clock, listSales, findSale }: HistoryDeps) {
  return {
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
      if (!findSale) throw new Error('Falta configurar la lectura de ventas');
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
