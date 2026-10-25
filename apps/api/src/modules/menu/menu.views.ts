import {
  compareMenuNames,
  type AdminMenuResponse,
  type CurrentMenuResponse,
} from '@kofi/contracts';
import type { Queryable } from '../../shared/database/database.ts';
import { listCategories } from './categories.repository.ts';
import { listCurrentMenuRows, listProducts } from './products.repository.ts';

const byName = (a: { name: string }, b: { name: string }) => compareMenuNames(a.name, b.name);

export async function getAdminMenu(db: Queryable): Promise<AdminMenuResponse['categories']> {
  const categories = await listCategories(db);
  const products = await listProducts(db);
  return categories.sort(byName).map((category) => ({
    ...category,
    products: products.filter((product) => product.categoryId === category.id).sort(byName),
  }));
}

// Superficie compartida con Ventas: solo productos vendibles, con su precio vigente (RF-15).
export async function getCurrentMenu(db: Queryable): Promise<CurrentMenuResponse['categories']> {
  const categories = new Map<string, CurrentMenuResponse['categories'][number]>();
  for (const row of await listCurrentMenuRows(db)) {
    const category = categories.get(row.categoryId) ?? {
      id: row.categoryId,
      name: row.categoryName,
      products: [],
    };
    category.products.push({ id: row.id, name: row.name, priceCents: row.priceCents });
    categories.set(category.id, category);
  }
  return [...categories.values()]
    .sort(byName)
    .map((category) => ({ ...category, products: category.products.sort(byName) }));
}
