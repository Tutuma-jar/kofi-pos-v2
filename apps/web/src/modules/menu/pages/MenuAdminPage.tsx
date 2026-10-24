import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { AdminMenuCategory } from '../api/menu-client.ts';
import { MenuAdminList } from '../components/MenuAdminList.tsx';
import { CategoryForm } from '../components/CategoryForm.tsx';
import type { Category, AdminProduct } from '@kofi/contracts';
import { ProductForm } from '../components/ProductForm.tsx';

type Editor =
  { kind: 'category'; category?: Category } | { kind: 'product'; product?: AdminProduct };

export function MenuAdminPage() {
  const client = useMenuClient();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminMenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
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
          {editor?.kind === 'category' ? (
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
          ) : editor?.kind === 'product' ? (
            <ProductForm
              key={editor.product?.id ?? 'new-product'}
              product={editor.product}
              categories={categories}
              onCancel={() => setEditor(null)}
              onSave={async (input) => {
                if (editor.product) await client.updateProduct(editor.product.id, input);
                else await client.createProduct(input);
                setCategories(await client.getAdminMenu());
                setEditor(null);
              }}
            />
          ) : (
            <>
              <button type="button" onClick={() => setEditor({ kind: 'category' })}>
                Crear categoría
              </button>
              <button
                type="button"
                disabled={!categories.some((category) => category.active)}
                onClick={() => setEditor({ kind: 'product' })}
              >
                Crear producto
              </button>
              {!categories.some((category) => category.active) && (
                <p>Crea o reactiva una categoría antes de añadir productos</p>
              )}
            </>
          )}
          <MenuAdminList
            categories={categories}
            onRenameCategory={
              editor ? undefined : (category) => setEditor({ kind: 'category', category })
            }
            onEditProduct={
              editor ? undefined : (product) => setEditor({ kind: 'product', product })
            }
          />
        </>
      ) : (
        !error && <p role="status">Cargando menú…</p>
      )}
    </main>
  );
}
