import { describe, expect, it } from 'vitest';
import { buildSeed, SEED_TODAY } from '@/db/seed';
import { ATTENTION_LIMIT, attentionSummary, buildAttention } from './attention';
import {
  bookedIn,
  monthSummary,
  outstanding,
  overdueTotal,
  receivedIn,
  rightsRevenueIn,
  sixMonthTrend,
  tdsIn,
} from './analytics';
import { buildIndex } from './dataIndex';
import {
  advanceCounter,
  formatInvoiceNumber,
  nextInvoiceNumber,
  parseSequence,
} from './invoiceNumber';
import {
  collabFilterCounts,
  filterCollabs,
  groupPayments,
  groupRights,
  normalizeSearch,
  paymentFilterCounts,
} from './lists';
import { rightsDaysLeft } from './status';
import type { DataSet, Invoice } from './types';

const TS = '2026-01-01T00:00:00.000Z';
const seed = buildSeed();
const index = buildIndex(seed.data);

describe('attention feed (seed, 2 Oct 2026)', () => {
  const items = buildAttention(index, SEED_TODAY);

  it('orders by weight, then urgency', () => {
    const weights = items.map((i) => i.weight);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
    expect(items[0]?.title).toBe('Kohl Coffee · invoice overdue');
    expect(items[0]?.subtitle).toBe('₹45,000 · 8 days late · follow up');
    expect(items[1]?.title).toBe('Kohl Coffee · rights end in 3 days');
  });

  it('includes your next actions and brand replies due', () => {
    const titles = items.map((i) => i.title);
    expect(titles).toContain('Mitti Home · send rate card');
    expect(titles).toContain('Tidewear · shoot lookbook');
    expect(titles).toContain('Saffa Skincare · waiting on approval');
    expect(items.find((i) => i.collabId === 'seed-saffa')?.subtitle).toBe(
      'Brand reply due tomorrow',
    );
    expect(items.find((i) => i.collabId === 'seed-mitti')?.subtitle).toBe(
      'Waiting on you · tomorrow',
    );
  });

  it('does not repeat a payment chase as a next action', () => {
    expect(items.filter((i) => i.collabId === 'seed-kohl').map((i) => i.rule)).toEqual([
      'overdue',
      'rights',
    ]);
  });

  it('skips archived collabs', () => {
    expect(items.some((i) => i.collabId === 'seed-kohl-coldbrew')).toBe(false);
  });

  it('has five items for the seed, and the limit keeps longer feeds at five', () => {
    expect(items).toHaveLength(5);
    const extra = Array.from({ length: 3 }, (_, i) => ({
      ...seed.data.collabs[0]!,
      id: `extra-${i}`,
      owner: 'You' as const,
      nextAction: 'Reply',
      nextDue: SEED_TODAY,
    }));
    const long = buildAttention(
      buildIndex({ ...seed.data, collabs: [...seed.data.collabs, ...extra] }),
      SEED_TODAY,
    );
    expect(long.length).toBe(8);
    expect(long.slice(0, ATTENTION_LIMIT).map((i) => i.weight)).toEqual([0, 1, 3, 3, 3]);
  });

  it('de-duplicates per collab and rule', () => {
    const extra: Invoice = { ...seed.data.invoices[0]!, id: 'dup', number: 'INV-2026-099' };
    const dup = buildIndex({ ...seed.data, invoices: [...seed.data.invoices, extra] });
    const kohlOverdue = buildAttention(dup, SEED_TODAY).filter(
      (i) => i.collabId === 'seed-kohl' && i.rule === 'overdue',
    );
    expect(kohlOverdue).toHaveLength(1);
  });

  it('Home and Rights agree on days left', () => {
    const kohl = seed.data.rights.find((r) => r.id === 'seed-r-kohl')!;
    const rightsRow = groupRights(index, SEED_TODAY)
      .flatMap((g) => g.rows)
      .find((r) => r.period.id === kohl.id)!;
    const n = rightsDaysLeft(rightsRow.period, SEED_TODAY);
    expect(items[1]?.title).toBe(`Kohl Coffee · rights end in ${n} days`);
  });

  it('summary line', () => {
    expect(attentionSummary(0)).toBe('All clear for today.');
    expect(attentionSummary(1)).toBe('One thing needs you today.');
    expect(attentionSummary(4)).toBe('4 things need you today.');
  });
});

