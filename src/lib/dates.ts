/**
 * Calendar-date helpers. Every value is a local `YYYY-MM-DD` string; no timezones, no timestamps.
 * Arithmetic goes through UTC midnight so DST shifts can never move a day.
 */
import type { DateStr } from '@/domain/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function parts(s: DateStr): [number, number, number] {
  const m = DATE_RE.exec(s);
  if (!m) throw new Error(`Invalid date: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toUtcMs(s: DateStr): number {
  const [y, m, d] = parts(s);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DateStr {
  const dt = new Date(ms);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function ymd(year: number, month: number, day: number): DateStr {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The device's local calendar date. */
export function localToday(now: Date = new Date()): DateStr {
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDays(s: DateStr, n: number): DateStr {
  return fromUtcMs(toUtcMs(s) + n * DAY_MS);
}

/** Whole days from `a` to `b` (b − a). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function yearOf(s: DateStr): number {
  return parts(s)[0];
}

/** `YYYY-MM` */
export type MonthKey = string;

export function monthKey(s: DateStr): MonthKey {
  return s.slice(0, 7);
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

export function inMonth(s: DateStr | null | undefined, key: MonthKey): boolean {
  return !!s && s.startsWith(key);
}

/** "2 Oct" */
export function formatShort(s: DateStr | null | undefined): string {
  if (!s) return '';
  const [, m, d] = parts(s);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2 Oct 2026" */
export function formatWithYear(s: DateStr): string {
  const [y] = parts(s);
  return `${formatShort(s)} ${y}`;
}

/** "Friday, 2 October" */
export function formatLong(s: DateStr): string {
  const [, m, d] = parts(s);
  const weekday = WEEKDAYS[new Date(toUtcMs(s)).getUTCDay()];
  return `${weekday}, ${d} ${MONTHS_LONG[m - 1]}`;
}

/** "Oct" */
export function monthShort(key: MonthKey): string {
  return MONTHS[Number(key.slice(5, 7)) - 1] ?? '';
}

/** "October" */
export function monthLong(key: MonthKey): string {
  return MONTHS_LONG[Number(key.slice(5, 7)) - 1] ?? '';
}

/** "Oct 2026" */
export function monthLabel(key: MonthKey): string {
  return `${monthShort(key)} ${key.slice(0, 4)}`;
}

/**
 * Today / Tomorrow / Yesterday / In N days (2–6) / N days ago, then "2 Oct".
 */
export function relativeDay(s: DateStr | null | undefined, today: DateStr): string {
  if (!s) return '';
  const n = diffDays(today, s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `In ${n} days`;
  if (n < -1 && n > -7) return `${-n} days ago`;
  return formatShort(s);
}

/** Lower-cased variant for use mid-sentence: "in 4 days", "today", "2 Oct". */
export function relativeDayInline(s: DateStr | null | undefined, today: DateStr): string {
  const r = relativeDay(s, today);
  return /^\d/.test(r) ? r : r.charAt(0).toLowerCase() + r.slice(1);
}
