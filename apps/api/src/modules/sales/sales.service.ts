import {
  registerSaleRequestSchema,
  saleQuoteRequestSchema,
  SALE_MESSAGES,
  type Sale,
  type SaleQuote,
  type SessionUser,
} from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import type { Clock } from '../../shared/clock.ts';
import { validate } from '../../shared/http/validate.ts';
import { priceDraft } from './sales.pricing.ts';
import { AppError, VALIDATION_MESSAGE } from '../../shared/http/errors.ts';
import { findSaleByDraftId, insertSale, nextSaleNumber } from './sales.repository.ts';
import type { z } from 'zod';

// Las líneas son un solo campo del formulario: sus errores se entregan en fields.lines (§6.2).
function validateSales<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  try {
    return validate(schema, input);
  } catch (error) {
    if (error instanceof AppError && error.details.fields) {
      const fields: Record<string, string> = {};
      for (const [path, message] of Object.entries(error.details.fields))
        fields[path.split('.')[0]!] ??= message;
      throw new AppError(error.statusCode, error.code, error.message, { fields });
    }
    throw error;
  }
}

export interface SalesDeps {
  db: Database;
  clock: Clock;
  currentMenu(db: Database): Promise<SaleQuote['menu']>;
}

export function createSalesService({ db, clock, currentMenu }: SalesDeps) {
  function existingSale(sale: Sale, user: SessionUser) {
    if (sale.registeredBy.userId !== user.id)
      throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, {
        fields: { draftId: SALE_MESSAGES.draftTaken },
      });
    return { sale, created: false };
  }
  return {
    async quote(input: unknown): Promise<SaleQuote> {
      const { lines } = validateSales(saleQuoteRequestSchema, input);
      const menu = await currentMenu(db);
      const priced = priceDraft(lines, menu);
      return { lines: priced.lines, totalCents: priced.totalCents, notices: priced.notices, menu };
    },
    async register(input: unknown, user: SessionUser): Promise<{ sale: Sale; created: boolean }> {
      const request = validateSales(registerSaleRequestSchema, input);
      const existing = await findSaleByDraftId(db, request.draftId);
      if (existing) return existingSale(existing, user);
      const menu = await currentMenu(db);
      const priced = priceDraft(request.lines, menu);
      if (priced.menuChanged) throw new AppError(409, 'MENU_CHANGED', SALE_MESSAGES.menuChanged);
      try {
        const sale = await db.transaction(async (tx) =>
          insertSale(tx, {
            number: await nextSaleNumber(tx),
            draftId: request.draftId,
            registeredAt: clock.now(),
            registeredBy: { userId: user.id, displayName: user.displayName, role: user.role },
            paymentMethod: request.paymentMethod,
            lines: priced.lines,
            totalCents: priced.totalCents,
          }),
        );
        return { sale, created: true };
      } catch (error) {
        const conflict = error as { code?: string; constraint?: string };
        if (conflict.code === '23505' && conflict.constraint === 'sales_draft_id_key') {
          const winner = await findSaleByDraftId(db, request.draftId);
          if (winner) return existingSale(winner, user);
        }
        throw error;
      }
    },
  };
}
