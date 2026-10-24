import type { SessionUser } from '@kofi/contracts';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ApiFetchError, subscribeUnauthorized } from '../../../shared/http/api-fetch.ts';
import type { AuthClient } from '../api/auth-client.ts';
import { SessionContext } from './useSession.ts';

interface State {
  user: SessionUser | null;
  checkedKey: string | null;
  error: string | null;
}

export function SessionProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const generation = useRef(0);
  const [state, setState] = useState<State>({ user: null, checkedKey: null, error: null });

  const sessionMissing = useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiFetchError) || error.code !== 'SESSION_MISSING') return false;
      generation.current++;
      setState({ user: null, checkedKey: location.key, error: null });
      if (location.pathname !== '/ingresar') navigate('/ingresar', { replace: true });
      return true;
    },
    [location.key, location.pathname, navigate],
  );

  const checkSession = useCallback(() => {
    const current = ++generation.current;
    return Promise.resolve()
      .then(() => client.getSession())
      .then((user) => {
        if (current === generation.current)
          setState({ user, checkedKey: location.key, error: null });
      })
      .catch((error: unknown) => {
        if (current !== generation.current) return;
        if (!sessionMissing(error))
          setState({
            user: null,
            checkedKey: location.key,
            error:
              error instanceof ApiFetchError
                ? error.message
                : 'Ocurrió un error. Inténtalo de nuevo',
          });
      });
  }, [client, location.key, sessionMissing]);

  useEffect(() => {
    const sequence = generation;
    void checkSession();
    return () => {
      sequence.current++;
    };
  }, [checkSession]);
  useEffect(() => subscribeUnauthorized(sessionMissing), [sessionMissing]);

  const refresh = useCallback(() => {
    setState({ user: null, checkedKey: null, error: null });
    return checkSession();
  }, [checkSession]);

  const acceptSession = useCallback(
    (user: SessionUser) => {
      generation.current++;
      setState({ user, checkedKey: location.key, error: null });
    },
    [location.key],
  );
  const logout = useCallback(async () => {
    await client.logout();
    generation.current++;
    setState({ user: null, checkedKey: location.key, error: null });
    navigate('/ingresar', { replace: true });
  }, [client, location.key, navigate]);
  const checking = state.checkedKey !== location.key;
  return (
    <SessionContext
      value={{
        user: checking ? null : state.user,
        checking,
        error: state.error,
        client,
        refresh,
        acceptSession,
        logout,
      }}
    >
      {children}
    </SessionContext>
  );
}
