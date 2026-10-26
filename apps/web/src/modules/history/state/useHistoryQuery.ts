import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiFetchError, NETWORK_ERROR_MESSAGE } from '../../../shared/http/api-fetch.ts';

export function useHistoryQuery<T>(load: () => Promise<T>, key: string | undefined) {
  const loader = useRef(load);
  const generation = useRef(0);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  useEffect(() => {
    loader.current = load;
  }, [load]);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setNotice(null);
    setRejection(null);
    try {
      const answer = await loader.current();
      if (current === generation.current) setData(answer);
    } catch (error: unknown) {
      if (current !== generation.current) return;
      if (error instanceof ApiFetchError && [400, 403, 404].includes(error.status ?? 0)) {
        setData(null);
        setRejection(error.message);
      } else if (error instanceof ApiFetchError && error.status === 401) {
        setData(null);
      } else {
        setNotice(
          error instanceof ApiFetchError && error.code === 'NETWORK_ERROR'
            ? NETWORK_ERROR_MESSAGE
            : 'Ocurrió un error. Inténtalo de nuevo',
        );
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);

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
  }, [key, refresh]);

  return { data, loading, notice, rejection, refresh };
}
