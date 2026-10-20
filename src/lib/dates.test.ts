import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  formatLong,
  formatShort,
  isDateStr,
  monthKey,
  relativeDay,
  relativeDayInline,
} from './dates';

describe('dates', () => {
  it('validates calendar dates', () => {
    expect(isDateStr('2026-10-02')).toBe(true);
    expect(isDateStr('2026-02-30')).toBe(false);
    expect(isDateStr('2026-10-2')).toBe(false);
    expect(isDateStr(null)).toBe(false);
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-09-05', 29)).toBe('2026-10-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is unaffected by DST transitions', () => {
    // Europe/US DST change weekends; whole-day arithmetic must still be exact.
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('diffs whole days', () => {
    expect(diffDays('2026-10-02', '2026-10-04')).toBe(2);
    expect(diffDays('2026-10-02', '2026-09-24')).toBe(-8);
  });

  it('formats', () => {
    expect(formatShort('2026-10-02')).toBe('2 Oct');
    expect(formatShort(null)).toBe('');
    expect(formatLong('2026-10-02')).toBe('Friday, 2 October');
  });

  it('months', () => {
    expect(monthKey('2026-10-02')).toBe('2026-10');
    expect(addMonths('2026-10', -5)).toBe('2026-05');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });

  it('relative days', () => {
    const t = '2026-10-02';
    expect(relativeDay('2026-10-02', t)).toBe('Today');
    expect(relativeDay('2026-10-03', t)).toBe('Tomorrow');
    expect(relativeDay('2026-10-01', t)).toBe('Yesterday');
    expect(relativeDay('2026-10-06', t)).toBe('In 4 days');
    expect(relativeDay('2026-09-28', t)).toBe('4 days ago');
    expect(relativeDay('2026-10-09', t)).toBe('9 Oct');
    expect(relativeDay('2026-09-24', t)).toBe('24 Sep');
    expect(relativeDayInline('2026-10-06', t)).toBe('in 4 days');
    expect(relativeDayInline('2026-10-09', t)).toBe('9 Oct');
  });
});
