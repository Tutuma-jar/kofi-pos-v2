import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { setCategoryActive } from './categories.repository.ts';
import { saveCategory } from './categories.service.ts';

describe('guardar categorías (RF-3, RF-7, RF-8, RF-12)', () => {
  let db: Database;
  beforeEach(async () => {
    db = await createTestDatabase();
  });
  afterEach(async () => {
    await db.close();
  });

  it('crea activa, normaliza y permite cambiar solo mayúsculas y tildes', async () => {
    const created = await saveCategory(db, { name: '  bebidas   frías  ' });
    expect(created).toMatchObject({ name: 'bebidas frías', active: true });
    expect(await saveCategory(db, { name: 'Bebidas Frias' }, created.id)).toEqual({
      ...created,
      name: 'Bebidas Frias',
    });
  });

  it('rechaza nombres repetidos incluso inactivos y revierte el cambio completo', async () => {
    const first = await saveCategory(db, { name: 'Café' });
    const second = await saveCategory(db, { name: 'Jugos' });
    await setCategoryActive(db, first.id, false);
    await expect(saveCategory(db, { name: 'CAFE' }, second.id)).rejects.toMatchObject({
      statusCode: 400,
      details: { fields: { name: 'Ya existe una categoría con ese nombre' } },
    });
    expect((await db.query('SELECT name FROM categories WHERE id = $1', [second.id])).rows).toEqual(
      [{ name: 'Jugos' }],
    );
    await expect(saveCategory(db, { name: 'cafe' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('valida el nombre y responde 404 para una categoría inexistente', async () => {
    await expect(saveCategory(db, { name: '' })).rejects.toMatchObject({
      details: { fields: { name: 'Escribe el nombre de la categoría' } },
    });
    await expect(
      saveCategory(db, { name: 'Nueva' }, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('traduce la restricción única tras una carrera y deshace la transacción', async () => {
    const racing: Database = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            ...tx,
            query: async (sql, params) => {
              if (sql.startsWith('INSERT INTO categories')) {
                await tx.query(sql, params);
                throw Object.assign(new Error('colisión simulada'), {
                  code: '23505',
                  constraint: 'categories_name_key_key',
                });
              }
              return tx.query(sql, params);
            },
          }),
        ),
    };
    await expect(saveCategory(racing, { name: 'Jugos' })).rejects.toMatchObject({
      statusCode: 400,
      details: { fields: { name: 'Ya existe una categoría con ese nombre' } },
    });
    expect((await db.query('SELECT * FROM categories')).rows).toEqual([]);
  });
});
