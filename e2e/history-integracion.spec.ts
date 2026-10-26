import { randomUUID } from 'node:crypto';
import { dayHistorySchema, historySaleResponseSchema } from '@kofi/contracts';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('Historial: día y detalle reales en vite preview y acceso exclusivo del dueño (T015, T021)', async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post('/api/__test/menu', {
        data: {
          categories: [
            { name: 'Bebidas calientes', products: [{ name: 'Café americano', price: '12,50' }] },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  expect((await request.post('/api/auth/login', { data: TEST_ACCOUNTS.owner })).status()).toBe(200);
  const product = (await (await request.get('/api/menu')).json()).categories[0].products[0];
  expect(
    (
      await request.post('/api/sales', {
        data: {
          draftId: randomUUID(),
          paymentMethod: 'cash',
          lines: [
            {
              productId: product.id,
              productName: product.name,
              unitPriceCents: product.priceCents,
              quantity: 1,
            },
          ],
        },
      })
    ).status(),
  ).toBe(201);
  for (const role of ['owner', 'cashier'] as const) {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.waitForURL((url) => url.pathname !== '/ingresar');
    await page.goto('/');
    expect((await (await page.request.get('/api/auth/session')).json()).user.role).toBe(role);
    const link = page.getByRole('link', { name: 'Historial de ventas', exact: true });
    if (role === 'owner') {
      const response = page.waitForResponse(
        (response) => response.url().includes('/api/history/day') && response.status() === 200,
      );
      await link.click();
      expect(dayHistorySchema.parse(await (await response).json()).salesCount).toBe(1);
      await expect(page.getByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
      await expect(page.getByText('Bs 12,50', { exact: true })).toBeVisible();
      await expect(page.getByRole('listitem')).toHaveText(
        'N.º 1 · 08:00 · Ana Quispe · Dueño · Efectivo · Bs 12,50',
      );
      expect(page.url()).not.toContain('escenarios');
      const detail = page.waitForResponse(
        (response) => response.url().includes('/api/history/sales/1') && response.status() === 200,
      );
      await page.getByRole('link', { name: /^N.º 1/ }).click();
      expect(historySaleResponseSchema.parse(await (await detail).json()).sale.number).toBe(1);
      await expect(page.getByRole('heading', { name: 'Venta N.º 1', exact: true })).toBeVisible();
      await expect(
        page.getByText('Café americano · Bebidas calientes · Bs 12,50 × 1 · Bs 12,50', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByText(/^Datos al/)).toHaveCount(0);
      await page.getByRole('link', { name: 'Volver', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
    } else {
      await expect(link).toHaveCount(0);
      await page.goto('/ventas');
      await expect(page.getByRole('alert')).toHaveText(
        'No tienes permiso para ver el historial de ventas',
      );
      await expect(page.getByRole('list')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  }
});
