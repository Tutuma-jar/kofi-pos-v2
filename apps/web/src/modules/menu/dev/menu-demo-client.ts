import {
  categoryInputSchema,
  compareMenuNames,
  productInputSchema,
  type AdminProduct,
  type ApiError,
  type Category,
} from '@kofi/contracts';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';
import type { AdminMenuCategory, CurrentMenuCategory, MenuClient } from '../api/menu-client.ts';
import { DEMO_CATEGORIES, DEMO_ERRORS, DEMO_PRODUCTS } from './fixtures.ts';

// Cliente simulado de /api/menu para trabajar la interfaz sin la API (docs/architecture.md §4.5,
// plan D-11). Guarda el menú en memoria y aplica solo lo necesario para recorrer las pantallas;
// los errores se fuerzan con escenarios. Las reglas reales viven en la API.

interface Scenario {
  label: string;
  empty?: boolean;
}

export const MENU_SCENARIOS = {
  loaded: { label: 'Menú cargado' },
  empty: { label: 'Menú vacío', empty: true },
  duplicateName: { label: 'Nombre repetido' },
  categoryHasActiveProducts: { label: 'Categoría con productos activos' },
  forbidden: { label: 'Sin permiso' },
  offline: { label: 'Sin conexión' },
} as const satisfies Record<string, Scenario>;

export type MenuScenarioId = keyof typeof MENU_SCENARIOS;

export interface MenuDemoClient extends MenuClient {
  readonly scenario: MenuScenarioId;
  setScenario(scenario: MenuScenarioId): void;
}

type DemoError = { status: number; body: ApiError };

const toError = ({ status, body }: DemoError) => new ApiFetchError(status, body.error);
const networkError = () =>
  new ApiFetchError(null, { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });

// Un esquema del contrato (Zod), sin depender de zod en la interfaz.
interface InputSchema<T> {
  safeParse(
    input: unknown,
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

// 400 VALIDATION_ERROR con el primer mensaje de cada campo, como la API.
function validated<T>(schema: InputSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.map(String).join('.');
    if (field && !(field in fields)) fields[field] = issue.message;
  }
  throw new ApiFetchError(400, { code: 'VALIDATION_ERROR', message: 'Revisa los datos', fields });
}

export function createMenuDemoClient(initial: MenuScenarioId): MenuDemoClient {
  let scenario: MenuScenarioId = initial;
  let categories: Category[] = [];
  let products: AdminProduct[] = [];

  const reset = () => {
    const current: Scenario = MENU_SCENARIOS[scenario];
    categories = current.empty ? [] : DEMO_CATEGORIES.map((c) => ({ ...c }));
    products = current.empty ? [] : DEMO_PRODUCTS.map((p) => ({ ...p }));
  };
  reset();

  const online = () => {
    if (scenario === 'offline') throw networkError();
  };
  // Operaciones de administración: solo el dueño (RF-1).
  const owner = () => {
    online();
    if (scenario === 'forbidden') throw toError(DEMO_ERRORS.forbidden);
  };
  const byName = <T extends { name: string }>(items: T[]) =>
    [...items].sort((a, b) => compareMenuNames(a.name, b.name));

  const findCategory = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) {
      throw new ApiFetchError(404, { code: 'NOT_FOUND', message: 'No se encontró la categoría' });
    }
    return category;
  };
  const findProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) throw toError(DEMO_ERRORS.notFound);
    return product;
  };

  return {
    get scenario() {
      return scenario;
    },
    setScenario(next) {
      scenario = next;
      reset();
    },

    async getAdminMenu() {
      owner();
      return byName(categories).map((category): AdminMenuCategory => ({
        ...category,
        products: byName(products.filter((p) => p.categoryId === category.id)),
      }));
    },

    async createCategory(input) {
      owner();
      if (scenario === 'duplicateName') throw toError(DEMO_ERRORS.duplicateCategory);
      const { name } = validated(categoryInputSchema, input);
      const category = { id: crypto.randomUUID(), name, active: true };
      categories.push(category);
      return { ...category };
    },

    async renameCategory(id, input) {
      owner();
      if (scenario === 'duplicateName') throw toError(DEMO_ERRORS.duplicateCategory);
      const category = findCategory(id);
      category.name = validated(categoryInputSchema, input).name;
      return { ...category };
    },

    async deactivateCategory(id) {
      owner();
      const category = findCategory(id);
      const active = products.filter((p) => p.categoryId === id && p.active).length;
      if (scenario === 'categoryHasActiveProducts' || active > 0) {
        throw toError(DEMO_ERRORS.categoryHasActiveProducts);
      }
      category.active = false;
      return { ...category };
    },

    async reactivateCategory(id) {
      owner();
      const category = findCategory(id);
      category.active = true;
      return { ...category };
    },

    async createProduct(input) {
      owner();
      if (scenario === 'duplicateName') throw toError(DEMO_ERRORS.duplicateProduct);
      const data = validated(productInputSchema, input);
      const product = { id: crypto.randomUUID(), ...data, active: true };
      products.push(product);
      return { ...product };
    },

    async updateProduct(id, input) {
      owner();
      if (scenario === 'duplicateName') throw toError(DEMO_ERRORS.duplicateProduct);
      const product = findProduct(id);
      Object.assign(product, validated(productInputSchema, input));
      return { ...product };
    },

    async deactivateProduct(id) {
      owner();
      const product = findProduct(id);
      product.active = false;
      return { ...product };
    },

    async reactivateProduct(id) {
      owner();
      const product = findProduct(id);
      const category = findCategory(product.categoryId);
      if (!category.active) {
        throw new ApiFetchError(409, {
          code: 'CATEGORY_INACTIVE',
          message: `Reactiva la categoría “${category.name}” o mueve el producto a otra antes de reactivarlo`,
        });
      }
      product.active = true;
      return { ...product };
    },

    async getCurrentMenu() {
      online();
      return byName(categories.filter((c) => c.active))
        .map((category): CurrentMenuCategory => ({
          id: category.id,
          name: category.name,
          products: byName(products.filter((p) => p.categoryId === category.id && p.active)).map(
            ({ id, name, priceCents }) => ({ id, name, priceCents }),
          ),
        }))
        .filter((category) => category.products.length > 0);
    },
  };
}

const STORAGE_KEY = 'kofi:dev:menu-scenario';

export function loadStoredMenuScenario(): MenuScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in MENU_SCENARIOS) return stored as MenuScenarioId;
  } catch {
    // Sin localStorage, se empieza con el menú cargado.
  }
  return 'loaded';
}

export function storeMenuScenario(scenario: MenuScenarioId): void {
  try {
    localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // No es necesario recordarlo.
  }
}
