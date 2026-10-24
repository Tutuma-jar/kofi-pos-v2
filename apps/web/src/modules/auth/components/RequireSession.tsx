import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from './useSession.ts';

export function RequireSession({ children }: { children: ReactNode }) {
  const { checking, user, error, refresh } = useSession();
  if (checking) return <p role="status">Comprobando sesión…</p>;
  if (error)
    return (
      <main>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            void refresh();
          }}
        >
          Reintentar
        </button>
      </main>
    );
  if (!user) return <Navigate to="/ingresar" replace />;
  return children;
}
