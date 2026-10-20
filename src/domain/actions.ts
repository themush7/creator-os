/**
 * Every mutation in the app. Each action:
 * - runs inside one Dexie transaction,
 * - stamps `updatedAt` on what it changes,
 * - writes one activity entry (where the spec asks for one),
 * - flags the Google Sheet mirror as needing a push,
 * - returns an `undo` that restores every record it touched.
 */
import { db as defaultDb, type CreatorDb } from '@/db/db';
import { defaultSettings } from '@/db/settings';
import { addDays, formatShort, yearOf } from '@/lib/dates';
import { newId, nowIso } from '@/lib/ids';
import { inr, sum } from '@/lib/money';
import { advanceCounter, nextInvoiceNumber } from './invoiceNumber';
import { clampStage, CONFIRMED, COMPLETE, stageName } from './stages';
import { STAGE_TRANSITIONS, type QuickActionId } from './stageActions';
import { extensionStartOn, invoiceRemaining, isUnpaid, rightsEndOn } from './status';
import type {
  ActivityEntry,
  Collab,
  DateStr,
  Invoice,
  InvoiceKind,
  Owner,
  Payment,
  RightsPeriod,
  Settings,
} from './types';

export interface ActionContext {
  today: DateStr;
  db?: CreatorDb;
}

export interface ActionResult<T> {
  value: T;
  undo: () => Promise<void>;
}

export class ActionError extends Error {}

type TableName = 'collabs' | 'invoices' | 'rights' | 'activity' | 'settings';
type Row = { id: string };

/** Remembers each record's state before its first change in this action, so it can be put back. */
class Recorder {
  private before = new Map<string, { table: TableName; id: string; prev: Row | undefined }>();
  constructor(private db: CreatorDb) {}

  private table(name: TableName) {
    return this.db.table<Row, string>(name);
  }

  private async remember(table: TableName, id: string) {
    const key = `${table}:${id}`;
    if (!this.before.has(key))
      this.before.set(key, { table, id, prev: await this.table(table).get(id) });
  }

  async put<T extends Row>(table: TableName, row: T): Promise<T> {
    await this.remember(table, row.id);
    await this.table(table).put(row);
    return row;
  }

  async delete(table: TableName, id: string): Promise<void> {
    await this.remember(table, id);
    await this.table(table).delete(id);
  }

  undo = async (): Promise<void> => {
    const entries = [...this.before.values()];
    await this.db.transaction('rw', allTables(this.db), async () => {
      for (const { table, id, prev } of entries) {
        if (prev) await this.table(table).put(prev);
        else await this.table(table).delete(id);
      }
      await flagDirty(this.db);
    });
  };
}

function allTables(db: CreatorDb) {
  return [db.collabs, db.invoices, db.rights, db.activity, db.settings];
}

/** Marks the Sheet mirror as behind. Always stamps `changedAt`, so an in-flight push can tell. */
async function flagDirty(db: CreatorDb, rec?: Recorder) {
  const s = await db.settings.get('app');
  if (!s) return;
  const next = { ...s, sheetSync: { ...s.sheetSync, dirty: true, changedAt: nowIso() } };
  if (rec) await rec.put('settings', next);
  else await db.settings.put(next);
}

async function run<T>(
  ctx: ActionContext,
  fn: (rec: Recorder, db: CreatorDb) => Promise<T>,
): Promise<ActionResult<T>> {
  const db = ctx.db ?? defaultDb;
  const rec = new Recorder(db);
  const value = await db.transaction('rw', allTables(db), async () => {
    const v = await fn(rec, db);
    await flagDirty(db, rec);
    return v;
  });
  return { value, undo: rec.undo };
}

async function mustGet<T>(promise: Promise<T | undefined>, what: string): Promise<T> {
  const v = await promise;
  if (!v) throw new ActionError(`${what} not found.`);
  return v;
}

async function settingsOf(db: CreatorDb, today: DateStr): Promise<Settings> {
  return (await db.settings.get('app')) ?? defaultSettings(yearOf(today));
}

function activity(
  collabId: string,
  today: DateStr,
  text: string,
  kind: ActivityEntry['kind'] = 'auto',
): ActivityEntry {
  return { id: newId(), collabId, on: today, text, kind, createdAt: nowIso() };
}

