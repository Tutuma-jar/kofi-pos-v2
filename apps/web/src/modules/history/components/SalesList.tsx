import {
  formatPaymentMethod,
  formatPrice,
  formatRole,
  formatTime,
  type ListedSale,
} from '@kofi/contracts';

export function SalesList({ sales }: { sales: ListedSale[] }) {
  return (
    <ol aria-label="Ventas del día">
      {sales.map((sale) => (
        <li key={sale.number}>
          N.º {sale.number} · {formatTime(sale.registeredAt)} · {sale.registeredBy.displayName} ·{' '}
          {formatRole(sale.registeredBy.role)} · {formatPaymentMethod(sale.paymentMethod)} ·{' '}
          {formatPrice(sale.totalCents)}
        </li>
      ))}
    </ol>
  );
}
