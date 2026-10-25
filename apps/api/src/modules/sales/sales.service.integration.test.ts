import { randomUUID } from 'node:crypto';
import { saleQuoteSchema, saleSchema, type SaleQuote, type SessionUser } from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createFakeClock } from '../../shared/clock.ts';
import { createSalesService } from './sales.service.ts';
import { insertSale, listRegisteredSales, nextSaleNumber } from './sales.repository.ts';

let db: Database;
beforeEach(async () => {
  db = await createTestDatabase();
});

describe('registrar una venta (RF-6 a RF-11)', () => {
  let user: SessionUser;
  let menu: SaleQuote['menu'];
  const clock = createFakeClock(new Date('2026-10-24T18:05:12Z'));
  beforeEach(async () => {
    const userId = (
      await db.query<{ id: string }>(
        "INSERT INTO users (username, display_name, role, password_hash) VALUES ('ana', 'Ana', 'cashier', 'x') RETURNING id",
      )
    ).rows[0]!.id;
    user = { id: userId, username: 'ana', displayName: 'Ana', role: 'cashier' };
    const categoryId = (
      await db.query<{ id: string }>(
        "INSERT INTO categories (name, name_key) VALUES ('Bebidas', 'bebidas') RETURNING id",
      )
    ).rows[0]!.id;
    const productId = (
      await db.query<{ id: string }>(
        "INSERT INTO products (name, name_key, category_id, price_cents) VALUES ('Café', 'cafe', $1, 1250) RETURNING id",
        [categoryId],
      )
    ).rows[0]!.id;
    menu = [
      {
        id: categoryId,
        name: 'Bebidas',
        products: [{ id: productId, name: 'Café', priceCents: 1250 }],
      },
    ];
  });
  const input = () => ({
    draftId: randomUUID(),
    paymentMethod: 'cash' as const,
    lines: [
      {
        productId: menu[0]!.products[0]!.id,
        productName: 'Café',
        quantity: 2,
        unitPriceCents: 1250,
      },
    ],
  });
  const service = (database = db, currentMenu = vi.fn(async () => menu)) =>
    createSalesService({ db: database, clock, currentMenu });

  it('guarda número, reloj, identidad, líneas y medio de pago; los reintentos preceden al menú', async () => {
    const request = input();
    const currentMenu = vi.fn(async () => menu);
    const sales = service(db, currentMenu);
    const first = await sales.register(request, user);
    expect(first.created).toBe(true);
    expect(saleSchema.parse(first.sale)).toMatchObject({
      number: 1,
      registeredAt: '2026-10-24T18:05:12.000Z',
      registeredBy: { userId: user.id, displayName: 'Ana', role: 'cashier' },
      totalCents: 2500,
      paymentMethod: 'cash',
      lines: [{ quantity: 2, subtotalCents: 2500 }],
    });
    menu = [];
    currentMenu.mockClear();
    expect(await sales.register({ ...request, paymentMethod: 'qr' }, user)).toEqual({
      sale: first.sale,
      created: false,
    });
    expect(currentMenu).not.toHaveBeenCalled();
    expect(await listRegisteredSales(db)).toEqual([first.sale]);
  });
  it.each(['price', 'removed'])('rechaza %s sin consumir número', async (change) => {
    const request = input();
    if (change === 'price') menu[0]!.products[0]!.priceCents = 1300;
    else menu = [];
    await expect(service().register(request, user)).rejects.toMatchObject({
      statusCode: 409,
      code: 'MENU_CHANGED',
    });
    expect(await listRegisteredSales(db)).toEqual([]);
    expect(await db.transaction((tx) => nextSaleNumber(tx))).toBe(1);
  });
  it('guarda el nombre y categoría nuevos sin cambiar el precio cobrado', async () => {
    const request = input();
    menu[0]!.name = 'Calientes';
    menu[0]!.products[0]!.name = 'Americano';
    const result = await service().register({ ...request, paymentMethod: 'qr' }, user);
    expect(result.sale).toMatchObject({
      paymentMethod: 'qr',
      lines: [{ productName: 'Americano', categoryName: 'Calientes', unitPriceCents: 1250 }],
    });
  });
  it('rechaza un draftId de otra cuenta', async () => {
    const sales = service();
    const request = input();
    await sales.register(request, user);
    await expect(sales.register(request, { ...user, id: randomUUID() })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: { fields: { draftId: 'Esta venta ya se registró desde otra cuenta' } },
    });
  });
  it('resuelve la carrera de draftId con rollback del número y comprueba la cuenta ganadora', async () => {
    const request = input();
    const priced = await service().quote(request);
    let competed = false;
    const raced: Database = {
      ...db,
      async transaction(work) {
        if (!competed) {
          competed = true;
          await db.transaction(async (tx) =>
            insertSale(tx, {
              ...priced,
              draftId: request.draftId,
              paymentMethod: 'qr',
              registeredAt: clock.now(),
              registeredBy: { userId: user.id, displayName: user.displayName, role: user.role },
              number: await nextSaleNumber(tx),
            }),
          );
        }
        return db.transaction(work);
      },
    };
    expect(await service(raced).register(request, user)).toMatchObject({
      created: false,
      sale: { number: 1, paymentMethod: 'qr' },
    });
    expect(await db.transaction((tx) => nextSaleNumber(tx))).toBe(2);
  });
  it('un fallo al insertar líneas deshace la venta y el contador', async () => {
    const broken: Database = {
      ...db,
      transaction: (work) =>
        db.transaction((tx) =>
          work({
            ...tx,
            async query(sql, params) {
              if (sql.includes('INSERT INTO sale_lines'))
                throw new Error('fallo al guardar líneas');
              return tx.query(sql, params);
            },
          }),
        ),
    };
    await expect(service(broken).register(input(), user)).rejects.toThrow(
      'fallo al guardar líneas',
    );
    expect(await listRegisteredSales(db)).toEqual([]);
    expect(await db.transaction((tx) => nextSaleNumber(tx))).toBe(1);
  });
  it('propaga otras restricciones únicas sin confundirlas con un reintento', async () => {
    const broken: Database = {
      ...db,
      async transaction() {
        throw Object.assign(new Error('otro conflicto'), {
          code: '23505',
          constraint: 'sales_number_key',
        });
      },
    };
    await expect(service(broken).register(input(), user)).rejects.toThrow('otro conflicto');
  });
});
afterEach(async () => {
  await db.close();
});

