import { Link } from 'react-router';
import { useDashboardSummaries } from '../state/useDashboardSummaries.ts';
import { TodaySummarySection } from '../components/TodaySummarySection.tsx';
import { MonthSummarySection } from '../components/MonthSummarySection.tsx';
import { useSession } from '../../auth/index.ts';

export function DashboardPage() {
  const { user } = useSession();
  const { today, month, monthError, loading, error, refresh } = useDashboardSummaries(user?.role);
  return (
    <main>
      <h1>Resumen de ventas</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        Actualizar
      </button>
      {loading && <p role="status">Cargando…</p>}
      {error && <p role="alert">{error}</p>}
      {today && <TodaySummarySection summary={today} />}
      {monthError && <p role="alert">{monthError}</p>}
      {month && <MonthSummarySection summary={month} />}
    </main>
  );
}
