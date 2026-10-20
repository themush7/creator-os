import { useEffect, useRef } from 'react';
import { db } from '@/db/db';
import { updateSettings } from '@/domain/actions';
import { runSync } from '@/lib/sheetSync';
import { useAppData } from './data';
import { useToday } from './today';

const SYNC_DEBOUNCE_MS = 4_000;
const RETRY_MS = 60_000;

/**
 * Background chores with no UI of their own:
 * - pushes to the Google Sheet a few seconds after a change, when online, retrying while behind;
 * - asks the browser once to keep this app's storage persistent.
 */
export function BackgroundTasks() {
  useSheetSync();
  usePersistentStorage();
  return null;
}

function useSheetSync() {
  const { ready, settings } = useAppData();
  const today = useToday();
  const running = useRef(false);
  const s = settings.sheetSync;
  const due = ready && s.enabled && s.dirty && !!s.url && !!s.key;

  useEffect(() => {
    if (!due) return;
    let cancelled = false;
    const attempt = async () => {
      if (cancelled || running.current || !navigator.onLine) return;
      running.current = true;
      try {
        await runSync(db, today);
      } finally {
        running.current = false;
      }
    };
    const first = window.setTimeout(attempt, SYNC_DEBOUNCE_MS);
    const retry = window.setInterval(attempt, RETRY_MS);
    window.addEventListener('online', attempt);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(retry);
      window.removeEventListener('online', attempt);
    };
    // changedAt restarts the debounce on every edit, so a burst of edits sends one push.
  }, [due, s.changedAt, s.url, s.key, today]);
}

function usePersistentStorage() {
  const { ready, settings } = useAppData();
  const today = useToday();
  useEffect(() => {
    if (!ready || settings.persistGranted !== null) return;
    const storage = navigator.storage;
    // Missing on plain http (not a secure context); try again once the app runs on HTTPS.
    if (!storage?.persist) return;
    void (async () => {
      const granted = (await storage.persisted?.()) || (await storage.persist());
      await updateSettings({ today }, { persistGranted: granted });
    })();
  }, [ready, settings.persistGranted, today]);
}
