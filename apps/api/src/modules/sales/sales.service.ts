import { saleQuoteRequestSchema, type SaleQuote } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import type { Clock } from '../../shared/clock.ts';
import { validate } from '../../shared/http/validate.ts';
import { priceDraft } from './sales.pricing.ts';

export interface SalesDeps {
  db: Database;
  clock: Clock;
  currentMenu(db: Database): Promise<SaleQuote['menu']>;
}

export function createSalesService({ db, currentMenu }: SalesDeps) {
  return {
    async quote(input: unknown): Promise<SaleQuote> {
      const { lines } = validate(saleQuoteRequestSchema, input);
      const menu = await currentMenu(db);
      const priced = priceDraft(lines, menu);
      return { lines: priced.lines, totalCents: priced.totalCents, notices: priced.notices, menu };
    },
  };
}
