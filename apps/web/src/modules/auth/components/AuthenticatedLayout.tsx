import { useEffect, useState, type ReactNode } from 'react';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useSession } from './useSession.ts';

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, logout, refresh } = useSession();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [refresh]);
  if (!user) return null;
  async function close() {
    if (closing) return;
    setClosing(true);
    setError('');
    try {
      await logout();
    } catch (failure) {
      setError(
        failure instanceof ApiFetchError ? failure.message : 'Ocurrió un error. Inténtalo de nuevo',
      );
    } finally {
      setClosing(false);
    }
  }
  return (
    <>
      <header>
        <span>{user.displayName}</span>
        {' · '}
        <span>{user.role === 'owner' ? 'Dueño' : 'Cajero'}</span>{' '}
        <button
          type="button"
          disabled={closing}
          onClick={() => {
            void close();
          }}
        >
          {closing ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
        {error && <p role="alert">{error}</p>}
      </header>
      {children}
    </>
  );
}
