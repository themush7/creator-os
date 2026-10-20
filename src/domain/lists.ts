/**
 * List derivations for the Collabs, Payments and Rights tabs: filters, search, grouping.
 */
import { sum } from '@/lib/money';
import type { DataIndex } from './dataIndex';
import { invoicesOf } from './dataIndex';
import { COMPLETE, CONFIRMED, DELIVERED, EDITING } from './stages';
import {
  collabPaymentStatus,
  invoiceRemaining,
  invoiceSettled,
  invoiceStatus,
  rightsEndOn,
  rightsStatus,
  type InvoiceStatus,
} from './status';
import type { Collab, DateStr, Invoice, RightsPeriod } from './types';

// ─── Collabs ─────────────────────────────────────────────────────────────────

export const COLLAB_FILTERS = [
  'Active',
  'All',
  'Leads',
  'In progress',
  'Delivered',
  'Paid',
  'Archived',
] as const;
export type CollabFilter = (typeof COLLAB_FILTERS)[number];

export function collabMatchesFilter(
  c: Collab,
  filter: CollabFilter,
  index: DataIndex,
  today: DateStr,
): boolean {
  if (filter === 'Archived') return c.archived;
  if (c.archived) return false;
  switch (filter) {
    case 'Active':
      return c.stage < COMPLETE;
    case 'All':
      return true;
    case 'Leads':
      return c.stage < CONFIRMED;
    case 'In progress':
      return c.stage >= CONFIRMED && c.stage <= EDITING;
    case 'Delivered':
      return c.stage >= DELIVERED && collabPaymentStatus(invoicesOf(index, c.id), today) !== 'Paid';
    case 'Paid':
      return collabPaymentStatus(invoicesOf(index, c.id), today) === 'Paid';
  }
}

/** Lower-case, accents stripped: "Café" matches "cafe". */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function collabMatchesQuery(c: Collab, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(`${c.brand} ${c.campaign}`).includes(q);
}

/** Soonest next action first; undated last; then by brand. */
export function compareByNextDue(a: Collab, b: Collab): number {
  if (a.nextDue !== b.nextDue) {
    if (!a.nextDue) return 1;
    if (!b.nextDue) return -1;
    return a.nextDue.localeCompare(b.nextDue);
  }
  return a.brand.localeCompare(b.brand);
}

export function filterCollabs(
  index: DataIndex,
  filter: CollabFilter,
  query: string,
  today: DateStr,
): Collab[] {
  return index.data.collabs
    .filter((c) => collabMatchesFilter(c, filter, index, today) && collabMatchesQuery(c, query))
    .sort(compareByNextDue);
}

export function collabFilterCounts(index: DataIndex, today: DateStr): Record<CollabFilter, number> {
  const counts = Object.fromEntries(COLLAB_FILTERS.map((f) => [f, 0])) as Record<
    CollabFilter,
    number
  >;
  for (const c of index.data.collabs) {
    for (const f of COLLAB_FILTERS) if (collabMatchesFilter(c, f, index, today)) counts[f]++;
  }
  return counts;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const PAYMENT_FILTERS = ['All', 'Overdue', 'Due soon', 'Part-paid', 'Paid'] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export type PaymentGroupTitle = InvoiceStatus | 'Not invoiced';

export type PaymentRow =
  | { kind: 'invoice'; invoice: Invoice; collab: Collab | undefined; status: InvoiceStatus }
  | { kind: 'not-invoiced'; collab: Collab };

export interface PaymentGroup {
  title: PaymentGroupTitle;
  /** Open amount for unpaid groups, paid amount for Paid, agreed fees for Not invoiced. */
  total: number;
  rows: PaymentRow[];
}

const GROUP_ORDER: PaymentGroupTitle[] = [
  'Overdue',
  'Due soon',
  'Not invoiced',
  'Part-paid',
  'Invoiced',
  'Paid',
];

/** Collabs delivered (stage ≥ 8) that have no invoice yet. */
export function notInvoicedCollabs(index: DataIndex): Collab[] {
  return index.data.collabs
    .filter((c) => !c.archived && c.stage >= DELIVERED && invoicesOf(index, c.id).length === 0)
    .sort(compareByNextDue);
}

export function groupPayments(
  index: DataIndex,
  filter: PaymentFilter,
  today: DateStr,
): PaymentGroup[] {
  const byStatus = new Map<InvoiceStatus, Invoice[]>();
  for (const inv of index.data.invoices) {
    const s = invoiceStatus(inv, today);
    byStatus.set(s, [...(byStatus.get(s) ?? []), inv]);
  }

  const groups: PaymentGroup[] = [];
  for (const title of GROUP_ORDER) {
    if (filter !== 'All' && title !== filter) continue;
    if (title === 'Not invoiced') {
      const collabs = notInvoicedCollabs(index);
      if (collabs.length)
        groups.push({
          title,
          total: sum(collabs.map((c) => c.fee ?? 0)),
          rows: collabs.map((collab) => ({ kind: 'not-invoiced', collab })),
        });
      continue;
    }
    const invoices = (byStatus.get(title) ?? []).sort((a, b) =>
      title === 'Paid'
        ? lastPaidOn(b).localeCompare(lastPaidOn(a))
        : a.dueOn.localeCompare(b.dueOn),
    );
    if (!invoices.length) continue;
    groups.push({
      title,
      total: sum(invoices.map((i) => (title === 'Paid' ? invoiceSettled(i) : invoiceRemaining(i)))),
      rows: invoices.map((invoice) => ({
        kind: 'invoice',
        invoice,
        collab: index.collabById.get(invoice.collabId),
        status: title,
      })),
    });
  }
  return groups;
}

export function paymentFilterCounts(
  index: DataIndex,
  today: DateStr,
): Record<PaymentFilter, number> {
  const counts: Record<PaymentFilter, number> = {
    All: index.data.invoices.length,
    Overdue: 0,
    'Due soon': 0,
    'Part-paid': 0,
    Paid: 0,
  };
  for (const inv of index.data.invoices) {
    const s = invoiceStatus(inv, today);
    if (s !== 'Invoiced') counts[s]++;
  }
  return counts;
}

export function lastPaidOn(inv: Invoice): DateStr {
  return inv.payments.reduce((latest, p) => (p.on > latest ? p.on : latest), '');
}

// ─── Rights ──────────────────────────────────────────────────────────────────

export const RIGHTS_GROUP_ORDER = [
  'Expiring soon',
  'Extension pending',
  'Active',
  'Expired',
] as const;
export type RightsGroupTitle = (typeof RIGHTS_GROUP_ORDER)[number];

export interface RightsGroup {
  title: RightsGroupTitle;
  rows: { period: RightsPeriod; collab: Collab | undefined }[];
}

/** Superseded periods are hidden; each group is ordered by end date. */
export function groupRights(index: DataIndex, today: DateStr): RightsGroup[] {
  const groups: RightsGroup[] = [];
  for (const title of RIGHTS_GROUP_ORDER) {
    const rows = index.data.rights
      .filter((p) => !p.supersededBy && rightsStatus(p, today) === title)
      .sort((a, b) =>
        title === 'Expired'
          ? rightsEndOn(b).localeCompare(rightsEndOn(a))
          : rightsEndOn(a).localeCompare(rightsEndOn(b)),
      )
      .map((period) => ({ period, collab: index.collabById.get(period.collabId) }));
    if (rows.length) groups.push({ title, rows });
  }
  return groups;
}
