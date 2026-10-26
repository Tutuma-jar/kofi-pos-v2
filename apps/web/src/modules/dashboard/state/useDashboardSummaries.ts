import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DASHBOARD_MONTH_ROLES,
  type TodaySummary,
  type MonthSummary,
  type Role,
} from '@kofi/contracts';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { useDashboardClient } from '../api/DashboardClientProvider.tsx';

export function useDashboardSummaries(role?: Role) {
  const client = useDashboardClient();
  const withMonth = DASHBOARD_MONTH_ROLES.some((allowed) => allowed === role);
  const generation = useRef(0);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<MonthSummary | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const [dayResult, monthResult] = await Promise.allSettled([
        client.today(),
        withMonth ? client.month() : Promise.resolve(null),
      ]);
      if (current !== generation.current) return;
      const forbidden =
        monthResult.status === 'rejected' &&
        monthResult.reason instanceof ApiFetchError &&
        monthResult.reason.status === 403
          ? monthResult.reason
          : null;
      if (forbidden) {
        setMonth(null);
        setMonthError(forbidden.message);
      }
      if (dayResult.status === 'rejected') throw dayResult.reason;
      if (monthResult.status === 'rejected' && !forbidden) throw monthResult.reason;
      setToday(dayResult.value);
      if (monthResult.status === 'fulfilled') {
        setMonth(monthResult.value);
        setMonthError(null);
      }
      setError(null);
    } catch (error: unknown) {
      if (current !== generation.current) return;
      setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [client, withMonth]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return refresh();
    });
    const sequence = generation;
    return () => {
      active = false;
      sequence.current++;
    };
  }, [refresh]);
  return {
    today,
    month: withMonth ? month : null,
    monthError: withMonth ? monthError : null,
    loading,
    error,
    refresh,
  };
}
