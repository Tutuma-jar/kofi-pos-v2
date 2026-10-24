import type { AdminProduct, ApiError, Category } from '@kofi/contracts';

// Datos del cliente simulado del menú. Los mensajes son los que devuelve la API (plan §6.2); las
// pruebas los validan con los esquemas del contrato.

export const DEMO_IDS = {
  hotDrinks: '1a7e4c2b-9d3f-4e5a-8b6c-7d8e9f0a1bc2',
  juices: '5d30a1b2-c3d4-4e5f-9a6b-7c8d9e0f1a9f',
  season: '88b2d1e4-5f6a-4b7c-9d8e-0f1a2b3c4d41',
  americano: 'c4e1a2b3-4c5d-4e6f-8a7b-9c0d1e2f3a07',
  teaCoca: '7f3e2d1c-0b9a-4876-b543-210fedcba987',
  pineappleJuice: 'f09a8b7c-6d5e-4f4a-a3b2-c1d0e9f8a73b',
  apiWithCake: '2b6d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4ee8',
} as const;

export const DEMO_CATEGORIES: Category[] = [
  { id: DEMO_IDS.hotDrinks, name: 'Bebidas calientes', active: true },
  { id: DEMO_IDS.juices, name: 'Jugos', active: true },
  { id: DEMO_IDS.season, name: 'Temporada', active: false },
];

export const DEMO_PRODUCTS: AdminProduct[] = [
  {
    id: DEMO_IDS.americano,
    name: 'Café americano',
    categoryId: DEMO_IDS.hotDrinks,
    priceCents: 1250,
    active: true,
  },
  {
    id: DEMO_IDS.teaCoca,
    name: 'Té de coca',
    categoryId: DEMO_IDS.hotDrinks,
    priceCents: 800,
    active: true,
  },
  {
    id: DEMO_IDS.pineappleJuice,
    name: 'Jugo de piña',
    categoryId: DEMO_IDS.juices,
    priceCents: 1500,
    active: true,
  },
  {
    id: DEMO_IDS.apiWithCake,
    name: 'Api con pastel',
    categoryId: DEMO_IDS.season,
    priceCents: 1800,
    active: false,
  },
];

interface DemoError {
  status: number;
  body: ApiError;
}

export const DEMO_ERRORS = {
  forbidden: {
    status: 403,
    body: { error: { code: 'FORBIDDEN', message: 'No tienes permiso para administrar el menú' } },
  },
  duplicateCategory: {
    status: 400,
    body: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos',
        fields: { name: 'Ya existe una categoría con ese nombre' },
      },
    },
  },
  duplicateProduct: {
    status: 400,
    body: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos',
        fields: { name: 'Ya existe un producto con ese nombre' },
      },
    },
  },
  categoryHasActiveProducts: {
    status: 409,
    body: {
      error: {
        code: 'CATEGORY_HAS_ACTIVE_PRODUCTS',
        message:
          'Esta categoría tiene 2 productos activos. Desactívalos o muévelos a otra categoría antes',
      },
    },
  },
  notFound: {
    status: 404,
    body: { error: { code: 'NOT_FOUND', message: 'No se encontró el producto' } },
  },
} as const satisfies Record<string, DemoError>;