async function saveCollab(rec: Recorder, c: Collab, patch: Partial<Collab>): Promise<Collab> {
  return rec.put('collabs', { ...c, ...patch, updatedAt: nowIso() });
}

async function log(
  rec: Recorder,
  collabId: string,
  today: DateStr,
  text: string,
  kind?: ActivityEntry['kind'],
) {
  await rec.put('activity', activity(collabId, today, text, kind));
}

/** bookedOn is set the first time the stage reaches Confirmed or later. */
function bookedPatch(c: Collab, stage: number, today: DateStr): Partial<Collab> {
  return stage >= CONFIRMED && !c.bookedOn ? { bookedOn: today } : {};
}

function cleanAmount(n: number, what: string): number {
  if (!Number.isFinite(n) || n < 0) throw new ActionError(`${what} must be a positive amount.`);
  return Math.round(n);
}

// ─── Collabs ─────────────────────────────────────────────────────────────────

export interface NewCollabInput {
  brand: string;
  campaign: string;
  fee: number | null;
  stage: number;
  owner: Owner;
}

export function createCollab(ctx: ActionContext, input: NewCollabInput) {
  return run(ctx, async (rec) => {
    const brand = input.brand.trim();
    const campaign = input.campaign.trim();
    if (!brand || !campaign) throw new ActionError('Brand and campaign are required.');
    const stage = clampStage(input.stage);
    const now = nowIso();
    const c: Collab = {
      id: newId(),
      brand,
      campaign,
      fee: input.fee === null ? null : cleanAmount(input.fee, 'Fee'),
      stage,
      owner: input.owner,
      nextAction: input.owner === 'You' ? 'Add details' : '',
      nextDue: null,
      bookedOn: stage >= CONFIRMED ? ctx.today : null,
      contact: '',
      deliverables: '',
      usageTerms: '',
      productStatus: '',
      shootDate: null,
      deliveredOn: null,
      links: '',
      conceptNotes: '',
      goLiveOn: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await rec.put('collabs', c);
    await log(rec, c.id, ctx.today, `Added at ${stageName(stage)}`);
    return c;
  });
}

export type CollabDetailsPatch = Partial<
  Pick<
    Collab,
    | 'brand'
    | 'campaign'
    | 'fee'
    | 'contact'
    | 'deliverables'
    | 'usageTerms'
    | 'productStatus'
    | 'shootDate'
    | 'deliveredOn'
    | 'links'
    | 'conceptNotes'
    | 'goLiveOn'
  >
>;

/** Edit-details sheets. `section` names the change in the activity log. */
export function updateDetails(
  ctx: ActionContext,
  collabId: string,
  patch: CollabDetailsPatch,
  section: string,
) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    if (patch.brand !== undefined && !patch.brand.trim())
      throw new ActionError('Brand is required.');
    if (patch.campaign !== undefined && !patch.campaign.trim())
      throw new ActionError('Campaign is required.');
    const clean: CollabDetailsPatch = { ...patch };
    if (clean.brand !== undefined) clean.brand = clean.brand.trim();
    if (clean.campaign !== undefined) clean.campaign = clean.campaign.trim();
    if (clean.fee !== undefined && clean.fee !== null) clean.fee = cleanAmount(clean.fee, 'Fee');
    const updated = await saveCollab(rec, c, clean);
    await log(rec, c.id, ctx.today, `Updated ${section.toLowerCase()}`);
    return updated;
  });
}

export interface StageChange {
  owner?: Owner;
  nextAction?: string;
  nextDue?: DateStr | null;
  deliveredOn?: DateStr;
  log?: string;
}

export function setStage(
  ctx: ActionContext,
  collabId: string,
  stage: number,
  change: StageChange = {},
) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const to = clampStage(stage);
    const { log: text, ...fields } = change;
    const updated = await saveCollab(rec, c, {
      ...fields,
      stage: to,
      ...bookedPatch(c, to, ctx.today),
    });
    await log(rec, c.id, ctx.today, text ?? `Moved to ${stageName(to)}`);
    return updated;
  });
}

