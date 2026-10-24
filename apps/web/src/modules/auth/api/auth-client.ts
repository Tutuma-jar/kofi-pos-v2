import {
  loginResponseSchema,
  sessionResponseSchema,
  type LoginRequest,
  type SessionUser,
} from '@kofi/contracts';
import { apiFetch } from '../../../shared/http/api-fetch.ts';

// Lo que la interfaz necesita de /api/auth (plan §6.2). Lo implementan el cliente HTTP real y el
// cliente simulado de dev/, así que la integración es cambiar uno por otro. Los errores llegan como
// ApiFetchError.
export interface AuthClient {
  login(credentials: LoginRequest): Promise<SessionUser>;
  logout(): Promise<void>;
  getSession(): Promise<SessionUser>;
}

export const httpAuthClient: AuthClient = {
  async login(credentials) {
    const { user } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: credentials,
      schema: loginResponseSchema,
    });
    return user;
  },
  async logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  },
  async getSession() {
    const { user } = await apiFetch('/api/auth/session', { schema: sessionResponseSchema });
    return user;
  },
};
