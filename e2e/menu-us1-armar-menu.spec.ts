import { expect, test, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

async function login(page: Page, role: 'owner' | 'cashier') {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/');
}

test('Menú US1: armar el menú con la API real (RF-1 a RF-7, RNF-4)', async ({
  page,
  request,
  context,
}, testInfo) => {
  expect((await request.post('/api/__test/menu', { data: { categories: [] } })).status()).toBe(200);
  await test.step('1. El cajero no puede administrar ni modificar datos', async () => {
    await login(page, 'cashier');
    await expect(page.getByRole('link', { name: 'Administrar menú' })).toHaveCount(0);
    await page.goto('/menu/administrar');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('No tienes permiso para administrar el menú')).toBeVisible();
    expect(
      (
        await context.request.post('/api/menu/categories', { data: { name: 'No autorizada' } })
      ).status(),
    ).toBe(403);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  });
  await test.step('2. El dueño abre la administración vacía', async () => {
    await login(page, 'owner');
    await page.getByRole('link', { name: 'Administrar menú' }).click();
    await expect(page.getByText('Todavía no hay categorías. Crea la primera')).toBeVisible();
  });
  await test.step('3. Crea categoría y producto solo con teclado, con precio exacto', async () => {
    await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
    await page.keyboard.type('Bebidas calientes');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Bebidas calientes' })).toBeVisible();
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await page.keyboard.type('Café americano');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12,5');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Cambios guardados')).toBeVisible();
    await expect(page.getByText('Bs 12,50', { exact: true })).toBeVisible();
  });
  await test.step('4. Rechaza los tres campos inválidos juntos y conserva lo escrito', async () => {
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await page.getByLabel('Nombre del producto').fill('CAFÉ AMERICANO');
    await page.getByLabel('Precio (Bs)').fill('0');
    await page.getByLabel('Precio (Bs)').press('Enter');
    for (const message of [
      'Ya existe un producto con ese nombre',
      'Elige una categoría',
      'El precio debe ser mayor que 0',
    ])
      await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible();
    await expect(page.getByLabel('Nombre del producto')).toHaveValue('CAFÉ AMERICANO');
    await expect(page.getByLabel('Precio (Bs)')).toHaveValue('0');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });
  await test.step('5. Cambia el precio y mueve el producto, y persiste al recargar', async () => {
    await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
    await page.getByLabel('Nombre de la categoría').fill('Jugos');
    await page.getByLabel('Nombre de la categoría').press('Enter');
    await expect(page.getByRole('heading', { name: 'Jugos' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar Café americano', exact: true }).click();
    await expect(page.getByLabel('Precio (Bs)')).toHaveValue('12,50');
    await page.getByLabel('Categoría', { exact: true }).selectOption({ label: 'Jugos' });
    await page.getByLabel('Precio (Bs)').fill('13');
    await page.getByLabel('Precio (Bs)').press('Enter');
    await expect(page.getByRole('region', { name: 'Jugos', exact: true })).toContainText(
      'Bs 13,00',
    );
    await page.reload();
    await expect(page.getByRole('region', { name: 'Jugos', exact: true })).toContainText(
      'Café americano',
    );
    await expect(page.getByRole('region', { name: 'Jugos', exact: true })).toContainText(
      'Bs 13,00',
    );
    await page.screenshot({ path: testInfo.outputPath('menu-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('menu-mobile.png'), fullPage: true });
  });
  await test.step('6. Sin conexión no guarda ni pierde el formulario', async () => {
    await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
    await page.getByLabel('Nombre de la categoría').fill('Sin conexión');
    await context.setOffline(true);
    try {
      await page.getByLabel('Nombre de la categoría').press('Enter');
      await expect(page.getByText('No hay conexión. Los cambios no se guardaron')).toBeVisible();
      await expect(page.getByLabel('Nombre de la categoría')).toHaveValue('Sin conexión');
    } finally {
      await context.setOffline(false);
    }
    const menu = await context.request.get('/api/menu/admin');
    expect(
      (await menu.json()).categories.map((category: { name: string }) => category.name),
    ).not.toContain('Sin conexión');
  });
});
