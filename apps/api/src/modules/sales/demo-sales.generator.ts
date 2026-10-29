import { randomUUID } from 'node:crypto';
import { menuNameKey } from '@kofi/contracts';
import { dayStart, type DemoCalendar } from './demo-sales.calendar.ts';

import { createRandom, type Random } from './demo-sales.random.ts';
import {
  CLOSING,
  checkDemoSales,
  DemoSalesGenerationError,
  isDrink,
  LARGE_SALE_CENTS,
  OPENING,
  PASTRY_CATEGORY,
  PEAKS,
  SALE_TYPE_SHARES,
  SALTENAS,
  type DemoAccount,
  type DemoProduct,
  type DemoSaleType,
  type DemoSalesContext,
} from './demo-sales.rules.ts';
import type { NewSale } from './sales.repository.ts';

// Ventas de demostración a partir del calendario (SPEC-007, RF-4 a RF-8; plan §5.3, D-5, D-6).

export interface DemoSalesInput {
  calendar: DemoCalendar;
  seed: number;
  products: readonly DemoProduct[];
  accounts: readonly DemoAccount[];
  firstNumber: number;
}

interface GenerateOptions {
  maxAttempts?: number;
  check?: (sales: readonly NewSale[], context: DemoSalesContext) => readonly string[];
}

const PEAK_WEIGHT = 2.5;
const NOON = 12 * 3600;
const TWO_PM = 14 * 3600;
// Peso de los productos más pedidos; los demás pesan 2,5 (RF-5). Las salteñas pesan más porque
// casi solo se venden de mañana.
const POPULAR: Record<string, number> = {
  Americano: 10,
  Cappuccino: 9,
  'Café latte': 8,
  'Salteña de pollo': 14,
  'Salteña de carne': 13,
};
const BASE_WEIGHT = 2.5;
const SALE_TYPES = Object.keys(SALE_TYPE_SHARES) as DemoSaleType[];

// Tramos del horario del local con su peso: las horas pico pesan 2,5 (RF-4).
const SEGMENTS = (() => {
  const bounds = [OPENING, ...PEAKS.flat(), CLOSING];
  return bounds.slice(0, -1).map((from, index) => ({
    from,
    to: bounds[index + 1]!,
    weight: PEAKS.some(([peakFrom]) => peakFrom === from) ? PEAK_WEIGHT : 1,
  }));
})();

function daySeconds(random: Random, count: number): number[] {
  const seconds = new Set<number>();
  while (seconds.size < count) {
    const segment = random.weighted(SEGMENTS, (s) => (s.to - s.from) * s.weight);
    seconds.add(random.int(segment.from, segment.to - 1));
  }
  return [...seconds].sort((a, b) => a - b);
}

function pickQuantity(random: Random, type: DemoSaleType): number {
  if (type === 'single') return 1;
  if (type === 'single-many') return random.int(2, 6);
  const roll = random.next();
  if (type === 'combo') return roll < 0.7 ? 1 : roll < 0.9 ? 2 : random.int(3, 6);
  return roll < 0.5 ? 1 : roll < 0.85 ? random.int(2, 4) : random.int(5, 12);
}

