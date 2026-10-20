/**
 * Backup file format, validation, migration, preview, and the two import modes.
 *
 * { "app": "creator-os", "schema": 1, "exportedAt": "ISO",
 *   "data": { "collabs": [], "invoices": [], "rights": [], "activity": [], "settings": {} } }
 */
import { z } from 'zod';
import type { CreatorDb } from '@/db/db';
import { readAll } from '@/db/repo';
import { defaultSettings } from '@/db/settings';
import {
  activitySchema,
  collabSchema,
  invoiceSchema,
  rightsPeriodSchema,
  settingsSchema,
} from '@/domain/schemas';
import type {
  ActivityEntry,
  Collab,
  DataSet,
  Invoice,
  RightsPeriod,
  Settings,
} from '@/domain/types';
import { formatShort, localToday, yearOf } from './dates';

export const BACKUP_APP = 'creator-os';
export const BACKUP_SCHEMA = 1;

export const NOT_A_BACKUP = 'This file is not a Creator OS backup.';
export const NEWER_BACKUP =
  'This backup is from a newer version of Creator OS. Update the app, then import it.';

export interface Backup {
  app: typeof BACKUP_APP;
  schema: typeof BACKUP_SCHEMA;
  exportedAt: string;
  data: DataSet & { settings: Settings };
}

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schema: z.literal(BACKUP_SCHEMA),
  exportedAt: z.string().min(1),
  data: z.object({
    collabs: z.array(collabSchema),
    invoices: z.array(invoiceSchema),
    rights: z.array(rightsPeriodSchema),
    activity: z.array(activitySchema),
    settings: settingsSchema,
  }),
});

/**
 * Brings an older backup up to the current schema. Each future schema bump adds one step,
 * so a backup from any earlier version still imports.
 */
export function migrateBackup(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const b = { ...(raw as Record<string, unknown>) };
  // schema 1 is current. Example for the next bump:
  // if (b.schema === 1) { b = upgrade1to2(b); }
  if (b.schema === 1 && b.data && typeof b.data === 'object') {
    // Settings are optional in hand-made or early files; fill defaults so validation can pass.
    const data = { ...(b.data as Record<string, unknown>) };
    const year = yearOf(localToday());
    const s = (data.settings ?? {}) as Partial<Settings>;
    const base = defaultSettings(year);
    data.settings = {
      ...base,
      ...s,
      id: 'app',
      sheetSync: { ...base.sheetSync, ...(s.sheetSync ?? {}) },
    };
    data.activity ??= [];
    b.data = data;
  }
  return b;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const schema = (raw as { schema?: unknown } | null)?.schema;
  if (
    (raw as { app?: unknown } | null)?.app === BACKUP_APP &&
    typeof schema === 'number' &&
    schema > BACKUP_SCHEMA
  ) {
    return { ok: false, error: NEWER_BACKUP };
  }
  const parsed = backupSchema.safeParse(migrateBackup(raw));
  if (!parsed.success) return { ok: false, error: NOT_A_BACKUP };
  return { ok: true, backup: parsed.data as Backup };
}

export { readAll };

export async function buildBackup(db: CreatorDb, now = new Date()): Promise<Backup> {
  const { data, settings } = await readAll(db);
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: now.toISOString(),
    data: { ...data, settings },
  };
}

export function backupFileName(today: string): string {
  return `creator-os-backup-${today}.json`;
}

/** "Backup from 21 Sep · 9 collaborations · 5 invoices · 4 rights periods" */
export function describeBackup(b: Backup): { title: string; body: string } {
  const d = b.data;
  const day = b.exportedAt.slice(0, 10);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return {
    title: `Backup from ${/^\d{4}-\d{2}-\d{2}$/.test(day) ? formatShort(day) : 'an unknown date'}`,
    body: [
      plural(d.collabs.length, 'collaboration'),
      plural(d.invoices.length, 'invoice'),
      plural(d.rights.length, 'rights period'),
    ].join(' · '),
  };
}

const TABLES = ['collabs', 'invoices', 'rights', 'activity'] as const;

/** Replace: this device becomes exactly the backup. One transaction; all or nothing. */
export async function importReplace(db: CreatorDb, b: Backup): Promise<void> {
  await db.transaction(
    'rw',
    [db.collabs, db.invoices, db.rights, db.activity, db.settings],
    async () => {
      const local = await db.settings.get('app');
      await Promise.all([
        db.collabs.clear(),
        db.invoices.clear(),
        db.rights.clear(),
        db.activity.clear(),
      ]);
      await db.collabs.bulkPut(b.data.collabs);
      await db.invoices.bulkPut(b.data.invoices);
      await db.rights.bulkPut(b.data.rights);
      await db.activity.bulkPut(b.data.activity);
      await db.settings.put({
        ...b.data.settings,
        // Device facts are not part of the backup's story.
        persistGranted: local?.persistGranted ?? b.data.settings.persistGranted,
        sheetSync: {
          ...b.data.settings.sheetSync,
          dirty: true,
          changedAt: new Date().toISOString(),
        },
      });
    },
  );
}

type Versioned = Collab | Invoice | RightsPeriod;

function newer<T extends Versioned>(incoming: T, existing: T | undefined): boolean {
  return !existing || incoming.updatedAt > existing.updatedAt;
}

export interface MergeResult {
  added: number;
  updated: number;
  kept: number;
}

/** Merge: upsert by id, keeping whichever copy has the newer `updatedAt`. One transaction. */
export async function importMerge(db: CreatorDb, b: Backup): Promise<MergeResult> {
  const result: MergeResult = { added: 0, updated: 0, kept: 0 };
  await db.transaction(
    'rw',
    [db.collabs, db.invoices, db.rights, db.activity, db.settings],
    async () => {
      for (const table of TABLES) {
        if (table === 'activity') {
          const existing = new Set(await db.activity.toCollection().primaryKeys());
          const fresh = b.data.activity.filter((a: ActivityEntry) => !existing.has(a.id));
          await db.activity.bulkPut(fresh);
          result.added += fresh.length;
          continue;
        }
        const incoming = b.data[table] as Versioned[];
        const store = db.table<Versioned, string>(table);
        const current = new Map(
          (await store.bulkGet(incoming.map((r) => r.id))).filter(Boolean).map((r) => [r!.id, r!]),
        );
        const winners = incoming.filter((r) => newer(r, current.get(r.id)));
        for (const r of incoming) {
          const had = current.get(r.id);
          if (!had) result.added++;
          else if (newer(r, had)) result.updated++;
          else result.kept++;
        }
        await store.bulkPut(winners);
      }

      const local = await db.settings.get('app');
      const theirs = b.data.settings;
      const base = !local || theirs.updatedAt > local.updatedAt ? theirs : local;
      const sameYear = local && local.invoiceYear === theirs.invoiceYear;
      await db.settings.put({
        ...base,
        // Never move the invoice counter backwards.
        invoiceNext: sameYear ? Math.max(local!.invoiceNext, theirs.invoiceNext) : base.invoiceNext,
        persistGranted: local?.persistGranted ?? theirs.persistGranted,
        sheetSync: {
          ...(local ?? theirs).sheetSync,
          dirty: true,
          changedAt: new Date().toISOString(),
        },
      });
    },
  );
  return result;
}

/** Share sheet on phones that support sharing files; download everywhere else. */
export async function deliverBackup(
  b: Backup,
  fileName: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(b, null, 2);
  const file = new File([json], fileName, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Fall through to a download if sharing failed for another reason.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
