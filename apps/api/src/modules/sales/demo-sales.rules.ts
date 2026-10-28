import { menuNameKey, type Role } from '@kofi/contracts';
import { addDays, boliviaDate, startOfBoliviaDay } from '../../shared/calendar.ts';
import { completeMonths, datesBetween, weekday, type DemoCalendar } from './demo-sales.calendar.ts';
import type { NewSale } from './sales.repository.ts';

// Reglas de las ventas de demostración (SPEC-007, RF-4 a RF-8; plan D-6). Cada función devuelve
// las reglas incumplidas: el generador reintenta hasta que no quede ninguna.

// El generador agotó sus intentos sin cumplir las reglas (D-11).
export class DemoSalesGenerationError extends Error {
  constructor() {
    super('No se pudieron generar ventas de demostración que cumplan las reglas');
    this.name = 'DemoSalesGenerationError';
  }
}

export type DemoCalendarRule =
  | 'period' // cada día del período, en orden, y ninguno hoy ni después
  | 'closed-sundays' // de 2 a 4 domingos sin ventas
  | 'closed-sunday-per-month' // al menos uno en cada mes completo
  | 'consecutive-closed-sundays' // nunca dos seguidos
  | 'daily-range' // los demás días, de 30 a 80 ventas (RNF-4)
  | 'weekend-boost' // viernes y sábados, al menos un 20 % más que de lunes a jueves
  | 'total'; // el total es la suma de los días

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function checkDemoCalendar(calendar: DemoCalendar): DemoCalendarRule[] {
  const failed = new Set<DemoCalendarRule>();
  const expected = datesBetween(calendar.from, calendar.to);
  if (
    calendar.days.length !== expected.length ||
    calendar.days.some((day, index) => day.date !== expected[index])
  )
    failed.add('period');

  const closed = calendar.days.filter((day) => day.salesCount === 0).map((day) => day.date);
  const closedSundays = closed.filter((date) => weekday(date) === 0);
  if (closedSundays.length < 2 || closedSundays.length > 4) failed.add('closed-sundays');
  if (completeMonths(calendar).some((month) => !closedSundays.some((d) => d.startsWith(month))))
    failed.add('closed-sunday-per-month');
  if (closedSundays.some((date) => closedSundays.includes(addDays(date, 7))))
    failed.add('consecutive-closed-sundays');
  if (
    closed.length !== closedSundays.length ||
    calendar.days.some(
      (day) => day.salesCount !== 0 && (day.salesCount < 30 || day.salesCount > 80),
    )
  )
    failed.add('daily-range');

  const open = calendar.days.filter((day) => day.salesCount > 0);
  const weekend = open.filter((day) => [5, 6].includes(weekday(day.date)));
  const weekdays = open.filter((day) => [1, 2, 3, 4].includes(weekday(day.date)));
  if (
    weekend.length === 0 ||
    weekdays.length === 0 ||
    average(weekend.map((day) => day.salesCount)) <
      1.2 * average(weekdays.map((day) => day.salesCount))
  )
    failed.add('weekend-boost');

  if (calendar.total !== calendar.days.reduce((sum, day) => sum + day.salesCount, 0))
    failed.add('total');
  return [...failed];
}

// Producto oficial con su nombre, categoría y precio vigentes, y cuenta que registra ventas.
export interface DemoProduct {
  id: string;
  name: string;
  categoryName: string;
  priceCents: number;
}

export interface DemoAccount {
  id: string;
  displayName: string;
  role: Role;
}

export interface DemoSalesContext {
  calendar: DemoCalendar;
  products: readonly DemoProduct[];
  accounts: readonly DemoAccount[];
  firstNumber: number;
}

// Horario del local y horas pico, en segundos desde las 00:00 de Bolivia («Conceptos»).
export const OPENING = 7.5 * 3600; // 07:30:00
export const CLOSING = 20.5 * 3600; // 20:30:00, excluido
export const PEAKS: readonly (readonly [number, number])[] = [
  [9 * 3600, 11 * 3600], // 09:00–10:59
  [15.5 * 3600, 18 * 3600], // 15:30–17:59
];
const NOON = 12 * 3600;
const TWO_PM = 14 * 3600;

export const DRINK_CATEGORIES = [
  'Cafés',
  'Otras bebidas calientes',
  'Bebidas frías',
  'Jugos y licuados',
];
export const PASTRY_CATEGORY = 'Repostería';
export const SALTENAS = ['Salteña de pollo', 'Salteña de carne'];
export const TOP_SELLERS = ['Americano', 'Cappuccino', 'Café latte', ...SALTENAS];

// Tipos de venta de RF-5 y su parte del total.
export type DemoSaleType = 'single' | 'single-many' | 'combo' | 'large';
export const SALE_TYPE_SHARES: Record<DemoSaleType, number> = {
  single: 0.4, // un producto, cantidad 1
  'single-many': 0.2, // un producto, cantidad 2 a 6
  combo: 0.35, // 2 a 5 productos
  large: 0.05, // 6 a 12 productos
};