function attemptSales(input: DemoSalesInput, attempt: number): NewSale[] {
  const random = createRandom(input.seed, 'content', attempt);
  const saltenas = new Set(SALTENAS.map(menuNameKey));
  const popular = new Map(
    Object.entries(POPULAR).map(([name, weight]) => [menuNameKey(name), weight]),
  );
  const pastry = menuNameKey(PASTRY_CATEGORY);
  const profiles = new Map(
    input.products.map((product) => {
      const key = menuNameKey(product.name);
      return [
        product,
        {
          base: popular.get(key) ?? BASE_WEIGHT,
          salteña: saltenas.has(key),
          pastry: menuNameKey(product.categoryName) === pastry,
        },
      ];
    }),
  );
  // Peso de un producto según la hora: salteñas de mañana y repostería de tarde (RF-5).
  const weightAt = (product: DemoProduct, seconds: number) => {
    const { base, salteña, pastry: isPastry } = profiles.get(product)!;
    if (salteña) return base * (seconds < NOON ? 1 : seconds < TWO_PM ? 0.3 : 0.05);
    if (isPastry) return base * (seconds >= TWO_PM ? 1 : 0.4);
    return base;
  };
  const drinks = input.products.filter((product) => isDrink(product.categoryName));
  const roles = new Set(input.accounts.map((account) => account.role));
  const byRole = (role: DemoAccount['role']) => input.accounts.filter((a) => a.role === role);

  const sales: NewSale[] = [];
  for (const day of input.calendar.days) {
    if (day.salesCount === 0) continue;
    const start = dayStart(day.date);
    const seconds = daySeconds(random, day.salesCount);
    // Cada día: una venta de un producto, otra de varios, una en efectivo y otra con QR (RF-5, RF-6).
    const [single, multiple] = distinctIndexes(random, day.salesCount);
    const [cash, qr] = distinctIndexes(random, day.salesCount);
    seconds.forEach((second, index) => {
      const choices =
        index === single
          ? SALE_TYPES.filter((t) => t === 'single' || t === 'single-many')
          : index === multiple
            ? SALE_TYPES.filter((t) => t === 'combo' || t === 'large')
            : SALE_TYPES;
      const type = random.weighted(choices, (t) => SALE_TYPE_SHARES[t]);
      const count = type === 'combo' ? random.int(2, 5) : type === 'large' ? random.int(6, 12) : 1;
      const chosen: DemoProduct[] = [];
      if (type === 'combo' && random.next() < 0.9)
        chosen.push(random.weighted(drinks, (p) => weightAt(p, second)));
      while (chosen.length < count)
        chosen.push(
          random.weighted(
            input.products.filter((p) => !chosen.includes(p)),
            (p) => weightAt(p, second),
          ),
        );
      const lines = chosen.map((product) => lineOf(product, pickQuantity(random, type)));
      const totalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
      const paymentMethod =
        index === cash
          ? 'cash'
          : index === qr
            ? 'qr'
            : random.next() < (totalCents >= LARGE_SALE_CENTS ? 0.6 : 0.33)
              ? 'qr'
              : 'cash';
      const role = roles.size === 2 ? (random.next() < 0.78 ? 'cashier' : 'owner') : [...roles][0]!;
      const account = random.pick(byRole(role));
      sales.push({
        number: 0,
        draftId: '',
        registeredAt: new Date(start + second * 1000),
        registeredBy: { userId: account.id, displayName: account.displayName, role: account.role },
        paymentMethod,
        lines,
        totalCents,
      });
    });
  }
  cover(random, input, sales);
  return sales.map((sale, index) => ({ ...sale, number: input.firstNumber + index }));
}

function distinctIndexes(random: Random, count: number): [number, number] {
  const first = random.int(0, count - 1);
  const second = (first + random.int(1, count - 1)) % count;
  return [first, second];
}

function lineOf(product: DemoProduct, quantity: number): NewSale['lines'][number] {
  return {
    productId: product.id,
    productName: product.name,
    categoryName: product.categoryName,
    unitPriceCents: product.priceCents,
    quantity,
    subtotalCents: product.priceCents * quantity,
  };
}

// Vende los productos y usa las cuentas que no salieron al azar: cambia el último producto de una
// venta de varios productos, o la cuenta de una venta del mismo rol (RF-5, RF-7).
function cover(random: Random, input: DemoSalesInput, sales: NewSale[]) {
  const sold = new Set(sales.flatMap((sale) => sale.lines.map((line) => line.productId)));
  for (const product of input.products.filter((p) => !sold.has(p.id))) {
    const candidates = sales
      .map((sale, index) => ({ sale, index }))
      .filter(
        ({ sale }) =>
          sale.lines.length >= 2 && !sale.lines.some((line) => line.productId === product.id),
      );
    if (candidates.length === 0) continue;
    const { sale, index } = random.pick(candidates);
    const lines = [...sale.lines.slice(0, -1), lineOf(product, sale.lines.at(-1)!.quantity)];
    sales[index] = {
      ...sale,
      lines,
      totalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
    };
  }
  for (const account of input.accounts) {
    if (sales.some((sale) => sale.registeredBy.userId === account.id)) continue;
    const candidates = sales
      .map((sale, index) => ({ sale, index }))
      .filter(({ sale }) => sale.registeredBy.role === account.role);
    if (candidates.length === 0) continue;
    const { sale, index } = random.pick(candidates);
    sales[index] = {
      ...sale,
      registeredBy: { userId: account.id, displayName: account.displayName, role: account.role },
    };
  }
}

export function generateDemoSales(
  input: DemoSalesInput,
  { maxAttempts = 50, check = checkDemoSales }: GenerateOptions = {},
): NewSale[] {
  const context: DemoSalesContext = {
    calendar: input.calendar,
    products: input.products,
    accounts: input.accounts,
    firstNumber: input.firstNumber,
  };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sales = attemptSales(input, attempt);
    if (check(sales, context).length === 0)
      return sales.map((sale) => ({ ...sale, draftId: randomUUID() }));
  }
  throw new DemoSalesGenerationError();
}
