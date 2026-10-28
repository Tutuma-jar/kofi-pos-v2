import {
  formatPaymentMethod,
  formatPrice,
  formatRole,
  formatTime,
  type ListedSale,
} from '@kofi/contracts';
import { Link } from 'react-router';

export function SalesList({ sales }: { sales: ListedSale[] }) {
  return (
    <>
      <div className="history-sales__head" aria-hidden="true">
        <span>N.º</span>
        <span>Hora</span>
        <span>Registrada por</span>
        <span>Medio de pago</span>
        <span>Total</span>
      </div>
      <ol className="history-sales" aria-label="Ventas del día">
        {sales.map((sale) => (
          <li key={sale.number}>
            <Link className="history-sales__row" to={`/ventas/${sale.number}`}>
              <span className="history-sales__number">N.º {sale.number}</span>{' '}
              <span className="history-separator">·</span>{' '}
              <span className="history-sales__time">{formatTime(sale.registeredAt)}</span>{' '}
              <span className="history-separator">·</span>{' '}
              <span className="history-sales__person">
                {sale.registeredBy.displayName} · {formatRole(sale.registeredBy.role)}
              </span>{' '}
              <span className="history-separator">·</span>{' '}
              <span className="history-sales__payment">
                {formatPaymentMethod(sale.paymentMethod)}
              </span>{' '}
              <span className="history-separator">·</span>{' '}
              <span className="history-sales__amount">{formatPrice(sale.totalCents)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
