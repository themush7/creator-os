import type { DataSet, Settings } from '@/domain/types';
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
