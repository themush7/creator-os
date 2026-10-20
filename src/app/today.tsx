import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DateStr } from '@/domain/types';
import { isDateStr, localToday } from '@/lib/dates';

const KEY = 'creator-os.today-override';

/**
 * `?today=2026-10-02` pins the app's notion of today for demos and tests.
 * It is remembered for the browser session; `?today=` (empty) clears it.
 */
export function readTodayOverride(search: string = window.location.search): DateStr | null {
  const params = new URLSearchParams(search);
  try {
    if (params.has('today')) {
      const v = params.get('today') ?? '';
      if (isDateStr(v)) sessionStorage.setItem(KEY, v);
      else sessionStorage.removeItem(KEY);
    }
    const stored = sessionStorage.getItem(KEY);
    return isDateStr(stored) ? stored : null;
  } catch {
    const v = params.get('today');
    return isDateStr(v) ? v : null;
  }
}

const TodayContext = createContext<DateStr | null>(null);

export function TodayProvider({
  children,
  override,
}: {
  children: ReactNode;
  override?: DateStr | null;
}) {
  const [today, setToday] = useState<DateStr>(() => override ?? localToday());

  useEffect(() => {
    if (override) {
      setToday(override);
      return;
    }
    // Roll over at midnight and when the app comes back to the foreground.
    const tick = () =>
      setToday((prev) => {
        const now = localToday();
        return now === prev ? prev : now;
      });
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [override]);

  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

export function useToday(): DateStr {
  const ctx = useContext(TodayContext);
  if (!ctx) throw new Error('useToday must be used inside TodayProvider');
  return ctx;
}
