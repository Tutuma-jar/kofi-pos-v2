import {
  formatDateTime,
  formatPaymentMethod,
  formatPrice,
  formatRole,
  type Sale,
} from '@kofi/contracts';

export function SaleDetailView({ sale }: { sale: Sale }) {
  return (
    <>
      <p>{formatDateTime(sale.registeredAt)}</p>
      <p>
        Registrada por {sale.registeredBy.displayName} · {formatRole(sale.registeredBy.role)}
      </p>
      <p>Medio de pago: {formatPaymentMethod(sale.paymentMethod)}</p>
      <ol aria-label="Productos de la venta">
        {sale.lines.map((line) => (
          <li key={line.productId}>
            {`${line.productName} · ${line.categoryName} · ${formatPrice(line.unitPriceCents)} × ${line.quantity} · ${formatPrice(line.subtotalCents)}`}
          </li>
        ))}
      </ol>
      <dl>
        <dt>Total</dt>
        <dd>{formatPrice(sale.totalCents)}</dd>
      </dl>
    </>
  );
}
