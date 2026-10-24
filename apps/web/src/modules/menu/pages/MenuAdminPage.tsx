import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useMenuClient } from '../api/MenuClientProvider.tsx';
import type { AdminMenuCategory } from '../api/menu-client.ts';
import { MenuAdminList } from '../components/MenuAdminList.tsx';
import { CategoryForm } from '../components/CategoryForm.tsx';
import type { Category, AdminProduct } from '@kofi/contracts';
import { ProductForm } from '../components/ProductForm.tsx';
import { SaveStatus, type SaveState } from '../components/SaveStatus.tsx';

type Editor =
  { kind: 'category'; category?: Category } | { kind: 'product'; product?: AdminProduct };

export function MenuAdminPage() {
  const client = useMenuClient();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminMenuCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  async function act(id: string, operation: () => Promise<unknown>) {
    if (saveState === 'saving') return;
    setRowErrors({});
    try {
      await save(operation);
    } catch (error) {
      if (error instanceof ApiFetchError && error.status === 409) {
        setSaveState(null);
        setRowErrors({ [id]: error.message });
      } else handleFailure(error);
    }
  }
  function handleFailure(error: unknown) {
    setSaveState(null);
    if (error instanceof ApiFetchError) {
      if (error.status === 403) {
        navigate('/', { replace: true, state: { notice: error.message } });
        return;
      }
      if (error.code === 'NETWORK_ERROR') {
        setSaveState('offline');
        return;
      }
      if (error.status === 401 || error.code === 'VALIDATION_ERROR') return;
    }
    setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
  }
  async function save(operation: () => Promise<unknown>) {
    setError(null);
    setSaveState('saving');
    await operation();
    setSaveState('saved');
    setEditor(null);
    try {
      setCategories(await client.getAdminMenu());
    } catch (error) {
      if (error instanceof ApiFetchError && (error.status === 401 || error.status === 403))
        handleFailure(error);
      else
        setError('Los cambios se guardaron, pero no se pudo actualizar el menú. Vuelve a abrirlo');
    }
  }
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
      <SaveStatus state={saveState} />
      {categories ? (
        <>
          {editor?.kind === 'category' ? (
            <CategoryForm
              key={editor.category?.id ?? 'new'}
              category={editor.category}
              onCancel={() => setEditor(null)}
              onFailure={handleFailure}
              onSave={(input) =>
                save(() =>
                  editor.category
                    ? client.renameCategory(editor.category.id, input)
                    : client.createCategory(input),
                )
              }
            />
          ) : editor?.kind === 'product' ? (
            <ProductForm
              key={editor.product?.id ?? 'new-product'}
              product={editor.product}
              categories={categories}
              onCancel={() => setEditor(null)}
              onFailure={handleFailure}
              onSave={(input) =>
                save(() =>
                  editor.product
                    ? client.updateProduct(editor.product.id, input)
                    : client.createProduct(input),
                )
              }
            />
          ) : (
            <>
              <button
                type="button"
                disabled={saveState === 'saving'}
                onClick={() => setEditor({ kind: 'category' })}
              >
                Crear categoría
              </button>
              <button
                type="button"
                disabled={saveState === 'saving' || !categories.some((category) => category.active)}
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
            busy={saveState === 'saving'}
            errors={rowErrors}
            onCategoryActive={
              editor
                ? undefined
                : (category) => {
                    void act(category.id, () =>
                      category.active
                        ? client.deactivateCategory(category.id)
                        : client.reactivateCategory(category.id),
                    );
                  }
            }
            onProductActive={
              editor
                ? undefined
                : (product) => {
                    void act(product.id, () =>
                      product.active
                        ? client.deactivateProduct(product.id)
                        : client.reactivateProduct(product.id),
                    );
                  }
            }
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
