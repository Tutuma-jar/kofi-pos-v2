import type { Category } from '@kofi/contracts';
import type { Queryable } from '../../shared/database/database.ts';

// Acceso a la tabla categories (RF-3, RF-10, RF-12). name_key la calcula el servicio con
// menuNameKey del contrato.

export interface CategoryNames {
  name: string;
  nameKey: string;
}

const CATEGORY_COLUMNS = 'id, name, active';

export async function insertCategory(db: Queryable, { name, nameKey }: CategoryNames) {
  const result = await db.query<Category>(
    `INSERT INTO categories (name, name_key) VALUES ($1, $2) RETURNING ${CATEGORY_COLUMNS}`,
    [name, nameKey],
  );
  return result.rows[0]!;
}

// Con `lock`, bloquea la fila hasta el fin de la transacción: `update` para cambiar la categoría,
// `share` para que nadie la desactive mientras se guarda uno de sus productos (plan §5.4).
export async function findCategoryById(
  db: Queryable,
  id: string,
  { lock }: { lock?: 'update' | 'share' } = {},
): Promise<Category | null> {
  const forLock = lock === 'update' ? ' FOR UPDATE' : lock === 'share' ? ' FOR SHARE' : '';
  const result = await db.query<Category>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = $1${forLock}`,
    [id],
  );
  return result.rows[0] ?? null;
}

// Otra categoría con la misma clave, activa o inactiva (RF-3, RF-12).
export async function findCategoryByNameKey(
  db: Queryable,
  nameKey: string,
  { excludeId }: { excludeId?: string } = {},
): Promise<Category | null> {
  const result = await db.query<Category>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories
     WHERE name_key = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [nameKey, excludeId ?? null],
  );
  return result.rows[0] ?? null;
}

export async function updateCategoryName(
  db: Queryable,
  id: string,
  { name, nameKey }: CategoryNames,
): Promise<Category | null> {
  const result = await db.query<Category>(
    `UPDATE categories SET name = $2, name_key = $3, updated_at = now()
     WHERE id = $1 RETURNING ${CATEGORY_COLUMNS}`,
    [id, name, nameKey],
  );
  return result.rows[0] ?? null;
}

export async function setCategoryActive(
  db: Queryable,
  id: string,
  active: boolean,
): Promise<Category | null> {
  const result = await db.query<Category>(
    `UPDATE categories SET active = $2, updated_at = now() WHERE id = $1 RETURNING ${CATEGORY_COLUMNS}`,
    [id, active],
  );
  return result.rows[0] ?? null;
}

// Productos activos de la categoría (RF-10).
export async function countActiveProducts(db: Queryable, categoryId: string): Promise<number> {
  const result = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM products WHERE category_id = $1 AND active',
    [categoryId],
  );
  return result.rows[0]!.count;
}