export function saleType(sale: NewSale): DemoSaleType | null {
  const count = sale.lines.length;
  if (count === 1) {
    const quantity = sale.lines[0]!.quantity;
    if (quantity === 1) return 'single';
    return quantity >= 2 && quantity <= 6 ? 'single-many' : null;
  }
  if (count >= 2 && count <= 5) return 'combo';
  return count >= 6 && count <= 12 ? 'large' : null;
}

export const isDrink = (categoryName: string) =>
  DRINK_CATEGORIES.some((category) => menuNameKey(category) === menuNameKey(categoryName));

export type DemoSalesRule =
  | 'business-hours' // en el horario del local (RF-4)
  | 'calendar-days' // cada día con las ventas de su calendario, y ninguna fuera (RF-4)
  | 'distinct-seconds' // nunca dos en el mismo segundo (RF-8)
  | 'peak-hours' // más ventas por hora en las horas pico (RF-4)
  | 'sale-types' // reparto de tipos con 5 puntos de tolerancia (RF-5)
  | 'quantities' // de 1 a 6 por línea, hasta 12 en los pedidos grandes (RF-5)
  | 'drinks' // una bebida en el 80 % de las ventas de 2 a 5 productos (RF-5)
  | 'daily-mix' // cada día, una venta de un producto y otra de varios (RF-5)
  | 'all-products' // los productos oficiales, al menos una vez (RF-5)
  | 'top-sellers' // Americano, Cappuccino, Café latte y las salteñas entre los 10 primeros (RF-5)
  | 'saltenas-morning' // el 70 % de las salteñas antes de las 12:00 (RF-5)
  | 'pastries-afternoon' // el 60 % de la repostería desde las 14:00 (RF-5)
  | 'unique-products' // un producto en una sola línea (RF-5)
  | 'amounts' // subtotal = precio × cantidad y total = suma (RF-5, RNF-2)
  | 'lines' // nombre, categoría y precio del menú recibido (RF-5)
  | 'cash-share' // del 55 % al 65 % en efectivo (RF-6)
  | 'daily-payments' // los dos medios de pago cada día con ventas (RF-6)
  | 'qr-large' // más QR desde Bs 60,00 que en las ventas menores (RF-6)
  | 'cashier-share' // con los dos roles, del 70 % al 85 % de cajero (RF-7)
  | 'single-role' // con un solo rol, todas de ese rol (RF-7)
  | 'all-accounts' // cada cuenta, al menos una venta (RF-7)
  | 'accounts' // nombre visible y rol de una cuenta de la base (RF-7)
  | 'numbers'; // consecutivos desde el primero, en orden de fecha y hora (RF-8)

export const LARGE_SALE_CENTS = 6000; // Bs 60,00 (RF-6)

