import { randomUUID } from 'node:crypto';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('US2: mes real, días sin ventas, permiso de cajero y nuevo mes (RF-9, RF-10)', async ({
  page,
  request,
}) => {
  await request.post('/api/__test/menu', {
    data: {
      categories: [
        {
          name: 'Menú',
          products: [
            { name: 'Café americano', price: '12,50' },
            { name: 'Empanada', price: '8,00' },
          ],
        },
      ],
    },
  });
  const loginApi = async () => {
    expect((await request.post('/api/auth/login', { data: TEST_ACCOUNTS.cashier })).status()).toBe(
      200,
    );
  };
  const loginPage = async (role: 'owner' | 'cashier') => {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.waitForURL((url) => url.pathname !== '/ingresar');
    await page.goto('/');
    await page.getByRole('link', { name: 'Resumen de ventas', exact: true }).click();
  };
  await loginApi();
  const { categories } = await (await request.get('/api/menu')).json();
  const products = categories[0].products as { id: string; name: string; priceCents: number }[];
  const register = async (index: number, quantity: number, paymentMethod: string) => {
    const p = products[index]!;
    expect(
      (
        await request.post('/api/sales', {
          data: {
            draftId: randomUUID(),
            paymentMethod,
            lines: [
              { productId: p.id, productName: p.name, unitPriceCents: p.priceCents, quantity },
            ],
          },
        })
      ).status(),
    ).toBe(201);
  };
  await register(1, 1, 'cash');
  await request.post('/api/__test/clock', { data: { advanceMilliseconds: 2 * 86400000 } });
  await loginApi();
  await register(0, 2, 'qr');
  await register(0, 1, 'cash');
  await loginPage('owner');
  const month = page.getByRole('region', { name: 'Octubre de 2026' });
  for (const text of [
    'Bs 45,50',
    '3 ventas',
    'Bs 15,17',
    'Efectivo: Bs 20,50 · 2 ventas',
    'QR: Bs 25,00 · 1 venta',
    'Café americano · 3 unidades · Bs 37,50',
    'Empanada · 1 unidad · Bs 8,00',
  ])
    await expect(month.getByText(text, { exact: true })).toBeVisible();
  const rows = month.getByRole('table', { name: 'Ventas por día' }).getByRole('row');
  await expect(rows).toHaveCount(27);
  for (let day = 1; day <= 26; day++) {
    const date = `${String(day).padStart(2, '0')}/10/2026`;
    const total = day === 24 ? 'Bs 8,00' : day === 26 ? 'Bs 37,50' : 'Bs 0,00';
    const count = day === 24 ? '1 venta' : day === 26 ? '2 ventas' : '0 ventas';
    await expect(rows.nth(day)).toHaveText(`${date}${total}${count}`);
  }
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await loginPage('cashier');
  await expect(page.getByRole('region', { name: 'Hoy · 26/10/2026' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toHaveCount(0);
  const denied = await page.request.get('/api/dashboard/month');
  expect(denied.status()).toBe(403);
  expect(await denied.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el resumen del mes' },
  });
  await request.post('/api/__test/clock', {
    data: { advanceMilliseconds: 6 * 86400000 - 8 * 3600000 },
  });
  await loginPage('owner');
  const november = page.getByRole('region', { name: 'Noviembre de 2026' });
  await expect(november.getByText('Todavía no hay ventas este mes')).toBeVisible();
  await expect(november.getByText('0 ventas', { exact: true }).first()).toBeVisible();
  const novemberRows = november.getByRole('table').getByRole('row');
  await expect(novemberRows).toHaveCount(2);
  await expect(novemberRows.nth(1)).toHaveText('01/11/2026Bs 0,000 ventas');
});
