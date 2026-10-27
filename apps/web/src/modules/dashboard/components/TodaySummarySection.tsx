import { DASHBOARD_MESSAGES, formatDate, formatDateTime, type TodaySummary } from '@kofi/contracts';
import { PeriodSummaryView } from './PeriodSummaryView.tsx';

export function TodaySummarySection({ summary }: { summary: TodaySummary }) {
  return (
    <section aria-labelledby="today-title" className="dashboard-period dashboard-period--today">
      <div className="dashboard-period__header">
        <h2 id="today-title">Hoy · {formatDate(summary.date)}</h2>
        <p className="dashboard-period__timestamp">Datos al {formatDateTime(summary.asOf)}</p>
      </div>
      <PeriodSummaryView summary={summary} emptyMessage={DASHBOARD_MESSAGES.emptyToday} />
    </section>
  );
}
