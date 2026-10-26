import { saleSchema, type SaleLine } from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import {
  findSaleByDraftId,
  findSaleByNumber,
  insertSale,
  listRegisteredSales,
  nextSaleNumber,
  type NewSale,
} from './sales.repository.ts';

// sales.repository.ts (plan §5.3, §6.3): número, venta con sus líneas y búsquedas.

const DRAFT_1 = '4f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e11';
const DRAFT_2 = 'c8a9b0c1-d2e3-4f4a-8b5c-6d7e8f9a0b02';
const DRAFT_3 = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d03';

let db: Database;
let userId: string;
let americano: SaleLine;
let empanada: SaleLine;

async function insertProduct(categoryId: string, name: string, priceCents: number) {
  const result = await db.query<{ id: string }>(
    `INSERT INTO products (name, name_key, category_id, price_cents)
     VALUES ($1, lower($1), $2, $3) RETURNING id`,
    [name, categoryId, priceCents],
  );
  return result.rows[0]!.id;
}

beforeEach(async () => {
  db = await createTestDatabase();
  userId = (
    await db.query<{ id: string }>(
      `INSERT INTO users (username, display_name, role, password_hash)
       VALUES ('ana', 'Ana', 'cashier', 'x') RETURNING id`,
    )
  ).rows[0]!.id;
  const categoryId = (
    await db.query<{ id: string }>(
      `INSERT INTO categories (name, name_key) VALUES ('Bebidas calientes', 'bebidas calientes')
       RETURNING id`,
    )
  ).rows[0]!.id;
  americano = {
    productId: await insertProduct(categoryId, 'Café americano', 1250),
    productName: 'Café americano',
    categoryName: 'Bebidas calientes',
    quantity: 2,
    unitPriceCents: 1250,
    subtotalCents: 2500,
  };
  empanada = {
    productId: await insertProduct(categoryId, 'Empanada', 800),
    productName: 'Empanada',
    categoryName: 'Salados',
    quantity: 1,
    unitPriceCents: 800,
    subtotalCents: 800,
  };
});

afterEach(async () => {
  await db.close();
});

function newSale(
  number: number,
  draftId: string,
  registeredAt: string,
  paymentMethod: NewSale['paymentMethod'] = 'cash',
): NewSale {
  return {
    number,
    draftId,
    registeredAt: new Date(registeredAt),
    registeredBy: { userId, displayName: 'Ana', role: 'cashier' },
    lines: [empanada, americano],
    totalCents: 3300,
    paymentMethod,
  };
}

describe('findSaleByNumber (SPEC-005 RF-7, RF-8, RF-9)', () => {
  it('devuelve la venta pedida, sus líneas en orden y null si no existe', async () => {
    const first = await db.transaction((tx) =>
      insertSale(tx, newSale(1, DRAFT_1, '2026-10-24T18:05:12Z')),
    );
    const second = await db.transaction((tx) =>
      insertSale(tx, newSale(2, DRAFT_2, '2026-10-25T13:15:00Z', 'qr')),
    );
    expect(saleSchema.parse(await findSaleByNumber(db, 2))).toEqual(second);
    expect((await findSaleByNumber(db, 2))?.lines).toEqual([empanada, americano]);
    expect(await findSaleByNumber(db, 1)).toEqual(first);
    expect(await findSaleByNumber(db, 99)).toBeNull();
    expect(await listRegisteredSales(db)).toEqual([first, second]);
  });
});

describe('nextSaleNumber (RF-6, RF-10)', () => {
  it('da 1, 2 y 3', async () => {
    const numbers = [];
    for (let i = 0; i < 3; i++) numbers.push(await db.transaction((tx) => nextSaleNumber(tx)));
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('no deja saltos si la transacción falla después de tomar el número', async () => {
    await expect(
      db.transaction(async (tx) => {
        await nextSaleNumber(tx);
        throw new Error('fallo a mitad del registro');
      }),
    ).rejects.toThrow('fallo a mitad del registro');
    expect(await db.transaction((tx) => nextSaleNumber(tx))).toBe(1);
  });
});

describe('insertSale y findSaleByDraftId (RF-6, RF-8, RF-11)', () => {
  it('guarda la venta con sus líneas en orden y la devuelve con el formato del contrato', async () => {
    const sale = await db.transaction((tx) =>
      insertSale(tx, newSale(1, DRAFT_1, '2026-10-24T18:05:12Z')),
    );
    expect(saleSchema.parse(sale)).toEqual(sale);
    expect(sale).toMatchObject({
      number: 1,
      registeredAt: '2026-10-24T18:05:12.000Z',
      registeredBy: { userId, displayName: 'Ana', role: 'cashier' },
      lines: [empanada, americano],
      totalCents: 3300,
      paymentMethod: 'cash',
    });
    expect(await findSaleByDraftId(db, DRAFT_1)).toEqual(sale);
  });

  it('no encuentra un draftId que no se registró', async () => {
    expect(await findSaleByDraftId(db, DRAFT_2)).toBeNull();
  });

  it('lee una venta cuya cuenta se eliminó', async () => {
    await db.transaction((tx) => insertSale(tx, newSale(1, DRAFT_1, '2026-10-24T18:05:12Z')));
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    expect((await findSaleByDraftId(db, DRAFT_1))?.registeredBy).toEqual({
      userId: null,
      displayName: 'Ana',
      role: 'cashier',
    });
  });
});

describe('listRegisteredSales (RF-11)', () => {
  beforeEach(async () => {
    await db.transaction((tx) => insertSale(tx, newSale(2, DRAFT_2, '2026-10-24T20:00:00Z', 'qr')));
    await db.transaction((tx) => insertSale(tx, newSale(1, DRAFT_1, '2026-10-24T12:00:00Z')));
    await db.transaction((tx) => insertSale(tx, newSale(3, DRAFT_3, '2026-10-25T04:00:00Z')));
  });

  it('devuelve todas las ventas ordenadas por número', async () => {
    const sales = await listRegisteredSales(db);
    expect(sales.map((sale) => [sale.number, sale.paymentMethod])).toEqual([
      [1, 'cash'],
      [2, 'qr'],
      [3, 'cash'],
    ]);
    for (const sale of sales) expect(saleSchema.parse(sale)).toEqual(sale);
  });

  it('incluye from y excluye to', async () => {
    const sales = await listRegisteredSales(db, {
      from: new Date('2026-10-24T12:00:00Z'),
      to: new Date('2026-10-25T04:00:00Z'),
    });
    expect(sales.map((sale) => sale.number)).toEqual([1, 2]);
  });
});
