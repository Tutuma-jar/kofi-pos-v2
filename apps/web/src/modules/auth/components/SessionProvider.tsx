import type { SessionUser } from '@kofi/contracts';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ApiFetchError, subscribeUnauthorized } from '../../../shared/http/api-fetch.ts';
import type { AuthClient } from '../api/auth-client.ts';
import { returnTo } from '../api/return-to.ts';
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

  const rejectSession = useCallback(
    (error: unknown) => {
      if (
        !(error instanceof ApiFetchError) ||
        error.status !== 401 ||
        !['SESSION_MISSING', 'SESSION_EXPIRED', 'SESSION_TERMINATED'].includes(error.code)
      )
        return false;
      if (error.code === 'SESSION_EXPIRED' && error.error.userId) {
        returnTo.save(error.error.userId, location.pathname + location.search + location.hash);
      } else if (error.code === 'SESSION_TERMINATED') returnTo.clear();
      generation.current++;
      setState({
        user: null,
        checkedKey: location.pathname === '/ingresar' ? location.key : null,
        error: null,
      });
      if (location.pathname !== '/ingresar' || error.code !== 'SESSION_MISSING') {
        navigate('/ingresar', {
          replace: true,
          state: { notice: error.code === 'SESSION_MISSING' ? undefined : error.message },
        });
      }
      return true;
    },
    [location.key, location.pathname, location.search, location.hash, navigate],
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
        if (!rejectSession(error))
          setState({
            user: null,
            checkedKey: location.key,
            error:
              error instanceof ApiFetchError
                ? error.message
                : 'Ocurrió un error. Inténtalo de nuevo',
          });
      });
  }, [client, location.key, rejectSession]);

  useEffect(() => {
    const sequence = generation;
    void checkSession();
    return () => {
      sequence.current++;
    };
  }, [checkSession]);
  useEffect(() => subscribeUnauthorized(rejectSession), [rejectSession]);

  const refresh = useCallback(() => {
    setState({ user: null, checkedKey: null, error: null });
    return checkSession();
  }, [checkSession]);

  const acceptSession = useCallback((user: SessionUser) => {
    generation.current++;
    // La página de ingreso navega al destino antes de exponer la nueva identidad.
    setState({ user, checkedKey: null, error: null });
  }, []);
  const logout = useCallback(async () => {
    returnTo.clear();
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
