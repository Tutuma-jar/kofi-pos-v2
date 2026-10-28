import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatDate, HISTORY_MIN_DATE, HISTORY_MESSAGES } from '@kofi/contracts';
import { useHistoryClient } from '../api/HistoryClientProvider.tsx';
import { useHistoryQuery } from '../state/useHistoryQuery.ts';
import { PeriodTotals } from '../components/PeriodTotals.tsx';
import { SalesList } from '../components/SalesList.tsx';
import { QueryStatus } from '../components/QueryStatus.tsx';
import { SaleSearch } from '../components/SaleSearch.tsx';
import { useHistoryTiming } from '../state/useHistoryTiming.ts';
import '../history.css';

export function DayHistoryPage() {
  const client = useHistoryClient();
  const [params, setParams] = useSearchParams();
  const date = params.get('fecha') ?? undefined;
  const query = useHistoryQuery(() => client.day(date), date);
  const { data } = query;
  const timing = useHistoryTiming(data ? `/ventas?fecha=${data.date}` : null, query.loading);
  const chooseDate = useCallback(
    (value: string, replace = false) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('fecha', value);
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  // El día inicial lo decide la API y se fija para recargar y actualizar tras medianoche.
  useEffect(() => {
    if (data && date === undefined) chooseDate(data.date, true);
  }, [data, date, chooseDate]);

  return (
    <main className="history history--day" ref={timing}>
      <header className="history-header">
        <div>
          <h1>{data ? `Ventas del ${formatDate(data.date)}` : 'Historial de ventas'}</h1>
          <p>
            <Link to="/">Volver al inicio</Link>
          </p>
        </div>
        <p>
          <Link to="/ventas/mes">Ver por mes</Link>
        </p>
      </header>
      {data && (
        <>
          <nav className="history-period" aria-label="Cambiar el día">
            <button
              type="button"
              disabled={data.previousDate === null}
              onClick={() => {
                if (data.previousDate) chooseDate(data.previousDate);
              }}
            >
              Día anterior
            </button>
            <label className="history-period__field">
              <span className="history-visually-hidden">Fecha</span>
              <input
                type="date"
                min={HISTORY_MIN_DATE}
                value={data.date}
                max={data.today}
                onChange={(event) => {
                  if (event.target.value) chooseDate(event.target.value);
                }}
              />
            </label>
            <button
              type="button"
              disabled={data.nextDate === null}
              onClick={() => {
                if (data.nextDate) chooseDate(data.nextDate);
              }}
            >
              Día siguiente
            </button>
          </nav>
          <PeriodTotals totals={data} />
        </>
      )}
      <div className="history-tools">
        <QueryStatus {...query} />
        <SaleSearch />
      </div>
      {data && (
        <div className="history-results">
          {data.salesCount === 0 ? (
            <p className="history-empty">{HISTORY_MESSAGES.emptyDay}</p>
          ) : (
            <SalesList sales={data.sales} />
          )}
        </div>
      )}
    </main>
  );
}