/** Runs a stage-moving quick action. Sheet-opening ones (invoice, payment, live) are handled by the UI. */
export function runQuickAction(ctx: ActionContext, collabId: string, id: QuickActionId) {
  const t = STAGE_TRANSITIONS[id];
  if (!t) throw new ActionError(`"${id}" opens a sheet; it is not a stage change.`);
  return setStage(ctx, collabId, t.to, {
    owner: t.owner,
    nextAction: t.nextAction,
    nextDue: t.dueInDays === null ? null : addDays(ctx.today, t.dueInDays),
    log: t.log,
    ...(id === 'mark-delivered' ? { deliveredOn: ctx.today } : {}),
  });
}

export function setOwner(ctx: ActionContext, collabId: string, owner: Owner) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const patch: Partial<Collab> =
      owner === 'Clear' ? { owner, nextAction: '', nextDue: null } : { owner };
    const updated = await saveCollab(rec, c, patch);
    await log(rec, c.id, ctx.today, `Next action owner: ${owner}`);
    return updated;
  });
}

export function setNextAction(
  ctx: ActionContext,
  collabId: string,
  nextAction: string,
  nextDue: DateStr | null,
) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const text = nextAction.trim();
    const updated = await saveCollab(rec, c, { nextAction: text, nextDue });
    await log(
      rec,
      c.id,
      ctx.today,
      text
        ? `Next action: ${text}${nextDue ? ` · ${formatShort(nextDue)}` : ''}`
        : 'Next action cleared',
    );
    return updated;
  });
}

export function setArchived(ctx: ActionContext, collabId: string, archived: boolean) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const updated = await saveCollab(rec, c, { archived });
    await log(rec, c.id, ctx.today, archived ? 'Archived' : 'Restored from archive');
    return updated;
  });
}

/** Deletes the collab and everything linked to it. Undo restores all of it. */
export function deleteCollab(ctx: ActionContext, collabId: string) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const [invoices, rights, entries] = await Promise.all([
      db.invoices.where('collabId').equals(collabId).primaryKeys(),
      db.rights.where('collabId').equals(collabId).primaryKeys(),
      db.activity.where('collabId').equals(collabId).primaryKeys(),
    ]);
    for (const id of invoices) await rec.delete('invoices', id);
    for (const id of rights) await rec.delete('rights', id);
    for (const id of entries) await rec.delete('activity', id);
    await rec.delete('collabs', c.id);
    return c;
  });
}

export function addNote(ctx: ActionContext, collabId: string, text: string) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(collabId), 'Collaboration');
    const t = text.trim();
    if (!t) throw new ActionError('Write something first.');
    await log(rec, c.id, ctx.today, t, 'note');
    await saveCollab(rec, c, {});
    return t;
  });
}

// ─── Invoices & payments ─────────────────────────────────────────────────────

/** Fee minus what has already been invoiced as fees (extensions excluded). */
export function defaultInvoiceAmount(collab: Collab, invoices: readonly Invoice[]): number {
  const invoiced = sum(invoices.filter((i) => i.kind !== 'Rights extension').map((i) => i.amount));
  return Math.max(0, (collab.fee ?? 0) - invoiced);
}

export interface InvoiceInput {
  collabId: string;
  amount: number;
  kind: InvoiceKind;
  termDays: number;
  /** Leave empty to use the next number in sequence. */
  number?: string;
}

export function recordInvoice(ctx: ActionContext, input: InvoiceInput) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(input.collabId), 'Collaboration');
    const amount = cleanAmount(input.amount, 'Amount');
    if (amount <= 0) throw new ActionError('Amount must be more than zero.');
    const settings = await settingsOf(db, ctx.today);
    const all = await db.invoices.toArray();
    const number = input.number?.trim() || nextInvoiceNumber(settings, all, ctx.today).number;
    if (all.some((i) => i.number === number)) throw new ActionError(`${number} already exists.`);
    const dueOn = addDays(ctx.today, input.termDays);
    const now = nowIso();
    const inv: Invoice = {
      id: newId(),
      collabId: c.id,
      number,
      kind: input.kind,
      amount,
      issuedOn: ctx.today,
      dueOn,
      followUpOn: dueOn,
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
    await rec.put('invoices', inv);
    await rec.put('settings', {
      ...settings,
      ...advanceCounter(settings, number, ctx.today),
      updatedAt: now,
    });
    await saveCollab(rec, c, {
      owner: 'Brand',
      nextAction: `Payment due ${formatShort(dueOn)}`,
      nextDue: dueOn,
    });
    await log(rec, c.id, ctx.today, `Invoice ${number} recorded · ${inr(amount)}`);
    return inv;
  });
}

