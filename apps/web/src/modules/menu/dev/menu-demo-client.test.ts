import {
  adminMenuResponseSchema,
  adminProductSchema,
  apiErrorSchema,
  categorySchema,
  currentMenuResponseSchema,
} from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import type { MenuClient } from '../api/menu-client.ts';
import { DEMO_CATEGORIES, DEMO_ERRORS, DEMO_IDS, DEMO_PRODUCTS } from './fixtures.ts';
import { createMenuDemoClient, MENU_SCENARIOS, type MenuScenarioId } from './menu-demo-client.ts';

async function rejection(promise: Promise<unknown>): Promise<ApiFetchError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiFetchError);
  return error as ApiFetchError;
}

const NEW_PRODUCT = { name: 'Latte', categoryId: DEMO_IDS.hotDrinks, price: '14,5' };

type Outcome = { value: unknown } | { error: unknown };

// Llama a cada operación del cliente, en orden, y devuelve lo que resuelve o lanza.
async function everyOperation(client: MenuClient): Promise<Outcome[]> {
  const calls: (() => Promise<unknown>)[] = [
    () => client.getAdminMenu(),
    () => client.getCurrentMenu(),
    () => client.createCategory({ name: 'Postres' }),
    () => client.renameCategory(DEMO_IDS.juices, { name: 'Jugos naturales' }),
    () => client.deactivateCategory(DEMO_IDS.hotDrinks),
    () => client.reactivateCategory(DEMO_IDS.season),
    () => client.createProduct(NEW_PRODUCT),
    () =>
      client.updateProduct(DEMO_IDS.americano, { ...NEW_PRODUCT, name: 'Americano', price: '13' }),
    () => client.deactivateProduct(DEMO_IDS.americano),
    () => client.reactivateProduct(DEMO_IDS.apiWithCake),
  ];
  const outcomes: Outcome[] = [];
  for (const call of calls) {
    outcomes.push(
      await call().then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      ),
    );
  }
  return outcomes;
}

describe('fixtures', () => {
  it.each(DEMO_CATEGORIES)('la categoría $name cumple el contrato', (category) => {
    expect(categorySchema.parse(category)).toEqual(category);
  });

  it.each(DEMO_PRODUCTS)('el producto $name cumple el contrato', (product) => {
    expect(adminProductSchema.parse(product)).toEqual(product);
  });

  it.each(Object.entries(DEMO_ERRORS))('el error %s cumple ApiError', (_name, { body }) => {
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });
});