describe('analytics', () => {
  function data(): DataSet {
    return {
      collabs: [
        { ...seed.data.collabs[0]!, id: 'a', fee: 100000, bookedOn: '2026-09-30' },
        { ...seed.data.collabs[0]!, id: 'b', fee: 50000, bookedOn: '2026-10-01' },
        { ...seed.data.collabs[0]!, id: 'c', fee: null, bookedOn: '2026-10-15' },
      ],
      invoices: [
        {
          id: 'i1',
          collabId: 'a',
          number: 'X1',
          kind: 'Content fee',
          amount: 100000,
          issuedOn: '2026-09-30',
          dueOn: '2026-10-30',
          followUpOn: null,
          payments: [
            { id: 'p1', on: '2026-09-30', amount: 40000 },
            { id: 'p2', on: '2026-10-01', amount: 45000, tds: 5000 },
          ],
          createdAt: TS,
          updatedAt: TS,
        },
        {
          id: 'i2',
          collabId: 'b',
          number: 'X2',
          kind: 'Rights extension',
          amount: 20000,
          issuedOn: '2026-10-31',
          dueOn: '2026-11-30',
          followUpOn: null,
          payments: [],
          createdAt: TS,
          updatedAt: TS,
        },
      ],
      rights: [],
      activity: [],
    };
  }

  it('booked counts fees by bookedOn month, plus extension invoices', () => {
    expect(bookedIn(data(), '2026-09')).toBe(100000);
    expect(bookedIn(data(), '2026-10')).toBe(50000 + 20000);
    expect(rightsRevenueIn(data(), '2026-10')).toBe(20000);
    expect(rightsRevenueIn(data(), '2026-11')).toBe(0);
  });

  it('received counts cash by payment month; TDS separately', () => {
    expect(receivedIn(data(), '2026-09')).toBe(40000);
    expect(receivedIn(data(), '2026-10')).toBe(45000);
    expect(tdsIn(data(), '2026-10')).toBe(5000);
  });

  it('outstanding sums what is still owed', () => {
    expect(outstanding(data())).toBe(10000 + 20000);
  });

  it('six-month trend ends on the current month', () => {
    const t = sixMonthTrend(data(), '2026-10-02');
    expect(t.map((m) => m.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(t.at(-1)).toEqual({ month: '2026-10', booked: 70000, received: 45000 });
    expect(sixMonthTrend(data(), '2026-02-10')[0]?.month).toBe('2025-09');
  });

  it('seed figures for October', () => {
    const s = monthSummary(seed.data, '2026-10');
    expect(s.booked).toBe(150000); // Pace Running, booked 1 Oct
    expect(s.received).toBe(50000); // Halden part-payment
    expect(s.outstanding).toBe(45000 + 45000 + 60000);
    expect(overdueTotal(seed.data, SEED_TODAY)).toBe(45000);
  });
});

describe('invoice numbers', () => {
  const settings = { invoicePrefix: 'INV-{YYYY}-', invoiceNext: 36, invoiceYear: 2026 };

  it('formats and parses', () => {
    expect(formatInvoiceNumber('INV-{YYYY}-', 2026, 7)).toBe('INV-2026-007');
    expect(parseSequence('INV-2026-035', 'INV-{YYYY}-', 2026)).toBe(35);
    expect(parseSequence('INV-2025-035', 'INV-{YYYY}-', 2026)).toBeNull();
  });

  it('auto-increments from the counter', () => {
    expect(nextInvoiceNumber(settings, [], '2026-10-02').number).toBe('INV-2026-036');
  });

  it('never reuses a number that exists', () => {
    expect(nextInvoiceNumber(settings, [{ number: 'INV-2026-040' }], '2026-10-02').number).toBe(
      'INV-2026-041',
    );
  });

  it('restarts at 001 when the year rolls over', () => {
    expect(nextInvoiceNumber(settings, [{ number: 'INV-2026-040' }], '2027-01-01').number).toBe(
      'INV-2027-001',
    );
    expect(advanceCounter(settings, 'INV-2027-001', '2027-01-01')).toEqual({
      invoiceYear: 2027,
      invoiceNext: 2,
    });
  });

  it('advances past an edited number', () => {
    expect(advanceCounter(settings, 'INV-2026-050', '2026-10-02')).toEqual({
      invoiceYear: 2026,
      invoiceNext: 51,
    });
    expect(advanceCounter(settings, 'CUSTOM-1', '2026-10-02')).toEqual({
      invoiceYear: 2026,
      invoiceNext: 36,
    });
  });
});

describe('lists', () => {
  it('filter counts for the seed', () => {
    expect(collabFilterCounts(index, SEED_TODAY)).toEqual({
      Active: 6,
      All: 9,
      Leads: 2,
      'In progress': 3,
      Delivered: 3,
      Paid: 1,
      Archived: 1,
    });
  });

  it('search ignores case and accents, across brand and campaign', () => {
    expect(normalizeSearch('Café ÉCLAIR')).toBe('cafe eclair');
    expect(filterCollabs(index, 'All', 'KOHL', SEED_TODAY).map((c) => c.campaign)).toEqual([
      'Morning ritual reel',
    ]);
    expect(filterCollabs(index, 'All', 'earbuds', SEED_TODAY).map((c) => c.brand)).toEqual([
      'Northline Audio',
    ]);
  });

  it('sorts by next due date', () => {
    const active = filterCollabs(index, 'Active', '', SEED_TODAY).map((c) => c.nextDue);
    expect(active).toEqual([...active].sort());
  });

  it('groups payments in the agreed order with Not invoiced under All only', () => {
    expect(groupPayments(index, 'All', SEED_TODAY).map((g) => g.title)).toEqual([
      'Overdue',
      'Not invoiced',
      'Part-paid',
      'Invoiced',
      'Paid',
    ]);
    expect(groupPayments(index, 'Overdue', SEED_TODAY).map((g) => g.title)).toEqual(['Overdue']);
    const ni = groupPayments(index, 'All', SEED_TODAY).find((g) => g.title === 'Not invoiced')!;
    expect(ni.rows.map((r) => r.collab?.brand)).toEqual(['Saffa Skincare']);
    expect(paymentFilterCounts(index, SEED_TODAY)).toEqual({
      All: 5,
      Overdue: 1,
      'Due soon': 0,
      'Part-paid': 1,
      Paid: 2,
    });
  });

  it('groups rights and hides superseded periods', () => {
    const groups = groupRights(index, SEED_TODAY);
    expect(groups.map((g) => g.title)).toEqual([
      'Expiring soon',
      'Extension pending',
      'Active',
      'Expired',
    ]);
    const withSuperseded = buildIndex({
      ...seed.data,
      rights: seed.data.rights.map((r) =>
        r.id === 'seed-r-halden' ? { ...r, supersededBy: 'x' } : r,
      ),
    });
    expect(
      groupRights(withSuperseded, SEED_TODAY)
        .flatMap((g) => g.rows)
        .some((r) => r.period.id === 'seed-r-halden'),
    ).toBe(false);
  });
});
