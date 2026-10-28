import {
  formatDateTime,
  formatPaymentMethod,
  formatPrice,
  formatRole,
  type Sale,
} from '@kofi/contracts';

export function SaleDetailView({ sale }: { sale: Sale }) {
  return (
    <div className="history-detail">
      <div className="history-detail__meta">
        <p>{formatDateTime(sale.registeredAt)}</p>
        <p>
          Registrada por {sale.registeredBy.displayName} · {formatRole(sale.registeredBy.role)}
        </p>
        <p>Medio de pago: {formatPaymentMethod(sale.paymentMethod)}</p>
      </div>
      <ol className="history-detail__lines" aria-label="Productos de la venta">
        {sale.lines.map((line) => (
          <li className="history-detail__line" key={line.productId}>
            <span className="history-detail__product">
              <strong>{line.productName}</strong> · {line.categoryName}
            </span>{' '}
            <span className="history-separator">·</span>{' '}
            <span className="history-detail__quantity">
              {formatPrice(line.unitPriceCents)} × {line.quantity}
            </span>{' '}
            <span className="history-separator">·</span>{' '}
            <span className="history-detail__subtotal">{formatPrice(line.subtotalCents)}</span>
          </li>
        ))}
      </ol>
      <dl className="history-detail__total">
        <dt>Total</dt>
        <dd>{formatPrice(sale.totalCents)}</dd>
      </dl>
    </div>
  );
}
