import { describe, expect, it } from 'vitest';
import { priceSchema } from '@kofi/contracts';
import { OFFICIAL_MENU } from '../menu/index.ts';
import { planDemoCalendar } from './demo-sales.calendar.ts';
import { generateDemoSales } from './demo-sales.generator.ts';
import {
  DemoSalesGenerationError,
  type DemoAccount,
  type DemoProduct,
} from './demo-sales.rules.ts';
import type { NewSale } from './sales.repository.ts';

const products: DemoProduct[] = OFFICIAL_MENU.flatMap((category, c) =>
  category.products.map((product, p) => ({
    id: `p-${c}-${p}`,
    name: product.name,
    categoryName: category.name,
    priceCents: priceSchema.parse(product.price),
  })),
);
const owner: DemoAccount = { id: 'o1', displayName: 'Luis Mamani', role: 'owner' };
const cashier: DemoAccount = { id: 'c1', displayName: 'Ana Quispe', role: 'cashier' };
const period = { from: '2026-07-28', to: '2026-10-27' };
const input = (seed: number, accounts: DemoAccount[] = [owner, cashier], items = products) => ({
  calendar: planDemoCalendar(period, seed),
  seed,
  products: items,
  accounts,
  firstNumber: 1,
});

const drinks = ['Cafés', 'Otras bebidas calientes', 'Bebidas frías', 'Jugos y licuados'];
const top = ['Americano', 'Cappuccino', 'Café latte', 'Salteña de pollo', 'Salteña de carne'];
const byId = new Map(products.map((item) => [item.id, item]));
// Fecha y segundos desde las 00:00 de una venta, con la hora de Bolivia (UTC−4, sin horario de
// verano), calculadas aquí sin el calendario del código.
const BOLIVIA_OFFSET = 4 * 3600 * 1000;
function localTime(sale: NewSale) {
  const local = sale.registeredAt.getTime() - BOLIVIA_OFFSET;
  return {
    date: new Date(local).toISOString().slice(0, 10),
    seconds: (((local % 86_400_000) + 86_400_000) % 86_400_000) / 1000,
  };
}
const unitsOf = (lines: { quantity: number }[]) =>
  lines.reduce((sum, line) => sum + line.quantity, 0);
const shareOf = <T>(items: T[], match: (item: T) => boolean) =>
  items.filter(match).length / items.length;

// Comprobaciones propias de RF-4 a RF-8, sin usar checkDemoSales: devuelve las incumplidas.
function violations(sales: NewSale[], seed: number): string[] {
  const failed: string[] = [];
  const fail = (rule: string, ok: boolean) => {
    if (!ok) failed.push(rule);
  };
  const { calendar } = input(seed);
  const times = sales.map(localTime);

  // RF-4: días del calendario, horario y horas pico.
  const perDay = new Map<string, number>();
  for (const { date } of times) perDay.set(date, (perDay.get(date) ?? 0) + 1);
  fail(
    'días',
    perDay.size === calendar.days.filter((day) => day.salesCount > 0).length &&
      calendar.days.every((day) => (perDay.get(day.date) ?? 0) === day.salesCount),
  );
  fail(
    'horario',
    times.every(({ seconds }) => seconds >= 27_000 && seconds < 73_800),
  );
  const peak = times.filter(
    ({ seconds }) =>
      (seconds >= 32_400 && seconds < 39_600) || (seconds >= 55_800 && seconds < 64_800),
  ).length;
  fail('horas pico', peak / 4.5 > (sales.length - peak) / 8.5);

  // RF-5: tipos, cantidades, bebidas, mezcla diaria, productos y horarios.
  const type = (sale: NewSale) =>
    sale.lines.length === 1
      ? sale.lines[0]!.quantity === 1
        ? 'single'
        : 'single-many'
      : sale.lines.length <= 5
        ? 'combo'
        : 'large';
  for (const [name, target] of [
    ['single', 0.4],
    ['single-many', 0.2],
    ['combo', 0.35],
    ['large', 0.05],
  ] as const)
    fail(`tipo ${name}`, Math.abs(shareOf(sales, (sale) => type(sale) === name) - target) <= 0.05);
  fail(
    'cantidades y productos únicos',
    sales.every(
      (sale) =>
        sale.lines.length <= 12 &&
        sale.lines.every(
          (line) => line.quantity >= 1 && line.quantity <= (sale.lines.length >= 6 ? 12 : 6),
        ) &&
        new Set(sale.lines.map((line) => line.productId)).size === sale.lines.length,
    ),
  );
  fail(
    'líneas e importes',
    sales.every(
      (sale) =>
        sale.lines.every((line) => {
          const item = byId.get(line.productId);
          return (
            item?.name === line.productName &&
            item.categoryName === line.categoryName &&
            item.priceCents === line.unitPriceCents &&
            line.subtotalCents === line.unitPriceCents * line.quantity
          );
        }) && sale.totalCents === sale.lines.reduce((sum, line) => sum + line.subtotalCents, 0),
    ),
  );
  const combos = sales.filter((sale) => type(sale) === 'combo');
  fail(
    'bebidas',
    shareOf(combos, (sale) => sale.lines.some((line) => drinks.includes(line.categoryName))) >= 0.8,
  );
  const days = new Map<string, NewSale[]>();
  sales.forEach((sale, index) =>
    days.set(times[index]!.date, [...(days.get(times[index]!.date) ?? []), sale]),
  );
  for (const ofDay of days.values()) {
    fail(
      'mezcla diaria',
      ofDay.some((s) => s.lines.length === 1) && ofDay.some((s) => s.lines.length > 1),
    );
    fail('pagos diarios', new Set(ofDay.map((sale) => sale.paymentMethod)).size === 2);
  }
  const lines = sales.flatMap((sale, index) =>
    sale.lines.map((line) => ({ ...line, seconds: times[index]!.seconds })),
  );
  const units = new Map(products.map((item) => [item.name, 0]));
  for (const line of lines)
    units.set(line.productName, units.get(line.productName)! + line.quantity);
  fail(
    '37 productos',
    [...units.values()].every((count) => count > 0),
  );
  for (const name of top)
    fail(
      `más vendidos: ${name}`,
      [...units.values()].filter((c) => c >= units.get(name)!).length <= 10,
    );
  const saltenas = lines.filter((line) => line.productName.startsWith('Salteña'));
  fail('salteñas', unitsOf(saltenas.filter((l) => l.seconds < 43_200)) >= 0.7 * unitsOf(saltenas));
  const pastries = lines.filter((line) => line.categoryName === 'Repostería');
  fail(
    'repostería',
    unitsOf(pastries.filter((l) => l.seconds >= 50_400)) >= 0.6 * unitsOf(pastries),
  );

  // RF-6: medio de pago.
  const cash = shareOf(sales, (sale) => sale.paymentMethod === 'cash');
  fail('efectivo', cash >= 0.55 && cash <= 0.65);
  const qr = (sale: NewSale) => sale.paymentMethod === 'qr';
  fail(
    'QR desde Bs 60,00',
    shareOf(
      sales.filter((s) => s.totalCents >= 6000),
      qr,
    ) >
      shareOf(
        sales.filter((s) => s.totalCents < 6000),
        qr,
      ),
  );

  // RF-7: quién registró cada venta.
  const cashierShare = shareOf(sales, (sale) => sale.registeredBy.role === 'cashier');
  fail('cajero', cashierShare >= 0.7 && cashierShare <= 0.85);
  fail(
    'cuentas',
    sales.every(({ registeredBy }) =>
      [owner, cashier].some(
        (a) =>
          a.id === registeredBy.userId &&
          a.displayName === registeredBy.displayName &&
          a.role === registeredBy.role,
      ),
    ),
  );

  // RF-8: números consecutivos en orden de fecha y hora, segundos distintos.
  fail(
    'números y segundos',
    sales.every(
      (sale, index) =>
        sale.number === index + 1 &&
        (index === 0 ||
          Math.floor(sale.registeredAt.getTime() / 1000) >
            Math.floor(sales[index - 1]!.registeredAt.getTime() / 1000)),
    ),
  );
  return failed;
}