export interface PaymentInput {
  invoiceId: string;
  amount: number;
  tds?: number;
  note?: string;
}

export interface PaymentOutcome {
  invoice: Invoice;
  /** Cash recorded after clamping. */
  cash: number;
  tds: number;
  remaining: number;
}

/**
 * Records cash (and optional TDS) against an invoice. The total is clamped to what is
 * still owed. When nothing is left unpaid on a completed collab, the owner becomes Clear.
 */
export function recordPayment(ctx: ActionContext, input: PaymentInput) {
  return run(ctx, async (rec, db) => {
    const inv = await mustGet(db.invoices.get(input.invoiceId), 'Invoice');
    const c = await mustGet(db.collabs.get(inv.collabId), 'Collaboration');
    const owed = invoiceRemaining(inv);
    if (owed <= 0) throw new ActionError(`${inv.number} is already settled.`);
    const tds = Math.min(cleanAmount(input.tds ?? 0, 'TDS'), owed);
    const cash = Math.min(cleanAmount(input.amount, 'Amount'), owed - tds);
    if (cash + tds <= 0) throw new ActionError('Enter an amount.');
    const payment: Payment = { id: newId(), on: ctx.today, amount: cash };
    if (tds) payment.tds = tds;
    if (input.note?.trim()) payment.note = input.note.trim();
    const updated: Invoice = { ...inv, payments: [...inv.payments, payment], updatedAt: nowIso() };
    await rec.put('invoices', updated);
    const remaining = invoiceRemaining(updated);

    const others = (await db.invoices.where('collabId').equals(c.id).toArray()).filter(
      (i) => i.id !== inv.id,
    );
    const stillOpen = [updated, ...others]
      .filter(isUnpaid)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
    if (!stillOpen.length && c.stage >= COMPLETE) {
      await saveCollab(rec, c, { owner: 'Clear', nextAction: '', nextDue: null });
    } else if (stillOpen[0]) {
      const next = stillOpen[0];
      await saveCollab(rec, c, {
        owner: 'Brand',
        nextAction: `Balance due ${formatShort(next.dueOn)}`,
        nextDue: next.dueOn,
      });
    }

    const tdsText = tds ? ` + TDS ${inr(tds)}` : '';
    await log(
      rec,
      c.id,
      ctx.today,
      `${remaining > 0 ? 'Part-payment' : 'Payment'} received · ${inr(cash)}${tdsText} · ${inv.number}`,
    );
    return { invoice: updated, cash, tds, remaining } satisfies PaymentOutcome;
  });
}

export const FOLLOW_UP_DAYS = 3;

export function logFollowUp(ctx: ActionContext, invoiceId: string) {
  return run(ctx, async (rec, db) => {
    const inv = await mustGet(db.invoices.get(invoiceId), 'Invoice');
    const c = await mustGet(db.collabs.get(inv.collabId), 'Collaboration');
    const next = addDays(ctx.today, FOLLOW_UP_DAYS);
    await rec.put('invoices', { ...inv, followUpOn: next, updatedAt: nowIso() });
    await saveCollab(rec, c, { owner: 'Brand', nextAction: 'Waiting on payment', nextDue: next });
    await log(
      rec,
      c.id,
      ctx.today,
      `Followed up on ${inv.number}; next follow-up ${formatShort(next)}`,
    );
    return next;
  });
}

// ─── Rights ──────────────────────────────────────────────────────────────────

export interface MarkLiveInput {
  collabId: string;
  platform: string;
  days: number;
  goLiveOn: DateStr;
}

