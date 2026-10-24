import { expect, test, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

async function submit(page: Page, username: string, password: string) {
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
}

test('US1: ingreso, errores, turnos en la computadora y pérdida de conexión (RF-1 a RF-8, RF-14)', async ({
  page,
  context,
}) => {
  await test.step('1. Sin sesión no se muestra información del negocio', async () => {
    await page.goto('/');
    await expect(page).toHaveURL('/ingresar');
    await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible();
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  });
  await test.step('2. Un campo vacío no envía una petición', async () => {
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/login')) requests.push(request.url());
    });
    await page.getByLabel('Usuario', { exact: true }).fill('ana');
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await expect(page.getByText('Escribe tu contraseña', { exact: true })).toBeVisible();
    expect(requests).toHaveLength(0);
  });
  await test.step('3. Usuario inexistente y contraseña incorrecta reciben el mismo error', async () => {
    for (const username of ['no-existe', 'Ana']) {
      await submit(page, username, 'incorrecta de prueba');
      await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos');
      await expect(page.getByLabel('Usuario', { exact: true })).toHaveValue(username);
      await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
      await expect(page).toHaveURL('/ingresar');
    }
  });
  await test.step('4. Ingreso normalizado muestra el saludo y el rol', async () => {
    await submit(page, '  Ana ', TEST_ACCOUNTS.owner.password);
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Dueño');
  });
  await test.step('5. Abrir el ingreso con sesión vuelve al inicio', async () => {
    await page.goto('/ingresar');
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
  });
  await test.step('6. Cerrar invalida otra pestaña, el token repetido y volver atrás', async () => {
    const tab = await context.newPage();
    await tab.goto('/');
    await expect(tab.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
    const token = (await context.cookies()).find((cookie) => cookie.name === 'kofi_session')!.value;
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL('/ingresar');
    const repeated = await context.request.get('/api/auth/session', {
      headers: { cookie: `kofi_session=${token}` },
    });
    expect(repeated.status()).toBe(401);
    expect((await repeated.json()).error.code).toBe('SESSION_MISSING');
    await tab.reload();
    await expect(tab).toHaveURL('/ingresar');
    await expect(tab.getByText('Hola, Ana Quispe', { exact: true })).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL('/ingresar');
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toHaveCount(0);
    await tab.close();
  });
  await test.step('7. La siguiente persona entra como cajero', async () => {
    await submit(page, TEST_ACCOUNTS.cashier.username, TEST_ACCOUNTS.cashier.password);
    await expect(page.getByText('Hola, Luis Mamani', { exact: true })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Cajero');
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL('/ingresar');
  });
  await test.step('8. Una red interrumpida mantiene el usuario y permite reintentar', async () => {
    await page.route('**/api/auth/login', (route) => route.abort('internetdisconnected'));
    await submit(page, 'Ana', TEST_ACCOUNTS.owner.password);
    await expect(page.getByRole('alert')).toHaveText('No hay conexión. Inténtalo de nuevo');
    await expect(page.getByLabel('Usuario', { exact: true })).toHaveValue('Ana');
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    await page.unroute('**/api/auth/login');
    await submit(page, 'Ana', TEST_ACCOUNTS.owner.password);
    await expect(page.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
  });
});

test('RF-6 y RF-8: cerrar una sesión mantiene la de otro navegador de la misma cuenta', async ({
  page,
  browser,
  baseURL,
}) => {
  const other = await browser.newContext({ baseURL });
  try {
    const otherPage = await other.newPage();
    for (const current of [page, otherPage]) {
      await current.goto('/ingresar');
      await submit(current, TEST_ACCOUNTS.owner.username, TEST_ACCOUNTS.owner.password);
      await expect(current.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL('/ingresar');
    await otherPage.reload();
    await expect(otherPage.getByText('Hola, Ana Quispe', { exact: true })).toBeVisible();
    await expect(otherPage).toHaveURL('/');
  } finally {
    await other.close();
  }
});
