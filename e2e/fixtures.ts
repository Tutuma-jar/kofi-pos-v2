import type { AccountInput } from '@kofi/contracts';

// Solo datos de prueba de la base efímera en memoria; no son cuentas ni contraseñas reales.
export const TEST_ACCOUNTS = {
  owner: {
    username: 'ana',
    displayName: 'Ana Quispe',
    role: 'owner',
    password: 'cafe de prueba Ana',
  },
  cashier: {
    username: 'luis',
    displayName: 'Luis Mamani',
    role: 'cashier',
    password: 'cafe de prueba Luis',
  },
} as const satisfies Record<string, AccountInput>;
