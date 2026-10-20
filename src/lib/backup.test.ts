import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CreatorDb } from '@/db/db';
import { loadSampleData } from '@/db/repo';
import {
  BACKUP_SCHEMA,
  NEWER_BACKUP,
  NOT_A_BACKUP,
  backupFileName,
  buildBackup,
  describeBackup,
  importMerge,
  importReplace,
  parseBackup,
  readAll,
} from './backup';

let db: CreatorDb;
beforeEach(async () => {
  db = new CreatorDb(`backup-${Math.random()}`);
  await loadSampleData(db);
});
afterEach(() => db.close());

const byId = <T extends { id: string }>(xs: T[]) =>
  [...xs].sort((a, b) => a.id.localeCompare(b.id));

describe('backup', () => {
  it('names the file by date', () => {
    expect(backupFileName('2026-10-02')).toBe('creator-os-backup-2026-10-02.json');
  });

  it('round trip: export → clear → import replace gives identical records', async () => {
    const before = await readAll(db);
    const text = JSON.stringify(await buildBackup(db, new Date('2026-09-21T10:00:00Z')));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(describeBackup(parsed.backup)).toEqual({
      title: 'Backup from 21 Sep',
      body: '10 collaborations · 5 invoices · 4 rights periods',
    });

    const other = new CreatorDb(`restore-${Math.random()}`);
    await importReplace(other, parsed.backup);
    const after = await readAll(other);
    expect(byId(after.data.collabs)).toEqual(byId(before.data.collabs));
    expect(byId(after.data.invoices)).toEqual(byId(before.data.invoices));
    expect(byId(after.data.rights)).toEqual(byId(before.data.rights));
    expect(byId(after.data.activity)).toEqual(byId(before.data.activity));
    expect(after.settings.invoiceNext).toBe(before.settings.invoiceNext);
    expect(after.settings.name).toBe('Sarthak');
    other.close();
  });

  it('replace removes records that are not in the backup', async () => {
    const backup = await buildBackup(db);
    await db.collabs.put({ ...backup.data.collabs[0]!, id: 'extra' });
    await importReplace(db, backup);
    expect(await db.collabs.get('extra')).toBeUndefined();
  });

  it('merge keeps the newer copy of each record and adds missing ones', async () => {
    const backup = await buildBackup(db);
    const mitti = backup.data.collabs.find((c) => c.id === 'seed-mitti')!;
    const kohl = backup.data.collabs.find((c) => c.id === 'seed-kohl')!;

    // On the device: Mitti edited later than the backup; Kohl edited earlier.
    await db.collabs.put({
      ...mitti,
      contact: 'device copy',
      updatedAt: '2026-10-10T00:00:00.000Z',
    });
    await db.collabs.put({
      ...kohl,
      contact: 'device copy',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await db.collabs.delete('seed-verde');

    const incoming = {
      ...backup,
      data: {
        ...backup.data,
        collabs: backup.data.collabs.map((c) =>
          c.id === 'seed-mitti' || c.id === 'seed-kohl' ? { ...c, contact: 'backup copy' } : c,
        ),
      },
    };
    const result = await importMerge(db, incoming);
    expect((await db.collabs.get('seed-mitti'))!.contact).toBe('device copy');
    expect((await db.collabs.get('seed-kohl'))!.contact).toBe('backup copy');
    expect(await db.collabs.get('seed-verde')).toBeDefined();
    expect(result.added).toBeGreaterThanOrEqual(1);
    expect(result.updated).toBe(1);
  });

  it('merge never moves the invoice counter backwards', async () => {
    const backup = await buildBackup(db);
    const s = (await db.settings.get('app'))!;
    await db.settings.put({ ...s, invoiceNext: 50, updatedAt: '2000-01-01T00:00:00.000Z' });
    await importMerge(db, backup);
    expect((await db.settings.get('app'))!.invoiceNext).toBe(50);
  });

  it('rejects malformed files with the agreed message', () => {
    for (const text of [
      'not json',
      '{}',
      JSON.stringify({ app: 'something-else', schema: 1, exportedAt: 'x', data: {} }),
      JSON.stringify({
        app: 'creator-os',
        schema: 1,
        exportedAt: 'x',
        data: { collabs: [{ id: 1 }], invoices: [], rights: [] },
      }),
    ]) {
      const r = parseBackup(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe(NOT_A_BACKUP);
    }
  });

  it('says so when a backup comes from a newer version', () => {
    const r = parseBackup(
      JSON.stringify({ app: 'creator-os', schema: BACKUP_SCHEMA + 1, exportedAt: 'x', data: {} }),
    );
    expect(r).toEqual({ ok: false, error: NEWER_BACKUP });
  });

  it('migrates a backup without settings or activity', async () => {
    const b = await buildBackup(db);
    const { settings: _s, activity: _a, ...rest } = b.data;
    void _s;
    void _a;
    const r = parseBackup(JSON.stringify({ ...b, data: rest }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.data.activity).toEqual([]);
      expect(r.backup.data.settings.invoicePrefix).toBe('INV-{YYYY}-');
    }
  });
});
