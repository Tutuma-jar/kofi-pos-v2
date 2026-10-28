import type { SaleQuote } from '@kofi/contracts';

// Datos del cliente simulado de ventas. Los mensajes son los que devuelve la API (plan §6.2); las
// pruebas los validan con los esquemas del contrato.

export const DEMO_IDS = {
  hotDrinks: '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2',
  juices: '5c2d8e1f-3a4b-4c6d-9e7f-0a1b2c3d4e10',
  snacks: '77b0c1d2-e3f4-4a5b-8c6d-7e8f9a0b1ce4',
  americano: 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07',
  teaCoca: '7f3e2d1c-0b9a-4876-b543-210fedcba987',
  empanada: 'a3f0b1c2-d3e4-4f5a-8b6c-7d8e9f0a1b5d',
  pineappleJuice: '9b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d21',
  passionFruitJuice: '2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a32',
  mocochinchi: '6d7e8f9a-0b1c-4d2e-8f3a-4b5c6d7e8f43',
  cashier: '7d3a4b5c-6d7e-4f8a-9b0c-1d2e3f4a5bc9',
} as const;

// Menú vigente simulado, agrupado y ordenado como lo entrega la API (SPEC-002, RF-15).
export const DEMO_MENU: SaleQuote['menu'] = [
  {
    id: DEMO_IDS.hotDrinks,
    name: 'Bebidas calientes',
    products: [
      { id: DEMO_IDS.americano, name: 'Café americano', priceCents: 1250 },
      { id: DEMO_IDS.teaCoca, name: 'Té de coca', priceCents: 800 },
    ],
  },
  {
    id: DEMO_IDS.juices,
    name: 'Jugos',
    products: [
      { id: DEMO_IDS.passionFruitJuice, name: 'Jugo de maracuyá', priceCents: 1000 },
      { id: DEMO_IDS.pineappleJuice, name: 'Jugo de piña', priceCents: 1000 },
      { id: DEMO_IDS.mocochinchi, name: 'Mocochinchi', priceCents: 600 },
    ],
  },
  {
    id: DEMO_IDS.snacks,
    name: 'Salados',
    products: [{ id: DEMO_IDS.empanada, name: 'Empanada', priceCents: 800 }],
  },
];

// Precio del café americano en el escenario «Cambió un precio».
export const DEMO_CHANGED_PRICE_CENTS = 1300;

// Quien registra las ventas simuladas: el cliente simulado no conoce la sesión.
export const DEMO_SELLER = {
  userId: DEMO_IDS.cashier,
  displayName: 'Ana',
  role: 'cashier',
} as const;
