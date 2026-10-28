import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures.ts';

// Filas de la tabla «Menú oficial» de la especificación: categoría, producto y precio («Bs 10,00»).
const OFFICIAL_ROWS = readFileSync(
  join(import.meta.dirname, '../specs/006-menu-inicial/spec.md'),
  'utf8',
)
  .split('### Menú oficial')[1]!
  .split('\n## ')[0]!
  .split('\n')
  .filter(
    (line) => line.startsWith('| ') && !line.startsWith('| Categoría') && !line.includes('---'),
  )
  .map((line) => {
    const [category, product, price] = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    return { category: category!, product: product!, price: price! };
  });
const CATEGORIES = [...new Set(OFFICIAL_ROWS.map((row) => row.category))];

async function login(page: Page, role: 'owner' | 'cashier') {
  await page.goto('/ingresar');
  await page.getByLabel('Usuario', { exact: true }).fill(TEST_ACCOUNTS[role].username);
  await page.getByLabel('Contraseña', { exact: true }).fill(TEST_ACCOUNTS[role].password);
  await page.getByLabel('Contraseña', { exact: true }).press('Enter');
  await expect(page).toHaveURL('/');
}

const productRow = (main: Locator, category: string, product: string) =>
  main
    .getByRole('region', { name: category, exact: true })
    .getByRole('listitem')
    .filter({ has: main.page().getByText(product, { exact: true }) });

// Exactamente las categorías y los productos de «Menú oficial», cada uno con su precio.
async function expectOfficialMenu(main: Locator) {
  await expect(main.locator('section.menu__section')).toHaveCount(CATEGORIES.length);
  for (const category of CATEGORIES) {
    const rows = OFFICIAL_ROWS.filter((row) => row.category === category);
    await expect(
      main.getByRole('region', { name: category, exact: true }).getByRole('listitem'),
    ).toHaveCount(rows.length);
    for (const row of rows)
      await expect(productRow(main, category, row.product)).toContainText(row.price);
  }
}

test('Menú inicial US1: el menú oficial cargado se ve y se administra como cualquier otro (RF-2)', async ({
  page,
  request,
  browser,
  baseURL,
}, testInfo) => {
  expect(OFFICIAL_ROWS).toHaveLength(37);
  expect(CATEGORIES).toHaveLength(6);
  const load = await request.post('/api/__test/official-menu');
  expect(load.status()).toBe(200);
  expect(await load.json()).toEqual({ categories: 6, products: 37 });
  const owner = await browser.newContext({ baseURL });
  try {
    await test.step('1. El cajero ve las 6 categorías y los 37 productos con sus precios', async () => {
      await login(page, 'cashier');
      await page.getByRole('link', { name: 'Ver menú', exact: true }).click();
      await expectOfficialMenu(page.getByRole('main'));
      await page.screenshot({ path: testInfo.outputPath('ver-menu.png'), fullPage: true });
    });
    const ownerPage = await owner.newPage();
    await test.step('2. El dueño los ve activos en «Administrar menú»', async () => {
      await login(ownerPage, 'owner');
      await ownerPage.getByRole('link', { name: 'Administrar menú' }).click();
      const main = ownerPage.getByRole('main');
      await expectOfficialMenu(main);
      await expect(main.getByText('Inactiva', { exact: true })).toHaveCount(0);
      await expect(main.getByText('Inactivo', { exact: true })).toHaveCount(0);
    });
    await test.step('3. Un cambio de precio del dueño se ve en «Ver menú»', async () => {
      await ownerPage.getByRole('button', { name: 'Editar Americano', exact: true }).click();
      await ownerPage.getByLabel('Precio (Bs)').fill('14');
      await ownerPage.getByLabel('Precio (Bs)').press('Enter');
      await expect(ownerPage.getByText('Cambios guardados')).toBeVisible();
      await page.reload();
      await expect(productRow(page.getByRole('main'), 'Cafés', 'Americano')).toContainText(
        'Bs 14,00',
      );
    });
  } finally {
    await owner.close();
  }
});
