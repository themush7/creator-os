/**
 * Pure status derivations. Every function takes `today` explicitly so results are
 * deterministic; components never compute a status inline.
 */
import { addDays, diffDays } from '@/lib/dates';
import { sum } from '@/lib/money';
import { COMPLETE } from './stages';
import type { Collab, DateStr, Invoice, RightsPeriod } from './types';

// ─── Invoices ────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = ['Paid', 'Overdue', 'Part-paid', 'Due soon', 'Invoiced'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentStatus = InvoiceStatus | 'Not invoiced';

/** Days before the due date at which an invoice counts as "Due soon". */
export const DUE_SOON_DAYS = 7;

/** Cash received against the invoice. */
export function invoiceCash(inv: Invoice): number {
  return sum(inv.payments.map((p) => p.amount));
}

/** TDS deducted by the brand against the invoice. */
export function invoiceTds(inv: Invoice): number {
  return sum(inv.payments.map((p) => p.tds ?? 0));
}

/** What counts toward settling the invoice: cash plus TDS. */
export function invoiceSettled(inv: Invoice): number {
  return invoiceCash(inv) + invoiceTds(inv);
}

export function invoiceRemaining(inv: Invoice): number {
  return Math.max(0, inv.amount - invoiceSettled(inv));
}

/** 0..1, clamped (an overpayment reads as fully paid). */
export function invoiceProgress(inv: Invoice): number {
  return inv.amount > 0 ? Math.min(1, invoiceSettled(inv) / inv.amount) : 1;
}

/**
 * Paid → Overdue → Part-paid → Due soon → Invoiced, checked in that order.
 * Due today is Due soon; due yesterday is Overdue.
 */
export function invoiceStatus(inv: Invoice, today: DateStr): InvoiceStatus {
  const settled = invoiceSettled(inv);
  if (settled >= inv.amount) return 'Paid';
  const daysToDue = diffDays(today, inv.dueOn);
  if (daysToDue < 0) return 'Overdue';
  if (settled > 0) return 'Part-paid';
  if (daysToDue <= DUE_SOON_DAYS) return 'Due soon';
  return 'Invoiced';
}

export function isUnpaid(inv: Invoice): boolean {
  return invoiceRemaining(inv) > 0;
}

/** Most severe first. */
const PAYMENT_SEVERITY: InvoiceStatus[] = ['Overdue', 'Due soon', 'Part-paid', 'Invoiced', 'Paid'];

/** The most severe status among a collab's invoices, or "Not invoiced". */
export function collabPaymentStatus(invoices: readonly Invoice[], today: DateStr): PaymentStatus {
  if (!invoices.length) return 'Not invoiced';
  const statuses = new Set(invoices.map((i) => invoiceStatus(i, today)));
  return PAYMENT_SEVERITY.find((s) => statuses.has(s)) ?? 'Paid';
}

// ─── Rights ──────────────────────────────────────────────────────────────────

export const RIGHTS_STATUSES = [
  'Extended',
  'Extension pending',
  'Expired',
  'Expiring soon',
  'Active',
] as const;
export type RightsStatus = (typeof RIGHTS_STATUSES)[number] | 'Not live';

export const EXPIRING_SOON_DAYS = 7;

/** Inclusive last day: a 30-day period from 5 Sep ends on 4 Oct. */
export function rightsEndOn(p: RightsPeriod): DateStr {
  return addDays(p.startOn, p.days - 1);
}

/**
 * Days left, counting today. A period that ends today has 1 day left; the day after, 0.
 * This single definition is used by Home, the Rights tab and the detail screen.
 */
export function rightsDaysLeft(p: RightsPeriod, today: DateStr): number {
  return Math.max(0, diffDays(today, rightsEndOn(p)) + 1);
}

/** 0..1 share of the window already used. */
export function rightsElapsed(p: RightsPeriod, today: DateStr): number {
  const used = p.days - rightsDaysLeft(p, today);
  return Math.min(1, Math.max(0, used / p.days));
}

/** True once the last day has passed, whatever the status (a pending extension can be on an ended period). */
export function rightsEnded(p: RightsPeriod, today: DateStr): boolean {
  return diffDays(rightsEndOn(p), today) > 0;
}

export function rightsStarted(p: RightsPeriod, today: DateStr): boolean {
  return diffDays(p.startOn, today) >= 0;
}

/** Extended → Extension pending → Expired → Expiring soon → Active. */
export function rightsStatus(p: RightsPeriod, today: DateStr): Exclude<RightsStatus, 'Not live'> {
  if (p.supersededBy) return 'Extended';
  if (p.extensionPending) return 'Extension pending';
  if (rightsEnded(p, today)) return 'Expired';
  if (rightsDaysLeft(p, today) <= EXPIRING_SOON_DAYS) return 'Expiring soon';
  return 'Active';
}

/** The period that currently describes a collab: the latest one that has not been superseded. */
export function currentRightsPeriod(periods: readonly RightsPeriod[]): RightsPeriod | null {
  const live = periods.filter((p) => !p.supersededBy);
  if (!live.length) return null;
  return live.reduce((a, b) => (b.startOn > a.startOn ? b : a));
}

export function collabRightsStatus(periods: readonly RightsPeriod[], today: DateStr): RightsStatus {
  const current = currentRightsPeriod(periods);
  return current ? rightsStatus(current, today) : 'Not live';
}

/**
 * An extension starts the day after the current period ends, or today if that period
 * has already expired (so no days are lost to the gap).
 */
export function extensionStartOn(p: RightsPeriod, today: DateStr): DateStr {
  const end = rightsEndOn(p);
  return diffDays(today, end) >= 0 ? addDays(end, 1) : today;
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export function isActiveCollab(c: Collab): boolean {
  return !c.archived && c.stage < COMPLETE;
}

/** A card's due date is highlighted when the next action is yours and overdue or due within a day. */
export function isNextDueUrgent(c: Collab, today: DateStr): boolean {
  return c.owner === 'You' && !!c.nextDue && diffDays(today, c.nextDue) <= 1;
}
