import {
  formatPrice,
  registerSaleRequestSchema,
  saleQuoteRequestSchema,
  SALE_MESSAGES,
  type Sale,
  type SaleDraftLine,
  type SaleLine,
  type SaleQuote,
} from '@kofi/contracts';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';
import type { SalesClient } from '../api/sales-client.ts';
import { DEMO_CHANGED_PRICE_CENTS, DEMO_IDS, DEMO_MENU, DEMO_SELLER } from './fixtures.ts';

// Cliente simulado de /api/sales para trabajar la interfaz sin la API (docs/architecture.md §4.5,
// plan D-10). Multiplica precio por cantidad para que las pantallas muestren importes, pero esas
// cifras no son oficiales: las calcula la API (principio 3), y este archivo no llega al build.

interface Scenario {
  label: string;
}

export const SALES_SCENARIOS = {
  loaded: { label: 'Menú cargado' },
  empty: { label: 'Menú vacío' },
  // Al primer registro, el café americano pasa a costar Bs 13,00.
  priceChanged: { label: 'Cambió un precio' },
  // Al primer registro, el café americano deja de estar en el menú.
  productRemoved: { label: 'Producto retirado' },
  offline: { label: 'Sin conexión' },
  // El primer registro se guarda, pero su respuesta no llega.
  lostResponse: { label: 'Respuesta perdida' },
} as const satisfies Record<string, Scenario>;

export type SalesScenarioId = keyof typeof SALES_SCENARIOS;

export interface SalesDemoClient extends SalesClient {
  readonly scenario: SalesScenarioId;
  setScenario(scenario: SalesScenarioId): void;
}

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

// 400 VALIDATION_ERROR con el primer mensaje de cada dato de primer nivel (`lines`, `draftId`),
// como la API (plan §6.2).
function validated<T>(schema: InputSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !(field in fields)) fields[field] = issue.message;
  }
  throw new ApiFetchError(400, { code: 'VALIDATION_ERROR', message: 'Revisa los datos', fields });
}

type DemoMenu = SaleQuote['menu'];

const copyMenu = (menu: DemoMenu): DemoMenu =>
  menu.map((category) => ({ ...category, products: category.products.map((p) => ({ ...p })) }));

// La misma cuenta que hace la API (plan §5.1), solo para recorrer las pantallas.
function priceLines(lines: SaleDraftLine[], menu: DemoMenu) {
  const sellable = new Map(
    menu.flatMap((category) =>
      category.products.map((product) => [product.id, { ...product, categoryName: category.name }]),
    ),
  );
  const priced: SaleLine[] = [];
  const notices: string[] = [];
  for (const line of lines) {
    const product = sellable.get(line.productId);
    if (!product) {
      notices.push(
        line.unitPriceCents === undefined
          ? `“${line.productName}” ya no está en el menú`
          : `Se quitó “${line.productName}”: ya no está en el menú`,
      );
      continue;
    }
    if (line.unitPriceCents !== undefined && line.unitPriceCents !== product.priceCents) {
      notices.push(
        `Cambió el precio de “${line.productName}”: ahora cuesta ${formatPrice(product.priceCents)}`,
      );
    }
    priced.push({
      productId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
      quantity: line.quantity,
      unitPriceCents: product.priceCents,
      subtotalCents: product.priceCents * line.quantity,
    });
  }
  const totalCents = priced.reduce((sum, line) => sum + line.subtotalCents, 0);
  return { lines: priced, totalCents, notices };
}

export function createSalesDemoClient(initial: SalesScenarioId): SalesDemoClient {
  let scenario: SalesScenarioId = initial;
  let menu: DemoMenu = [];
  let menuChangeApplied = false;
  let responseLost = false;
  let sales = new Map<string, Sale>();

  const reset = () => {
    menu = scenario === 'empty' ? [] : copyMenu(DEMO_MENU);
    menuChangeApplied = false;
    responseLost = false;
    sales = new Map();
  };
  reset();

  const online = () => {
    if (scenario === 'offline') throw networkError();
  };

  // El cambio del menú de «Cambió un precio» y «Producto retirado» ocurre al primer registro.
  const applyMenuChange = () => {
    if (menuChangeApplied) return;
    menuChangeApplied = true;
    for (const category of menu) {
      if (scenario === 'priceChanged') {
        for (const product of category.products) {
          if (product.id === DEMO_IDS.americano) product.priceCents = DEMO_CHANGED_PRICE_CENTS;
        }
      } else if (scenario === 'productRemoved') {
        category.products = category.products.filter((p) => p.id !== DEMO_IDS.americano);
      }
    }
    menu = menu.filter((category) => category.products.length > 0);
  };

  return {
    get scenario() {
      return scenario;
    },
    setScenario(next) {
      scenario = next;
      reset();
    },

    async quote(request) {
      online();
      const { lines } = validated(saleQuoteRequestSchema, request);
      return { ...priceLines(lines, menu), menu: copyMenu(menu) };
    },

    async register(request) {
      online();
      const { draftId, lines } = validated(registerSaleRequestSchema, request);
      const previous = sales.get(draftId);
      if (previous) return previous;

      applyMenuChange();
      const priced = priceLines(lines, menu);
      if (priced.notices.length > 0) {
        throw new ApiFetchError(409, { code: 'MENU_CHANGED', message: SALE_MESSAGES.menuChanged });
      }
      const sale: Sale = {
        id: crypto.randomUUID(),
        number: sales.size + 1,
        registeredAt: new Date().toISOString(),
        registeredBy: { ...DEMO_SELLER },
        lines: priced.lines,
        totalCents: priced.totalCents,
      };
      sales.set(draftId, sale);
      if (scenario === 'lostResponse' && !responseLost) {
        responseLost = true;
        throw networkError();
      }
      return sale;
    },
  };
}

const STORAGE_KEY = 'kofi:dev:sales-scenario';

export function loadStoredSalesScenario(): SalesScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in SALES_SCENARIOS) return stored as SalesScenarioId;
  } catch {
    // Sin localStorage, se empieza con el menú cargado.
  }
  return 'loaded';
}

export function storeSalesScenario(scenario: SalesScenarioId): void {
  try {
    localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // No es necesario recordarlo.
  }
}