describe('calcular la venta con el menú inyectado (RF-2 a RF-5)', () => {
  it('devuelve el mismo menú y las líneas calculadas, sin persistir', async () => {
    const id = randomUUID();
    const menu: SaleQuote['menu'] = [
      { id: randomUUID(), name: 'Bebidas', products: [{ id, name: 'Café', priceCents: 1250 }] },
    ];
    const currentMenu = vi.fn(async () => menu);
    const service = createSalesService({
      db,
      clock: createFakeClock(new Date('2026-10-24T18:05:12Z')),
      currentMenu,
    });
    const quote = await service.quote({
      lines: [{ productId: id, productName: 'Café', quantity: 2 }],
    });
    expect(saleQuoteSchema.parse(quote)).toEqual(quote);
    expect(currentMenu).toHaveBeenCalledExactlyOnceWith(db);
    expect(quote.menu).toBe(menu);
    expect(quote).toMatchObject({
      totalCents: 2500,
      notices: [],
      lines: [{ productName: 'Café', subtotalCents: 2500 }],
    });
    expect((await db.query('SELECT * FROM sales')).rows).toEqual([]);
  });
  it('devuelve menú y líneas vacíos cuando no hay productos', async () => {
    const service = createSalesService({
      db,
      clock: createFakeClock(new Date()),
      currentMenu: async () => [],
    });
    const quote = await service.quote({ lines: [] });
    expect(saleQuoteSchema.parse(quote)).toEqual({
      menu: [],
      lines: [],
      notices: [],
      totalCents: 0,
    });
  });
});
