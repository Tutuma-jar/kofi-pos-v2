import { expect, test, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

const fixture = {
  categories: [
    { name: 'Bebidas', products: [{ name: 'Café americano', price: '12,50' }] },
    { name: 'Salados', products: [{ name: 'Empanada', price: '8' }] },
  ],
};
async function login(page: Page, role: 'owner' | 'cashier') {
  if (new URL(page.url()).pathname !== '/ingresar') await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
}
async function openSale(page: Page) {
  await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
  await expect(page).toHaveURL('/ventas/nueva');
}
async function expectEmpty(page: Page) {
  await expect(page.getByText('Elige los productos de la venta')).toBeVisible();
  await expect(page.getByLabel('QR', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Efectivo', { exact: true })).not.toBeChecked();
}

test('Ventas US2: conservar, recuperar y descartar una venta con la API real (RF-12 a RF-14)', async ({
  page,
  context,
  request,
}, testInfo) => {
  expect((await request.post('/api/__test/menu', { data: fixture })).status()).toBe(200);
  let current = page;
  await login(current, 'cashier');
  await expect(current).toHaveURL('/');
  await openSale(current);
  await test.step('1. Recarga, navegación, pestañas y cierre de pestaña conservan líneas y pago', async () => {
    await current.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
    await current.getByRole('button', { name: 'Empanada · Bs 8,00' }).click();
    await current.getByLabel('QR', { exact: true }).check();
    await current.reload();
    await expect(current.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await expect(current.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    await expect(current.getByLabel('QR', { exact: true })).toBeChecked();
    await current.getByRole('link', { name: 'Volver al inicio' }).click();
    await openSale(current);
    await expect(current.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    const second = await context.newPage();
    try {
      await second.goto('/ventas/nueva');
      await expect(second.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
      await expect(second.getByLabel('QR', { exact: true })).toBeChecked();
      await current.getByRole('button', { name: 'Sumar Café americano' }).click();
      await expect(second.getByText('Café americano × 2 · Bs 25,00')).toBeVisible();
      await second.getByRole('button', { name: 'Sumar Empanada' }).click();
      await expect(current.getByText('Empanada × 2 · Bs 16,00')).toBeVisible();
      await second.getByLabel('Efectivo', { exact: true }).check();
      await expect(current.getByLabel('Efectivo', { exact: true })).toBeChecked();
      await current.getByLabel('QR', { exact: true }).check();
      await expect(second.getByLabel('QR', { exact: true })).toBeChecked();
    } finally {
      await second.close();
    }
    await current.close();
    current = await context.newPage();
    await current.goto('/ventas/nueva');
    await expect(current.getByText('Café americano × 2 · Bs 25,00')).toBeVisible();
    await expect(current.getByText('Empanada × 2 · Bs 16,00')).toBeVisible();
    await expect(current.getByLabel('QR', { exact: true })).toBeChecked();
  });
  await test.step('2. Al vencer la sesión, la misma cuenta recupera la preparación', async () => {
    expect(
      (
        await request.post('/api/__test/clock', { data: { advanceMilliseconds: 12 * 60 * 60_000 } })
      ).status(),
    ).toBe(200);
    await current.getByRole('button', { name: 'Sumar Café americano' }).click();
    await expect(current).toHaveURL('/ingresar');
    await expect(current.getByRole('alert')).toHaveText(
      'Tu sesión venció. Vuelve a iniciar sesión',
    );
    await login(current, 'cashier');
    await expect(current).toHaveURL('/ventas/nueva');
    await expect(current.getByText('Café americano × 2 · Bs 25,00')).toBeVisible();
    await expect(current.getByText('Empanada × 2 · Bs 16,00')).toBeVisible();
    await expect(current.getByLabel('QR', { exact: true })).toBeChecked();
  });
  await test.step('3. Cerrar sesión descarta la preparación', async () => {
    await current.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(current).toHaveURL('/ingresar');
    await login(current, 'cashier');
    await expect(current).toHaveURL('/');
    await openSale(current);
    await expectEmpty(current);
  });
  await test.step('4. Otra cuenta no ve la preparación y la descarta al abrir Nueva venta', async () => {
    await current.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
    await current.getByLabel('QR', { exact: true }).check();
    expect(
      (
        await request.post('/api/__test/clock', { data: { advanceMilliseconds: 12 * 60 * 60_000 } })
      ).status(),
    ).toBe(200);
    await current.getByRole('button', { name: 'Sumar Café americano' }).click();
    await expect(current).toHaveURL('/ingresar');
    await login(current, 'owner');
    await expect(current).toHaveURL('/');
    await openSale(current);
    await expectEmpty(current);
    await current.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(current).toHaveURL('/ingresar');
    await login(current, 'cashier');
    await expect(current).toHaveURL('/');
    await openSale(current);
    await expectEmpty(current);
  });
  await test.step('5. Volver conserva y Descartar vacía sin registrar, con diálogo nativo y teclado', async () => {
    await current.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
    await current.getByLabel('QR', { exact: true }).check();
    const trigger = current.getByRole('button', { name: 'Descartar venta', exact: true });
    await trigger.focus();
    await current.keyboard.press('Enter');
    const dialog = current.getByRole('dialog', {
      name: '¿Descartar esta venta? Se quitarán todos sus productos',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Volver', exact: true })).toBeFocused();
    await current.setViewportSize({ width: 390, height: 844 });
    await current.screenshot({
      path: testInfo.outputPath('ventas-descartar-mobile.png'),
      fullPage: true,
    });
    await current.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(current.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await expect(current.getByLabel('QR', { exact: true })).toBeChecked();
    await expect(trigger).toBeFocused();
    await current.keyboard.press('Enter');
    await current.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(current.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await current.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await current.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Descartar', exact: true })).toBeFocused();
    await current.keyboard.press('Space');
    await expectEmpty(current);
    expect(await current.evaluate(() => localStorage.getItem('kofi:sales:draft'))).toBeNull();
    expect((await (await request.get('/api/__test/sales')).json()).sales).toHaveLength(0);
  });
});

test('RF-12: registrar y descartar en una pestaña actualiza la otra', async ({
  page,
  context,
  request,
}) => {
  await request.post('/api/__test/menu', { data: fixture });
  await login(page, 'cashier');
  await openSale(page);
  await page.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
  await page.getByLabel('QR', { exact: true }).check();
  const second = await context.newPage();
  try {
    await second.goto('/ventas/nueva');
    await expect(second.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await expect(second.getByLabel('QR', { exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
    await expect(page.getByText(/Venta N.º 1 registrada/)).toBeVisible();
    await expectEmpty(second);
    await second.getByRole('button', { name: 'Empanada · Bs 8,00' }).click();
    await expect(page.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    await second.getByRole('button', { name: 'Descartar venta', exact: true }).click();
    await second
      .getByRole('dialog')
      .getByRole('button', { name: 'Descartar', exact: true })
      .click();
    await expectEmpty(page);
    expect((await (await request.get('/api/__test/sales')).json()).sales).toHaveLength(1);
  } finally {
    await second.close();
  }
});

test('RF-13: un cambio de rol termina la sesión y descarta su borrador', async ({
  page,
  request,
}) => {
  await request.post('/api/__test/menu', { data: fixture });
  await login(page, 'cashier');
  await openSale(page);
  await page.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
  try {
    expect(
      (
        await request.post(`/api/__test/accounts/${TEST_ACCOUNTS.cashier.username}`, {
          data: { action: 'update', changes: { role: 'owner' } },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Sumar Café americano' }).click();
    await expect(page).toHaveURL('/ingresar');
    await expect(page.getByRole('alert')).toHaveText('Tu sesión terminó. Vuelve a iniciar sesión');
    expect(await page.evaluate(() => localStorage.getItem('kofi:sales:draft'))).toBeNull();
  } finally {
    expect(
      (
        await request.post(`/api/__test/accounts/${TEST_ACCOUNTS.cashier.username}`, {
          data: { action: 'update', changes: { role: TEST_ACCOUNTS.cashier.role } },
        })
      ).status(),
    ).toBe(200);
  }
  await login(page, 'cashier');
  await openSale(page);
  await expectEmpty(page);
});
