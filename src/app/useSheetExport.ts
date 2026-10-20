import { useCallback, useState } from 'react';
import { useToast } from '@/components/Toast';
import { db } from '@/db/db';
import { runSync } from '@/lib/sheetSync';
import { useToday } from './today';

/** "Export to Google Sheet": sends everything now, whatever the automatic setting. */
export function useSheetExport() {
  const today = useToday();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const exportNow = useCallback(async () => {
    if (exporting) return;
    if (!navigator.onLine) {
      toast.show('You are offline. Export when you are connected.');
      return;
    }
    setExporting(true);
    toast.show('Exporting to your Sheet…', { duration: Infinity });
    const outcome = await runSync(db, today, undefined, { manual: true });
    setExporting(false);
    const s = (await db.settings.get('app'))?.sheetSync;
    if (outcome === 'synced') toast.show('Exported to your Google Sheet.');
    else if (outcome === 'failed') toast.show(s?.lastError ?? 'Export failed.');
    else toast.show('Add the Web app URL in Settings first.');
  }, [exporting, today, toast]);

  return { exportNow, exporting };
}
