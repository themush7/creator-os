import type { Settings } from '@/domain/types';
import { nowIso } from '@/lib/ids';

export const DEFAULT_INVOICE_PREFIX = 'INV-{YYYY}-';

export function defaultSettings(year: number): Settings {
  return {
    id: 'app',
    name: '',
    defaultRightsDays: 30,
    defaultPaymentDays: 30,
    invoicePrefix: DEFAULT_INVOICE_PREFIX,
    invoiceNext: 1,
    invoiceYear: year,
    lastBackupOn: null,
    persistGranted: null,
    sheetSync: {
      enabled: false,
      url: '',
      key: '',
      sheetUrl: '',
      lastSyncedAt: null,
      lastError: null,
      dirty: false,
    },
    updatedAt: nowIso(),
  };
}
