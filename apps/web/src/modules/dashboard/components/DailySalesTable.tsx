import { formatDate, formatPrice, type DayTotal } from '@kofi/contracts';
import { salesCount } from './counts.ts';

export function DailySalesTable({ days }: { days: DayTotal[] }) {
  return (
    <table className="dashboard-days">
      <caption>Ventas por día</caption>
      <thead>
        <tr>
          <th scope="col">Día</th>
          <th scope="col">Total vendido</th>
          <th scope="col">Ventas</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.date}>
            <th scope="row">{formatDate(day.date)}</th>
            <td>{formatPrice(day.totalCents)}</td>
            <td>{salesCount(day.salesCount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
