import { formatPrice, type Category, type AdminProduct } from '@kofi/contracts';
import type { AdminMenuCategory } from '../api/menu-client.ts';
import { SteppedDiamond } from '../../../shared/components/SteppedDiamond.tsx';
import { CategoryIndex } from '../../../shared/components/CategoryIndex.tsx';
import { categoryAnchor } from './category-anchor.ts';

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
  if (!categories.length)
    return <p className="menu__empty">Todavía no hay categorías. Crea la primera</p>;
  return (
    <>
      <CategoryIndex className="menu__index" categories={categories} anchor={categoryAnchor} />
      <div className="menu__sections">
        {categories.map((category) => (
          <section
            className="menu__section"
            key={category.id}
            id={categoryAnchor(category.id)}
            aria-label={category.name}
          >
            <header className="menu__category">
              <div className="menu__category-name">
                <SteppedDiamond
                  className="menu__mark"
                  outline="var(--color-weave-light)"
                  ring="var(--color-weave-green)"
                  eye="var(--color-weave-light)"
                />
                <h2 tabIndex={-1}>{category.name}</h2>
                {!category.active && <span className="menu__inactive">Inactiva</span>}
              </div>
              <div className="menu__actions">
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
                    className="menu__availability"
                    type="button"
                    disabled={busy}
                    onClick={() => onCategoryActive(category)}
                    aria-label={`${category.active ? 'Desactivar' : 'Reactivar'} categoría ${category.name}`}
                  >
                    {category.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                )}
              </div>
            </header>
            {errors[category.id] && (
              <p className="alert" role="alert">
                {errors[category.id]}
              </p>
            )}
            {category.products.length ? (
              <ul className="menu__products">
                {category.products.map((product) => (
                  <li className="menu__product" key={product.id}>
                    <div className="menu__product-name">
                      <span>{product.name}</span>
                      {!product.active && <span className="menu__inactive">Inactivo</span>}
                    </div>
                    <span className="menu__price">{formatPrice(product.priceCents)}</span>
                    <div className="menu__actions">
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
                          className="menu__availability"
                          type="button"
                          disabled={busy}
                          onClick={() => onProductActive(product)}
                          aria-label={`${product.active ? 'Desactivar' : 'Reactivar'} producto ${product.name}`}
                        >
                          {product.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      )}
                    </div>
                    {errors[product.id] && (
                      <p className="alert" role="alert">
                        {errors[product.id]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="menu__empty">Sin productos</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
