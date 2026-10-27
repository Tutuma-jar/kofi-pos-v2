import { Link } from 'react-router';
import { formatDate, formatPrice, type MonthHistory } from '@kofi/contracts';
import { salesCount } from './counts.ts';

export function MonthDaysTable({ days }: { days: MonthHistory['days'] }) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Ventas por día</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.date}>
            <td>
              <Link to={`/ventas?fecha=${day.date}`}>
                {formatDate(day.date)} · {formatPrice(day.totalCents)} ·{' '}
                {salesCount(day.salesCount)}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
