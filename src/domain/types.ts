/** Calendar date, local time: `YYYY-MM-DD`. Business dates are never timestamps. */
export type DateStr = string;
/** ISO timestamp. Used only for sync/merge bookkeeping (`createdAt`, `updatedAt`). */
export type IsoTimestamp = string;

export const OWNERS = ['You', 'Brand', 'Scheduled', 'Clear'] as const;
export type Owner = (typeof OWNERS)[number];

export const INVOICE_KINDS = ['Content fee', 'Advance', 'Balance', 'Rights extension'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const PLATFORMS = ['Instagram', 'YouTube', 'Meta ads'] as const;
export type Platform = (typeof PLATFORMS)[number] | (string & {});

export interface Collab {
  id: string;
  brand: string;
  campaign: string;
  /** Agreed fee in whole rupees. */
  fee: number | null;
  /** 0..10, see `STAGES`. */
  stage: number;
  owner: Owner;
  nextAction: string;
  nextDue: DateStr | null;
  /** Set automatically the first time stage reaches Confirmed (2) or later. */
  bookedOn: DateStr | null;
  contact: string;
  deliverables: string;
  usageTerms: string;
  productStatus: string;
  shootDate: DateStr | null;
  deliveredOn: DateStr | null;
  links: string;
  conceptNotes: string;
  goLiveOn: DateStr | null;
  archived: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Payment {
  id: string;
  on: DateStr;
  /** Cash received, whole rupees. */
  amount: number;
  /** TDS the brand deducted against this payment. Counts toward settling the invoice, not toward cash received. */
  tds?: number;
  note?: string;
}

export interface Invoice {
  id: string;
  collabId: string;
  number: string;
  kind: InvoiceKind;
  amount: number;
  issuedOn: DateStr;
  dueOn: DateStr;
  followUpOn: DateStr | null;
  payments: Payment[];
  rightsPeriodId?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface RightsPeriod {
  id: string;
  collabId: string;
  platform: Platform;
  startOn: DateStr;
  days: number;
  isExtension: boolean;
  extensionPending: boolean;
  supersededBy?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface ActivityEntry {
  id: string;
  collabId: string;
  on: DateStr;
  text: string;
  kind: 'auto' | 'note';
  createdAt: IsoTimestamp;
}

export interface SheetSyncSettings {
  enabled: boolean;
  /** Apps Script web app URL (`https://script.google.com/macros/s/.../exec`). */
  url: string;
  /** Shared secret the script checks before writing. */
  key: string;
  /** Link to the spreadsheet itself, for the "Open sheet" shortcut. */
  sheetUrl: string;
  lastSyncedAt: IsoTimestamp | null;
  lastError: string | null;
  /** True when local data changed after the last successful push. */
  dirty: boolean;
  /** Stamped by every change. A push only clears `dirty` if this has not moved since it started. */
  changedAt?: IsoTimestamp | null;
}

export interface Settings {
  id: 'app';
  name: string;
  defaultRightsDays: number;
  defaultPaymentDays: number;
  /** `{YYYY}` is replaced with the invoice year. */
  invoicePrefix: string;
  /** Next sequence number for `invoiceYear`. Resets to 1 when the year rolls over. */
  invoiceNext: number;
  invoiceYear: number;
  lastBackupOn: DateStr | null;
  persistGranted: boolean | null;
  sheetSync: SheetSyncSettings;
  updatedAt: IsoTimestamp;
}

export interface DataSet {
  collabs: Collab[];
  invoices: Invoice[];
  rights: RightsPeriod[];
  activity: ActivityEntry[];
}
