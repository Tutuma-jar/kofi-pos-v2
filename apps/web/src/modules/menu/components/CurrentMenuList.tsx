import { formatPrice } from '@kofi/contracts';
import type { CurrentMenuCategory } from '../api/menu-client.ts';

export function CurrentMenuList({ categories }: { categories: readonly CurrentMenuCategory[] }) {
  if (!categories.length) return <p>El menú todavía no tiene productos disponibles</p>;
  return (
    <div>
      {categories.map((category) => (
        <section key={category.id} aria-label={category.name}>
          <h2>{category.name}</h2>
          <ul>
            {category.products.map((product) => (
              <li key={product.id}>
                <span>{product.name}</span>
                {' — '}
                <span>{formatPrice(product.priceCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
