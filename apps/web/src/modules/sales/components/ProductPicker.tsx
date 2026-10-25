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
    <section aria-label="Productos para vender">
      <h2>Productos para vender</h2>
      {menu.length === 0 && <p>El menú todavía no tiene productos para vender</p>}
      {menu.map((category) => (
        <section key={category.id} aria-labelledby={`sale-category-${category.id}`}>
          <h3 id={`sale-category-${category.id}`}>{category.name}</h3>
          <ul>
            {category.products.map((product) => (
              <li key={product.id}>
                <button type="button" disabled={busy} onClick={() => void onSelect(product)}>
                  {product.name} · {formatPrice(product.priceCents)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
