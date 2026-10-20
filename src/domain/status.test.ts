import { describe, expect, it } from 'vitest';
import {
  collabPaymentStatus,
  collabRightsStatus,
  currentRightsPeriod,
  extensionStartOn,
  invoiceProgress,
  invoiceRemaining,
  invoiceStatus,
  isNextDueUrgent,
  rightsDaysLeft,
  rightsElapsed,
  rightsEndOn,
  rightsStatus,
} from './status';
import type { Collab, Invoice, RightsPeriod } from './types';

const TS = '2026-01-01T00:00:00.000Z';

function inv(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i',
    collabId: 'c',
    number: 'INV-2026-001',
    kind: 'Content fee',
    amount: 10000,
    issuedOn: '2026-09-01',
    dueOn: '2026-10-10',
    followUpOn: null,
    payments: [],
    createdAt: TS,
    updatedAt: TS,
    ...over,
  };
}

function pay(amount: number, tds?: number) {
  return { id: `p${amount}`, on: '2026-10-01', amount, ...(tds ? { tds } : {}) };
}

function period(over: Partial<RightsPeriod> = {}): RightsPeriod {
  return {
    id: 'r',
    collabId: 'c',
    platform: 'Instagram',
    startOn: '2026-09-05',
    days: 30,
    isExtension: false,
    extensionPending: false,
    createdAt: TS,
    updatedAt: TS,
    ...over,
  };
}

describe('invoice status', () => {
  const today = '2026-10-02';

  it('due today is Due soon', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-10-02' }), today)).toBe('Due soon');
  });
  it('due yesterday is Overdue', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-10-01' }), today)).toBe('Overdue');
  });
  it('due in exactly 7 days is Due soon; 8 days is Invoiced', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-10-09' }), today)).toBe('Due soon');
    expect(invoiceStatus(inv({ dueOn: '2026-10-10' }), today)).toBe('Invoiced');
  });
  it('partial payment is Part-paid, even when due soon', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-10-03', payments: [pay(4000)] }), today)).toBe(
      'Part-paid',
    );
  });
  it('overdue beats part-paid', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-09-24', payments: [pay(4000)] }), today)).toBe(
      'Overdue',
    );
  });
  it('paid beats overdue', () => {
    expect(invoiceStatus(inv({ dueOn: '2026-09-24', payments: [pay(10000)] }), today)).toBe('Paid');
  });
  it('overpayment is clamped: Paid, nothing remaining, progress 1', () => {
    const i = inv({ payments: [pay(12000)] });
    expect(invoiceStatus(i, today)).toBe('Paid');
    expect(invoiceRemaining(i)).toBe(0);
    expect(invoiceProgress(i)).toBe(1);
  });
  it('TDS counts toward settling the invoice', () => {
    const i = inv({ payments: [pay(9000, 1000)] });
    expect(invoiceStatus(i, today)).toBe('Paid');
    expect(invoiceRemaining(i)).toBe(0);
  });
});

describe('collab payment status', () => {
  const today = '2026-10-02';
  it('is Not invoiced with no invoices', () => {
    expect(collabPaymentStatus([], today)).toBe('Not invoiced');
  });
  it('takes the most severe invoice status', () => {
    const paid = inv({ id: 'a', payments: [pay(10000)] });
    const soon = inv({ id: 'b', dueOn: '2026-10-05' });
    const late = inv({ id: 'c', dueOn: '2026-09-20' });
    expect(collabPaymentStatus([paid, soon], today)).toBe('Due soon');
    expect(collabPaymentStatus([paid, soon, late], today)).toBe('Overdue');
    expect(collabPaymentStatus([paid], today)).toBe('Paid');
  });
});

describe('rights', () => {
  const p = period(); // 5 Sep + 30 days → ends 4 Oct

  it('ends inclusively', () => {
    expect(rightsEndOn(p)).toBe('2026-10-04');
  });
  it('a period ending today has 1 day left', () => {
    expect(rightsDaysLeft(p, '2026-10-04')).toBe(1);
    expect(rightsStatus(p, '2026-10-04')).toBe('Expiring soon');
  });
  it('the day after the end is Expired with 0 days left', () => {
    expect(rightsDaysLeft(p, '2026-10-05')).toBe(0);
    expect(rightsStatus(p, '2026-10-05')).toBe('Expired');
  });
  it('7 days left is Expiring soon; 8 is Active', () => {
    expect(rightsDaysLeft(p, '2026-09-28')).toBe(7);
    expect(rightsStatus(p, '2026-09-28')).toBe('Expiring soon');
    expect(rightsDaysLeft(p, '2026-09-27')).toBe(8);
    expect(rightsStatus(p, '2026-09-27')).toBe('Active');
  });
  it('Kohl Coffee on 2 Oct has 3 days left', () => {
    expect(rightsDaysLeft(p, '2026-10-02')).toBe(3);
  });
  it('extension pending and extended take precedence', () => {
    expect(rightsStatus(period({ extensionPending: true }), '2026-10-10')).toBe(
      'Extension pending',
    );
    expect(rightsStatus(period({ supersededBy: 'x', extensionPending: true }), '2026-10-10')).toBe(
      'Extended',
    );
  });
  it('elapsed share', () => {
    expect(rightsElapsed(p, '2026-09-05')).toBeCloseTo(0);
    expect(rightsElapsed(p, '2026-10-05')).toBe(1);
  });
  it('extension starts the day after an active period ends', () => {
    expect(extensionStartOn(p, '2026-10-02')).toBe('2026-10-05');
    expect(extensionStartOn(p, '2026-10-04')).toBe('2026-10-05');
  });
  it('extension starts today when the period already expired', () => {
    expect(extensionStartOn(p, '2026-10-20')).toBe('2026-10-20');
  });
  it('the superseded period is hidden from the current status', () => {
    const old = period({ id: 'old', supersededBy: 'new' });
    const ext = period({ id: 'new', startOn: '2026-10-05', isExtension: true });
    expect(currentRightsPeriod([old, ext])?.id).toBe('new');
    expect(collabRightsStatus([old, ext], '2026-10-06')).toBe('Active');
    expect(collabRightsStatus([], '2026-10-06')).toBe('Not live');
  });
});

describe('next-due urgency', () => {
  const base = { owner: 'You', nextDue: '2026-10-03' } as Collab;
  it('is urgent when yours and due within a day or overdue', () => {
    expect(isNextDueUrgent(base, '2026-10-02')).toBe(true);
    expect(isNextDueUrgent({ ...base, nextDue: '2026-09-30' }, '2026-10-02')).toBe(true);
    expect(isNextDueUrgent({ ...base, nextDue: '2026-10-04' }, '2026-10-02')).toBe(false);
    expect(isNextDueUrgent({ ...base, owner: 'Brand' }, '2026-10-02')).toBe(false);
  });
});
