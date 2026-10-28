import { formatPaymentMethod, formatPrice, type DayHistory } from '@kofi/contracts';
import { salesCount } from './counts.ts';

export function PeriodTotals({
  totals,
}: {
  totals: Pick<DayHistory, 'totalCents' | 'salesCount' | 'byPaymentMethod'>;
}) {
  return (
    <section className="history-totals" aria-label="Cifras del período">
      <dl className="history-totals__primary">
        <dt>Total vendido</dt>
        <dd className="history-totals__amount">{formatPrice(totals.totalCents)}</dd>
        <dt className="history-visually-hidden">Ventas</dt>
        <dd className="history-totals__count">{salesCount(totals.salesCount)}</dd>
      </dl>
      <div className="history-totals__payments">
        <h2>Por medio de pago</h2>
        <div className="history-totals__payment-grid">
          {totals.byPaymentMethod.map((payment) => (
            <p key={payment.paymentMethod} className="history-totals__payment">
              <strong>{formatPaymentMethod(payment.paymentMethod)}:</strong>{' '}
              <span>
                {formatPrice(payment.totalCents)} ·{' '}
                <span className="history-totals__payment-count">
                  {salesCount(payment.salesCount)}
                </span>
              </span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
