/**
 * Invoice numbers: `{prefix}{NNN}`, where the prefix may contain `{YYYY}`.
 * The sequence restarts at 001 when the year rolls over, and never reuses a number
 * that already exists for that year.
 */
import { yearOf } from '@/lib/dates';
import type { DateStr, Invoice, Settings } from './types';

export function renderPrefix(prefix: string, year: number): string {
  return prefix.replaceAll('{YYYY}', String(year));
}

export function formatInvoiceNumber(prefix: string, year: number, n: number): string {
  return `${renderPrefix(prefix, year)}${String(n).padStart(3, '0')}`;
}

/** The sequence number of `number` if it was issued under `prefix` in `year`, else null. */
export function parseSequence(number: string, prefix: string, year: number): number | null {
  const p = renderPrefix(prefix, year);
  if (!number.startsWith(p)) return null;
  const rest = number.slice(p.length);
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

export interface NextNumber {
  number: string;
  year: number;
  sequence: number;
}

export function nextInvoiceNumber(
  settings: Pick<Settings, 'invoicePrefix' | 'invoiceNext' | 'invoiceYear'>,
  invoices: readonly Pick<Invoice, 'number'>[],
  today: DateStr,
): NextNumber {
  const year = yearOf(today);
  const counter = settings.invoiceYear === year ? settings.invoiceNext : 1;
  const used = invoices
    .map((i) => parseSequence(i.number, settings.invoicePrefix, year))
    .filter((n): n is number => n !== null);
  const sequence = Math.max(counter, used.length ? Math.max(...used) + 1 : 1);
  return { number: formatInvoiceNumber(settings.invoicePrefix, year, sequence), year, sequence };
}

/** Counter state after issuing `number` (which the person may have edited). */
export function advanceCounter(
  settings: Pick<Settings, 'invoicePrefix' | 'invoiceNext' | 'invoiceYear'>,
  issued: string,
  today: DateStr,
): Pick<Settings, 'invoiceNext' | 'invoiceYear'> {
  const year = yearOf(today);
  const base = settings.invoiceYear === year ? settings.invoiceNext : 1;
  const seq = parseSequence(issued, settings.invoicePrefix, year);
  return { invoiceYear: year, invoiceNext: Math.max(base, seq !== null ? seq + 1 : base) };
}
