import type { ApiError, SessionUser } from '@kofi/contracts';

// Datos del cliente simulado. Los mensajes son los que devuelve la API (plan §6.2); las pruebas los
// validan con los esquemas del contrato.

export const DEMO_USERS = {
  owner: {
    id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
    username: 'ana',
    displayName: 'Ana Quispe',
    role: 'owner',
  },
  cashier: {
    id: 'b7d05a31-6e2c-4b8f-a1d4-3c9e8f2a11c3',
    username: 'luis',
    displayName: 'Luis Mamani',
    role: 'cashier',
  },
} as const satisfies Record<string, SessionUser>;

interface DemoError {
  status: number;
  body: ApiError;
}

export const DEMO_ERRORS = {
  invalidCredentials: {
    status: 401,
    body: { error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' } },
  },
  accountLocked: {
    status: 429,
    body: {
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Demasiados intentos. Vuelve a intentarlo en 5 minutos',
        retryAfterMinutes: 5,
      },
    },
  },
  sessionMissing: {
    status: 401,
    body: { error: { code: 'SESSION_MISSING', message: 'Inicia sesión para continuar' } },
  },
  sessionExpired: {
    status: 401,
    body: {
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Tu sesión venció. Vuelve a iniciar sesión',
        userId: DEMO_USERS.owner.id,
      },
    },
  },
  sessionTerminated: {
    status: 401,
    body: {
      error: { code: 'SESSION_TERMINATED', message: 'Tu sesión terminó. Vuelve a iniciar sesión' },
    },
  },
} as const satisfies Record<string, DemoError>;
