import { formatPaymentMethod, formatPrice, type PeriodSummary } from '@kofi/contracts';
import { salesCount, unitsCount } from './counts.ts';

export function PeriodSummaryView({
  summary,
  emptyMessage,
}: {
  summary: PeriodSummary;
  emptyMessage: string;
}) {
  return (
    <>
      <dl>
        <dt>Total vendido</dt>
        <dd>{formatPrice(summary.totalCents)}</dd>
        <dt>Ventas</dt>
        <dd>{salesCount(summary.salesCount)}</dd>
        <dt>Venta promedio</dt>
        <dd>
          {summary.averageTicketCents === null ? '—' : formatPrice(summary.averageTicketCents)}
        </dd>
      </dl>
      <h3>Por medio de pago</h3>
      {summary.byPaymentMethod.map((payment) => (
        <p key={payment.paymentMethod}>
          {formatPaymentMethod(payment.paymentMethod)}: {formatPrice(payment.totalCents)} ·{' '}
          {salesCount(payment.salesCount)}
        </p>
      ))}
      <h3>Productos más vendidos</h3>
      {summary.salesCount === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ol aria-label="Productos más vendidos">
          {summary.topProducts.map((product) => (
            <li key={product.productId}>
              {product.productName} · {unitsCount(product.quantity)} ·{' '}
              {formatPrice(product.totalCents)}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
