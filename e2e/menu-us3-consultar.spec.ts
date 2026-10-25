import { expect, test, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

async function login(page: Page, role: 'owner' | 'cashier') {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/');
}

test('Menú US3: consultar el menú vigente y ver los cambios al recargar (RF-13, RF-14)', async ({
  page,
  request,
  browser,
  baseURL,
}, testInfo) => {
  const owner = await browser.newContext({ baseURL });
  try {
    expect((await request.post('/api/__test/menu', { data: { categories: [] } })).status()).toBe(
      200,
    );
    await test.step('1. El cajero abre la consulta vacía desde inicio', async () => {
      await login(page, 'cashier');
      await page.getByRole('link', { name: 'Ver menú', exact: true }).click();
      await expect(page.getByText('El menú todavía no tiene productos disponibles')).toBeVisible();
    });
    const ownerPage = await owner.newPage();
    await login(ownerPage, 'owner');
    await test.step('2. Muestra solo productos vigentes, con sus precios y sin edición', async () => {
      expect(
        (
          await request.post('/api/__test/menu', {
            data: {
              categories: [
                {
                  name: 'Bebidas',
                  products: [
                    { name: 'Café americano', price: '12,5' },
                    { name: 'Té', price: '8' },
                  ],
                },
                { name: 'Temporada', products: [{ name: 'Api', price: '10' }] },
                { name: 'Vacía', products: [] },
              ],
            },
          })
        ).status(),
      ).toBe(200);
      const admin = (await (await owner.request.get('/api/menu/admin')).json()).categories;
      for (const category of admin)
        for (const product of category.products)
          if (product.name !== 'Café americano')
            expect(
              (await owner.request.post(`/api/menu/products/${product.id}/deactivate`)).status(),
            ).toBe(200);
      const season = admin.find((category: { name: string }) => category.name === 'Temporada');
      expect(
        (await owner.request.post(`/api/menu/categories/${season.id}/deactivate`)).status(),
      ).toBe(200);
      await page.reload();
      const main = page.getByRole('main');
      await expect(main.getByText('Café americano', { exact: true })).toBeVisible();
      await expect(main.getByText('Bs 12,50', { exact: true })).toBeVisible();
      await expect(main.getByText('Té', { exact: true })).toHaveCount(0);
      await expect(main.getByRole('heading', { name: 'Temporada' })).toHaveCount(0);
      await expect(main.getByRole('heading', { name: 'Vacía' })).toHaveCount(0);
      await expect(main.getByRole('button')).toHaveCount(0);
      await expect(main.getByRole('textbox')).toHaveCount(0);
    });
    await test.step('3. Un cambio del dueño en otro navegador se ve al recargar', async () => {
      await ownerPage.getByRole('link', { name: 'Administrar menú' }).click();
      await ownerPage.getByRole('button', { name: 'Editar Café americano', exact: true }).click();
      await ownerPage.getByLabel('Precio (Bs)').fill('14');
      await ownerPage.getByLabel('Precio (Bs)').press('Enter');
      await expect(ownerPage.getByText('Bs 14,00', { exact: true })).toBeVisible();
      await expect(page.getByText('Bs 12,50', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByText('Bs 14,00', { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('consulta-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: testInfo.outputPath('consulta-mobile.png'), fullPage: true });
    });
  } finally {
    await owner.close();
  }
});
