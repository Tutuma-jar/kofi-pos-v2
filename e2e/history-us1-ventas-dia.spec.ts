import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';
import { saleResponseSchema } from '@kofi/contracts';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('US1: ventas del día, navegación, permisos, conexión, medianoche y teclado (RF-1 a RF-7, RNF-4)', async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(60000);
  let now = new Date('2026-10-24T12:00:00Z');
  const advanceTo = async (instant: string) => {
    const next = new Date(instant);
    const response = await request.post('/api/__test/clock', {
      data: { advanceMilliseconds: next.getTime() - now.getTime() },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).now).toBe(next.toISOString());
    now = next;
  };
  const loginApi = async (role: 'owner' | 'cashier') => {
    expect((await request.post('/api/auth/login', { data: TEST_ACCOUNTS[role] })).status()).toBe(
      200,
    );
    expect((await (await request.get('/api/auth/session')).json()).user.role).toBe(role);
  };
  const loginPage = async (role: 'owner' | 'cashier') => {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.waitForURL((url) => url.pathname !== '/ingresar');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Kofi POS', exact: true })).toBeVisible();
    expect((await (await page.request.get('/api/auth/session')).json()).user.role).toBe(role);
  };
  const tabTo = async (target: Locator) => {
    for (let index = 0; index < 40; index++) {
      await page.keyboard.press('Tab');
      if (await target.evaluate((element) => element === element.ownerDocument.activeElement))
        return;
    }
    throw new Error('No se alcanzó el control con Tab');
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
  const menu = (await (await request.get('/api/menu')).json()).categories as {
    products: { id: string; name: string; priceCents: number }[];
  }[];
  const products = menu.flatMap((category) => category.products);
  const coffee = products.find((product) => product.name === 'Café americano')!;
  const pie = products.find((product) => product.name === 'Empanada')!;
  const register = async (
    lines: { product: typeof coffee; quantity: number }[],
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
    return saleResponseSchema.parse(await response.json()).sale;
  };
  await advanceTo('2026-10-24T12:30:00Z');
  expect((await register([{ product: coffee, quantity: 1 }], 'cash')).number).toBe(1);
  await advanceTo('2026-10-25T13:15:00Z');
  await loginApi('cashier');
  expect((await register([{ product: coffee, quantity: 2 }], 'cash')).number).toBe(2);
  await advanceTo('2026-10-25T14:30:00Z');
  await loginApi('owner');
  expect(
    (
      await register(
        [
          { product: pie, quantity: 1 },
          { product: coffee, quantity: 1 },
        ],
        'qr',
      )
    ).number,
  ).toBe(3);
  const originalSales = await (await request.get('/api/__test/sales')).json();
  await advanceTo('2026-10-26T15:00:00Z');

  await loginPage('cashier');
  await expect(page.getByRole('link', { name: 'Historial de ventas', exact: true })).toHaveCount(0);
  const forbidden = await page.request.get('/api/history/day?date=ayer');
  expect(forbidden.status()).toBe(403);
  expect(await forbidden.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el historial de ventas' },
  });
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await loginPage('owner');
  await tabTo(page.getByRole('link', { name: 'Historial de ventas', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 26/10/2026' })).toBeVisible();
  for (const text of [
    'Bs 0,00',
    '0 ventas',
    'Efectivo: Bs 0,00 · 0 ventas',
    'QR: Bs 0,00 · 0 ventas',
    'No hay ventas registradas este día',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeEnabled();

  await tabTo(page.getByRole('button', { name: 'Día anterior' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 25/10/2026' })).toBeVisible();
  for (const text of [
    'Bs 45,50',
    '2 ventas',
    'Efectivo: Bs 25,00 · 1 venta',
    'QR: Bs 20,50 · 1 venta',
    'Datos al 26/10/2026 11:00',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText([
    'N.º 3 · 10:30 · Ana Quispe · Dueño · QR · Bs 20,50',
    'N.º 2 · 09:15 · Luis Mamani · Cajero · Efectivo · Bs 25,00',
  ]);
  await tabTo(page.getByLabel('Fecha', { exact: true }));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText(
    'N.º 1 · 08:30 · Luis Mamani · Cajero · Efectivo · Bs 12,50',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Ventas del 25/10/2026' })).toBeVisible();

  await page.goto('/ventas?fecha=2026-10-27');
  await expect(page.getByRole('alert')).toHaveText('No se pueden consultar fechas futuras');
  await expect(page.getByRole('list')).toHaveCount(0);
  await page.goto('/ventas?fecha=2026-02-30');
  await expect(page.getByRole('alert')).toHaveText('La fecha no es válida');
  await expect(page.getByRole('list')).toHaveCount(0);
  await page.goto('/ventas?fecha=2026-10-25');
  await expect(page.getByRole('heading', { name: 'Ventas del 25/10/2026' })).toBeVisible();
  await context.setOffline(true);
  await tabTo(page.getByRole('button', { name: 'Actualizar' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('No hay conexión. Inténtalo de nuevo');
  await expect(page.getByRole('heading', { name: 'Ventas del 25/10/2026' })).toBeVisible();
  await expect(page.getByText('Bs 45,50', { exact: true })).toBeVisible();
  await expect(page.getByText('Datos al 26/10/2026 11:00', { exact: true })).toBeVisible();
  await context.setOffline(false);

  await advanceTo('2026-10-27T03:58:00Z');
  await loginPage('owner');
  await tabTo(page.getByRole('link', { name: 'Historial de ventas', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 26/10/2026' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
  await advanceTo('2026-10-27T04:05:00Z');
  await expect(page.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
  await tabTo(page.getByRole('button', { name: 'Actualizar' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Día siguiente' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Ventas del 26/10/2026' })).toBeVisible();
  await expect(page.getByText('Datos al 27/10/2026 00:05', { exact: true })).toBeVisible();
  await tabTo(page.getByRole('button', { name: 'Día siguiente' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 27/10/2026' })).toBeVisible();
  expect(await (await request.get('/api/__test/sales')).json()).toEqual(originalSales);
  await page.goto('/ventas?fecha=0099-12-31');
  await expect(page.getByRole('heading', { name: 'Ventas del 31/12/0099' })).toBeVisible();
  await expect(page.getByText('0 ventas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Ventas del 01/01/0100' })).toBeVisible();
  await page.goto('/ventas?fecha=0001-01-01');
  await expect(page.getByRole('button', { name: 'Día anterior' })).toBeDisabled();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('0001-01-01');
  await page.goto('/ventas?fecha=0000-01-01');
  await expect(page.getByRole('alert')).toHaveText('La fecha no es válida');
});