describe('generador de ventas de demostración (RF-4 a RF-8, RNF-2)', () => {
  it('cumple las reglas para 200 semillas, al primer intento en al menos el 95 %', () => {
    let firstAttempt = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let sales: NewSale[];
      try {
        sales = generateDemoSales(input(seed), { maxAttempts: 1 });
        firstAttempt++;
      } catch (error) {
        expect(error).toBeInstanceOf(DemoSalesGenerationError);
        sales = generateDemoSales(input(seed));
      }
      expect({ seed, failed: violations(sales, seed) }).toEqual({ seed, failed: [] });
    }
    expect(firstAttempt).toBeGreaterThanOrEqual(190);
  }, 120_000);

  it('con una sola cuenta de cajero, todas las ventas son suyas', () => {
    const sales = generateDemoSales(input(3, [cashier]));
    expect(sales.every((sale) => sale.registeredBy.userId === cashier.id)).toBe(true);
  });

  it('con dos cuentas de cajero, las dos registran ventas', () => {
    const other: DemoAccount = { id: 'c2', displayName: 'Rosa Choque', role: 'cashier' };
    const sales = generateDemoSales(input(3, [owner, cashier, other]));
    expect(sales.some((sale) => sale.registeredBy.userId === cashier.id)).toBe(true);
    expect(sales.some((sale) => sale.registeredBy.userId === other.id)).toBe(true);
  });

  it('lleva en cada línea el nombre, la categoría y el precio recibidos', () => {
    const changedPrice = products.map((item) =>
      item.name === 'Americano' ? { ...item, priceCents: 1400 } : item,
    );
    const americano = generateDemoSales(input(3, [owner, cashier], changedPrice))
      .flatMap((sale) => sale.lines)
      .filter((line) => line.productName === 'Americano');
    expect(americano.length).toBeGreaterThan(0);
    expect(americano.every((line) => line.unitPriceCents === 1400)).toBe(true);
  });

  it('da las mismas ventas con la misma semilla, salvo draftId', () => {
    const withoutDraft = (sales: NewSale[]) => sales.map((sale) => ({ ...sale, draftId: '' }));
    expect(withoutDraft(generateDemoSales(input(5)))).toEqual(
      withoutDraft(generateDemoSales(input(5))),
    );
    expect(withoutDraft(generateDemoSales(input(5)))).not.toEqual(
      withoutDraft(generateDemoSales(input(6))),
    );
  });

  it('lanza DemoSalesGenerationError si las reglas fallan siempre', () => {
    expect(() => generateDemoSales(input(3), { check: () => ['amounts'] })).toThrow(
      DemoSalesGenerationError,
    );
  });
});
