import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { AdminMenuCategory } from '../api/menu-client.ts';
import { MenuAdminList } from '../components/MenuAdminList.tsx';
import { CategoryForm } from '../components/CategoryForm.tsx';
import type { Category } from '@kofi/contracts';

export function MenuAdminPage() {
  const client = useMenuClient();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminMenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ category?: Category } | null>(null);
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
        <>
          {editor ? (
            <CategoryForm
              key={editor.category?.id ?? 'new'}
              category={editor.category}
              onCancel={() => setEditor(null)}
              onSave={async (input) => {
                if (editor.category) await client.renameCategory(editor.category.id, input);
                else await client.createCategory(input);
                setCategories(await client.getAdminMenu());
                setEditor(null);
              }}
            />
          ) : (
            <button type="button" onClick={() => setEditor({})}>
              Crear categoría
            </button>
          )}
          <MenuAdminList
            categories={categories}
            onRenameCategory={editor ? undefined : (category) => setEditor({ category })}
          />
        </>
      ) : (
        !error && <p role="status">Cargando menú…</p>
      )}
    </main>
  );
}
