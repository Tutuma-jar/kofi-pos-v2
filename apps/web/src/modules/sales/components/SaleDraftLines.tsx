import { formatPrice, type SaleQuote } from '@kofi/contracts';
import type { ReactNode } from 'react';

export function SaleDraftLines({
  quote,
  busy,
  onIncrement,
  onDecrement,
  onRemove,
  children,
}: {
  quote: SaleQuote;
  busy: boolean;
  onIncrement(id: string): Promise<void>;
  onDecrement(id: string): Promise<void>;
  onRemove(id: string): Promise<void>;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="sale-draft-title" className="sale-draft">
      <h2 id="sale-draft-title">Venta en preparación</h2>
      <div className="sale-draft__items">
        {quote.lines.length === 0 && (
          <p className="sale-draft__empty">Elige los productos de la venta</p>
        )}
        <ul className="sale-draft__lines">
          {quote.lines.map((line) => (
            <li key={line.productId} className="sale-line">
              <p className="sale-line__summary">
                {line.productName} × {line.quantity} · {formatPrice(line.subtotalCents)}
              </p>
              <p className="sale-line__price">
                Precio unitario: {formatPrice(line.unitPriceCents)}
              </p>
              <div className="sale-line__actions">
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Sumar ${line.productName}`}
                  onClick={() => void onIncrement(line.productId)}
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={busy || line.quantity === 1}
                  aria-label={`Restar ${line.productName}`}
                  onClick={() => void onDecrement(line.productId)}
                >
                  −
                </button>
                <button
                  className="sale-line__remove"
                  type="button"
                  disabled={busy}
                  aria-label={`Quitar ${line.productName}`}
                  onClick={() => void onRemove(line.productId)}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="sale-draft__footer">
        {quote.notices.length > 0 && (
          <div role="status" className="notice sale-draft__notices">
            {quote.notices.map((notice, i) => (
              <p key={i}>{notice}</p>
            ))}
          </div>
        )}
        <p className="sale-draft__total">
          Total: <output aria-label="Total de la venta">{formatPrice(quote.totalCents)}</output>
        </p>
        {children}
      </div>
    </section>
  );
}
