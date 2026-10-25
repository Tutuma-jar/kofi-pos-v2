import { expect, test } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('Menú US2: desactivar y reactivar sin perder datos (RF-9 a RF-12)', async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post('/api/__test/menu', {
        data: {
          categories: [
            { name: 'Bebidas calientes', products: [{ name: 'Café americano', price: '12,5' }] },
            { name: 'Jugos', products: [] },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.owner.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.owner.password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await page.getByRole('link', { name: 'Administrar menú' }).click();
  const hotDrinks = page.getByRole('region', { name: 'Bebidas calientes', exact: true });
  await test.step('1. Impide desactivar una categoría con un producto activo', async () => {
    await page.getByRole('button', { name: 'Desactivar categoría Bebidas calientes' }).click();
    await expect(hotDrinks.getByRole('alert')).toHaveText(
      'Esta categoría tiene 1 producto activo. Desactívalos o muévelos a otra categoría antes',
    );
  });
  await test.step('2. Desactiva primero el producto y después la categoría', async () => {
    await page.getByRole('button', { name: 'Desactivar producto Café americano' }).click();
    await expect(hotDrinks.getByText('Inactivo', { exact: true })).toBeVisible();
    await expect(page.getByText('Cambios guardados')).toBeVisible();
    await page.getByRole('button', { name: 'Desactivar categoría Bebidas calientes' }).click();
    await expect(hotDrinks.getByText('Inactiva', { exact: true })).toBeVisible();
  });
  await test.step('3. Impide reactivar el producto hasta reactivar su categoría', async () => {
    await page.getByRole('button', { name: 'Reactivar producto Café americano' }).click();
    await expect(hotDrinks.getByRole('alert')).toHaveText(
      'Reactiva la categoría “Bebidas calientes” o mueve el producto a otra antes de reactivarlo',
    );
  });
  await test.step('4. No ofrece la categoría inactiva para productos nuevos', async () => {
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await expect(
      page
        .getByLabel('Categoría', { exact: true })
        .getByRole('option', { name: 'Bebidas calientes' }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel('Categoría', { exact: true }).getByRole('option', { name: 'Jugos' }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });
  await test.step('5. Reactiva ambos, conservando el nombre, categoría y precio', async () => {
    await page.getByRole('button', { name: 'Reactivar categoría Bebidas calientes' }).click();
    await expect(
      page.getByRole('button', { name: 'Desactivar categoría Bebidas calientes' }),
    ).toBeVisible();
    await expect(hotDrinks.getByText('Inactivo', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reactivar producto Café americano' }).click();
    await expect(
      page.getByRole('button', { name: 'Desactivar producto Café americano' }),
    ).toBeVisible();
    await expect(hotDrinks).toContainText('Café americano');
    await expect(hotDrinks).toContainText('Bs 12,50');
    await expect(page.getByText('Cambios guardados')).toBeVisible();
    await expect(page.getByRole('button', { name: /eliminar|borrar/i })).toHaveCount(0);
  });
});
