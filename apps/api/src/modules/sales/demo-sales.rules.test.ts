import { describe, expect, it } from 'vitest';
import { priceSchema } from '@kofi/contracts';
import { addDays } from '../../shared/calendar.ts';
import { OFFICIAL_MENU } from '../menu/index.ts';
import type { DemoCalendar } from './demo-sales.calendar.ts';
import {
  checkDemoCalendar,
  checkDemoSales,
  type DemoAccount,
  type DemoProduct,
  type DemoSalesContext,
} from './demo-sales.rules.ts';
import type { NewSale } from './sales.repository.ts';

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

// Calendario armado a mano: 40 ventas de lunes a jueves, 60 viernes y sábados, 40 los domingos
// y sin ventas en los domingos de `closed`.
function calendarOf(
  from: string,
  to: string,
  closed: string[],
  count: (date: string) => number = (date) => ([5, 6].includes(weekday(date)) ? 60 : 40),
): DemoCalendar {
  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1))
    days.push({ date, salesCount: closed.includes(date) ? 0 : count(date) });
  return { from, to, days, total: days.reduce((sum, day) => sum + day.salesCount, 0) };
}

// 28/07/2026–27/10/2026: agosto y septiembre son los meses completos.
const from = '2026-07-28';
const to = '2026-10-27';
const valid = () => calendarOf(from, to, ['2026-08-09', '2026-09-13', '2026-10-11']);

describe('checkDemoCalendar (RF-4, RNF-4)', () => {
  it('no encuentra fallos en un calendario que cumple todo', () => {
    expect(checkDemoCalendar(valid())).toEqual([]);
  });

  it('detecta un día que falta o que sobra en el período', () => {
    const missing = valid();
    missing.days.splice(10, 1);
    missing.total = missing.days.reduce((sum, day) => sum + day.salesCount, 0);
    expect(checkDemoCalendar(missing)).toContain('period');
    const extra = valid();
    extra.days.push({ date: '2026-10-28', salesCount: 40 });
    extra.total += 40;
    expect(checkDemoCalendar(extra)).toContain('period');
  });

  it('detecta menos de 2 o más de 4 domingos sin ventas', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-09']))).toContain('closed-sundays');
    expect(
      checkDemoCalendar(
        calendarOf(from, to, [
          '2026-08-02',
          '2026-08-16',
          '2026-09-06',
          '2026-09-20',
          '2026-10-04',
        ]),
      ),
    ).toContain('closed-sundays');
  });

  it('detecta un día sin ventas que no es domingo', () => {
    expect(
      checkDemoCalendar(calendarOf(from, to, ['2026-08-09', '2026-09-13', '2026-10-14'])),
    ).toContain('daily-range');
  });

  it('detecta un mes completo sin domingo cerrado', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-09', '2026-10-11']))).toContain(
      'closed-sunday-per-month',
    );
  });

  it('detecta dos domingos sin ventas seguidos', () => {
    expect(checkDemoCalendar(calendarOf(from, to, ['2026-08-30', '2026-09-06']))).toContain(
      'consecutive-closed-sundays',
    );
  });

  it('detecta un día con menos de 30 o más de 80 ventas', () => {
    const closed = ['2026-08-09', '2026-09-13'];
    expect(
      checkDemoCalendar(calendarOf(from, to, closed, (date) => (date === '2026-09-01' ? 29 : 50))),
    ).toContain('daily-range');
    expect(
      checkDemoCalendar(
        calendarOf(from, to, closed, (date) =>
          date === '2026-09-04' ? 81 : [5, 6].includes(weekday(date)) ? 60 : 40,
        ),
      ),
    ).toContain('daily-range');
  });

  it('detecta viernes y sábados con menos de un 20 % más que de lunes a jueves', () => {
    expect(
      checkDemoCalendar(
        calendarOf(from, to, ['2026-08-09', '2026-09-13'], (date) =>
          [5, 6].includes(weekday(date)) ? 47 : 40,
        ),
      ),
    ).toContain('weekend-boost');
  });

  it('detecta un total que no es la suma de los días', () => {
    const wrong = valid();
    wrong.total += 1;
    expect(checkDemoCalendar(wrong)).toContain('total');
  });
});

// Ventas armadas a mano que cumplen todas las reglas: 2 días con 50 ventas cada uno.
const products: DemoProduct[] = OFFICIAL_MENU.flatMap((category, c) =>
  category.products.map((product, p) => ({
    id: `p-${c}-${p}`,
    name: product.name,
    categoryName: category.name,
    priceCents: priceSchema.parse(product.price),
  })),
);
const product = (name: string) => products.find((candidate) => candidate.name === name)!;
const accounts: DemoAccount[] = [
  { id: 'o1', displayName: 'Luis Mamani', role: 'owner' },
  { id: 'c1', displayName: 'Ana Quispe', role: 'cashier' },
  { id: 'c2', displayName: 'Rosa Choque', role: 'cashier' },
];
const days = ['2026-09-01', '2026-09-02'];
const at = (date: string, seconds: number) =>
  new Date(new Date(`${date}T00:00:00-04:00`).getTime() + seconds * 1000);
