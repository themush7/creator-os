import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CreatorDb } from '@/db/db';
import { loadSampleData } from '@/db/repo';
import { SEED_TODAY } from '@/db/seed';
import {
  addNote,
  askExtension,
  createCollab,
  defaultInvoiceAmount,
  deleteCollab,
  logFollowUp,
  markLive,
  recordExtension,
  recordInvoice,
  recordPayment,
  runQuickAction,
  setArchived,
  setNextAction,
  setOwner,
  setStage,
  updateDetails,
  type ActionContext,
} from './actions';
import { quickActionsFor } from './stageActions';
import { collabPaymentStatus, invoiceStatus, rightsEndOn, rightsStatus } from './status';

let db: CreatorDb;
let ctx: ActionContext;

beforeEach(async () => {
  db = new CreatorDb(`actions-${Math.random()}`);
  await loadSampleData(db);
  ctx = { db, today: SEED_TODAY };
});

afterEach(() => db.close());

async function activityTexts(collabId: string) {
  return (await db.activity.where('collabId').equals(collabId).toArray()).map((a) => a.text);
}

describe('create and stage', () => {
  it('quick add logs, sets bookedOn from Confirmed and validates', async () => {
    const { value: c } = await createCollab(ctx, {
      brand: ' Acme ',
      campaign: 'Reel',
      fee: 50000,
      stage: 2,
      owner: 'You',
    });
    expect(c.brand).toBe('Acme');
    expect(c.bookedOn).toBe(SEED_TODAY);
    expect(await activityTexts(c.id)).toEqual(['Added at Confirmed']);
    const { value: lead } = await createCollab(ctx, {
      brand: 'B',
      campaign: 'C',
      fee: null,
      stage: 0,
      owner: 'Brand',
    });
    expect(lead.bookedOn).toBeNull();
    await expect(
      createCollab(ctx, { brand: '', campaign: 'x', fee: null, stage: 0, owner: 'You' }),
    ).rejects.toThrow();
  });

  it('first reach of Confirmed sets bookedOn; later moves keep it', async () => {
    const { value: c } = await setStage(ctx, 'seed-verde', 2);
    expect(c.bookedOn).toBe(SEED_TODAY);
    const { value: again } = await setStage({ ...ctx, today: '2026-10-09' }, 'seed-verde', 3);
    expect(again.bookedOn).toBe(SEED_TODAY);
    expect(await activityTexts('seed-verde')).toContain('Moved to Product in transit');
  });

  it('quick actions move stage, owner and next action', async () => {
    await runQuickAction(ctx, 'seed-pace', 'product-received');
    let pace = (await db.collabs.get('seed-pace'))!;
    expect([pace.stage, pace.owner, pace.nextAction]).toEqual([4, 'You', 'Write concept']);

    await runQuickAction(ctx, 'seed-tidewear', 'mark-delivered');
    const tide = (await db.collabs.get('seed-tidewear'))!;
    expect([tide.stage, tide.owner, tide.deliveredOn]).toEqual([9, 'Brand', SEED_TODAY]);

    await runQuickAction(ctx, 'seed-saffa', 'mark-approved');
    const saffa = (await db.collabs.get('seed-saffa'))!;
    expect([saffa.stage, saffa.owner, saffa.nextAction]).toEqual([10, 'You', 'Record invoice']);
    pace = (await db.collabs.get('seed-pace'))!;
    expect(await activityTexts('seed-pace')).toContain('Product received');
  });

  it('offers context quick actions by stage', () => {
    const ids = (stage: number, rights = false, unpaid = false) =>
      quickActionsFor({ stage } as never, rights, unpaid).map((a) => a.id);
    expect(ids(3)).toEqual(['product-received', 'record-invoice']);
    expect(ids(7)).toEqual(['mark-delivered', 'record-invoice']);
    expect(ids(9)).toEqual(['mark-approved', 'mark-live', 'record-invoice']);
    expect(ids(10, true, true)).toEqual(['record-invoice', 'record-payment']);
  });

  it('owner Clear clears the next action', async () => {
    await setOwner(ctx, 'seed-mitti', 'Clear');
    const m = (await db.collabs.get('seed-mitti'))!;
    expect([m.owner, m.nextAction, m.nextDue]).toEqual(['Clear', '', null]);
    await setNextAction(ctx, 'seed-mitti', 'Call Priya', '2026-10-05');
    expect((await db.collabs.get('seed-mitti'))!.nextAction).toBe('Call Priya');
  });

  it('edits details and logs the section', async () => {
    await updateDetails(
      ctx,
      'seed-mitti',
      { contact: 'Priya · Founder', fee: 30000 },
      'Deliverables & terms',
    );
    const m = (await db.collabs.get('seed-mitti'))!;
    expect([m.contact, m.fee]).toEqual(['Priya · Founder', 30000]);
    expect(await activityTexts('seed-mitti')).toContain('Updated deliverables & terms');
  });

  it('notes are kind note', async () => {
    await addNote(ctx, 'seed-mitti', 'Followed up on WhatsApp');
    const notes = await db.activity
      .where('collabId')
      .equals('seed-mitti')
      .filter((a) => a.kind === 'note')
      .toArray();
    expect(notes.map((n) => n.text)).toEqual(['Followed up on WhatsApp']);
  });
});

