import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';
import { monthHistorySchema } from '@kofi/contracts';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

test('US3: cifras reales del mes, límites, navegación, estados y teclado (RF-5, RF-6, RF-11 a RF-13, RNF-4)', async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(60000);
  let now = new Date('2026-10-24T12:00:00Z');
  const advanceTo = async (instant: string) => {
    const next = new Date(instant);
    const response = await request.post('/api/__test/clock', {
      data: { advanceMilliseconds: next.getTime() - now.getTime() },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).now).toBe(next.toISOString());
    now = next;
  };
  const loginApi = async (role: 'owner' | 'cashier') => {
    expect((await request.post('/api/auth/login', { data: TEST_ACCOUNTS[role] })).status()).toBe(
      200,
    );
    expect((await (await request.get('/api/auth/session')).json()).user.role).toBe(role);
  };
  const loginPage = async () => {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.owner.username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS.owner.password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await page.waitForURL((url) => url.pathname !== '/ingresar');
    await page.goto('/');
    expect((await (await page.request.get('/api/auth/session')).json()).user.role).toBe('owner');
  };
  const tabTo = async (target: Locator) => {
    for (let index = 0; index < 45; index++) {
      await page.keyboard.press('Tab');
      if (await target.evaluate((element) => element === element.ownerDocument.activeElement))
        return;
    }
    throw new Error('No se alcanzó el control con Tab');
  };

  // 1. Tres ventas a ambos lados del cierre de octubre, en una base efímera.
  expect(
    (
      await request.post('/api/__test/menu', {
        data: {
          categories: [
            {
              name: 'Menú de prueba',
              products: [
                { name: 'Café americano', price: '12,50' },
                { name: 'Empanada', price: '8,00' },
              ],
            },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  await loginApi('cashier');
  const products = (await (await request.get('/api/menu')).json()).categories[0].products as {
    id: string;
    name: string;
    priceCents: number;
  }[];
  const register = async (name: string, quantity: number, paymentMethod: 'cash' | 'qr') => {
    const product = products.find((product) => product.name === name)!;
    const response = await request.post('/api/sales', {
      data: {
        draftId: randomUUID(),
        paymentMethod,
        lines: [
          {
            productId: product.id,
            productName: product.name,
            unitPriceCents: product.priceCents,
            quantity,
          },
        ],
      },
    });
    expect(response.status()).toBe(201);
  };
  await advanceTo('2026-10-24T13:00:00Z');
  await register('Empanada', 1, 'cash');
  await advanceTo('2026-11-01T03:59:00Z');
  await loginApi('cashier');
  await register('Café americano', 2, 'qr');
  await advanceTo('2026-11-01T04:00:30Z');
  await register('Café americano', 1, 'cash');
  await advanceTo('2026-11-05T14:00:00Z');
  await loginApi('owner');
  const originalSales = await (await request.get('/api/__test/sales')).json();
  const october = monthHistorySchema.parse(
    await (await request.get('/api/history/month?month=2026-10')).json(),
  );
  expect(october.totalCents).toBe(3300);
  expect(october.days.reduce((sum, day) => sum + day.totalCents, 0)).toBe(october.totalCents);
  expect(october.days.reduce((sum, day) => sum + day.salesCount, 0)).toBe(october.salesCount);

  // 2. El acceso independiente al mes empieza desde la pantalla inicial.
  await loginPage();
  await tabTo(page.getByRole('link', { name: 'Historial de ventas', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 05/11/2026' })).toBeVisible();
  await tabTo(page.getByRole('link', { name: 'Ver por mes', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Noviembre de 2026' })).toBeVisible();
  await expect(page).toHaveURL(/\/ventas\/mes\?mes=2026-11$/);
  for (const text of [
    'Bs 12,50',
    '1 venta',
    'Efectivo: Bs 12,50 · 1 venta',
    'QR: Bs 0,00 · 0 ventas',
    'Datos al 05/11/2026 10:00',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  await expect(page.getByLabel('Mes', { exact: true })).toHaveAttribute('min', '0001-01');
  await expect(page.getByLabel('Mes', { exact: true })).toHaveAttribute('max', '2026-11');

  // 3. Octubre tiene las dos ventas de octubre, sin la del 1 de noviembre.
  await tabTo(page.getByRole('button', { name: 'Mes anterior' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  for (const text of [
    'Bs 33,00',
    '2 ventas',
    'Efectivo: Bs 8,00 · 1 venta',
    'QR: Bs 25,00 · 1 venta',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(32);
  await expect(
    page.getByRole('link', { name: '24/10/2026 · Bs 8,00 · 1 venta', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '31/10/2026 · Bs 25,00 · 1 venta', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: / · Bs 0,00 · 0 ventas$/ })).toHaveCount(29);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();

  // 4. La fila abre su día; Ver por día vuelve a hoy.
  await tabTo(page.getByRole('link', { name: '31/10/2026 · Bs 25,00 · 1 venta', exact: true }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ventas del 31/10/2026' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText(
    'N.º 2 · 23:59 · Luis Mamani · Cajero · QR · Bs 25,00',
  );
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver por día', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ventas del 05/11/2026' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver por mes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Noviembre de 2026' })).toBeVisible();

  // 5. Rechazos de URL, sin cifras residuales.
  for (const [month, message] of [
    ['2026-12', 'No se pueden consultar meses futuros'],
    ['2026-13', 'El mes no es válido'],
  ]) {
    await page.goto('/ventas/mes?mes=' + month);
    await expect(page.getByRole('alert')).toHaveText(message!);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByText('Total vendido', { exact: true })).toHaveCount(0);
  }

  // 6–7. Campo nativo y filas accesibles con teclado; septiembre conserva sus 30 días en cero.
  await page.goto('/ventas/mes?mes=2026-10');
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  await tabTo(page.getByLabel('Mes', { exact: true }));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Septiembre de 2026' })).toBeVisible();
  await expect(page.getByText('No hay ventas registradas este mes', { exact: true })).toBeVisible();
  for (const text of [
    'Bs 0,00',
    '0 ventas',
    'Efectivo: Bs 0,00 · 0 ventas',
    'QR: Bs 0,00 · 0 ventas',
  ])
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(31);
  await expect(page.getByRole('link', { name: / · Bs 0,00 · 0 ventas$/ })).toHaveCount(30);

  // Conservación de consulta ante desconexión y error, recuperación y búsqueda desde el mes.
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Mes anterior' }).click();
  await expect(page.getByRole('alert')).toHaveText('No hay conexión. Inténtalo de nuevo');
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  await expect(page.getByText('Bs 33,00', { exact: true })).toBeVisible();
  await expect(page.getByText('Datos al 05/11/2026 10:00', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('heading', { name: 'Septiembre de 2026' })).toBeVisible();
  await page.route('**/api/history/month**', (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error. Inténtalo de nuevo' } },
    }),
  );
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ocurrió un error. Inténtalo de nuevo');
  await expect(page.getByRole('heading', { name: 'Septiembre de 2026' })).toBeVisible();
  await page.unroute('**/api/history/month**');
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  await page.getByLabel('Buscar venta por número', { exact: true }).fill('002');
  await page.getByLabel('Buscar venta por número', { exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Venta N.º 2', exact: true })).toBeVisible();

  // El mes abierto no cambia por sí solo al pasar al siguiente mes.
  await advanceTo('2026-12-01T03:58:00Z');
  await loginPage();
  await page.goto('/ventas/mes');
  await expect(page).toHaveURL(/mes=2026-11$/);
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  await advanceTo('2026-12-01T04:05:00Z');
  await expect(page.getByRole('heading', { name: 'Noviembre de 2026' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  await page.getByRole('button', { name: 'Actualizar' }).click();
  await expect(page.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Noviembre de 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Diciembre de 2026' })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.goto('/ventas/mes?mes=0001-01');
  await expect(page.getByRole('heading', { name: 'Enero de 0001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
  await expect(page.getByRole('row')).toHaveCount(32);
  await loginApi('cashier');
  const forbidden = await request.get('/api/history/month?month=2026-13');
  expect(forbidden.status()).toBe(403);
  expect(await forbidden.json()).toEqual({
    error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el historial de ventas' },
  });
  expect(await (await request.get('/api/__test/sales')).json()).toEqual(originalSales);
});
