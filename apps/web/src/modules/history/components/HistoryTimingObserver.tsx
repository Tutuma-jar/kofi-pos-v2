import { useEffect } from 'react';
import { installHistoryTiming } from '../state/history-timing.ts';

export function HistoryTimingObserver() {
  useEffect(() => {
    if (import.meta.env.VITE_HISTORY_MEASUREMENT === 'true') return installHistoryTiming();
  }, []);
  return null;
}