describe('createMenuDemoClient', () => {
  it('ofrece los seis escenarios', () => {
    expect(Object.keys(MENU_SCENARIOS)).toEqual([
      'loaded',
      'empty',
      'duplicateName',
      'categoryHasActiveProducts',
      'forbidden',
      'offline',
    ]);
  });

  it.each(Object.keys(MENU_SCENARIOS) as MenuScenarioId[])(
    'todo lo que devuelve o lanza en el escenario %s cumple el contrato',
    async (scenario) => {
      for (const outcome of await everyOperation(createMenuDemoClient(scenario))) {
        if ('error' in outcome) {
          expect(outcome.error).toBeInstanceOf(ApiFetchError);
          const { status, error } = outcome.error as ApiFetchError;
          if (status !== null) expect(apiErrorSchema.parse({ error })).toEqual({ error });
        } else if (Array.isArray(outcome.value)) {
          const valid =
            adminMenuResponseSchema.safeParse({ categories: outcome.value }).success ||
            currentMenuResponseSchema.safeParse({ categories: outcome.value }).success;
          expect(valid).toBe(true);
        } else {
          const valid =
            categorySchema.safeParse(outcome.value).success ||
            adminProductSchema.safeParse(outcome.value).success;
          expect(valid).toBe(true);
        }
      }
    },
  );

  it('con el menú cargado, la administración ordena categorías y productos', async () => {
    const menu = await createMenuDemoClient('loaded').getAdminMenu();

    expect(menu.map((c) => c.name)).toEqual(['Bebidas calientes', 'Jugos', 'Temporada']);
    expect(menu[0]!.products.map((p) => p.name)).toEqual(['Café americano', 'Té de coca']);
  });

  it('el menú vacío no tiene categorías', async () => {
    const client = createMenuDemoClient('empty');
    expect(await client.getAdminMenu()).toEqual([]);
    expect(await client.getCurrentMenu()).toEqual([]);
  });

  it('crear y editar cambian el menú en memoria', async () => {
    const client = createMenuDemoClient('loaded');

    const latte = await client.createProduct(NEW_PRODUCT);
    expect(latte).toMatchObject({ name: 'Latte', priceCents: 1450, active: true });

    await client.updateProduct(latte.id, {
      ...NEW_PRODUCT,
      categoryId: DEMO_IDS.juices,
      price: '15',
    });
    const category = await client.createCategory({ name: '  Postres ' });
    await client.renameCategory(category.id, { name: 'Postres caseros' });

    const menu = await client.getAdminMenu();
    expect(menu.find((c) => c.id === DEMO_IDS.juices)!.products).toContainEqual({
      ...latte,
      categoryId: DEMO_IDS.juices,
      priceCents: 1500,
    });
    expect(menu.map((c) => c.name)).toContain('Postres caseros');
  });

  it('el menú vigente solo tiene productos activos de categorías activas', async () => {
    const client = createMenuDemoClient('loaded');
    await client.deactivateProduct(DEMO_IDS.teaCoca);

    const current = await client.getCurrentMenu();
    expect(current.map((c) => c.name)).toEqual(['Bebidas calientes', 'Jugos']);
    expect(current[0]!.products).toEqual([
      { id: DEMO_IDS.americano, name: 'Café americano', priceCents: 1250 },
    ]);
  });

  it('valida los datos con el contrato y responde 400 con los campos', async () => {
    const error = await rejection(
      createMenuDemoClient('loaded').createProduct({ name: ' ', categoryId: '', price: '0' }),
    );
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(error.error.fields).toEqual({
      name: 'Escribe el nombre del producto',
      categoryId: 'Elige una categoría',
      price: 'El precio debe ser mayor que 0',
    });
  });

  it('en «Nombre repetido», crear o renombrar responde el mensaje de nombre repetido', async () => {
    const client = createMenuDemoClient('duplicateName');

    expect((await rejection(client.createProduct(NEW_PRODUCT))).error.fields).toEqual({
      name: 'Ya existe un producto con ese nombre',
    });
    expect((await rejection(client.createCategory({ name: 'Jugos' }))).error.fields).toEqual({
      name: 'Ya existe una categoría con ese nombre',
    });
  });

  it('en «Categoría con productos activos», desactivar una categoría responde 409', async () => {
    const error = await rejection(
      createMenuDemoClient('categoryHasActiveProducts').deactivateCategory(DEMO_IDS.hotDrinks),
    );
    expect(error).toMatchObject({ status: 409, code: 'CATEGORY_HAS_ACTIVE_PRODUCTS' });
  });

  it('reactivar un producto de una categoría inactiva responde 409 con su nombre', async () => {
    const error = await rejection(
      createMenuDemoClient('loaded').reactivateProduct(DEMO_IDS.apiWithCake),
    );
    expect(error).toMatchObject({ status: 409, code: 'CATEGORY_INACTIVE' });
    expect(error.message).toContain('“Temporada”');
  });

  it('en «Sin permiso», la administración responde 403 y la consulta funciona', async () => {
    const client = createMenuDemoClient('forbidden');

    expect(await rejection(client.getAdminMenu())).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'No tienes permiso para administrar el menú',
    });
    expect(await rejection(client.createCategory({ name: 'Postres' }))).toMatchObject({
      status: 403,
    });
    expect(await client.getCurrentMenu()).not.toEqual([]);
  });

  it('en «Sin conexión», todo lanza NETWORK_ERROR sin estado', async () => {
    for (const outcome of await everyOperation(createMenuDemoClient('offline'))) {
      expect(outcome).toHaveProperty('error');
      expect((outcome as { error: unknown }).error).toMatchObject({
        status: null,
        code: 'NETWORK_ERROR',
      });
    }
  });

  it('cambiar de escenario cambia sus respuestas y reinicia el menú', async () => {
    const client = createMenuDemoClient('loaded');
    await client.createCategory({ name: 'Postres' });

    client.setScenario('empty');
    expect(client.scenario).toBe('empty');
    expect(await client.getAdminMenu()).toEqual([]);

    client.setScenario('forbidden');
    await expect(client.getAdminMenu()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
