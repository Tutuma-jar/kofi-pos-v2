import { formatPrice, type Category } from '@kofi/contracts';
import type { AdminMenuCategory } from '../api/menu-client.ts';

export function MenuAdminList({
  categories,
  onRenameCategory,
}: {
  categories: readonly AdminMenuCategory[];
  onRenameCategory?: (category: Category) => void;
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
              onClick={() => onRenameCategory(category)}
              aria-label={`Renombrar ${category.name}`}
            >
              Renombrar
            </button>
          )}
          {category.products.length ? (
            <ul>
              {category.products.map((product) => (
                <li key={product.id}>
                  <span>{product.name}</span>
                  {' — '}
                  <span>{formatPrice(product.priceCents)}</span>
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
