import { formatDateTime, formatPaymentMethod, formatPrice, type Sale } from '@kofi/contracts';

export function SaleConfirmation({ sale }: { sale: Sale }) {
  return (
    <p role="status">
      Venta N.º {sale.number} registrada · {formatPrice(sale.totalCents)} ·{' '}
      {formatPaymentMethod(sale.paymentMethod)} · {formatDateTime(sale.registeredAt)}
    </p>
  );
}
