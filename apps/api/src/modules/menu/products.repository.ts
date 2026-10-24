import type { AdminProduct } from '@kofi/contracts';
import type { Queryable } from '../../shared/database/database.ts';

// Acceso a la tabla products (RF-4, RF-5, RF-9, RF-12, RF-15). name_key la calcula el servicio con
// menuNameKey del contrato; el precio va en centavos (D-2).

export interface ProductData {
  name: string;
  nameKey: string;
  categoryId: string;
  priceCents: number;
}

// Un producto vendible con su categoría, para el menú vigente (RF-15).
export interface CurrentMenuRow {
  id: string;
  name: string;
  priceCents: number;
  categoryId: string;
  categoryName: string;
}

const PRODUCT_COLUMNS = `id, name, category_id AS "categoryId", price_cents AS "priceCents", active`;

export async function insertProduct(db: Queryable, product: ProductData): Promise<AdminProduct> {
  const result = await db.query<AdminProduct>(
    `INSERT INTO products (name, name_key, category_id, price_cents)
     VALUES ($1, $2, $3, $4) RETURNING ${PRODUCT_COLUMNS}`,
    [product.name, product.nameKey, product.categoryId, product.priceCents],
  );
  return result.rows[0]!;
}

// Con `forUpdate`, bloquea la fila hasta el fin de la transacción (plan §5.3, §5.4).
export async function findProductById(
  db: Queryable,
  id: string,
  { forUpdate = false } = {},
): Promise<AdminProduct | null> {
  const result = await db.query<AdminProduct>(
    `SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return result.rows[0] ?? null;
}

// Otro producto con la misma clave, de cualquier categoría, activo o inactivo (RF-6, RF-12).
export async function findProductByNameKey(
  db: Queryable,
  nameKey: string,
  { excludeId }: { excludeId?: string } = {},
): Promise<AdminProduct | null> {
  const result = await db.query<AdminProduct>(
    `SELECT ${PRODUCT_COLUMNS} FROM products
     WHERE name_key = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [nameKey, excludeId ?? null],
  );
  return result.rows[0] ?? null;
}

// Cambia nombre, categoría y precio; el estado no cambia (RF-5).
export async function updateProduct(
  db: Queryable,
  id: string,
  product: ProductData,
): Promise<AdminProduct | null> {
  const result = await db.query<AdminProduct>(
    `UPDATE products
     SET name = $2, name_key = $3, category_id = $4, price_cents = $5, updated_at = now()
     WHERE id = $1 RETURNING ${PRODUCT_COLUMNS}`,
    [id, product.name, product.nameKey, product.categoryId, product.priceCents],
  );
  return result.rows[0] ?? null;
}

export async function setProductActive(
  db: Queryable,
  id: string,
  active: boolean,
): Promise<AdminProduct | null> {
  const result = await db.query<AdminProduct>(
    `UPDATE products SET active = $2, updated_at = now() WHERE id = $1 RETURNING ${PRODUCT_COLUMNS}`,
    [id, active],
  );
  return result.rows[0] ?? null;
}

// Todos los productos, activos e inactivos, sin orden: lo ordena la API (D-4).
export async function listProducts(db: Queryable): Promise<AdminProduct[]> {
  const result = await db.query<AdminProduct>(`SELECT ${PRODUCT_COLUMNS} FROM products`);
  return result.rows;
}

// Productos activos de categorías activas, con su categoría (menú vigente, RF-15).
export async function listCurrentMenuRows(db: Queryable): Promise<CurrentMenuRow[]> {
  const result = await db.query<CurrentMenuRow>(
    `SELECT p.id, p.name, p.price_cents AS "priceCents", c.id AS "categoryId",
       c.name AS "categoryName"
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active AND c.active`,
  );
  return result.rows;
}
