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
      <dl className="summary-totals">
        <div className="summary-totals__total">
          <dt>Total vendido</dt>
          <dd>{formatPrice(summary.totalCents)}</dd>
        </div>
        <div className="summary-totals__secondary">
          <dt>Ventas</dt>
          <dd>{salesCount(summary.salesCount)}</dd>
        </div>
        <div className="summary-totals__secondary">
          <dt>Venta promedio</dt>
          <dd>
            {summary.averageTicketCents === null ? '—' : formatPrice(summary.averageTicketCents)}
          </dd>
        </div>
      </dl>
      <div className="summary-payments">
        <h3>Por medio de pago</h3>
        <ul aria-label="Por medio de pago" role="list">
          {summary.byPaymentMethod.map((payment) => (
            <li key={payment.paymentMethod}>
              <span className="summary-payments__label">
                {formatPaymentMethod(payment.paymentMethod)}:{' '}
              </span>
              <span className="summary-payments__value">
                <strong>{formatPrice(payment.totalCents)}</strong>
                <span className="summary-payments__count"> · {salesCount(payment.salesCount)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="summary-products">
        <h3>Productos más vendidos</h3>
        {summary.salesCount === 0 ? (
          <p className="summary-products__empty">{emptyMessage}</p>
        ) : (
          <ol aria-label="Productos más vendidos">
            {summary.topProducts.map((product) => (
              <li key={product.productId}>
                <span className="summary-products__row">
                  <span className="summary-products__name">{product.productName}</span>
                  <span className="summary-products__units"> · {unitsCount(product.quantity)}</span>
                  <span className="summary-products__amount">
                    {' '}
                    · {formatPrice(product.totalCents)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
