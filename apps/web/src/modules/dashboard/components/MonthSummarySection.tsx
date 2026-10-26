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
    <section aria-labelledby="month-title">
      <h2 id="month-title">{formatMonth(summary.month)}</h2>
      <p>Datos al {formatDateTime(summary.asOf)}</p>
      <PeriodSummaryView summary={summary} emptyMessage={DASHBOARD_MESSAGES.emptyMonth} />
      <DailySalesTable days={summary.days} />
    </section>
  );
}
