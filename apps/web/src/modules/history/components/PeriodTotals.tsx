import { formatPaymentMethod, formatPrice, type DayHistory } from '@kofi/contracts';
import { salesCount } from './counts.ts';

export function PeriodTotals({
  totals,
}: {
  totals: Pick<DayHistory, 'totalCents' | 'salesCount' | 'byPaymentMethod'>;
}) {
  return (
    <>
      <dl>
        <dt>Total vendido</dt>
        <dd>{formatPrice(totals.totalCents)}</dd>
        <dt>Ventas</dt>
        <dd>{salesCount(totals.salesCount)}</dd>
      </dl>
      <h2>Por medio de pago</h2>
      {totals.byPaymentMethod.map((payment) => (
        <p key={payment.paymentMethod}>
          {formatPaymentMethod(payment.paymentMethod)}: {formatPrice(payment.totalCents)} ·{' '}
          {salesCount(payment.salesCount)}
        </p>
      ))}
    </>
  );
}
