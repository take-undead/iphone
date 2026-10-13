import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type Polled<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** 最後に取れた時刻（Date.now()） */
  okAt: number | null;
  refresh: () => void;
};

/**
 * intervalMs ごとに fetcher を呼ぶ。アプリが前面のときだけ動き、画面が enabled=false なら止まる。
 * 失敗しても前のデータは残す（画面は「取得失敗」の理由を別に出す）。
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  describe: (e: unknown) => string,
  enabled = true,
  /** これが変わったら今すぐ取り直す（時間足の切替など） */
  key: string | number = '',
): Polled<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [okAt, setOkAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const describeRef = useRef(describe);
  describeRef.current = describe;
  const inFlight = useRef(false);
  const gen = useRef(0);

  const tick = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const g = gen.current;
    setLoading(true);
    try {
      const d = await fetcherRef.current();
      if (g !== gen.current) return;
      setData(d);
      setError(null);
      setOkAt(Date.now());
    } catch (e) {
      if (g !== gen.current) return;
      setError(describeRef.current(e));
    } finally {
      inFlight.current = false;
      if (g === gen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const schedule = () => {
      if (stopped) return;
      timer.current = setTimeout(async () => {
        if (AppState.currentState === 'active') await tick();
        schedule();
      }, intervalMs);
    };
    tick().then(schedule);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      stopped = true;
      gen.current++;
      inFlight.current = false;
      if (timer.current) clearTimeout(timer.current);
      sub.remove();
    };
  }, [enabled, intervalMs, tick, key]);

  const refresh = useCallback(() => {
    tick();
  }, [tick]);

  return { data, error, loading, okAt, refresh };
}
