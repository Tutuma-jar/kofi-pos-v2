import type { Page } from '@playwright/test';
import { test, expect } from './dashboard-fixture.ts';
import { TEST_ACCOUNTS } from './fixtures.ts';

// SPEC-007 HU-1: tres meses de ventas de demostración, vistas en el Historial (plan §8.2).
test('US1: el Historial muestra las ventas de demostración y la numeración sigue (RF-8, RF-9)', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);

  // El servidor de este recorrido arranca el 24/10/2026 a las 08:00; se avanza al 28/10 11:00.
  const start = new Date('2026-10-24T08:00:00-04:00');
  const now = new Date('2026-10-28T11:00:00-04:00');
  const clock = await request.post('/api/__test/clock', {
    data: { advanceMilliseconds: now.getTime() - start.getTime() },
  });
  expect((await clock.json()).now).toBe(now.toISOString());

  const loaded = await request.post('/api/__test/demo-sales');
  expect(loaded.status()).toBe(200);
  const { count, from, to } = (await loaded.json()) as { count: number; from: string; to: string };
  expect([from, to]).toEqual(['2026-07-28', '2026-10-27']);

  const login = async (role: 'owner' | 'cashier') => {
    await page.goto('/ingresar');
    await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
    await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
    await page.getByLabel('Contraseña', { exact: true }).press('Enter');
    await expect(page).toHaveURL('/');
  };
  const logout = async (current: Page) => {
    await current.goto('/');
    await current.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(current).toHaveURL('/ingresar');
  };

  await test.step('1. Hoy, 28/10/2026, no tiene ventas de demostración', async () => {
    await login('owner');
    await page.getByRole('link', { name: 'Historial de ventas', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ventas del 28/10/2026' })).toBeVisible();
    await expect(
      page.getByText('No hay ventas registradas este día', { exact: true }),
    ).toBeVisible();
  });

  await test.step('2. El 27/10/2026 tiene de 30 a 80 ventas, en horario, con los dos medios', async () => {
    await page.getByRole('button', { name: 'Día anterior' }).click();
    await expect(page.getByRole('heading', { name: 'Ventas del 27/10/2026' })).toBeVisible();
    const items = page.getByRole('listitem');
    await expect(items.first()).toBeVisible();
    const texts = await items.allTextContents();
    expect(texts.length).toBeGreaterThanOrEqual(30);
    expect(texts.length).toBeLessThanOrEqual(80);
    const names = [
      `${TEST_ACCOUNTS.owner.displayName} · Dueño`,
      `${TEST_ACCOUNTS.cashier.displayName} · Cajero`,
    ];
    for (const text of texts) {
      const [, time] = text.split(' · ');
      expect(time! >= '07:30' && time! <= '20:29').toBe(true);
      expect(names.some((name) => text.includes(name))).toBe(true);
    }
    expect(texts.some((text) => text.includes(' · Efectivo · '))).toBe(true);
    expect(texts.some((text) => text.includes(' · QR · '))).toBe(true);
    expect(texts.some((text) => text.includes('· Cajero ·'))).toBe(true);
  });

  await test.step('3. El detalle de una venta muestra productos del menú oficial con su precio', async () => {
    await page.getByRole('link', { name: /^N.º / }).first().click();
    await expect(page.getByRole('heading', { name: /^Venta N.º \d+$/ })).toBeVisible();
    const lines = await page.getByRole('listitem').allTextContents();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines)
      expect(line).toMatch(
        /^.+ · (Cafés|Otras bebidas calientes|Bebidas frías|Jugos y licuados|Salados|Repostería) · Bs \d+,\d\d × \d+ · Bs \d+,\d\d$/,
      );
  });

  await test.step('4. Septiembre de 2026 muestra 30 días, alguno sin ventas', async () => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Historial de ventas', exact: true }).click();
    await page.getByRole('link', { name: 'Ver por mes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
    await page.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(page.getByRole('heading', { name: 'Septiembre de 2026' })).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(31);
    await expect(
      page.getByRole('row').filter({ hasText: 'Bs 0,00 · 0 ventas' }).first(),
    ).toBeVisible();
    await logout(page);
  });

  await test.step('5. «Nueva venta» toma el número siguiente al de la última venta de demostración', async () => {
    await login('cashier');
    await page.getByRole('link', { name: 'Nueva venta', exact: true }).click();
    await page.getByRole('button', { name: 'Americano · Bs 13,00' }).click();
    await page.getByLabel('Efectivo', { exact: true }).check();
    await page.getByRole('button', { name: 'Registrar venta', exact: true }).click();
    await expect(
      page.getByText(`Venta N.º ${count + 1} registrada · Bs 13,00 · Efectivo`, { exact: false }),
    ).toBeVisible();
  });
});
