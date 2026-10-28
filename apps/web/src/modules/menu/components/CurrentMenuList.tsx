import { formatPrice } from '@kofi/contracts';
import type { CurrentMenuCategory } from '../api/menu-client.ts';
import { SteppedDiamond } from '../../../shared/components/SteppedDiamond.tsx';
import { CategoryIndex } from '../../../shared/components/CategoryIndex.tsx';
import { categoryAnchor } from './category-anchor.ts';

export function CurrentMenuList({ categories }: { categories: readonly CurrentMenuCategory[] }) {
  if (!categories.length)
    return <p className="menu__empty">El menú todavía no tiene productos disponibles</p>;
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
              </div>
            </header>
            <ul className="menu__products">
              {category.products.map((product) => (
                <li className="menu__product" key={product.id}>
                  <span className="menu__product-name">{product.name}</span>
                  <span className="menu__price">{formatPrice(product.priceCents)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
