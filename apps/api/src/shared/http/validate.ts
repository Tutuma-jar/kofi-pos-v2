import { ERROR_CODES } from '@kofi/contracts';
import type { z } from 'zod';
import { AppError, VALIDATION_MESSAGE } from './errors.ts';

// Valida datos de una petición con un esquema del contrato. Si no cumplen, lanza
// 400 VALIDATION_ERROR con el primer mensaje de cada campo en `fields`.
export function validate<Schema extends z.ZodType>(
  schema: Schema,
  data: unknown,
): z.output<Schema> {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join('.');
    if (field && !(field in fields)) fields[field] = issue.message;
  }
  throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, VALIDATION_MESSAGE, { fields });
}
