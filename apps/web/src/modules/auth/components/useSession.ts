import type { SessionUser } from '@kofi/contracts';
import { createContext, useContext } from 'react';
import type { AuthClient } from '../api/auth-client.ts';

export interface SessionContextValue {
  user: SessionUser | null;
  checking: boolean;
  error: string | null;
  client: AuthClient;
  refresh(): Promise<void>;
  acceptSession(user: SessionUser): void;
  logout(): Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Falta SessionProvider');
  return session;
}