const hms = (hours: number, minutes: number) => hours * 3600 + minutes * 60;
const later = (sale: NewSale, seconds: number): NewSale => ({
  ...sale,
  registeredAt: new Date(sale.registeredAt.getTime() + seconds * 1000),
});
// 37 productos en 6 grupos para los pedidos grandes: cada producto se vende al menos una vez.
const bigGroups = [0, 7, 13, 19, 25, 31].map((start, index, starts) =>
  products.slice(start, starts[index + 1] ?? products.length),
);

function lineOf(item: DemoProduct, quantity: number) {
  return {
    productId: item.id,
    productName: item.name,
    categoryName: item.categoryName,
    unitPriceCents: item.priceCents,
    quantity,
    subtotalCents: item.priceCents * quantity,
  };
}

function saleOf(date: string, seconds: number, lines: NewSale['lines'], k: number): NewSale {
  const totalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
  const account = k % 5 === 0 ? accounts[0]! : accounts[1 + (k % 2)]!;
  return {
    number: 0,
    draftId: `${date}-${k}`,
    registeredAt: at(date, seconds),
    registeredBy: { userId: account.id, displayName: account.displayName, role: account.role },
    paymentMethod: totalCents >= 6000 || k % 3 === 0 ? 'qr' : 'cash',
    lines,
    totalCents,
  };
}

// Numera en orden de fecha y hora, desde 1.
function numbered(sales: NewSale[]): NewSale[] {
  return [...sales]
    .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime())
    .map((sale, index) => ({ ...sale, number: index + 1 }));
}

function lineFor(k: number): NewSale['lines'] {
  if (k % 2 === 0) return [lineOf(product('Americano'), 1)];
  return [lineOf(product(k % 4 === 1 ? 'Salteña de pollo' : 'Salteña de carne'), 1)];
}

function validSales(): NewSale[] {
  const sales = days.flatMap((date, d) =>
    Array.from({ length: 50 }, (_, k) => {
      // 09:00–09:48 y 15:30–16:12 (horas pico), y tres pedidos grandes desde las 19:00.
      const seconds =
        k < 25
          ? hms(9, 0) + k * 120
          : k < 47
            ? hms(15, 30) + (k - 25) * 120
            : hms(19, 0) + (k - 47) * 600;
      let lines: NewSale['lines'];
      if (k < 20) lines = lineFor(k);
      else if (k < 30) lines = [lineOf(product(k < 25 ? 'Cappuccino' : 'Café latte'), 3)];
      else if (k < 47) lines = [lineOf(product('Café latte'), 1), lineOf(product('Brownie'), 1)];
      else lines = bigGroups[d * 3 + (k - 47)]!.map((item) => lineOf(item, 2));
      return saleOf(date, seconds, lines, k);
    }),
  );
  return numbered(sales);
}

const context = (): DemoSalesContext => ({
  calendar: {
    from: days[0]!,
    to: days[1]!,
    days: days.map((date) => ({ date, salesCount: 50 })),
    total: 100,
  },
  products,
  accounts,
  firstNumber: 1,
});

// Cambia las ventas que cumplen `match` y vuelve a numerar en orden de fecha y hora.
function changed(
  match: (sale: NewSale, index: number) => boolean,
  change: (sale: NewSale) => NewSale,
): NewSale[] {
  return numbered(validSales().map((sale, index) => (match(sale, index) ? change(sale) : sale)));
}
const withLines = (sale: NewSale, lines: NewSale['lines']): NewSale => ({
  ...sale,
  lines,
  totalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
});
const has = (name: string) => (sale: NewSale) =>
  sale.lines.some((line) => line.productName === name);
const only =
  (name: string, quantity = 1) =>
  (sale: NewSale) =>
    sale.lines.length === 1 &&
    sale.lines[0]!.productName.startsWith(name) &&
    sale.lines[0]!.quantity === quantity;

