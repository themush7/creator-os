/**
 * One-way mirror to a Google Sheet through a small Apps Script web app.
 * The phone stays the source of truth: each push rewrites readable tabs in full.
 */
import type { CreatorDb } from '@/db/db';
import { buildIndex, invoicesOf, rightsOf, type DataIndex } from '@/domain/dataIndex';
import { stageName } from '@/domain/stages';
import {
  collabPaymentStatus,
  collabRightsStatus,
  currentRightsPeriod,
  invoiceCash,
  invoiceRemaining,
  invoiceStatus,
  invoiceTds,
  rightsDaysLeft,
  rightsEndOn,
  rightsStatus,
} from '@/domain/status';
import type { DateStr, Settings } from '@/domain/types';
import { sum } from './money';
import { readAll } from '@/db/repo';

export type Cell = string | number;
export type Rows = Cell[][];

export interface SheetPayload {
  key: string;
  app: 'creator-os';
  syncedAt: string;
  today: DateStr;
  tabs: Record<'Collabs' | 'Invoices' | 'Rights' | 'Activity', Rows>;
}

const d = (s: string | null | undefined): string => s ?? '';

/** Human-readable tabs. Columns with ₹ hold whole rupees. */
export function buildSheetTabs(index: DataIndex, today: DateStr): SheetPayload['tabs'] {
  const { collabs, invoices, rights, activity } = index.data;
  const byCollab = index.collabById;

  const collabRows: Rows = [
    [
      'Brand',
      'Campaign',
      'Stage',
      'Stage no.',
      'Owner',
      'Next action',
      'Next due',
      'Fee (₹)',
      'Payment',
      'Outstanding (₹)',
      'Rights',
      'Rights end',
      'Booked on',
      'Delivered on',
      'Go-live',
      'Contact',
      'Deliverables',
      'Usage',
      'Archived',
      'Updated',
    ],
    ...[...collabs]
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.campaign.localeCompare(b.campaign))
      .map((c) => {
        const invs = invoicesOf(index, c.id);
        const periods = rightsOf(index, c.id);
        const current = currentRightsPeriod(periods);
        return [
          c.brand,
          c.campaign,
          stageName(c.stage),
          c.stage + 1,
          c.owner,
          c.nextAction,
          d(c.nextDue),
          c.fee ?? '',
          collabPaymentStatus(invs, today),
          sum(invs.map(invoiceRemaining)),
          collabRightsStatus(periods, today),
          current ? rightsEndOn(current) : '',
          d(c.bookedOn),
          d(c.deliveredOn),
          d(c.goLiveOn),
          c.contact,
          c.deliverables,
          c.usageTerms,
          c.archived ? 'Yes' : '',
          c.updatedAt.slice(0, 10),
        ];
      }),
  ];

  const invoiceRows: Rows = [
    [
      'Number',
      'Brand',
      'Campaign',
      'Kind',
      'Amount (₹)',
      'Received (₹)',
      'TDS (₹)',
      'Outstanding (₹)',
      'Status',
      'Issued',
      'Due',
      'Follow up',
      'Last paid',
    ],
    ...[...invoices]
      .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number))
      .map((i) => {
        const c = byCollab.get(i.collabId);
        const lastPaid = i.payments.reduce((m, p) => (p.on > m ? p.on : m), '');
        return [
          i.number,
          c?.brand ?? '',
          c?.campaign ?? '',
          i.kind,
          i.amount,
          invoiceCash(i),
          invoiceTds(i),
          invoiceRemaining(i),
          invoiceStatus(i, today),
          i.issuedOn,
          i.dueOn,
          d(i.followUpOn),
          lastPaid,
        ];
      }),
  ];

  const rightsRows: Rows = [
    ['Brand', 'Campaign', 'Platform', 'Start', 'End', 'Days', 'Days left', 'Status', 'Extension'],
    ...[...rights]
      .sort((a, b) => b.startOn.localeCompare(a.startOn))
      .map((p) => {
        const c = byCollab.get(p.collabId);
        return [
          c?.brand ?? '',
          c?.campaign ?? '',
          p.platform,
          p.startOn,
          rightsEndOn(p),
          p.days,
          rightsDaysLeft(p, today),
          rightsStatus(p, today),
          p.isExtension ? 'Yes' : '',
        ];
      }),
  ];

  const activityRows: Rows = [
    ['Date', 'Brand', 'Campaign', 'Kind', 'Entry'],
    ...[...activity]
      .sort((a, b) => b.on.localeCompare(a.on) || b.createdAt.localeCompare(a.createdAt))
      .map((a) => {
        const c = byCollab.get(a.collabId);
        return [
          a.on,
          c?.brand ?? '',
          c?.campaign ?? '',
          a.kind === 'note' ? 'Note' : 'Update',
          a.text,
        ];
      }),
  ];

  return { Collabs: collabRows, Invoices: invoiceRows, Rights: rightsRows, Activity: activityRows };
}

