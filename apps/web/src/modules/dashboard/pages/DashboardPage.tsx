import { Link } from 'react-router';
import { useDashboardSummaries } from '../state/useDashboardSummaries.ts';
import { TodaySummarySection } from '../components/TodaySummarySection.tsx';

export function DashboardPage() {
  const { today, loading, error, refresh } = useDashboardSummaries();
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
    </main>
  );
}
