import { Link } from 'react-router';
import { formatDate, formatPrice, type MonthHistory } from '@kofi/contracts';
import { salesCount } from './counts.ts';

export function MonthDaysTable({ days }: { days: MonthHistory['days'] }) {
  return (
    <table className="history-days">
      <thead>
        <tr>
          <th scope="col">Ventas por día</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.date}>
            <td>
              <Link className="history-days__row" to={`/ventas?fecha=${day.date}`}>
                <span className="history-days__date">{formatDate(day.date)}</span>{' '}
                <span className="history-separator">·</span>{' '}
                <span className="history-days__amount">{formatPrice(day.totalCents)}</span>{' '}
                <span className="history-separator">·</span>{' '}
                <span className="history-days__count">{salesCount(day.salesCount)}</span>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
