import { DASHBOARD_MESSAGES, formatDate, formatDateTime, type TodaySummary } from '@kofi/contracts';
import { PeriodSummaryView } from './PeriodSummaryView.tsx';

export function TodaySummarySection({ summary }: { summary: TodaySummary }) {
  return (
    <section aria-labelledby="today-title">
      <h2 id="today-title">Hoy · {formatDate(summary.date)}</h2>
      <p>Datos al {formatDateTime(summary.asOf)}</p>
      <PeriodSummaryView summary={summary} emptyMessage={DASHBOARD_MESSAGES.emptyToday} />
    </section>
  );
}
