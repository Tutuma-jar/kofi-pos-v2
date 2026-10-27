import { useEffect, useRef } from 'react';
import { finishHistoryTiming } from './history-timing.ts';

export function useHistoryTiming(readyKey: string | null, loading: boolean) {
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      import.meta.env.VITE_HISTORY_MEASUREMENT !== 'true' ||
      loading ||
      !readyKey ||
      !main.current
    )
      return;
    return finishHistoryTiming(main.current, readyKey);
  }, [readyKey, loading]);
  return main;
}
