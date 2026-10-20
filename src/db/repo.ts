import type { DataSet, Settings } from '@/domain/types';
import { localToday, yearOf } from '@/lib/dates';
import { db as defaultDb, type CreatorDb } from './db';
import { buildSeed } from './seed';
import { defaultSettings } from './settings';

/** Overwrite every table in one transaction. */
export async function replaceAll(
  data: DataSet,
  settings: Settings,
  db: CreatorDb = defaultDb,
): Promise<void> {
  await db.transaction(
    'rw',
    [db.collabs, db.invoices, db.rights, db.activity, db.settings],
    async () => {
      await Promise.all([
        db.collabs.clear(),
        db.invoices.clear(),
        db.rights.clear(),
        db.activity.clear(),
        db.settings.clear(),
      ]);
      await db.collabs.bulkPut(data.collabs);
      await db.invoices.bulkPut(data.invoices);
      await db.rights.bulkPut(data.rights);
      await db.activity.bulkPut(data.activity);
      await db.settings.put(settings);
    },
  );
}

export async function loadSampleData(db: CreatorDb = defaultDb): Promise<void> {
  const { data, settings } = buildSeed();
  await replaceAll(data, settings, db);
}

/** Settings row, created with defaults on first read. */
export async function getSettings(year: number, db: CreatorDb = defaultDb): Promise<Settings> {
  const existing = await db.settings.get('app');
  if (existing) return existing;
  const fresh = defaultSettings(year);
  await db.settings.put(fresh);
  return fresh;
}

/** Deletes every collab, invoice, rights period and activity entry. Settings stay. */
export async function clearRecords(db: CreatorDb = defaultDb): Promise<void> {
  await db.transaction(
    'rw',
    [db.collabs, db.invoices, db.rights, db.activity, db.settings],
    async () => {
      await Promise.all([
        db.collabs.clear(),
        db.invoices.clear(),
        db.rights.clear(),
        db.activity.clear(),
      ]);
      const s = await db.settings.get('app');
      if (s)
        await db.settings.put({
          ...s,
          sheetSync: { ...s.sheetSync, dirty: true, changedAt: new Date().toISOString() },
        });
    },
  );
}

/** Every record and the settings row, read in parallel. */
export async function readAll(
  db: CreatorDb = defaultDb,
): Promise<{ data: DataSet; settings: Settings }> {
  const [collabs, invoices, rights, activity, settings] = await Promise.all([
    db.collabs.toArray(),
    db.invoices.toArray(),
    db.rights.toArray(),
    db.activity.toArray(),
    db.settings.get('app'),
  ]);
  return {
    data: { collabs, invoices, rights, activity },
    settings: settings ?? defaultSettings(yearOf(localToday())),
  };
}
