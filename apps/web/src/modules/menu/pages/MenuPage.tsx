import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { CurrentMenuCategory } from '../api/menu-client.ts';
import { CurrentMenuList } from '../components/CurrentMenuList.tsx';

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
    <main>
      <h1>Menú</h1>
      <Link to="/">Volver al inicio</Link>
      {error && <p role="alert">{error}</p>}
      {categories ? (
        <CurrentMenuList categories={categories} />
      ) : (
        !error && <p role="status">Cargando menú…</p>
      )}
    </main>
  );
}