describe('invoices and payments', () => {
  it('records an invoice with the next number and sets the brand chasing payment', async () => {
    const { value: inv } = await recordInvoice(ctx, {
      collabId: 'seed-saffa',
      amount: 60000,
      kind: 'Content fee',
      termDays: 30,
    });
    expect(inv.number).toBe('INV-2026-036');
    expect(inv.dueOn).toBe('2026-11-01');
    expect(inv.followUpOn).toBe('2026-11-01');
    const s = (await db.collabs.get('seed-saffa'))!;
    expect([s.owner, s.nextAction, s.nextDue]).toEqual([
      'Brand',
      'Payment due 1 Nov',
      '2026-11-01',
    ]);
    expect((await db.settings.get('app'))!.invoiceNext).toBe(37);
    const { value: second } = await recordInvoice(ctx, {
      collabId: 'seed-saffa',
      amount: 100,
      kind: 'Balance',
      termDays: 15,
    });
    expect(second.number).toBe('INV-2026-037');
  });

  it('rejects a duplicate invoice number', async () => {
    await expect(
      recordInvoice(ctx, {
        collabId: 'seed-saffa',
        amount: 1,
        kind: 'Content fee',
        termDays: 15,
        number: 'INV-2026-031',
      }),
    ).rejects.toThrow('already exists');
  });

  it('defaults the amount to fee minus fee invoices', async () => {
    const tide = (await db.collabs.get('seed-tidewear'))!;
    const invs = await db.invoices.where('collabId').equals('seed-tidewear').toArray();
    expect(defaultInvoiceAmount(tide, invs)).toBe(60000);
  });

  it('half then the rest: Clear once fully paid on a completed collab', async () => {
    const { value: half } = await recordPayment(ctx, { invoiceId: 'seed-inv-031', amount: 22500 });
    expect(half.remaining).toBe(22500);
    let kohl = (await db.collabs.get('seed-kohl'))!;
    expect([kohl.owner, kohl.nextAction]).toEqual(['Brand', 'Balance due 24 Sep']);

    const { value: rest } = await recordPayment(ctx, { invoiceId: 'seed-inv-031', amount: 99999 });
    expect(rest.cash).toBe(22500); // clamped
    expect(rest.remaining).toBe(0);
    kohl = (await db.collabs.get('seed-kohl'))!;
    expect([kohl.owner, kohl.nextAction, kohl.nextDue]).toEqual(['Clear', '', null]);
    const invs = await db.invoices.where('collabId').equals('seed-kohl').toArray();
    expect(collabPaymentStatus(invs, SEED_TODAY)).toBe('Paid');
  });

  it('TDS settles the invoice without counting as cash', async () => {
    const { value } = await recordPayment(ctx, {
      invoiceId: 'seed-inv-034',
      amount: 40500,
      tds: 4500,
    });
    expect(value.remaining).toBe(0);
    expect(value.invoice.payments.at(-1)).toMatchObject({ amount: 40500, tds: 4500 });
    expect(invoiceStatus(value.invoice, SEED_TODAY)).toBe('Paid');
    expect(await activityTexts('seed-halden')).toContain(
      'Payment received · ₹40,500 + TDS ₹4,500 · INV-2026-034',
    );
  });

  it('refuses payment on a settled invoice', async () => {
    await expect(recordPayment(ctx, { invoiceId: 'seed-inv-027', amount: 1 })).rejects.toThrow(
      'already settled',
    );
  });

  it('logs a follow-up three days out', async () => {
    const { value: next } = await logFollowUp(ctx, 'seed-inv-031');
    expect(next).toBe('2026-10-05');
    expect((await db.invoices.get('seed-inv-031'))!.followUpOn).toBe('2026-10-05');
    const kohl = (await db.collabs.get('seed-kohl'))!;
    expect([kohl.owner, kohl.nextAction, kohl.nextDue]).toEqual([
      'Brand',
      'Waiting on payment',
      '2026-10-05',
    ]);
    expect(await activityTexts('seed-kohl')).toContain(
      'Followed up on INV-2026-031; next follow-up 5 Oct',
    );
  });
});

