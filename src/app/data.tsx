import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { db } from '@/db/db';
import { getSettings } from '@/db/repo';
import { defaultSettings } from '@/db/settings';
import { buildIndex, type DataIndex } from '@/domain/dataIndex';
import type { Settings } from '@/domain/types';
import { yearOf } from '@/lib/dates';
import { useToday } from './today';

interface AppData {
  /** False until the first live query resolves; screens render skeletons meanwhile. */
  ready: boolean;
  index: DataIndex;
  settings: Settings;
}

const DataContext = createContext<AppData | null>(null);

/**
 * One live query over every table. Dexie re-runs it after any write, so each screen
 * sees the same consistent snapshot and derivations are memoised once per change.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const result = useLiveQuery(async () => {
    const [collabs, invoices, rights, activity, settings] = await Promise.all([
      db.collabs.toArray(),
      db.invoices.toArray(),
      db.rights.toArray(),
      db.activity.toArray(),
      db.settings.get('app'),
    ]);
    return { data: { collabs, invoices, rights, activity }, settings };
  });

  useEffect(() => {
    void getSettings(yearOf(today));
  }, [today]);

  const value = useMemo<AppData>(() => {
    const fallback = defaultSettings(yearOf(today));
    if (!result) {
      return {
        ready: false,
        index: buildIndex({ collabs: [], invoices: [], rights: [], activity: [] }),
        settings: fallback,
      };
    }
    return { ready: true, index: buildIndex(result.data), settings: result.settings ?? fallback };
  }, [result, today]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useAppData must be used inside DataProvider');
  return ctx;
}
