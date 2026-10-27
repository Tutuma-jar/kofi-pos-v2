import { Link } from 'react-router';
import { useDashboardSummaries } from '../state/useDashboardSummaries.ts';
import { TodaySummarySection } from '../components/TodaySummarySection.tsx';
import { MonthSummarySection } from '../components/MonthSummarySection.tsx';
import { useSession } from '../../auth/index.ts';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useSession();
  const { today, month, monthError, loading, error, refresh } = useDashboardSummaries(user?.role);
  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__heading">
          <h1>Resumen de ventas</h1>
          <Link to="/">Volver al inicio</Link>
        </div>
        <div className="dashboard__refresh">
          <button type="button" disabled={loading} onClick={() => void refresh()}>
            Actualizar
          </button>
          {loading && <p role="status">Cargando…</p>}
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
        </div>
      </header>
      {today && <TodaySummarySection summary={today} />}
      {monthError && (
        <p role="alert" className="alert dashboard__month-error">
          {monthError}
        </p>
      )}
      {month && <MonthSummarySection summary={month} />}
    </main>
  );
}
