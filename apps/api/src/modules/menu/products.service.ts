import { categoryIdSchema, menuNameKey, priceSchema, productNameSchema } from '@kofi/contracts';
import type { Database } from '../../shared/database/database.ts';
import { AppError, VALIDATION_MESSAGE } from '../../shared/http/errors.ts';
import { findCategoryById } from './categories.repository.ts';
import {
  findProductById,
  findProductByNameKey,
  insertProduct,
  updateProduct,
} from './products.repository.ts';

const duplicateName = 'Ya existe un producto con ese nombre';
const inactiveCategory = 'Elige una categoría activa';

export async function saveProduct(
  db: Database,
  input: { name?: unknown; categoryId?: unknown; price?: unknown },
  id?: string,
) {
  const name = productNameSchema.safeParse(input.name);
  const price = priceSchema.safeParse(input.price);
  const categoryId = categoryIdSchema.safeParse(input.categoryId);
  const fields: Record<string, string> = {};
  for (const [field, result] of [
    ['name', name],
    ['price', price],
    ['categoryId', categoryId],
  ] as const) {
    if (!result.success) fields[field] = result.error.issues[0]!.message;
  }
  try {
    return await db.transaction(async (tx) => {
      const current = id ? await findProductById(tx, id, { forUpdate: true }) : null;
      if (id && !current) throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto');
      if (categoryId.success) {
        const category = await findCategoryById(tx, categoryId.data, { lock: 'share' });
        if (!category || (!category.active && current?.categoryId !== category.id))
          fields.categoryId = inactiveCategory;
      }
      if (
        name.success &&
        (await findProductByNameKey(tx, menuNameKey(name.data), { excludeId: id }))
      )
        fields.name = duplicateName;
      if (!name.success || !price.success || !categoryId.success || Object.keys(fields).length) {
        throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, { fields });
      }
      const product = {
        name: name.data,
        nameKey: menuNameKey(name.data),
        categoryId: categoryId.data,
        priceCents: price.data,
      };
      return id ? (await updateProduct(tx, id, product))! : insertProduct(tx, product);
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '23505' || code === 'KM001') {
      throw new AppError(400, 'VALIDATION_ERROR', VALIDATION_MESSAGE, {
        fields: code === '23505' ? { name: duplicateName } : { categoryId: inactiveCategory },
      });
    }
    throw error;
  }
}
