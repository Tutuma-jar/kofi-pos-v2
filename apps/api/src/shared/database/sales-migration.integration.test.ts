import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database, Queryable } from './database.ts';
import { migrate } from './migrate.ts';

// 003_sales.sql (SPEC-003, plan §4): número, ventas, líneas y su integridad (D-4).

interface Fixture {
  userId: string;
  americano: string;
  empanada: string;
}

async function insertFixture(db: Database): Promise<Fixture> {
  const user = await db.query<{ id: string }>(
    `INSERT INTO users (username, display_name, role, password_hash)
     VALUES ('ana', 'Ana', 'cashier', 'x') RETURNING id`,
  );
  const category = await db.query<{ id: string }>(
    `INSERT INTO categories (name, name_key) VALUES ('Bebidas calientes', 'bebidas calientes')
     RETURNING id`,
  );
  const insertProduct = async (name: string, priceCents: number) =>
    (
      await db.query<{ id: string }>(
        `INSERT INTO products (name, name_key, category_id, price_cents)
         VALUES ($1, lower($1), $2, $3) RETURNING id`,
        [name, category.rows[0]!.id, priceCents],
      )
    ).rows[0]!.id;
  return {
    userId: user.rows[0]!.id,
    americano: await insertProduct('Café americano', 1250),
    empanada: await insertProduct('Empanada', 800),
  };
}

interface LineInput {
  productId: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents?: number;
}

let draftCounter = 0;

async function insertSale(
  tx: Queryable,
  fixture: Fixture,
  { number = 1, totalCents, lines }: { number?: number; totalCents: number; lines: LineInput[] },
) {
  const draftId = `00000000-0000-4000-8000-${String(++draftCounter).padStart(12, '0')}`;
  const sale = await tx.query<{ id: string }>(
    `INSERT INTO sales (number, draft_id, registered_at, registered_by_user_id, registered_by_name,
       registered_by_role, total_cents)
     VALUES ($1, $2, '2026-10-24T18:05:12Z', $3, 'Ana', 'cashier', $4) RETURNING id`,
    [number, draftId, fixture.userId, totalCents],
  );
  const saleId = sale.rows[0]!.id;
  for (const [index, line] of lines.entries()) {
    await tx.query(
      `INSERT INTO sale_lines (sale_id, position, product_id, product_name, category_name,
         unit_price_cents, quantity, subtotal_cents)
       VALUES ($1, $2, $3, 'Producto', 'Categoría', $4, $5, $6)`,
      [
        saleId,
        index + 1,
        line.productId,
        line.unitPriceCents,
        line.quantity,
        line.subtotalCents ?? line.unitPriceCents * line.quantity,
      ],
    );
  }
  return saleId;
}

