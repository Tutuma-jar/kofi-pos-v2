import { categoryNameSchema, menuNameKey } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import { AppError, VALIDATION_MESSAGE } from '../../shared/http/errors.ts';
import {
  findCategoryById,
  findCategoryByNameKey,
  insertCategory,
  updateCategoryName,
  countActiveProducts,
  setCategoryActive,
} from './categories.repository.ts';

const duplicateName = 'Ya existe una categoría con ese nombre';

function categoryHasProducts(count: number) {
  return new AppError(
    409,
    'CATEGORY_HAS_ACTIVE_PRODUCTS',
    `Esta categoría tiene ${count} ${count === 1 ? 'producto activo' : 'productos activos'}. Desactívalos o muévelos a otra categoría antes`,
  );
}

async function changeCategoryActive(db: Database, id: string, active: boolean) {
  try {
    return await db.transaction(async (tx) => {
      const category = await findCategoryById(tx, id, { lock: 'update' });
      if (!category) throw new AppError(404, 'NOT_FOUND', 'No se encontró la categoría');
      if (category.active === active) return category;
      if (!active) {
        const count = await countActiveProducts(tx, id);
        if (count) throw categoryHasProducts(count);
      }
      return (await setCategoryActive(tx, id, active))!;
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'KM002')
      throw categoryHasProducts(await countActiveProducts(db, id));
    throw error;
  }
}

export const deactivateCategory = (db: Database, id: string) => changeCategoryActive(db, id, false);
export const reactivateCategory = (db: Database, id: string) => changeCategoryActive(db, id, true);

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
