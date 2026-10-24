import type { MonthSummary, TodaySummary } from '@kofi/contracts';

// Resúmenes ya calculados para el cliente simulado del dashboard (plan D-8). Son cifras fijas, como
// las devolvería la API: la interfaz no calcula nada, ni siquiera en dev/ (principio 3). Las pruebas
// los validan con los esquemas del contrato. `asOf` lo pone el cliente simulado en cada pedido.

export const DEMO_IDS = {
  americano: 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07',
  empanada: 'a3f0b1c2-d3e4-4f5a-8b6c-7d8e9f0a1b5d',
} as const;

const DEMO_AS_OF = '2026-10-24T15:00:00.000Z';

// El ejemplo de HU-1: dos ventas el 24/10/2026.
export const DEMO_TODAY: TodaySummary = {
  date: '2026-10-24',
  asOf: DEMO_AS_OF,
  totalCents: 4550,
  salesCount: 2,
  averageTicketCents: 2275,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 2500, salesCount: 1 },
    { paymentMethod: 'qr', totalCents: 2050, salesCount: 1 },
  ],
  topProducts: [
    { productId: DEMO_IDS.americano, productName: 'Café americano', quantity: 3, totalCents: 3750 },
    { productId: DEMO_IDS.empanada, productName: 'Empanada', quantity: 1, totalCents: 800 },
  ],
};

const DAYS_WITH_SALES: Record<string, { totalCents: number; salesCount: number }> = {
  '2026-10-01': { totalCents: 800, salesCount: 1 },
  '2026-10-15': { totalCents: 2500, salesCount: 1 },
  '2026-10-24': { totalCents: 4550, salesCount: 2 },
};

const octoberDays = (withSales: boolean) =>
  Array.from({ length: 24 }, (_, index) => {
    const date = `2026-10-${String(index + 1).padStart(2, '0')}`;
    const sales = withSales ? DAYS_WITH_SALES[date] : undefined;
    return { date, totalCents: sales?.totalCents ?? 0, salesCount: sales?.salesCount ?? 0 };
  });

// Octubre de 2026 hasta el 24: las dos ventas de hoy, una del 01/10 y otra del 15/10.
export const DEMO_MONTH: MonthSummary = {
  month: '2026-10',
  asOf: DEMO_AS_OF,
  totalCents: 7850,
  salesCount: 4,
  averageTicketCents: 1963,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 3300, salesCount: 2 },
    { paymentMethod: 'qr', totalCents: 4550, salesCount: 2 },
  ],
  topProducts: [
    { productId: DEMO_IDS.americano, productName: 'Café americano', quantity: 5, totalCents: 6250 },
    { productId: DEMO_IDS.empanada, productName: 'Empanada', quantity: 2, totalCents: 1600 },
  ],
  days: octoberDays(true),
};

const emptyPeriod = {
  asOf: DEMO_AS_OF,
  totalCents: 0,
  salesCount: 0,
  averageTicketCents: null,
  byPaymentMethod: [
    { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
    { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
  ],
  topProducts: [],
} satisfies Omit<TodaySummary, 'date'>;

export const DEMO_EMPTY_TODAY: TodaySummary = { date: '2026-10-24', ...emptyPeriod };

export const DEMO_EMPTY_MONTH: MonthSummary = {
  month: '2026-10',
  ...emptyPeriod,
  days: octoberDays(false),
};
