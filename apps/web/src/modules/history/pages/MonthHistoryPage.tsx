import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatMonth, HISTORY_MIN_MONTH, HISTORY_MESSAGES } from '@kofi/contracts';
import { useHistoryClient } from '../api/HistoryClientProvider.tsx';
import { useHistoryQuery } from '../state/useHistoryQuery.ts';
import { PeriodTotals } from '../components/PeriodTotals.tsx';
import { MonthDaysTable } from '../components/MonthDaysTable.tsx';
import { QueryStatus } from '../components/QueryStatus.tsx';
import { SaleSearch } from '../components/SaleSearch.tsx';
import { useHistoryTiming } from '../state/useHistoryTiming.ts';

export function MonthHistoryPage() {
  const client = useHistoryClient();
  const [params, setParams] = useSearchParams();
  const month = params.get('mes') ?? undefined;
  const query = useHistoryQuery(() => client.month(month), month);
  const { data } = query;
  const timing = useHistoryTiming(data ? `/ventas/mes?mes=${data.month}` : null, query.loading);
  const chooseMonth = useCallback(
    (value: string, replace = false) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('mes', value);
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  // El mes inicial lo decide la API y se fija para recargar y actualizar tras el cambio de mes.
  useEffect(() => {
    if (data && month === undefined) chooseMonth(data.month, true);
  }, [data, month, chooseMonth]);

  return (
    <main ref={timing}>
      <h1>{data ? formatMonth(data.month) : 'Ventas por mes'}</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
      <SaleSearch />
      <p>
        <Link to="/ventas">Ver por día</Link>
      </p>
      {data && (
        <>
          <nav aria-label="Cambiar el mes">
            <button
              type="button"
              disabled={data.previousMonth === null}
              onClick={() => {
                if (data.previousMonth) chooseMonth(data.previousMonth);
              }}
            >
              Mes anterior
            </button>
            <button
              type="button"
              disabled={data.nextMonth === null}
              onClick={() => {
                if (data.nextMonth) chooseMonth(data.nextMonth);
              }}
            >
              Mes siguiente
            </button>
          </nav>
          <label>
            Mes{' '}
            <input
              type="month"
              min={HISTORY_MIN_MONTH}
              value={data.month}
              max={data.currentMonth}
              onChange={(event) => {
                if (event.target.value) chooseMonth(event.target.value);
              }}
            />
          </label>
          <PeriodTotals totals={data} />
          {data.salesCount === 0 && <p>{HISTORY_MESSAGES.emptyMonth}</p>}
          <MonthDaysTable days={data.days} />
        </>
      )}
      <QueryStatus {...query} />
    </main>
  );
}
