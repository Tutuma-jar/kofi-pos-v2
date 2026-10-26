import { useCallback, useEffect, useRef, useState } from 'react';
import type { TodaySummary } from '@kofi/contracts';
import { useDashboardClient } from '../api/DashboardClientProvider.tsx';

export function useDashboardSummaries() {
  const client = useDashboardClient();
  const generation = useRef(0);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    try {
      const summary = await client.today();
      if (current !== generation.current) return;
      setToday(summary);
      setError(null);
    } catch (error: unknown) {
      if (current !== generation.current) return;
      setError(error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [client]);
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
  return { today, loading, error, refresh };
}
