import {
  DASHBOARD_MESSAGES,
  formatDateTime,
  formatMonth,
  type MonthSummary,
} from '@kofi/contracts';
import { PeriodSummaryView } from './PeriodSummaryView.tsx';
import { DailySalesTable } from './DailySalesTable.tsx';

export function MonthSummarySection({ summary }: { summary: MonthSummary }) {
  return (
    <section aria-labelledby="month-title" className="dashboard-period dashboard-period--month">
      <div className="dashboard-period__header">
        <h2 id="month-title">{formatMonth(summary.month)}</h2>
        <p className="dashboard-period__timestamp">Datos al {formatDateTime(summary.asOf)}</p>
      </div>
      <PeriodSummaryView summary={summary} emptyMessage={DASHBOARD_MESSAGES.emptyMonth} />
      <DailySalesTable days={summary.days} />
    </section>
  );
}
