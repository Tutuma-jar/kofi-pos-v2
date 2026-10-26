import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('US2: buscar, conservar la instantánea, volver al día y abrir su detalle con teclado (RF-5, RF-7 a RF-10, RNF-4)', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  let now = new Date('2026-10-24T12:00:00Z');
  const advanceTo = async (instant: string) => {
    const next = new Date(instant);
    expect(
      (
        await request.post('/api/__test/clock', {
          data: { advanceMilliseconds: next.getTime() - now.getTime() },
        })
      ).status(),
    ).toBe(200);
    now = next;
  };
  const loginApi = async (role: 'owner' | 'cashier') => {
    expect((await request.post('/api/auth/login', { data: TEST_ACCOUNTS[role] })).status()).toBe(
      200,
    );
    expect((await (await request.get('/api/auth/session')).json()).user.role).toBe(role);
  };
  const tabTo = async (target: Locator) => {
    for (let index = 0; index < 40; index++) {
      await page.keyboard.press('Tab');
      if (await target.evaluate((element) => element === element.ownerDocument.activeElement))
        return;
    }
    throw new Error('No se alcanzó el control con Tab');
  };
  const search = async (text: string) => {
    const field = page.getByLabel('Buscar venta por número', { exact: true });
    await field.fill(text);
    await field.press('Enter');
  };
  expect(
    (
      await request.post('/api/__test/menu', {
        data: {
          categories: [
            { name: 'Bebidas calientes', products: [{ name: 'Café americano', price: '12,50' }] },
            { name: 'Salados', products: [{ name: 'Empanada', price: '8,00' }] },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  await loginApi('cashier');
  type Product = { id: string; name: string; priceCents: number };
  const menu = (await (await request.get('/api/menu')).json()).categories as {
    id: string;
    name: string;
    products: Product[];
  }[];
  const coffeeCategory = menu.find((category) => category.name === 'Bebidas calientes')!;
  const coffee = coffeeCategory.products[0]!;
  const pie = menu.find((category) => category.name === 'Salados')!.products[0]!;
  const register = async (
    lines: { product: Product; quantity: number }[],
    paymentMethod: 'cash' | 'qr',
  ) => {
    const response = await request.post('/api/sales', {
      data: {
        draftId: randomUUID(),
        paymentMethod,
        lines: lines.map(({ product, quantity }) => ({
          productId: product.id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity,
        })),
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).sale.number;
  };
  await advanceTo('2026-10-24T12:30:00Z');
  expect(await register([{ product: coffee, quantity: 1 }], 'cash')).toBe(1);
  await advanceTo('2026-10-25T13:15:00Z');
  await loginApi('cashier');
  expect(await register([{ product: coffee, quantity: 2 }], 'cash')).toBe(2);
  await advanceTo('2026-10-25T14:30:00Z');
  await loginApi('owner');
  expect(
    await register(
      [
        { product: pie, quantity: 1 },
        { product: coffee, quantity: 1 },
      ],
      'qr',
    ),
  ).toBe(3);
  await advanceTo('2026-10-25T15:00:00Z');
  expect(
    (
      await request.put(`/api/menu/products/${coffee.id}`, {
        data: { name: coffee.name, categoryId: coffeeCategory.id, price: '13,00' },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`/api/__test/accounts/${TEST_ACCOUNTS.cashier.username}`, {
        data: { action: 'delete' },
      })
    ).status(),
  ).toBe(200);
  const originalSales = await (await request.get('/api/__test/sales')).json();
  const currentMenu = (await (await request.get('/api/menu')).json()).categories;
  expect(
    currentMenu
      .flatMap((category: { products: Product[] }) => category.products)
      .find((product: Product) => product.id === coffee.id).priceCents,
  ).toBe(1300);

  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.owner.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.owner.password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await page.waitForURL((url) => url.pathname !== '/ingresar');
  await page.goto('/');
  await tabTo(page.getByRole('link', { name: 'Historial de ventas', exact: true }));
  await page.keyboard.press('Enter');
  await tabTo(page.getByLabel('Buscar venta por número', { exact: true }));
  await page.keyboard.type('3');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Venta N.º 3', exact: true })).toBeVisible();
  for (const text of [
    '25/10/2026 10:30',
    'Registrada por Ana Quispe · Dueño',
    'Medio de pago: QR',
    'Bs 20,50',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText([
    'Empanada · Salados · Bs 8,00 × 1 · Bs 8,00',
    'Café americano · Bebidas calientes · Bs 12,50 × 1 · Bs 12,50',
  ]);
  await expect(page.getByText(/^Datos al/)).toHaveCount(0);
  await search(' 002 ');
  await expect(page.getByRole('heading', { name: 'Venta N.º 2', exact: true })).toBeVisible();
  await expect(
    page.getByText('Registrada por Luis Mamani · Cajero', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText(
    'Café americano · Bebidas calientes · Bs 12,50 × 2 · Bs 25,00',
  );
  for (const number of ['99', '12345678901234567890']) {
    await search(number);
    await expect(page.getByRole('alert')).toHaveText(`No existe la venta N.º ${number}`);
    await expect(page.getByRole('list')).toHaveCount(0);
  }
  for (const text of ['abc', '0']) {
    const before = page.url();
    await search(text);
    await expect(
      page.getByText('Escribe un número de venta válido', { exact: true }),
    ).toBeVisible();
    expect(page.url()).toBe(before);
  }
  await search('2');
  await expect(page.getByRole('heading', { name: 'Venta N.º 2', exact: true })).toBeVisible();
  await tabTo(page.getByRole('link', { name: 'Volver', exact: true }));
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Ventas del 25/10/2026', exact: true }),
  ).toBeVisible();
  await tabTo(page.getByRole('link', { name: /^N.º 3/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Venta N.º 3', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Venta N.º 3', exact: true })).toBeVisible();
  expect(await (await request.get('/api/__test/sales')).json()).toEqual(originalSales);
});
