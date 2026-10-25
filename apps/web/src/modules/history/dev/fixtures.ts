import type {
  DayHistory,
  HistorySaleResponse,
  ListedSale,
  MonthHistory,
  Sale,
} from '@kofi/contracts';
import { monthDays } from './demo-calendar.ts';

// Ventas y cifras ya calculadas para el cliente simulado del historial (plan D-9). Son cifras fijas,
// como las devolvería la API: la interfaz no calcula nada, ni siquiera en dev/ (principio 3). Las
// pruebas las validan con los esquemas del contrato. `asOf` lo pone el cliente simulado en cada
// pedido. Hoy es el 25/10/2026.

export const DEMO_TODAY = '2026-10-25';
export const DEMO_CURRENT_MONTH = '2026-10';

const DEMO_AS_OF = '2026-10-25T15:00:00.000Z';

const IDS = {
  owner: 'b2c3d4e5-0000-4000-8000-000000000001',
  americano: 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07',
  empanada: 'a3f0b1c2-d3e4-4f5a-8b6c-7d8e9f0a1b5d',
} as const;

const americano = (quantity: number) => ({
  productId: IDS.americano,
  productName: 'Café americano',
  categoryName: 'Bebidas calientes',
  quantity,
  unitPriceCents: 1250,
  subtotalCents: 1250 * quantity,
});

const empanada = {
  productId: IDS.empanada,
  productName: 'Empanada',
  categoryName: 'Salados',
  quantity: 1,
  unitPriceCents: 800,
  subtotalCents: 800,
};

const ana = { userId: null, displayName: 'Ana Quispe', role: 'cashier' } as const;
const luis = { userId: IDS.owner, displayName: 'Luis Mamani', role: 'owner' } as const;

// Las ventas del ejemplo de HU-1 de spec.md, más una de hoy. La cuenta de Ana se eliminó después.
const SALES: Sale[] = [
  {
    id: 'd1e2f3a4-0000-4000-8000-000000000001',
    number: 1,
    registeredAt: '2026-10-24T03:50:00.000Z',
    registeredBy: ana,
    lines: [americano(1)],
    totalCents: 1250,
    paymentMethod: 'cash',
  },
  {
    id: 'd1e2f3a4-0000-4000-8000-000000000002',
    number: 2,
    registeredAt: '2026-10-24T13:15:00.000Z',
    registeredBy: ana,
    lines: [americano(2)],
    totalCents: 2500,
    paymentMethod: 'cash',
  },
  {
    id: 'd1e2f3a4-0000-4000-8000-000000000003',
    number: 3,
    registeredAt: '2026-10-24T14:30:00.000Z',
    registeredBy: luis,
    lines: [empanada, americano(1)],
    totalCents: 2050,
    paymentMethod: 'qr',
  },
  {
    id: 'd1e2f3a4-0000-4000-8000-000000000004',
    number: 4,
    registeredAt: '2026-10-25T12:05:00.000Z',
    registeredBy: luis,
    lines: [americano(1)],
    totalCents: 1250,
    paymentMethod: 'qr',
  },
];

const SALE_DATES = ['2026-10-23', '2026-10-24', '2026-10-24', '2026-10-25'];

// El detalle de cada venta, por número, con su día en Bolivia.
export const DEMO_SALES: Record<string, HistorySaleResponse> = Object.fromEntries(
  SALES.map((sale, index) => [String(sale.number), { sale, date: SALE_DATES[index]! }]),
);

// La fila de la lista de un día: la venta sin sus líneas.
const listed = (number: number): ListedSale => {
  const { id, registeredAt, registeredBy, totalCents, paymentMethod } =
    DEMO_SALES[String(number)]!.sale;
  return { id, number, registeredAt, registeredBy, totalCents, paymentMethod };
};

const payments = (cash: [number, number], qr: [number, number]): DayHistory['byPaymentMethod'] => [
  { paymentMethod: 'cash', totalCents: cash[0], salesCount: cash[1] },
  { paymentMethod: 'qr', totalCents: qr[0], salesCount: qr[1] },
];

export const DEMO_NO_PAYMENTS = payments([0, 0], [0, 0]);

// Los días con ventas; la navegación es la de la API con hoy el 25/10/2026.
export const DEMO_DAYS: Record<string, DayHistory> = {
  '2026-10-23': {
    date: '2026-10-23',
    today: DEMO_TODAY,
    previousDate: '2026-10-22',
    nextDate: '2026-10-24',
    asOf: DEMO_AS_OF,
    totalCents: 1250,
    salesCount: 1,
    byPaymentMethod: payments([1250, 1], [0, 0]),
    sales: [listed(1)],
  },
  '2026-10-24': {
    date: '2026-10-24',
    today: DEMO_TODAY,
    previousDate: '2026-10-23',
    nextDate: '2026-10-25',
    asOf: DEMO_AS_OF,
    totalCents: 4550,
    salesCount: 2,
    byPaymentMethod: payments([2500, 1], [2050, 1]),
    sales: [listed(3), listed(2)],
  },
  '2026-10-25': {
    date: '2026-10-25',
    today: DEMO_TODAY,
    previousDate: '2026-10-24',
    nextDate: null,
    asOf: DEMO_AS_OF,
    totalCents: 1250,
    salesCount: 1,
    byPaymentMethod: payments([0, 0], [1250, 1]),
    sales: [listed(4)],
  },
};

const OCTOBER_TOTALS: Record<string, { totalCents: number; salesCount: number }> = {
  '2026-10-23': { totalCents: 1250, salesCount: 1 },
  '2026-10-24': { totalCents: 4550, salesCount: 2 },
  '2026-10-25': { totalCents: 1250, salesCount: 1 },
};

// Octubre (el mes en curso, del 1 a hoy) con ventas y septiembre sin ventas.
export const DEMO_MONTHS: Record<string, MonthHistory> = {
  '2026-10': {
    month: '2026-10',
    currentMonth: DEMO_CURRENT_MONTH,
    previousMonth: '2026-09',
    nextMonth: null,
    asOf: DEMO_AS_OF,
    totalCents: 7050,
    salesCount: 4,
    byPaymentMethod: payments([3750, 2], [3300, 2]),
    days: monthDays('2026-10')
      .filter((date) => date <= DEMO_TODAY)
      .map((date) => ({ date, ...(OCTOBER_TOTALS[date] ?? { totalCents: 0, salesCount: 0 }) })),
  },
  '2026-09': {
    month: '2026-09',
    currentMonth: DEMO_CURRENT_MONTH,
    previousMonth: '2026-08',
    nextMonth: '2026-10',
    asOf: DEMO_AS_OF,
    totalCents: 0,
    salesCount: 0,
    byPaymentMethod: DEMO_NO_PAYMENTS,
    days: monthDays('2026-09').map((date) => ({ date, totalCents: 0, salesCount: 0 })),
  },
};
