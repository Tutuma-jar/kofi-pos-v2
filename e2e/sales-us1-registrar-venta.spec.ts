import { expect, test } from '@playwright/test';
import { adminMenuResponseSchema, saleSchema, formatDateTime } from '@kofi/contracts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('RF-2: conserva la lista entre cambios y la refresca al recargar o ante RF-5', async ({
  page,
  request,
  browser,
}) => {
  await request.post('/api/__test/menu', {
    data: {
      categories: [
        {
          name: 'Bebidas',
          products: [
            { name: 'Café', price: '10' },
            { name: 'Té', price: '8' },
          ],
        },
      ],
    },
  });
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.cashier.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.cashier.password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
  await page.getByRole('button', { name: 'Café · Bs 10,00', exact: true }).click();
  const owner = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect(
      (await owner.request.post('/api/auth/login', { data: TEST_ACCOUNTS.owner })).status(),
    ).toBe(200);
    const menu = adminMenuResponseSchema.parse(
      await (await owner.request.get('/api/menu/admin')).json(),
    );
    const products = menu.categories.flatMap((category) => category.products);
    const tea = products.find((product) => product.name === 'Té')!;
    const coffee = products.find((product) => product.name === 'Café')!;
    expect(
      (
        await owner.request.put(`/api/menu/products/${tea.id}`, {
          data: { name: 'Té nuevo', categoryId: tea.categoryId, price: '9' },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Sumar Café', exact: true }).click();
    await expect(page.getByLabel('Total de la venta')).toHaveText('Bs 20,00');
    await expect(page.getByRole('button', { name: 'Té · Bs 8,00', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Té nuevo · Bs 9,00', exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Té nuevo · Bs 9,00', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Total de la venta')).toHaveText('Bs 20,00');
    expect(
      (
        await owner.request.put(`/api/menu/products/${coffee.id}`, {
          data: { name: coffee.name, categoryId: coffee.categoryId, price: '11' },
        })
      ).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Sumar Café', exact: true }).click();
    await expect(page.getByText('Cambió el precio de “Café”: ahora cuesta Bs 11,00')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Café · Bs 11,00', exact: true })).toBeVisible();
    expect((await owner.request.post(`/api/menu/products/${tea.id}/deactivate`)).status()).toBe(
      200,
    );
    await page.getByRole('button', { name: 'Té nuevo · Bs 9,00', exact: true }).click();
    await expect(page.getByText('“Té nuevo” ya no está en el menú')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Té nuevo · Bs 9,00', exact: true })).toHaveCount(
      0,
    );
  } finally {
    await owner.close();
  }
});

test('RF-6: conserva la confirmación al intentar agregar un producto retirado', async ({
  page,
  request,
  browser,
}) => {
  await request.post('/api/__test/menu', {
    data: {
      categories: [
        {
          name: 'Venta',
          products: [
            { name: 'Café', price: '12,50' },
            { name: 'Empanada', price: '8' },
          ],
        },
      ],
    },
  });
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.cashier.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.cashier.password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
  await page.getByRole('button', { name: 'Café · Bs 12,50' }).click();
  await page.getByLabel('Efectivo', { exact: true }).check();
  await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
  const confirmation = page.getByText(/Venta N.º 1 registrada · Bs 12,50 · Efectivo/);
  await expect(confirmation).toBeVisible();
  const owner = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect(
      (
        await owner.request.post('/api/auth/login', {
          data: { username: TEST_ACCOUNTS.owner.username, password: TEST_ACCOUNTS.owner.password },
        })
      ).status(),
    ).toBe(200);
    const menu = adminMenuResponseSchema.parse(
      await (await owner.request.get('/api/menu/admin')).json(),
    );
    const coffee = menu.categories
      .flatMap((category) => category.products)
      .find((product) => product.name === 'Café')!;
    expect((await owner.request.post(`/api/menu/products/${coffee.id}/deactivate`)).status()).toBe(
      200,
    );
  } finally {
    await owner.close();
  }
  await page.getByRole('button', { name: 'Café · Bs 12,50' }).click();
  await expect(page.getByText('“Café” ya no está en el menú')).toBeVisible();
  await expect(page.getByText('Elige los productos de la venta')).toBeVisible();
  await expect(confirmation).toBeVisible();
  await page.getByRole('button', { name: 'Empanada · Bs 8,00' }).click();
  await expect(page.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
  await expect(confirmation).toHaveCount(0);
});

test('Ventas US1: registrar una venta pagada con cambios del menú y conexión (RF-1 a RF-11)', async ({
  page,
  request,
  context,
  browser,
}, testInfo) => {
  expect(
    (
      await request.post('/api/__test/menu', {
        data: {
          categories: [
            { name: 'Bebidas calientes', products: [{ name: 'Café americano', price: '12,50' }] },
            { name: 'Salados', products: [{ name: 'Empanada', price: '8' }] },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  const { now } = await (
    await request.post('/api/__test/clock', { data: { advanceMilliseconds: 0 } })
  ).json();

  await test.step('1. El cajero abre Nueva venta con categorías y precios vigentes', async () => {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.cashier.username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.cashier.password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
    await expect(page).toHaveURL('/ventas/nueva');
    await expect(page.getByRole('heading', { name: 'Bebidas calientes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Salados' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Café americano · Bs 12,50' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Empanada · Bs 8,00' })).toBeEnabled();
  });
  await test.step('2. Arma dos líneas con teclado y muestra Bs 33,00', async () => {
    const coffee = page.getByRole('button', { name: 'Café americano · Bs 12,50' });
    await coffee.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await page.getByRole('button', { name: 'Sumar Café americano' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByText('Café americano × 2 · Bs 25,00')).toBeVisible();
    await page.getByRole('button', { name: 'Empanada · Bs 8,00' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restar Empanada' })).toBeDisabled();
    await expect(page.getByLabel('Total de la venta')).toHaveText('Bs 33,00');
  });
  await test.step('3. Elige Efectivo y el doble clic registra una sola venta completa', async () => {
    const register = page.getByRole('button', { name: 'Registrar venta', exact: true });
    await expect(register).toBeDisabled();
    await expect(page.getByLabel('Efectivo', { exact: true })).not.toBeChecked();
    await expect(page.getByLabel('QR', { exact: true })).not.toBeChecked();
    await page.getByLabel('Efectivo', { exact: true }).focus();
    await page.keyboard.press('Space');
    await register.dblclick();
    await expect(
      page.getByText(`Venta N.º 1 registrada · Bs 33,00 · Efectivo · ${formatDateTime(now)}`),
    ).toBeVisible();
    await expect(page.getByText('Elige los productos de la venta')).toBeVisible();
    await expect(page.getByLabel('Efectivo', { exact: true })).not.toBeChecked();
    await expect(page.getByLabel('QR', { exact: true })).not.toBeChecked();
    const { sales } = await (await request.get('/api/__test/sales')).json();
    expect(sales).toHaveLength(1);
    expect(saleSchema.parse(sales[0])).toMatchObject({
      number: 1,
      totalCents: 3300,
      paymentMethod: 'cash',
      registeredAt: now,
      registeredBy: { displayName: TEST_ACCOUNTS.cashier.displayName, role: 'cashier' },
      lines: [
        { productName: 'Café americano', quantity: 2, unitPriceCents: 1250, subtotalCents: 2500 },
        { productName: 'Empanada', quantity: 1, subtotalCents: 800 },
      ],
    });
  });
  await test.step('4. Un dueño cambia el precio y se revisa antes del registro con QR', async () => {
    await page.getByRole('button', { name: 'Café americano · Bs 12,50' }).click();
    const owner = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      expect(
        (
          await owner.request.post('/api/auth/login', {
            data: {
              username: TEST_ACCOUNTS.owner.username,
              password: TEST_ACCOUNTS.owner.password,
            },
          })
        ).status(),
      ).toBe(200);
      const menu = adminMenuResponseSchema.parse(
        await (await owner.request.get('/api/menu/admin')).json(),
      );
      const coffee = menu.categories
        .flatMap((category) => category.products)
        .find((product) => product.name === 'Café americano')!;
      expect(
        (
          await owner.request.put(`/api/menu/products/${coffee.id}`, {
            data: { name: coffee.name, categoryId: coffee.categoryId, price: '13' },
          })
        ).status(),
      ).toBe(200);
    } finally {
      await owner.close();
    }
    await page.getByLabel('QR', { exact: true }).check();
    await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
    await expect(
      page.getByText('El menú cambió. Revisa la venta antes de registrarla'),
    ).toBeVisible();
    await expect(
      page.getByText('Cambió el precio de “Café americano”: ahora cuesta Bs 13,00'),
    ).toBeVisible();
    await expect(page.getByText('Café americano × 1 · Bs 13,00')).toBeVisible();
    expect((await (await request.get('/api/__test/sales')).json()).sales).toHaveLength(1);
    await page.getByRole('button', { name: 'Registrar venta', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText(`Venta N.º 2 registrada · Bs 13,00 · QR · ${formatDateTime(now)}`),
    ).toBeVisible();
    const { sales } = await (await request.get('/api/__test/sales')).json();
    expect(sales).toHaveLength(2);
    expect(sales[0]).toMatchObject({
      number: 1,
      paymentMethod: 'cash',
      totalCents: 3300,
      lines: [{ unitPriceCents: 1250 }, { unitPriceCents: 800 }],
    });
    expect(sales[1]).toMatchObject({ number: 2, paymentMethod: 'qr', totalCents: 1300 });
    await page.screenshot({ path: testInfo.outputPath('ventas-desktop.png'), fullPage: true });
  });
  await test.step('5. Sin conexión se conserva la venta sin el producto que se intentó agregar', async () => {
    await page.getByRole('button', { name: 'Café americano · Bs 13,00' }).click();
    await expect(page.getByText('Café americano × 1 · Bs 13,00')).toBeVisible();
    await context.setOffline(true);
    try {
      await page.getByRole('button', { name: 'Empanada · Bs 8,00' }).click();
      await expect(
        page.getByText('No hay conexión. Inténtalo de nuevo', { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Café americano × 1 · Bs 13,00')).toBeVisible();
      await expect(page.getByText('Empanada × 1 · Bs 8,00')).toHaveCount(0);
      await expect(page.getByLabel('Total de la venta')).toHaveText('Bs 13,00');
    } finally {
      await context.setOffline(false);
    }
    expect((await (await request.get('/api/__test/sales')).json()).sales).toHaveLength(2);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('ventas-mobile.png'), fullPage: true });
  });
});
