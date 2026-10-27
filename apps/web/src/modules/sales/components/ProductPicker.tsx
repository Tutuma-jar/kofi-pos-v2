import { formatPrice, type MenuProduct, type SaleQuote } from '@kofi/contracts';

export function ProductPicker({
  menu,
  busy,
  onSelect,
}: {
  menu: SaleQuote['menu'];
  busy: boolean;
  onSelect(product: MenuProduct): Promise<void>;
}) {
  return (
    <section aria-label="Productos para vender" className="sale-catalog">
      <h2>Productos para vender</h2>
      {menu.length === 0 && (
        <p className="sale-catalog__empty">El menú todavía no tiene productos para vender</p>
      )}
      {menu.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`sale-category-${category.id}`}
          className="sale-catalog__category"
        >
          <h3 id={`sale-category-${category.id}`}>{category.name}</h3>
          <ul className="sale-catalog__products">
            {category.products.map((product) => (
              <li key={product.id}>
                <button
                  className="sale-product"
                  aria-label={`${product.name} · ${formatPrice(product.priceCents)}`}
                  type="button"
                  disabled={busy}
                  onClick={() => void onSelect(product)}
                >
                  <span className="sale-product__name">{product.name}</span>
                  <span className="sale-product__separator"> · </span>
                  <span className="sale-product__price">{formatPrice(product.priceCents)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
