import { expect, test } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('Dashboard: ambos roles ven el enlace y consultan la API real con vite preview (T015)', async ({
  page,
  request,
}) => {
  await request.post('/api/__test/menu', { data: { categories: [] } });
  for (const role of ['owner', 'cashier'] as const) {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.getByRole('link', { name: 'Resumen de ventas', exact: true }).click();
    expect(page.url()).not.toContain('escenarios');
    await expect(
      page.getByRole('heading', { name: 'Resumen de ventas', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Todavía no hay ventas hoy')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  }
});
