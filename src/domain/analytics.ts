/**
 * Money figures. All pure, all by calendar month (`YYYY-MM`).
 *
 * - Booked (M): fees of collabs whose `bookedOn` is in M, plus rights-extension invoices issued in M.
 * - Received (M): cash payments dated in M. TDS is reported separately and is not cash.
 * - Outstanding: everything still owed across all invoices, as of today.
 * - Rights revenue (M): extension invoices issued in M (already part of Booked).
 */
import { addMonths, inMonth, monthKey, type MonthKey } from '@/lib/dates';
import { sum } from '@/lib/money';
import { invoiceRemaining, invoiceStatus } from './status';
import type { DataSet, DateStr } from './types';

export function bookedIn(data: DataSet, month: MonthKey): number {
  const fees = sum(data.collabs.filter((c) => inMonth(c.bookedOn, month)).map((c) => c.fee ?? 0));
  return fees + rightsRevenueIn(data, month);
}

export function rightsRevenueIn(data: DataSet, month: MonthKey): number {
  return sum(
    data.invoices
      .filter((i) => i.kind === 'Rights extension' && inMonth(i.issuedOn, month))
      .map((i) => i.amount),
  );
}

export function receivedIn(data: DataSet, month: MonthKey): number {
  return sum(
    data.invoices.flatMap((i) =>
      i.payments.filter((p) => inMonth(p.on, month)).map((p) => p.amount),
    ),
  );
}

export function tdsIn(data: DataSet, month: MonthKey): number {
  return sum(
    data.invoices.flatMap((i) =>
      i.payments.filter((p) => inMonth(p.on, month)).map((p) => p.tds ?? 0),
    ),
  );
}

export function outstanding(data: DataSet): number {
  return sum(data.invoices.map(invoiceRemaining));
}

export function overdueTotal(data: DataSet, today: DateStr): number {
  return sum(
    data.invoices.filter((i) => invoiceStatus(i, today) === 'Overdue').map(invoiceRemaining),
  );
}

export interface TrendMonth {
  month: MonthKey;
  booked: number;
  received: number;
}

/** Booked vs received for the current month and the five before it, oldest first. */
export function sixMonthTrend(data: DataSet, today: DateStr): TrendMonth[] {
  const current = monthKey(today);
  return Array.from({ length: 6 }, (_, i) => {
    const month = addMonths(current, i - 5);
    return { month, booked: bookedIn(data, month), received: receivedIn(data, month) };
  });
}

export interface MonthSummary {
  month: MonthKey;
  booked: number;
  received: number;
  tds: number;
  outstanding: number;
  rightsRevenue: number;
}

export function monthSummary(data: DataSet, month: MonthKey): MonthSummary {
  return {
    month,
    booked: bookedIn(data, month),
    received: receivedIn(data, month),
    tds: tdsIn(data, month),
    outstanding: outstanding(data),
    rightsRevenue: rightsRevenueIn(data, month),
  };
}
