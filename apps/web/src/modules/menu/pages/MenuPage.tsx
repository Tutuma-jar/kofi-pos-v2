import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { CurrentMenuCategory } from '../api/menu-client.ts';
import { CurrentMenuList } from '../components/CurrentMenuList.tsx';
import '../menu.css';

export function MenuPage() {
  const client = useMenuClient();
  const [categories, setCategories] = useState<CurrentMenuCategory[] | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let active = true;
    void client
      .getCurrentMenu()
      .then((menu) => {
        if (active) setCategories(menu);
      })
      .catch((error: unknown) => {
        if (active)
          setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
      });
    return () => {
      active = false;
    };
  }, [client]);
  return (
    <main className="menu menu--current">
      <header className="menu__header">
        <h1>Menú</h1>
        <Link to="/">Volver al inicio</Link>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {categories ? (
        <CurrentMenuList categories={categories} />
      ) : (
        !error && (
          <p className="menu__empty" role="status">
            Cargando menú…
          </p>
        )
      )}
    </main>
  );
}
