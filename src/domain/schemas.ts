import { z } from 'zod';
import type {
  ActivityEntry,
  Collab,
  Invoice,
  Payment,
  RightsPeriod,
  Settings,
  SheetSyncSettings,
} from './types';
import { INVOICE_KINDS, OWNERS } from './types';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const isoTs = z.string().min(1);
const rupees = z.number().int().nonnegative();
const id = z.string().min(1);

export const collabSchema: z.ZodType<Collab> = z.object({
  id,
  brand: z.string().trim().min(1),
  campaign: z.string().trim().min(1),
  fee: rupees.nullable(),
  stage: z.number().int().min(0).max(10),
  owner: z.enum(OWNERS),
  nextAction: z.string(),
  nextDue: dateStr.nullable(),
  bookedOn: dateStr.nullable(),
  contact: z.string(),
  deliverables: z.string(),
  usageTerms: z.string(),
  productStatus: z.string(),
  shootDate: dateStr.nullable(),
  deliveredOn: dateStr.nullable(),
  links: z.string(),
  conceptNotes: z.string(),
  goLiveOn: dateStr.nullable(),
  archived: z.boolean(),
  createdAt: isoTs,
  updatedAt: isoTs,
});

export const paymentSchema: z.ZodType<Payment> = z.object({
  id,
  on: dateStr,
  amount: rupees,
  tds: rupees.optional(),
  note: z.string().optional(),
});

export const invoiceSchema: z.ZodType<Invoice> = z.object({
  id,
  collabId: id,
  number: z.string().min(1),
  kind: z.enum(INVOICE_KINDS),
  amount: rupees.positive(),
  issuedOn: dateStr,
  dueOn: dateStr,
  followUpOn: dateStr.nullable(),
  payments: z.array(paymentSchema),
  rightsPeriodId: id.optional(),
  createdAt: isoTs,
  updatedAt: isoTs,
});

export const rightsPeriodSchema: z.ZodType<RightsPeriod> = z.object({
  id,
  collabId: id,
  platform: z.string().min(1),
  startOn: dateStr,
  days: z.number().int().positive(),
  isExtension: z.boolean(),
  extensionPending: z.boolean(),
  supersededBy: id.optional(),
  createdAt: isoTs,
  updatedAt: isoTs,
});

export const activitySchema: z.ZodType<ActivityEntry> = z.object({
  id,
  collabId: id,
  on: dateStr,
  text: z.string().min(1),
  kind: z.enum(['auto', 'note']),
  createdAt: isoTs,
});

export const sheetSyncSchema: z.ZodType<SheetSyncSettings> = z.object({
  enabled: z.boolean(),
  url: z.string(),
  key: z.string(),
  sheetUrl: z.string(),
  lastSyncedAt: isoTs.nullable(),
  lastError: z.string().nullable(),
  dirty: z.boolean(),
  changedAt: isoTs.nullable().optional(),
});

export const settingsSchema: z.ZodType<Settings> = z.object({
  id: z.literal('app'),
  name: z.string(),
  defaultRightsDays: z.number().int().positive(),
  defaultPaymentDays: z.number().int().positive(),
  invoicePrefix: z.string(),
  invoiceNext: z.number().int().positive(),
  invoiceYear: z.number().int(),
  lastBackupOn: dateStr.nullable(),
  persistGranted: z.boolean().nullable(),
  sheetSync: sheetSyncSchema,
  updatedAt: isoTs,
});
