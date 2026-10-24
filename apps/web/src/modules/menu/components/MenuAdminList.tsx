import { formatPrice, type Category, type AdminProduct } from '@kofi/contracts';
import type { AdminMenuCategory } from '../api/menu-client.ts';

export function MenuAdminList({
  categories,
  onRenameCategory,
  onEditProduct,
  onCategoryActive,
  onProductActive,
  errors = {},
  busy = false,
}: {
  categories: readonly AdminMenuCategory[];
  onRenameCategory?: (category: Category) => void;
  onEditProduct?: (product: AdminProduct) => void;
  onCategoryActive?: (category: Category) => void;
  onProductActive?: (product: AdminProduct) => void;
  errors?: Readonly<Record<string, string>>;
  busy?: boolean;
}) {
  if (!categories.length) return <p>Todavía no hay categorías. Crea la primera</p>;
  return (
    <div>
      {categories.map((category) => (
        <section key={category.id} aria-label={category.name}>
          <h2>{category.name}</h2>
          {!category.active && <p>Inactiva</p>}
          {onRenameCategory && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRenameCategory(category)}
              aria-label={`Renombrar ${category.name}`}
            >
              Renombrar
            </button>
          )}
          {onCategoryActive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCategoryActive(category)}
              aria-label={`${category.active ? 'Desactivar' : 'Reactivar'} categoría ${category.name}`}
            >
              {category.active ? 'Desactivar' : 'Reactivar'}
            </button>
          )}
          {errors[category.id] && <p role="alert">{errors[category.id]}</p>}
          {category.products.length ? (
            <ul>
              {category.products.map((product) => (
                <li key={product.id}>
                  <span>{product.name}</span>
                  {' — '}
                  <span>{formatPrice(product.priceCents)}</span>
                  {onEditProduct && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEditProduct(product)}
                      aria-label={`Editar ${product.name}`}
                    >
                      Editar
                    </button>
                  )}
                  {onProductActive && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onProductActive(product)}
                      aria-label={`${product.active ? 'Desactivar' : 'Reactivar'} producto ${product.name}`}
                    >
                      {product.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                  {errors[product.id] && <p role="alert">{errors[product.id]}</p>}
                  {!product.active && (
                    <>
                      {' '}
                      · <span>Inactivo</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin productos</p>
          )}
        </section>
      ))}
    </div>
  );
}
