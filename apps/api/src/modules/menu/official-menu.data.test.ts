import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  categoryNameSchema,
  formatPrice,
  menuNameKey,
  priceSchema,
  productNameSchema,
} from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { OFFICIAL_MENU } from './official-menu.data.ts';

const SPEC_PATH = join(import.meta.dirname, '../../../../../specs/006-menu-inicial/spec.md');

// Filas de la tabla «Menú oficial» de spec.md: categoría, producto y precio (D-6).
function specMenuRows(): string[][] {
  const section = readFileSync(SPEC_PATH, 'utf8').split('### Menú oficial')[1]!.split('\n## ')[0]!;
  return section
    .split('\n')
    .filter(
      (line) => line.startsWith('| ') && !line.startsWith('| Categoría') && !line.includes('---'),
    )
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}

const products = OFFICIAL_MENU.flatMap((category) => category.products);

describe('menú oficial (RF-1)', () => {
  it('tiene 6 categorías y 37 productos', () => {
    expect(OFFICIAL_MENU).toHaveLength(6);
    expect(products).toHaveLength(37);
  });

  it('cumple las reglas de nombres y precios de SPEC-002 sin cambiar al normalizarse', () => {
    for (const category of OFFICIAL_MENU) {
      expect(categoryNameSchema.parse(category.name)).toBe(category.name);
      for (const product of category.products) {
        expect(productNameSchema.parse(product.name)).toBe(product.name);
        expect(priceSchema.safeParse(product.price).success).toBe(true);
      }
    }
  });

  it('no repite nombres según «Comparación de nombres»', () => {
    const categoryKeys = OFFICIAL_MENU.map((category) => menuNameKey(category.name));
    const productKeys = products.map((product) => menuNameKey(product.name));
    expect(new Set(categoryKeys).size).toBe(categoryKeys.length);
    expect(new Set(productKeys).size).toBe(productKeys.length);
  });

  it('coincide fila por fila con la tabla «Menú oficial» de spec.md', () => {
    const rows = OFFICIAL_MENU.flatMap((category) =>
      category.products.map((product) => [
        category.name,
        product.name,
        formatPrice(priceSchema.parse(product.price)),
      ]),
    );
    expect(rows).toEqual(specMenuRows());
  });
});
