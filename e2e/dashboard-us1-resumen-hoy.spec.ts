import { randomUUID } from 'node:crypto';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('US1: resumen real de hoy, actualización, desconexión y nuevo día (RF-1 a RF-8, RNF-4)', async ({
  page,
  request,
  context,
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
    await expect(page.getByRole('heading', { name: 'Kofi POS', exact: true })).toBeVisible();
  };
  await loginApi();
  const menu = await (await request.get('/api/menu')).json();
  const products = menu.categories[0].products as {
    id: string;
    name: string;
    priceCents: number;
  }[];
  const register = async (quantities: number[], paymentMethod = 'cash') => {
    expect(
      (
        await request.post('/api/sales', {
          data: {
            draftId: randomUUID(),
            paymentMethod,
            lines: products.flatMap((p, i) =>
              quantities[i]
                ? [
                    {
                      productId: p.id,
                      productName: p.name,
                      unitPriceCents: p.priceCents,
                      quantity: quantities[i],
                    },
                  ]
                : [],
            ),
          },
        })
      ).status(),
    ).toBe(201);
  };
  await register([1, 0]);
  await request.post('/api/__test/clock', { data: { advanceMilliseconds: 25.25 * 3600000 } });
  await loginApi();
  await register([2, 0]);
  await request.post('/api/__test/clock', { data: { advanceMilliseconds: 1.25 * 3600000 } });
  await register([1, 1], 'qr');
  await loginPage('cashier');
  await page.getByRole('link', { name: 'Resumen de ventas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hoy · 25/10/2026' })).toBeVisible();
  await expect(page.getByText('Bs 45,50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await request.post('/api/__test/clock', { data: { advanceMilliseconds: 0.5 * 3600000 } });
  await loginPage('owner');
  // Desde el inicio se llega al resumen también con teclado.
  const homeLink = page.getByRole('link', { name: 'Resumen de ventas', exact: true });
  await homeLink.focus();
  await page.keyboard.press('Enter');
  const today = page.getByRole('region', { name: 'Hoy · 25/10/2026' });
  for (const text of [
    'Bs 45,50',
    '2 ventas',
    'Bs 22,75',
    'Efectivo: Bs 25,00 · 1 venta',
    'QR: Bs 20,50 · 1 venta',
    'Café americano · 3 unidades · Bs 37,50',
    'Empanada · 1 unidad · Bs 8,00',
    'Datos al 25/10/2026 11:00',
  ])
    await expect(today.getByText(text, { exact: true })).toBeVisible();
  await loginApi();
  await register([1, 0]);
  await expect(today.getByText('Bs 45,50', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al inicio' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(today.getByText('Bs 58,00', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('alert')).toHaveText('No hay conexión. Inténtalo de nuevo');
  await expect(today.getByText('Bs 58,00', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await request.post('/api/__test/clock', { data: { advanceMilliseconds: 13 * 3600000 } });
  await page.reload();
  await loginPage('owner');
  await page.getByRole('link', { name: 'Resumen de ventas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hoy · 26/10/2026' })).toBeVisible();
  for (const text of ['Bs 0,00', '0 ventas', '—', 'Todavía no hay ventas hoy'])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
});
