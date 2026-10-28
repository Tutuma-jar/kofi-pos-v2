import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatPrice } from '@kofi/contracts';
import { createTestDatabase } from './test-database.ts';
import { loadOfficialMenuFixture } from './official-menu-fixture.ts';
import type { Database } from '../src/shared/database/database.ts';
import { getAdminMenu, OFFICIAL_MENU } from '../src/modules/menu/index.ts';

describe('menú oficial para las pruebas de SPEC-007 (plan §8.1)', () => {
  let db: Database;
  beforeEach(async () => {
    db = await createTestDatabase();
  });
  afterEach(async () => {
    await db.close();
  });

  it('deja las 6 categorías y los 37 productos oficiales activos, con sus precios', async () => {
    await loadOfficialMenuFixture(db);
    const menu = await getAdminMenu(db);
    expect(menu).toHaveLength(6);
    expect(menu.every((category) => category.active)).toBe(true);
    const loaded = menu.flatMap((category) =>
      category.products.map((product) => ({
        category: category.name,
        name: product.name,
        price: formatPrice(product.priceCents),
        active: product.active,
      })),
    );
    expect(loaded).toHaveLength(37);
    const expected = OFFICIAL_MENU.flatMap((category) =>
      category.products.map((product) => ({
        category: category.name,
        name: product.name,
        price: `Bs ${product.price}`,
        active: true,
      })),
    );
    expect(loaded).toEqual(expect.arrayContaining(expected));
  });
});
