import { expect, test } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('la interfaz abre y llega a la API a través del proxy de /api', async ({ page }) => {
  await page.goto('/ingresar');
  await expect(page.getByRole('heading', { name: 'Ingresar', exact: true })).toBeVisible();

  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: await response.json() };
  });

  expect(health).toEqual({ status: 200, body: { status: 'ok' } });
});

test('el cliente real inicia y cierra sesión desde vite preview', async ({ page }) => {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.owner.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.owner.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL('/ingresar');
  await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible();
});
