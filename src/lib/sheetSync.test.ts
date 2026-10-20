import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatorDb } from '@/db/db';
import { loadSampleData } from '@/db/repo';
import { buildSeed, SEED_TODAY } from '@/db/seed';
import { addNote } from '@/domain/actions';
import { buildIndex } from '@/domain/dataIndex';
import {
  buildSheetTabs,
  generateKey,
  isAppsScriptUrl,
  runSync,
  type SheetPayload,
} from './sheetSync';

describe('sheet tabs', () => {
  const tabs = buildSheetTabs(buildIndex(buildSeed().data), SEED_TODAY);

  it('has a header and one row per record, all rows the header width', () => {
    expect(tabs.Collabs).toHaveLength(11);
    expect(tabs.Invoices).toHaveLength(6);
    expect(tabs.Rights).toHaveLength(5);
    for (const rows of Object.values(tabs))
      for (const r of rows) expect(r).toHaveLength(rows[0]!.length);
  });

  it('writes readable values', () => {
    const header = tabs.Collabs[0]!;
    const kohl = tabs.Collabs.find((r) => r[1] === 'Morning ritual reel')!;
    const col = (name: string) => kohl[header.indexOf(name)];
    expect(col('Stage')).toBe('Complete');
    expect(col('Payment')).toBe('Overdue');
    expect(col('Outstanding (₹)')).toBe(45000);
    expect(col('Rights')).toBe('Expiring soon');
    const inv = tabs.Invoices.find((r) => r[0] === 'INV-2026-034')!;
    expect(inv.slice(4, 9)).toEqual([95000, 50000, 0, 45000, 'Part-paid']);
  });
});

describe('sync helpers', () => {
  it('recognises Apps Script web app URLs', () => {
    expect(isAppsScriptUrl('https://script.google.com/macros/s/AKfycbx_abc-123/exec')).toBe(true);
    expect(isAppsScriptUrl('https://script.google.com/macros/s/AKfycbx/dev')).toBe(false);
    expect(isAppsScriptUrl('https://example.com/exec')).toBe(false);
  });

  it('generates 24-character keys', () => {
    const k = generateKey();
    expect(k).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(generateKey()).not.toBe(k);
  });
});

describe('runSync', () => {
  let db: CreatorDb;
  beforeEach(async () => {
    db = new CreatorDb(`sync-${Math.random()}`);
    await loadSampleData(db);
    const s = (await db.settings.get('app'))!;
    await db.settings.put({
      ...s,
      sheetSync: {
        ...s.sheetSync,
        enabled: true,
        url: 'https://script.google.com/macros/s/x/exec',
        key: 'k',
        dirty: true,
        changedAt: 'a',
      },
    });
  });
  afterEach(() => db.close());

  it('skips when nothing changed or the mirror is off', async () => {
    const push = vi.fn(async () => {});
    const s = (await db.settings.get('app'))!;
    await db.settings.put({ ...s, sheetSync: { ...s.sheetSync, dirty: false } });
    expect(await runSync(db, SEED_TODAY, push)).toBe('skipped');
    expect(push).not.toHaveBeenCalled();
  });

  it('pushes with the key and clears dirty', async () => {
    const push = vi.fn(async (_url: string, _p: SheetPayload) => {});
    expect(await runSync(db, SEED_TODAY, push)).toBe('synced');
    expect(push.mock.calls[0]![1].key).toBe('k');
    const s = (await db.settings.get('app'))!.sheetSync;
    expect(s.dirty).toBe(false);
    expect(s.lastSyncedAt).not.toBeNull();
  });

  it('keeps dirty when an edit lands during the push', async () => {
    const push = vi.fn(async () => {
      await addNote({ db, today: SEED_TODAY }, 'seed-mitti', 'edited mid-push');
    });
    expect(await runSync(db, SEED_TODAY, push)).toBe('synced');
    expect((await db.settings.get('app'))!.sheetSync.dirty).toBe(true);
  });

  it('manual export runs with automatic updates off and creates the pairing key', async () => {
    const s = (await db.settings.get('app'))!;
    await db.settings.put({
      ...s,
      sheetSync: { ...s.sheetSync, enabled: false, dirty: false, key: '' },
    });
    const push = vi.fn(async (_url: string, _p: SheetPayload) => {});
    expect(await runSync(db, SEED_TODAY, push)).toBe('skipped');
    expect(await runSync(db, SEED_TODAY, push, { manual: true })).toBe('synced');
    const key = (await db.settings.get('app'))!.sheetSync.key;
    expect(key).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(push.mock.calls[0]![1].key).toBe(key);
  });

  it('rejects a Sheet link pasted as the web app URL, without calling out', async () => {
    const s = (await db.settings.get('app'))!;
    await db.settings.put({
      ...s,
      sheetSync: { ...s.sheetSync, url: 'https://docs.google.com/spreadsheets/d/abc/edit' },
    });
    const push = vi.fn();
    expect(await runSync(db, SEED_TODAY, push, { manual: true })).toBe('failed');
    expect(push).not.toHaveBeenCalled();
    expect((await db.settings.get('app'))!.sheetSync.lastError).toMatch(/That is the Sheet link/);
  });

  it('manual export needs a URL', async () => {
    const s = (await db.settings.get('app'))!;
    await db.settings.put({ ...s, sheetSync: { ...s.sheetSync, url: '' } });
    expect(await runSync(db, SEED_TODAY, vi.fn(), { manual: true })).toBe('skipped');
  });

  it('records the error and stays dirty on failure', async () => {
    const push = vi.fn(async () => {
      throw new Error('The key does not match the script.');
    });
    expect(await runSync(db, SEED_TODAY, push)).toBe('failed');
    const s = (await db.settings.get('app'))!.sheetSync;
    expect(s.lastError).toBe('The key does not match the script.');
    expect(s.dirty).toBe(true);
  });
});
