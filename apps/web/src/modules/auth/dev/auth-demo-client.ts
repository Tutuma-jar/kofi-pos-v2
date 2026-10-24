import type { SessionUser } from '@kofi/contracts';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';
import type { AuthClient } from '../api/auth-client.ts';
import { DEMO_ERRORS, DEMO_USERS } from './fixtures.ts';

// Cliente simulado de /api/auth para trabajar la interfaz sin la API (docs/architecture.md §4.5).
// Cada escenario decide qué responde el ingreso y con qué sesión se empieza.

type DemoError = (typeof DEMO_ERRORS)[keyof typeof DEMO_ERRORS];

interface Scenario {
  label: string;
  login: SessionUser | DemoError | 'offline';
  // La respuesta de la primera comprobación de la sesión; después, la cookie ya no existe.
  initialSession?: DemoError;
}

export const SCENARIOS = {
  owner: { label: 'Dueño', login: DEMO_USERS.owner },
  cashier: { label: 'Cajero', login: DEMO_USERS.cashier },
  invalidCredentials: { label: 'Credenciales incorrectas', login: DEMO_ERRORS.invalidCredentials },
  accountLocked: { label: 'Cuenta bloqueada', login: DEMO_ERRORS.accountLocked },
  offline: { label: 'Sin conexión', login: 'offline' },
  sessionExpired: {
    label: 'Sesión vencida',
    login: DEMO_USERS.owner,
    initialSession: DEMO_ERRORS.sessionExpired,
  },
  sessionTerminated: {
    label: 'Sesión terminada',
    login: DEMO_USERS.owner,
    initialSession: DEMO_ERRORS.sessionTerminated,
  },
} as const satisfies Record<string, Scenario>;

export type ScenarioId = keyof typeof SCENARIOS;

export interface AuthDemoClient extends AuthClient {
  readonly scenario: ScenarioId;
  setScenario(scenario: ScenarioId): void;
}

const toError = ({ status, body }: DemoError) => new ApiFetchError(status, body.error);
const networkError = () =>
  new ApiFetchError(null, { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });

export function createAuthDemoClient(initial: ScenarioId): AuthDemoClient {
  let scenario: ScenarioId = initial;
  let session: SessionUser | DemoError | null = null;

  const reset = () => {
    const current: Scenario = SCENARIOS[scenario];
    session = current.initialSession ?? null;
  };
  const isOffline = () => SCENARIOS[scenario].login === 'offline';
  reset();

  return {
    get scenario() {
      return scenario;
    },
    setScenario(next) {
      scenario = next;
      reset();
    },
    async login() {
      const result: Scenario['login'] = SCENARIOS[scenario].login;
      if (result === 'offline') throw networkError();
      if ('body' in result) throw toError(result);
      session = result;
      return result;
    },
    async logout() {
      if (isOffline()) throw networkError();
      session = null;
    },
    async getSession() {
      if (isOffline()) throw networkError();
      if (session === null) throw toError(DEMO_ERRORS.sessionMissing);
      if ('body' in session) {
        const error = toError(session);
        session = null;
        throw error;
      }
      return session;
    },
  };
}

const STORAGE_KEY = 'kofi:dev:auth-scenario';

export function loadStoredScenario(): ScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in SCENARIOS) return stored as ScenarioId;
  } catch {
    // Sin localStorage, se empieza con el dueño.
  }
  return 'owner';
}

export function storeScenario(scenario: ScenarioId): void {
  try {
    localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // No es necesario recordarlo.
  }
}
