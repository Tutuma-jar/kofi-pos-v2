import { expect, test, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

async function submit(page: Page, password: string) {
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS.cashier.username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  return response;
}

test('US2: bloqueo, desbloqueo, vencimiento, regreso y terminación (RF-9 a RF-12)', async ({
  page,
  context,
}) => {
  const advance = async (advanceMilliseconds: number) => {
    const response = await page.request.post('/api/__test/clock', {
      data: { advanceMilliseconds },
    });
    expect(response.status()).toBe(200);
  };
  const role = async (role: 'owner' | 'cashier') => {
    const response = await page.request.post('/api/__test/accounts/luis', {
      data: { action: 'update', changes: { role } },
    });
    expect(response.status()).toBe(200);
  };
  try {
    await test.step('1. Cinco fallos bloquean incluso la contraseña correcta', async () => {
      await page.goto('/ingresar');
      for (let i = 0; i < 5; i++) {
        expect((await submit(page, 'incorrecta de prueba')).status()).toBe(401);
        await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos');
        await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
      }
      expect((await submit(page, TEST_ACCOUNTS.cashier.password)).status()).toBe(429);
      await expect(page.getByRole('alert')).toHaveText(
        'Demasiados intentos. Vuelve a intentarlo en 5 minutos',
      );
    });
    await test.step('2. A los cinco minutos se acepta el ingreso', async () => {
      await advance(5 * 60_000);
      expect((await submit(page, TEST_ACCOUNTS.cashier.password)).status()).toBe(200);
      await expect(page).toHaveURL('/');
      await expect(page.getByText('Hola, Luis Mamani', { exact: true })).toBeVisible();
      await expect(page.getByRole('banner')).toContainText('Cajero');
    });
    await test.step('3. La cookie dura más de doce horas; el vencimiento avisa y permite regresar', async () => {
      const cookie = (await context.cookies()).find((cookie) => cookie.name === 'kofi_session');
      expect(cookie).toBeDefined();
      expect(cookie!.expires * 1000 - Date.now()).toBeGreaterThan(12 * 60 * 60_000);
      expect(cookie!.httpOnly).toBe(true);
      expect(cookie!.sameSite).toBe('Strict');
      await advance(12 * 60 * 60_000);
      await page.reload();
      await expect(page).toHaveURL('/ingresar');
      await expect(page.getByRole('alert')).toHaveText('Tu sesión venció. Vuelve a iniciar sesión');
      await expect(page.getByText('Hola, Luis Mamani', { exact: true })).toHaveCount(0);
      expect((await submit(page, TEST_ACCOUNTS.cashier.password)).status()).toBe(200);
      await expect(page).toHaveURL('/');
      await expect(page.getByText('Hola, Luis Mamani', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('kofi:auth:return-to'))).toBeNull();
    });
    await test.step('4. Un cambio de rol termina la sesión en su siguiente acción', async () => {
      await role('owner');
      await page.reload();
      await expect(page).toHaveURL('/ingresar');
      await expect(page.getByRole('alert')).toHaveText(
        'Tu sesión terminó. Vuelve a iniciar sesión',
      );
      await expect(page.getByText('Hola, Luis Mamani', { exact: true })).toHaveCount(0);
      expect((await submit(page, TEST_ACCOUNTS.cashier.password)).status()).toBe(200);
      await expect(page.getByRole('banner')).toContainText('Dueño');
    });
  } finally {
    await role('cashier');
  }
});
