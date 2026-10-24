import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { AdminMenuCategory } from '../api/menu-client.ts';
import { MenuAdminList } from '../components/MenuAdminList.tsx';

export function MenuAdminPage() {
  const client = useMenuClient();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminMenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void client
      .getAdminMenu()
      .then((menu) => {
        if (active) setCategories(menu);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiFetchError && error.status === 403)
          navigate('/', { replace: true, state: { notice: error.message } });
        else
          setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
      });
    return () => {
      active = false;
    };
  }, [client, navigate]);
  return (
    <main>
      <h1>Administrar menú</h1>
      <Link to="/">Volver al inicio</Link>
      {error && <p role="alert">{error}</p>}
      {categories ? (
        <MenuAdminList categories={categories} />
      ) : (
        !error && <p role="status">Cargando menú…</p>
      )}
    </main>
  );
}
