import { expect, test } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('Ventas: los dos roles registran con la API real desde el enlace de inicio (T020)', async ({
  page,
  request,
}) => {
  for (const role of ['owner', 'cashier'] as const) {
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
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
    await page.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
    await page.getByLabel('QR', { exact: true }).check();
    await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
    await expect(page.getByText(/Venta N.º 1 registrada · Bs 12,50 · QR/)).toBeVisible();
    const { sales } = await (await request.get('/api/__test/sales')).json();
    expect(sales).toHaveLength(1);
    expect(sales[0].registeredBy.role).toBe(role);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  }
});