describe('003_sales.sql', () => {
  let db: Database;
  let fixture: Fixture;

  beforeEach(async () => {
    db = await createTestDatabase();
    fixture = await insertFixture(db);
  });

  afterEach(async () => {
    await db.close();
  });

  const twoLines = (): { totalCents: number; lines: LineInput[] } => ({
    totalCents: 3300,
    lines: [
      { productId: fixture.americano, unitPriceCents: 1250, quantity: 2 },
      { productId: fixture.empanada, unitPriceCents: 800, quantity: 1 },
    ],
  });

  it('se aplica sin errores aunque las migraciones se ejecuten dos veces', async () => {
    await expect(migrate(db)).resolves.toEqual([]);
  });

  it('empieza el contador en 0, con una sola fila', async () => {
    const counter = await db.query('SELECT id, last_number FROM sale_counter');
    expect(counter.rows).toEqual([{ id: true, last_number: 0 }]);
    await expect(db.query('INSERT INTO sale_counter (id) VALUES (false)')).rejects.toThrow(
      /check/i,
    );
  });

  it('guarda una venta con sus líneas en una transacción', async () => {
    await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
    const lines = await db.query('SELECT position, subtotal_cents FROM sale_lines ORDER BY 1');
    expect(lines.rows).toEqual([
      { position: 1, subtotal_cents: 2500 },
      { position: 2, subtotal_cents: 800 },
    ]);
  });

  it('rechaza un subtotal distinto del precio por la cantidad', async () => {
    const sale = twoLines();
    sale.lines[0]!.subtotalCents = 2400;
    await expect(db.transaction((tx) => insertSale(tx, fixture, sale))).rejects.toThrow(/check/i);
  });

  it.each([0, 100])('rechaza una cantidad de %i', async (quantity) => {
    const sale = {
      totalCents: 1250 * quantity || 1,
      lines: [{ productId: fixture.americano, unitPriceCents: 1250, quantity }],
    };
    await expect(db.transaction((tx) => insertSale(tx, fixture, sale))).rejects.toThrow(/check/i);
  });

  it('rechaza un número o un draft_id repetidos', async () => {
    await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
    await expect(db.transaction((tx) => insertSale(tx, fixture, twoLines()))).rejects.toThrow(
      /unique|duplicate/i,
    );
    const draft = await db.query<{ draft_id: string }>('SELECT draft_id FROM sales');
    await expect(
      db.query(
        `INSERT INTO sales (number, draft_id, registered_at, registered_by_name, registered_by_role,
           total_cents) VALUES (2, $1, now(), 'Ana', 'cashier', 1)`,
        [draft.rows[0]!.draft_id],
      ),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  describe('sales_check_lines (KS001)', () => {
    it('rechaza al confirmar una venta cuyo total no es la suma de sus líneas', async () => {
      const sale = { ...twoLines(), totalCents: 3200 };
      await expect(db.transaction((tx) => insertSale(tx, fixture, sale))).rejects.toMatchObject({
        code: 'KS001',
      });
      expect((await db.query('SELECT 1 FROM sales')).rowCount).toBe(0);
    });

    it('rechaza una venta sin líneas', async () => {
      await expect(
        db.transaction((tx) => insertSale(tx, fixture, { totalCents: 100, lines: [] })),
      ).rejects.toMatchObject({ code: 'KS001' });
    });

    it('rechaza añadir una línea a una venta ya registrada', async () => {
      const saleId = await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
      const otherProduct = await db.query<{ id: string }>(
        `INSERT INTO products (name, name_key, category_id, price_cents)
         SELECT 'Té', 'te', category_id, 100 FROM products WHERE id = $1 RETURNING id`,
        [fixture.americano],
      );
      await expect(
        db.query(
          `INSERT INTO sale_lines (sale_id, position, product_id, product_name, category_name,
             unit_price_cents, quantity, subtotal_cents)
           VALUES ($1, 3, $2, 'Té', 'Categoría', 100, 1, 100)`,
          [saleId, otherProduct.rows[0]!.id],
        ),
      ).rejects.toMatchObject({ code: 'KS001' });
    });
  });

  describe('ventas inmutables (KS002)', () => {
    it.each([
      ['modificar una venta', 'UPDATE sales SET total_cents = 1'],
      ['borrar una venta', 'DELETE FROM sales'],
      ['modificar una línea', 'UPDATE sale_lines SET quantity = 1'],
      ['borrar una línea', 'DELETE FROM sale_lines'],
    ])('no permite %s', async (_case, sql) => {
      await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
      await expect(db.query(sql)).rejects.toMatchObject({ code: 'KS002' });
    });

    it('al eliminar la cuenta deja registered_by_user_id en NULL con el nombre y el rol', async () => {
      await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
      await db.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
      const sale = await db.query(
        'SELECT registered_by_user_id, registered_by_name, registered_by_role FROM sales',
      );
      expect(sale.rows).toEqual([
        { registered_by_user_id: null, registered_by_name: 'Ana', registered_by_role: 'cashier' },
      ]);
    });
  });

  it('no permite borrar un producto que aparece en una venta', async () => {
    await db.transaction((tx) => insertSale(tx, fixture, twoLines()));
    await expect(
      db.query('DELETE FROM products WHERE id = $1', [fixture.americano]),
    ).rejects.toThrow(/foreign key|violates/i);
  });
});