export function isAppsScriptUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(url.trim());
}

/** 24 random characters, safe to paste anywhere. */
export function generateKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const TIMEOUT_MS = 25_000;

async function call(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.trim(), { ...init, redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`The script answered ${res.status}.`);
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(
        'The script did not answer. Check it is deployed as a web app with access for anyone.',
      );
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError')
      throw new Error('The Sheet took too long to answer.');
    if (e instanceof TypeError)
      throw new Error('Could not reach the Sheet. Check the URL and your connection.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function testConnection(url: string): Promise<{ paired: boolean }> {
  if (!isAppsScriptUrl(url))
    throw new Error('That is not an Apps Script web app URL (it ends in /exec).');
  const r = await call(url);
  if (r.app !== 'creator-os-sheet') throw new Error('That URL is not the Creator OS script.');
  return { paired: r.paired === true };
}

export async function pushPayload(url: string, payload: SheetPayload): Promise<void> {
  // text/plain keeps this a "simple" request: no CORS preflight, which Apps Script cannot answer.
  const r = await call(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (r.ok !== true)
    throw new Error(typeof r.error === 'string' ? r.error : 'The Sheet refused the update.');
}

export type SyncOutcome = 'synced' | 'skipped' | 'failed';

/**
 * Sends everything to the Sheet.
 * - Automatic (default): only when automatic updates are on and something changed.
 * - `manual: true` (the Export button): whenever a URL is set; creates the pairing key if needed.
 * `dirty` is only cleared when nothing changed while the push was in flight, so an edit made
 * mid-push is never lost.
 */
export async function runSync(
  db: CreatorDb,
  today: DateStr,
  push: typeof pushPayload = pushPayload,
  options: { manual?: boolean } = {},
): Promise<SyncOutcome> {
  const { data, settings } = await readAll(db);
  let s = settings.sheetSync;
  if (!s.url) return 'skipped';
  if (!options.manual && (!s.enabled || !s.dirty || !s.key)) return 'skipped';
  if (!isAppsScriptUrl(s.url)) {
    const msg = /docs\.google\.com\/spreadsheets/.test(s.url)
      ? 'That is the Sheet link. Paste the Web app URL from Deploy → Manage deployments instead (it ends in /exec).'
      : 'The Web app URL should start with https://script.google.com/macros/s/ and end in /exec.';
    await patchSync(db, { lastError: msg });
    return 'failed';
  }
  if (!s.key) {
    s = { ...s, key: generateKey() };
    await patchSync(db, { key: s.key });
  }
  const stamp = s.changedAt ?? null;
  const payload: SheetPayload = {
    key: s.key,
    app: 'creator-os',
    syncedAt: new Date().toISOString(),
    today,
    tabs: buildSheetTabs(buildIndex(data), today),
  };
  try {
    await push(s.url, payload);
  } catch (e) {
    await patchSync(db, { lastError: e instanceof Error ? e.message : 'Export failed.' });
    return 'failed';
  }
  await db.transaction('rw', db.settings, async () => {
    const now = await db.settings.get('app');
    if (!now) return;
    const unchanged = (now.sheetSync.changedAt ?? null) === stamp;
    await db.settings.put({
      ...now,
      sheetSync: {
        ...now.sheetSync,
        dirty: unchanged ? false : now.sheetSync.dirty,
        lastSyncedAt: payload.syncedAt,
        lastError: null,
      },
    });
  });
  return 'synced';
}

async function patchSync(db: CreatorDb, patch: Partial<Settings['sheetSync']>) {
  await db.transaction('rw', db.settings, async () => {
    const s = await db.settings.get('app');
    if (s) await db.settings.put({ ...s, sheetSync: { ...s.sheetSync, ...patch } });
  });
}