export function checkDemoSales(
  sales: readonly NewSale[],
  context: DemoSalesContext,
): DemoSalesRule[] {
  const failed = new Set<DemoSalesRule>();
  const starts = new Map<string, number>();
  const local = sales.map((sale) => {
    const date = boliviaDate(sale.registeredAt);
    if (!starts.has(date)) starts.set(date, startOfBoliviaDay(date).getTime());
    return { sale, date, seconds: (sale.registeredAt.getTime() - starts.get(date)!) / 1000 };
  });
  const byId = new Map(context.products.map((product) => [product.id, product]));
  const units = new Map<string, number>(context.products.map((product) => [product.id, 0]));
  const lines = local.flatMap(({ sale, seconds }) => sale.lines.map((line) => ({ line, seconds })));
  for (const { line } of lines)
    units.set(line.productId, (units.get(line.productId) ?? 0) + line.quantity);
  const productKeys = (names: string[]) =>
    context.products
      .filter((product) => names.some((name) => menuNameKey(name) === menuNameKey(product.name)))
      .map((product) => product.id);

  // Horas y días (RF-4, RF-8).
  if (local.some(({ seconds }) => seconds < OPENING || seconds >= CLOSING))
    failed.add('business-hours');
  const perDay = new Map<string, number>();
  for (const { date } of local) perDay.set(date, (perDay.get(date) ?? 0) + 1);
  const planned = new Map(context.calendar.days.map((day) => [day.date, day.salesCount]));
  if (
    [...perDay.keys()].some((date) => !planned.has(date)) ||
    context.calendar.days.some((day) => (perDay.get(day.date) ?? 0) !== day.salesCount)
  )
    failed.add('calendar-days');
  const seconds = new Set(sales.map((sale) => Math.floor(sale.registeredAt.getTime() / 1000)));
  if (seconds.size !== sales.length) failed.add('distinct-seconds');
  const peakLength = PEAKS.reduce((sum, [from, to]) => sum + to - from, 0);
  const inPeak = local.filter(({ seconds: s }) => PEAKS.some(([from, to]) => s >= from && s < to));
  if (
    inPeak.length / peakLength <=
    (local.length - inPeak.length) / (CLOSING - OPENING - peakLength)
  )
    failed.add('peak-hours');

  // Contenido de cada venta (RF-5, RNF-2).
  const types = sales.map(saleType);
  if (
    types.includes(null) ||
    (Object.keys(SALE_TYPE_SHARES) as DemoSaleType[]).some(
      (type) =>
        Math.abs(types.filter((t) => t === type).length / sales.length - SALE_TYPE_SHARES[type]) >
        0.05,
    )
  )
    failed.add('sale-types');
  if (
    sales.some((sale, index) =>
      sale.lines.some(
        (line) => line.quantity < 1 || line.quantity > (types[index] === 'large' ? 12 : 6),
      ),
    )
  )
    failed.add('quantities');
  const combos = sales.filter((_, index) => types[index] === 'combo');
  if (
    combos.filter((sale) => sale.lines.some((line) => isDrink(line.categoryName))).length <
    0.8 * combos.length
  )
    failed.add('drinks');
  for (const day of context.calendar.days.filter((day) => day.salesCount > 0)) {
    const ofDay = local.filter(({ date }) => date === day.date).map(({ sale }) => sale);
    if (
      !ofDay.some((sale) => sale.lines.length === 1) ||
      !ofDay.some((sale) => sale.lines.length > 1)
    )
      failed.add('daily-mix');
  }
  if ([...units.values()].some((count) => count === 0)) failed.add('all-products');
  const topIds = productKeys(TOP_SELLERS);
  if (
    topIds.length !== TOP_SELLERS.length ||
    topIds.some((id) => [...units.values()].filter((count) => count >= units.get(id)!).length > 10)
  )
    failed.add('top-sellers');
  const share = (ids: string[], when: (seconds: number) => boolean) => {
    const of = lines.filter(({ line }) => ids.includes(line.productId));
    const total = of.reduce((sum, { line }) => sum + line.quantity, 0);
    const matching = of
      .filter(({ seconds: s }) => when(s))
      .reduce((sum, { line }) => sum + line.quantity, 0);
    return total === 0 ? 0 : matching / total;
  };
  if (share(productKeys(SALTENAS), (s) => s < NOON) < 0.7) failed.add('saltenas-morning');
  const pastries = context.products
    .filter((product) => menuNameKey(product.categoryName) === menuNameKey(PASTRY_CATEGORY))
    .map((product) => product.id);
  if (share(pastries, (s) => s >= TWO_PM) < 0.6) failed.add('pastries-afternoon');
  if (
    sales.some(
      (sale) => new Set(sale.lines.map((line) => line.productId)).size !== sale.lines.length,
    )
  )
    failed.add('unique-products');
  if (
    sales.some(
      (sale) =>
        sale.lines.some((line) => line.subtotalCents !== line.unitPriceCents * line.quantity) ||
        sale.totalCents !== sale.lines.reduce((sum, line) => sum + line.subtotalCents, 0),
    )
  )
    failed.add('amounts');
  if (
    lines.some(({ line }) => {
      const product = byId.get(line.productId);
      return (
        !product ||
        product.name !== line.productName ||
        product.categoryName !== line.categoryName ||
        product.priceCents !== line.unitPriceCents
      );
    })
  )
    failed.add('lines');

  // Medio de pago (RF-6).
  const cash = sales.filter((sale) => sale.paymentMethod === 'cash').length / sales.length;
  if (cash < 0.55 || cash > 0.65) failed.add('cash-share');
  for (const day of context.calendar.days.filter((day) => day.salesCount > 0)) {
    const methods = new Set(
      local.filter(({ date }) => date === day.date).map(({ sale }) => sale.paymentMethod),
    );
    if (methods.size < 2) failed.add('daily-payments');
  }
  const qrShare = (of: NewSale[]) =>
    of.length === 0 ? 0 : of.filter((sale) => sale.paymentMethod === 'qr').length / of.length;
  if (
    qrShare(sales.filter((sale) => sale.totalCents >= LARGE_SALE_CENTS)) <=
    qrShare(sales.filter((sale) => sale.totalCents < LARGE_SALE_CENTS))
  )
    failed.add('qr-large');

  // Quién registró cada venta (RF-7).
  const roles = new Set(context.accounts.map((account) => account.role));
  const cashier =
    sales.filter((sale) => sale.registeredBy.role === 'cashier').length / sales.length;
  if (roles.size === 2 && (cashier < 0.7 || cashier > 0.85)) failed.add('cashier-share');
  if (roles.size === 1 && sales.some((sale) => !roles.has(sale.registeredBy.role)))
    failed.add('single-role');
  if (
    context.accounts.some(
      (account) => !sales.some((sale) => sale.registeredBy.userId === account.id),
    )
  )
    failed.add('all-accounts');
  const accounts = new Map(context.accounts.map((account) => [account.id, account]));
  if (
    sales.some(({ registeredBy }) => {
      const account = accounts.get(registeredBy.userId);
      return (
        !account ||
        account.displayName !== registeredBy.displayName ||
        account.role !== registeredBy.role
      );
    })
  )
    failed.add('accounts');

  // Número y orden (RF-8).
  const ordered = [...sales].sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
  if (ordered.some((sale, index) => sale.number !== context.firstNumber + index))
    failed.add('numbers');
  return [...failed];
}
