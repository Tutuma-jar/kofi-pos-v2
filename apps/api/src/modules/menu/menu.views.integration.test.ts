import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { saveCategory } from './categories.service.ts';
import { saveProduct } from './products.service.ts';
import { setCategoryActive } from './categories.repository.ts';
import { setProductActive } from './products.repository.ts';
import { getAdminMenu } from './menu.views.ts';
import { getCurrentMenu } from './index.ts';

describe('vistas del menú (RF-2, RF-15)', () => {
  let db: Database;
  beforeEach(async () => {
    db = await createTestDatabase();
  });
  afterEach(async () => {
    await db.close();
  });
  it('incluye todas las categorías y productos en administración, ordenados en español', async () => {
    for (const name of ['Pipa', 'Piña', 'Pino', 'Pina']) {
      const category = await saveCategory(db, { name });
      if (name === 'Pina') {
        for (const name of ['Piña', 'Pipa', 'Pina', 'Pino'])
          await saveProduct(db, { name, categoryId: category.id, price: '12,5' });
      } else await setCategoryActive(db, category.id, false);
    }
    const menu = await getAdminMenu(db);
    expect(menu.map((c) => c.name)).toEqual(['Pina', 'Pino', 'Piña', 'Pipa']);
    expect(menu[0]!.products.map((p) => p.name)).toEqual(['Pina', 'Pino', 'Piña', 'Pipa']);
    expect(menu[1]).toMatchObject({ active: false, products: [] });
    expect(menu[0]!.products[0]).toMatchObject({ priceCents: 1250, active: true });
  });
  it('expone solo los productos vendibles con categoría y precio vigente; excluye categorías vacías', async () => {
    const hot = await saveCategory(db, { name: 'Bebidas' });
    const season = await saveCategory(db, { name: 'Temporada' });
    await saveCategory(db, { name: 'Vacía' });
    const coffee = await saveProduct(db, { name: 'Café', categoryId: hot.id, price: '12,5' });
    const tea = await saveProduct(db, { name: 'Té', categoryId: hot.id, price: '8' });
    const api = await saveProduct(db, { name: 'Api', categoryId: season.id, price: '10' });
    await setProductActive(db, tea.id, false);
    await setProductActive(db, api.id, false);
    await setCategoryActive(db, season.id, false);
    expect(await getCurrentMenu(db)).toEqual([
      {
        id: hot.id,
        name: 'Bebidas',
        products: [{ id: coffee.id, name: 'Café', priceCents: 1250 }],
      },
    ]);
    expect((await getAdminMenu(db)).find((c) => c.id === hot.id)!.products).toHaveLength(2);
    await saveProduct(db, { name: 'Café', categoryId: hot.id, price: '13' }, coffee.id);
    expect((await getCurrentMenu(db))[0]!.products[0]!.priceCents).toBe(1300);
  });
  it('devuelve listas vacías con un menú vacío', async () => {
    expect(await getAdminMenu(db)).toEqual([]);
    expect(await getCurrentMenu(db)).toEqual([]);
  });
});
