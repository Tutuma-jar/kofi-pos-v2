import { useEffect, useState, type ReactNode } from 'react';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { WeaveStrip } from '../../../shared/components/WeaveStrip.tsx';
import { useSession } from './useSession.ts';
import './AuthenticatedLayout.css';

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
    <div className="shell">
      <header className="shell__bar">
        <p className="shell__who">
          <span className="shell__name">{user.displayName}</span>{' '}
          <span className="shell__role">{user.role === 'owner' ? 'Dueño' : 'Cajero'}</span>
        </p>
        <button
          type="button"
          disabled={closing}
          className="shell__logout"
          onClick={() => {
            void close();
          }}
        >
          {closing ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
        {error && (
          <p role="alert" className="alert shell__error">
            {error}
          </p>
        )}
      </header>
      <WeaveStrip orientation="vertical" />
      <WeaveStrip orientation="horizontal" />
      <div className="shell__content">{children}</div>
    </div>
  );
}
