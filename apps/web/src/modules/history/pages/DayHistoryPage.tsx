import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatDate, HISTORY_MESSAGES } from '@kofi/contracts';
import { useHistoryClient } from '../api/HistoryClientProvider.tsx';
import { useHistoryQuery } from '../state/useHistoryQuery.ts';
import { PeriodTotals } from '../components/PeriodTotals.tsx';
import { SalesList } from '../components/SalesList.tsx';
import { QueryStatus } from '../components/QueryStatus.tsx';

export function DayHistoryPage() {
  const client = useHistoryClient();
  const [params, setParams] = useSearchParams();
  const date = params.get('fecha') ?? undefined;
  const query = useHistoryQuery(() => client.day(date), date);
  const { data } = query;
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
    <main>
      <h1>{data ? `Ventas del ${formatDate(data.date)}` : 'Historial de ventas'}</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
      {data && (
        <>
          <nav aria-label="Cambiar el día">
            <button type="button" onClick={() => chooseDate(data.previousDate)}>
              Día anterior
            </button>
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
          <label>
            Fecha{' '}
            <input
              type="date"
              value={data.date}
              max={data.today}
              onChange={(event) => {
                if (event.target.value) chooseDate(event.target.value);
              }}
            />
          </label>
          <PeriodTotals totals={data} />
          {data.salesCount === 0 ? (
            <p>{HISTORY_MESSAGES.emptyDay}</p>
          ) : (
            <SalesList sales={data.sales} />
          )}
        </>
      )}
      <QueryStatus {...query} />
    </main>
  );
}
