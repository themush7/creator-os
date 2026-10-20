import { describe, expect, it } from 'vitest';
import { CreatorDb } from './db';
import { loadSampleData } from './repo';
import { buildSeed } from './seed';
import {
  activitySchema,
  collabSchema,
  invoiceSchema,
  rightsPeriodSchema,
  settingsSchema,
} from '@/domain/schemas';

describe('seed data', () => {
  const { data, settings } = buildSeed();

  it('every record passes its schema', () => {
    for (const c of data.collabs) expect(collabSchema.safeParse(c).success, c.id).toBe(true);
    for (const i of data.invoices) expect(invoiceSchema.safeParse(i).success, i.id).toBe(true);
    for (const r of data.rights) expect(rightsPeriodSchema.safeParse(r).success, r.id).toBe(true);
    for (const a of data.activity) expect(activitySchema.safeParse(a).success, a.id).toBe(true);
    expect(settingsSchema.safeParse(settings).success).toBe(true);
  });

  it('has unique ids and valid references', () => {
    const ids = [...data.collabs, ...data.invoices, ...data.rights, ...data.activity].map(
      (x) => x.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    const collabIds = new Set(data.collabs.map((c) => c.id));
    for (const x of [...data.invoices, ...data.rights, ...data.activity]) {
      expect(collabIds.has(x.collabId), x.id).toBe(true);
    }
  });

  it('matches the prototype records', () => {
    expect(data.collabs).toHaveLength(10);
    expect(data.collabs.filter((c) => c.archived).map((c) => c.campaign)).toEqual([
      'Cold brew launch',
    ]);
    expect(data.invoices.map((i) => i.number).sort()).toEqual([
      'INV-2026-022',
      'INV-2026-027',
      'INV-2026-031',
      'INV-2026-034',
      'INV-2026-035',
    ]);
    expect(settings.name).toBe('Sarthak');
  });

  it('loads into IndexedDB', async () => {
    const db = new CreatorDb(`seed-test-${Math.random()}`);
    await loadSampleData(db);
    expect(await db.collabs.count()).toBe(10);
    expect(await db.invoices.where('collabId').equals('seed-kohl').count()).toBe(1);
    expect((await db.settings.get('app'))?.invoiceNext).toBe(36);
    db.close();
  });
});
