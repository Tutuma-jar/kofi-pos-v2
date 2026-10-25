import { formatPrice, type SaleQuote } from '@kofi/contracts';

export function SaleDraftLines({
  quote,
  busy,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  quote: SaleQuote;
  busy: boolean;
  onIncrement(id: string): Promise<void>;
  onDecrement(id: string): Promise<void>;
  onRemove(id: string): Promise<void>;
}) {
  return (
    <section aria-labelledby="sale-draft-title">
      <h2 id="sale-draft-title">Venta en preparación</h2>
      {quote.lines.length === 0 && <p>Elige los productos de la venta</p>}
      <ul>
        {quote.lines.map((line) => (
          <li key={line.productId}>
            <p>
              {line.productName} × {line.quantity} · {formatPrice(line.subtotalCents)}
            </p>
            <p>Precio unitario: {formatPrice(line.unitPriceCents)}</p>
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
              type="button"
              disabled={busy}
              aria-label={`Quitar ${line.productName}`}
              onClick={() => void onRemove(line.productId)}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <p>
        Total: <output aria-label="Total de la venta">{formatPrice(quote.totalCents)}</output>
      </p>
      {quote.notices.length > 0 && (
        <div role="status">
          {quote.notices.map((notice, i) => (
            <p key={i}>{notice}</p>
          ))}
        </div>
      )}
    </section>
  );
}
