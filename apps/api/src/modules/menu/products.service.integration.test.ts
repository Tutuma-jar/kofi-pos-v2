import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { saveCategory } from './categories.service.ts';
import { setCategoryActive } from './categories.repository.ts';
import { findProductById, setProductActive } from './products.repository.ts';
import { saveProduct } from './products.service.ts';

describe('guardar productos (RF-4 a RF-8, RF-11, RF-12)', () => {
  let db: Database;
  let categoryId: string;
  beforeEach(async () => {
    db = await createTestDatabase();
    categoryId = (await saveCategory(db, { name: 'Bebidas' })).id;
  });
  afterEach(async () => {
    await db.close();
  });
  const input = () => ({ name: '  Café   americano  ', categoryId, price: '12,5' });

  it('crea activo con nombre normalizado y precio exacto, y edita todos los datos', async () => {
    const product = await saveProduct(db, input());
    expect(product).toMatchObject({ name: 'Café americano', priceCents: 1250, active: true });
    const other = await saveCategory(db, { name: 'Jugos' });
    await setProductActive(db, product.id, false);
    const edited = await saveProduct(
      db,
      { name: 'CAFÉ AMERICANO', categoryId: other.id, price: '13' },
      product.id,
    );
    expect(edited).toEqual({
      ...product,
      name: 'CAFÉ AMERICANO',
      categoryId: other.id,
      priceCents: 1300,
      active: false,
    });
    expect(await findProductById(db, product.id)).toEqual(edited);
  });

  it('devuelve los tres campos inválidos juntos, incluido el nombre repetido de la base', async () => {
    await saveProduct(db, input());
    await expect(
      saveProduct(db, { name: 'CAFE AMERICANO', categoryId: '', price: '0' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      details: {
        fields: {
          name: 'Ya existe un producto con ese nombre',
          categoryId: 'Elige una categoría',
          price: 'El precio debe ser mayor que 0',
        },
      },
    });
    expect((await db.query('SELECT * FROM products')).rows).toHaveLength(1);
  });

  it('cuenta nombres inactivos y en otras categorías y no modifica el producto rechazado', async () => {
    const first = await saveProduct(db, input());
    await setProductActive(db, first.id, false);
    const other = await saveCategory(db, { name: 'Jugos' });
    await expect(saveProduct(db, { ...input(), categoryId: other.id })).rejects.toMatchObject({
      statusCode: 400,
    });
    const second = await saveProduct(db, { ...input(), name: 'Té' });
    await expect(saveProduct(db, { ...input(), price: '20' }, second.id)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(await findProductById(db, second.id)).toEqual(second);
  });

  it('rechaza crear y mover a una categoría inactiva, pero permite editar en la propia', async () => {
    const product = await saveProduct(db, input());
    await setProductActive(db, product.id, false);
    await setCategoryActive(db, categoryId, false);
    await expect(saveProduct(db, { ...input(), name: 'Otro' })).rejects.toMatchObject({
      details: { fields: { categoryId: 'Elige una categoría activa' } },
    });
    expect(await saveProduct(db, { ...input(), price: '0,1' }, product.id)).toMatchObject({
      priceCents: 10,
      active: false,
    });
    const other = await saveCategory(db, { name: 'Jugos' });
    const second = await saveProduct(db, { name: 'Jugo', categoryId: other.id, price: '10' });
    await expect(
      saveProduct(db, { name: 'Jugo', categoryId, price: '10' }, second.id),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rechaza categoría inexistente y producto inexistente', async () => {
    const missing = '11111111-1111-4111-8111-111111111111';
    await expect(saveProduct(db, { ...input(), categoryId: missing })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(saveProduct(db, input(), missing)).rejects.toMatchObject({ statusCode: 404 });
  });

  it.each(['23505', 'KM001'])(
    'traduce la carrera %s y revierte una escritura parcial',
    async (code) => {
      const racing: Database = {
        ...db,
        transaction: (work) =>
          db.transaction((tx) =>
            work({
              ...tx,
              query: async (sql, params) => {
                if (sql.startsWith('INSERT INTO products')) {
                  await tx.query(sql, params);
                  throw Object.assign(new Error('carrera simulada'), { code });
                }
                return tx.query(sql, params);
              },
            }),
          ),
      };
      await expect(saveProduct(racing, input())).rejects.toMatchObject({
        statusCode: 400,
        details: {
          fields:
            code === '23505'
              ? { name: 'Ya existe un producto con ese nombre' }
              : { categoryId: 'Elige una categoría activa' },
        },
      });
      expect((await db.query('SELECT * FROM products')).rows).toEqual([]);
    },
  );
});