export function markLive(ctx: ActionContext, input: MarkLiveInput) {
  return run(ctx, async (rec, db) => {
    const c = await mustGet(db.collabs.get(input.collabId), 'Collaboration');
    if (!Number.isInteger(input.days) || input.days <= 0)
      throw new ActionError('Rights term must be at least 1 day.');
    const now = nowIso();
    const period: RightsPeriod = {
      id: newId(),
      collabId: c.id,
      platform: input.platform.trim() || 'Instagram',
      startOn: input.goLiveOn,
      days: input.days,
      isExtension: false,
      extensionPending: false,
      createdAt: now,
      updatedAt: now,
    };
    await rec.put('rights', period);
    await saveCollab(rec, c, { goLiveOn: input.goLiveOn });
    await log(rec, c.id, ctx.today, `Went live on ${period.platform} · ${input.days}-day rights`);
    return period;
  });
}

export function askExtension(ctx: ActionContext, periodId: string) {
  return run(ctx, async (rec, db) => {
    const p = await mustGet(db.rights.get(periodId), 'Rights period');
    const c = await mustGet(db.collabs.get(p.collabId), 'Collaboration');
    await rec.put('rights', { ...p, extensionPending: true, updatedAt: nowIso() });
    await saveCollab(rec, c, {
      owner: 'Brand',
      nextAction: 'Waiting on extension reply',
      nextDue: addDays(ctx.today, FOLLOW_UP_DAYS),
    });
    await log(rec, c.id, ctx.today, 'Asked about extension');
  });
}

export interface ExtensionInput {
  periodId: string;
  days: number;
  fee: number;
  termDays?: number;
}

export const EXTENSION_PAYMENT_DAYS = 30;

export function recordExtension(ctx: ActionContext, input: ExtensionInput) {
  return run(ctx, async (rec, db) => {
    const old = await mustGet(db.rights.get(input.periodId), 'Rights period');
    const c = await mustGet(db.collabs.get(old.collabId), 'Collaboration');
    if (old.supersededBy) throw new ActionError('This period has already been extended.');
    if (!Number.isInteger(input.days) || input.days <= 0)
      throw new ActionError('Extension must be at least 1 day.');
    const fee = cleanAmount(input.fee, 'Extension fee');
    if (fee <= 0) throw new ActionError('Extension fee must be more than zero.');
    const now = nowIso();
    const period: RightsPeriod = {
      id: newId(),
      collabId: c.id,
      platform: old.platform,
      startOn: extensionStartOn(old, ctx.today),
      days: input.days,
      isExtension: true,
      extensionPending: false,
      createdAt: now,
      updatedAt: now,
    };
    await rec.put('rights', {
      ...old,
      extensionPending: false,
      supersededBy: period.id,
      updatedAt: now,
    });
    await rec.put('rights', period);

    const settings = await settingsOf(db, ctx.today);
    const number = nextInvoiceNumber(settings, await db.invoices.toArray(), ctx.today).number;
    const dueOn = addDays(ctx.today, input.termDays ?? EXTENSION_PAYMENT_DAYS);
    const invoice: Invoice = {
      id: newId(),
      collabId: c.id,
      number,
      kind: 'Rights extension',
      amount: fee,
      issuedOn: ctx.today,
      dueOn,
      followUpOn: dueOn,
      payments: [],
      rightsPeriodId: period.id,
      createdAt: now,
      updatedAt: now,
    };
    await rec.put('invoices', invoice);
    await rec.put('settings', {
      ...settings,
      ...advanceCounter(settings, number, ctx.today),
      updatedAt: now,
    });
    await saveCollab(rec, c, {
      owner: 'Brand',
      nextAction: `Extension payment due ${formatShort(dueOn)}`,
      nextDue: dueOn,
    });
    await log(rec, c.id, ctx.today, `Rights extended ${input.days} days · ${number} · ${inr(fee)}`);
    return { period, invoice, endOn: rightsEndOn(period) };
  });
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'updatedAt'>>;

/** Settings changes are not collab activity and do not need a Sheet push. */
export async function updateSettings(ctx: ActionContext, patch: SettingsPatch): Promise<Settings> {
  const db = ctx.db ?? defaultDb;
  return db.transaction('rw', db.settings, async () => {
    const s = await settingsOf(db, ctx.today);
    const next: Settings = { ...s, ...patch, id: 'app', updatedAt: nowIso() };
    await db.settings.put(next);
    return next;
  });
}
