import { categoryNameSchema, menuNameKey } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import { AppError, VALIDATION_MESSAGE } from '../../shared/http/errors.ts';
import {
  findCategoryById,
  findCategoryByNameKey,
  insertCategory,
  updateCategoryName,
} from './categories.repository.ts';

const duplicateName = 'Ya existe una categoría con ese nombre';

export async function saveCategory(db: Database, input: { name?: unknown }, id?: string) {
  const parsed = categoryNameSchema.safeParse(input.name);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, {
      fields: { name: parsed.error.issues[0]!.message },
    });
  }
  try {
    return await db.transaction(async (tx) => {
      if (id && !(await findCategoryById(tx, id, { lock: 'update' }))) {
        throw new AppError(404, 'NOT_FOUND', 'No se encontró la categoría');
      }
      const name = parsed.data;
      const nameKey = menuNameKey(name);
      if (await findCategoryByNameKey(tx, nameKey, { excludeId: id })) {
        throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, {
          fields: { name: duplicateName },
        });
      }
      return id
        ? (await updateCategoryName(tx, id, { name, nameKey }))!
        : insertCategory(tx, { name, nameKey });
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, {
        fields: { name: duplicateName },
      });
    }
    throw error;
  }
}
