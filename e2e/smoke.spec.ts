import { expect, test } from '@playwright/test';

test('la interfaz abre y llega a la API a través del proxy de /api', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kofi POS' })).toBeVisible();

  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: await response.json() };
  });

  expect(health).toEqual({ status: 200, body: { status: 'ok' } });
});