describe('checkDemoSales: horas y contenido (RF-4, RF-5, RNF-2)', () => {
  it('no encuentra fallos en ventas que cumplen todo', () => {
    expect(checkDemoSales(validSales(), context())).toEqual([]);
  });

  it('detecta una venta a las 20:30:00 o antes de las 07:30', () => {
    const first = (_: NewSale, index: number) => index === 0;
    const late = changed(first, (sale) => ({ ...sale, registeredAt: at(days[0]!, hms(20, 30)) }));
    expect(checkDemoSales(late, context())).toContain('business-hours');
    const early = changed(first, (sale) => ({ ...sale, registeredAt: at(days[0]!, hms(7, 29)) }));
    expect(checkDemoSales(early, context())).toContain('business-hours');
  });

  it('detecta una venta fuera del período o un día con otra cantidad de ventas', () => {
    const outside = changed(
      (_, index) => index === 0,
      (sale) => ({ ...sale, registeredAt: at('2026-09-03', hms(10, 0)) }),
    );
    expect(checkDemoSales(outside, context())).toContain('calendar-days');
  });

  it('detecta dos ventas en el mismo segundo', () => {
    const sales = validSales();
    sales[1] = { ...sales[1]!, registeredAt: sales[0]!.registeredAt };
    expect(checkDemoSales(sales, context())).toContain('distinct-seconds');
  });

  it('detecta horas pico sin más ventas por hora que el resto del horario', () => {
    const offPeak = changed(
      (sale) => sale.lines.length < 6,
      (sale) => later(sale, hms(3, 0)),
    );
    expect(checkDemoSales(offPeak, context())).toContain('peak-hours');
  });

  it('detecta un reparto de tipos de venta fuera de 5 puntos', () => {
    const moreMultiple = changed(only('Americano'), (sale) =>
      withLines(sale, [sale.lines[0]!, lineOf(product('Cuñapé'), 1)]),
    );
    expect(checkDemoSales(moreMultiple, context())).toContain('sale-types');
  });

  it('detecta una cantidad mayor que 6 fuera de los pedidos grandes', () => {
    const tooMany = changed(has('Brownie'), (sale) =>
      withLines(sale, [sale.lines[0]!, lineOf(product('Brownie'), 7)]),
    );
    expect(checkDemoSales(tooMany, context())).toContain('quantities');
  });

  it('detecta menos del 80 % de bebidas en las ventas de 2 a 5 productos', () => {
    const noDrink = changed(
      (sale, index) => sale.lines.length === 2 && index % 2 === 0,
      (sale) => withLines(sale, [lineOf(product('Croissant'), 1), sale.lines[1]!]),
    );
    expect(checkDemoSales(noDrink, context())).toContain('drinks');
  });

  it('detecta un día sin ventas de varios productos', () => {
    const singles = changed(
      (sale) => sale.lines.length > 1 && sale.draftId.startsWith(days[1]!),
      (sale) => withLines(sale, [sale.lines[0]!]),
    );
    expect(checkDemoSales(singles, context())).toContain('daily-mix');
  });

  it('detecta un producto oficial sin vender («Mocochinchi»)', () => {
    const missing = changed(has('Mocochinchi'), (sale) =>
      withLines(
        sale,
        sale.lines.filter((line) => line.productName !== 'Mocochinchi'),
      ),
    );
    expect(checkDemoSales(missing, context())).toContain('all-products');
  });

  it('detecta «Americano» fuera de los 10 más vendidos', () => {
    const fewer = changed(only('Americano'), (sale) => withLines(sale, [lineOf(product('Té'), 1)]));
    expect(checkDemoSales(fewer, context())).toContain('top-sellers');
  });

  it('acepta el 70,8 % de las salteñas antes de las 12:00 y rechaza el 66,7 %', () => {
    const moveSaltenas = (count: number) => {
      let moved = 0;
      return changed(
        (sale) => only('Salteña')(sale) && moved++ < count,
        (sale) => later(sale, hms(4, 0)),
      );
    };
    expect(checkDemoSales(moveSaltenas(3), context())).not.toContain('saltenas-morning');
    expect(checkDemoSales(moveSaltenas(4), context())).toContain('saltenas-morning');
  });

  it('detecta menos del 60 % de la repostería desde las 14:00', () => {
    const morning = changed(has('Brownie'), (sale) => later(sale, -hms(5, 0)));
    expect(checkDemoSales(morning, context())).toContain('pastries-afternoon');
  });

  it('detecta un producto repetido en una venta', () => {
    const repeated = changed(has('Brownie'), (sale) =>
      withLines(sale, [sale.lines[0]!, sale.lines[0]!]),
    );
    expect(checkDemoSales(repeated, context())).toContain('unique-products');
  });

  it('detecta un subtotal que no es precio por cantidad o un total que no es la suma', () => {
    const subtotal = validSales();
    subtotal[0] = { ...subtotal[0]!, lines: [{ ...subtotal[0]!.lines[0]!, subtotalCents: 1 }] };
    expect(checkDemoSales(subtotal, context())).toContain('amounts');
    const total = validSales();
    total[0] = { ...total[0]!, totalCents: total[0]!.totalCents + 1 };
    expect(checkDemoSales(total, context())).toContain('amounts');
  });

  it('detecta una línea con un nombre, categoría o precio distinto del menú recibido', () => {
    const sales = validSales();
    sales[0] = withLines(sales[0]!, [
      { ...sales[0]!.lines[0]!, unitPriceCents: 999, subtotalCents: 999 },
    ]);
    expect(checkDemoSales(sales, context())).toContain('lines');
  });
});