describe('rights', () => {
  it('marks live from the go-live date', async () => {
    const { value: p } = await markLive(ctx, {
      collabId: 'seed-saffa',
      platform: 'Instagram',
      days: 30,
      goLiveOn: SEED_TODAY,
    });
    expect(rightsEndOn(p)).toBe('2026-10-31');
    expect((await db.collabs.get('seed-saffa'))!.goLiveOn).toBe(SEED_TODAY);
  });

  it('Kohl: ask, then extend 30 days for ₹20,000 from the day after 4 Oct', async () => {
    await askExtension(ctx, 'seed-r-kohl');
    expect(rightsStatus((await db.rights.get('seed-r-kohl'))!, SEED_TODAY)).toBe(
      'Extension pending',
    );
    const kohl = (await db.collabs.get('seed-kohl'))!;
    expect([kohl.owner, kohl.nextAction, kohl.nextDue]).toEqual([
      'Brand',
      'Waiting on extension reply',
      '2026-10-05',
    ]);

    const { value } = await recordExtension(ctx, { periodId: 'seed-r-kohl', days: 30, fee: 20000 });
    expect(value.period.startOn).toBe('2026-10-05');
    expect(value.endOn).toBe('2026-11-03');
    expect(value.invoice).toMatchObject({
      kind: 'Rights extension',
      amount: 20000,
      rightsPeriodId: value.period.id,
      dueOn: '2026-11-01',
    });
    const old = (await db.rights.get('seed-r-kohl'))!;
    expect(old.supersededBy).toBe(value.period.id);
    expect(old.extensionPending).toBe(false);
    expect(await activityTexts('seed-kohl')).toContain(
      `Rights extended 30 days · ${value.invoice.number} · ₹20,000`,
    );
    await expect(
      recordExtension(ctx, { periodId: 'seed-r-kohl', days: 30, fee: 1 }),
    ).rejects.toThrow('already been extended');
  });

  it('an expired period extends from today', async () => {
    const { value } = await recordExtension(
      { ...ctx, today: '2026-10-20' },
      { periodId: 'seed-r-kohl', days: 30, fee: 1000 },
    );
    expect(value.period.startOn).toBe('2026-10-20');
  });
});

describe('undo', () => {
  it('undoes a payment, including the collab change', async () => {
    const before = (await db.collabs.get('seed-kohl'))!;
    const { undo } = await recordPayment(ctx, { invoiceId: 'seed-inv-031', amount: 45000 });
    await undo();
    expect((await db.invoices.get('seed-inv-031'))!.payments).toEqual([]);
    expect((await db.collabs.get('seed-kohl'))!).toEqual(before);
    expect(await activityTexts('seed-kohl')).not.toContain(
      'Payment received · ₹45,000 · INV-2026-031',
    );
  });

  it('undoes a delete, restoring linked records', async () => {
    const counts = async () =>
      Promise.all([
        db.invoices.where('collabId').equals('seed-kohl').count(),
        db.rights.where('collabId').equals('seed-kohl').count(),
        db.activity.where('collabId').equals('seed-kohl').count(),
      ]);
    const before = await counts();
    const { undo } = await deleteCollab(ctx, 'seed-kohl');
    expect(await db.collabs.get('seed-kohl')).toBeUndefined();
    expect(await counts()).toEqual([0, 0, 0]);
    await undo();
    expect(await db.collabs.get('seed-kohl')).toBeDefined();
    expect(await counts()).toEqual(before);
  });

  it('undoes an invoice, freeing its number', async () => {
    const { undo } = await recordInvoice(ctx, {
      collabId: 'seed-saffa',
      amount: 1,
      kind: 'Content fee',
      termDays: 15,
    });
    await undo();
    expect((await db.settings.get('app'))!.invoiceNext).toBe(36);
    expect(await db.invoices.where('collabId').equals('seed-saffa').count()).toBe(0);
  });

  it('archive round trip', async () => {
    const { undo } = await setArchived(ctx, 'seed-mitti', true);
    expect((await db.collabs.get('seed-mitti'))!.archived).toBe(true);
    await undo();
    expect((await db.collabs.get('seed-mitti'))!.archived).toBe(false);
  });
});

describe('sheet mirror', () => {
  it('every action marks the mirror dirty; undo keeps it dirty', async () => {
    expect((await db.settings.get('app'))!.sheetSync.dirty).toBe(false);
    const { undo } = await addNote(ctx, 'seed-mitti', 'hi');
    expect((await db.settings.get('app'))!.sheetSync.dirty).toBe(true);
    await undo();
    expect((await db.settings.get('app'))!.sheetSync.dirty).toBe(true);
  });
});