const by =
  (account: DemoAccount) =>
  (sale: NewSale): NewSale => ({
    ...sale,
    registeredBy: { userId: account.id, displayName: account.displayName, role: account.role },
  });
const paid =
  (paymentMethod: NewSale['paymentMethod']) =>
  (sale: NewSale): NewSale => ({
    ...sale,
    paymentMethod,
  });
// Las primeras `count` ventas que cumplen `match`.
function first(count: number, match: (sale: NewSale) => boolean) {
  let found = 0;
  return (sale: NewSale) => match(sale) && found++ < count;
}

describe('checkDemoSales: pago, cuentas y número (RF-6, RF-7, RF-8)', () => {
  it('acepta del 55 % al 65 % en efectivo y rechaza el 66 % y el 54 %', () => {
    const small = (sale: NewSale) => sale.totalCents < 6000;
    const qrSmall = (sale: NewSale) => small(sale) && sale.paymentMethod === 'qr';
    const cashSmall = (sale: NewSale) => small(sale) && sale.paymentMethod === 'cash';
    // El conjunto válido tiene 62 ventas en efectivo.
    expect(checkDemoSales(changed(first(3, qrSmall), paid('cash')), context())).not.toContain(
      'cash-share',
    );
    expect(checkDemoSales(changed(first(4, qrSmall), paid('cash')), context())).toContain(
      'cash-share',
    );
    expect(checkDemoSales(changed(first(7, cashSmall), paid('qr')), context())).not.toContain(
      'cash-share',
    );
    expect(checkDemoSales(changed(first(8, cashSmall), paid('qr')), context())).toContain(
      'cash-share',
    );
  });

  it('detecta un día sin ventas con QR', () => {
    const noQr = changed((sale) => sale.draftId.startsWith(days[1]!), paid('cash'));
    expect(checkDemoSales(noQr, context())).toContain('daily-payments');
  });

  it('detecta menos QR en las ventas desde Bs 60,00 que en las menores', () => {
    const largeCash = changed((sale) => sale.totalCents >= 6000, paid('cash'));
    expect(checkDemoSales(largeCash, context())).toContain('qr-large');
  });

  it('acepta del 70 % al 85 % de ventas de cajero y rechaza el 90 % y el 65 %', () => {
    const owner = (sale: NewSale) => sale.registeredBy.role === 'owner';
    const cashier = (sale: NewSale) => sale.registeredBy.role === 'cashier';
    // El conjunto válido tiene 20 ventas del dueño.
    expect(checkDemoSales(changed(first(5, owner), by(accounts[1]!)), context())).not.toContain(
      'cashier-share',
    );
    expect(checkDemoSales(changed(first(10, owner), by(accounts[1]!)), context())).toContain(
      'cashier-share',
    );
    expect(checkDemoSales(changed(first(10, cashier), by(accounts[0]!)), context())).not.toContain(
      'cashier-share',
    );
    expect(checkDemoSales(changed(first(15, cashier), by(accounts[0]!)), context())).toContain(
      'cashier-share',
    );
  });

  it('con cuentas de un solo rol, exige que todas las ventas sean de ese rol', () => {
    const cashiers = { ...context(), accounts: accounts.slice(1) };
    expect(checkDemoSales(validSales(), cashiers)).toContain('single-role');
    const allCashier = changed((sale) => sale.registeredBy.role === 'owner', by(accounts[2]!));
    expect(checkDemoSales(allCashier, cashiers)).toEqual([]);
  });

  it('detecta una cuenta sin ventas', () => {
    const withoutRosa = changed((sale) => sale.registeredBy.userId === 'c2', by(accounts[1]!));
    expect(checkDemoSales(withoutRosa, context())).toContain('all-accounts');
  });

  it('detecta una venta a nombre de una cuenta que no existe o con otro nombre o rol', () => {
    const sales = validSales();
    sales[0] = { ...sales[0]!, registeredBy: { ...sales[0]!.registeredBy, displayName: 'Otra' } };
    expect(checkDemoSales(sales, context())).toContain('accounts');
  });

  it('detecta números repetidos, con saltos, fuera de orden o que no empiezan en el primero', () => {
    const repeated = validSales();
    repeated[1] = { ...repeated[1]!, number: 1 };
    expect(checkDemoSales(repeated, context())).toContain('numbers');
    const swapped = validSales();
    [swapped[0], swapped[1]] = [
      { ...swapped[0]!, number: 2 },
      { ...swapped[1]!, number: 1 },
    ];
    expect(checkDemoSales(swapped, context())).toContain('numbers');
    expect(checkDemoSales(validSales(), { ...context(), firstNumber: 5 })).toContain('numbers');
  });
});
