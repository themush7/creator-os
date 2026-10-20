import Dexie, { type EntityTable } from 'dexie';
import type { ActivityEntry, Collab, Invoice, RightsPeriod, Settings } from '@/domain/types';

/** Bump together with a new `this.version(n)` block below. Backups carry their own `schema`. */
export const DB_SCHEMA_VERSION = 1;

export class CreatorDb extends Dexie {
  collabs!: EntityTable<Collab, 'id'>;
  invoices!: EntityTable<Invoice, 'id'>;
  rights!: EntityTable<RightsPeriod, 'id'>;
  activity!: EntityTable<ActivityEntry, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'creator-os') {
    super(name);
    // Booleans are not valid IndexedDB keys, so `archived` is filtered in memory.
    this.version(1).stores({
      collabs: 'id, stage, nextDue, bookedOn, updatedAt',
      invoices: 'id, collabId, number, issuedOn, dueOn, updatedAt',
      rights: 'id, collabId, startOn, updatedAt',
      activity: 'id, collabId, on, createdAt',
      settings: 'id',
    });
    // Future migrations go here, e.g.
    // this.version(2).stores({...}).upgrade(tx => ...)
  }
}

export const db = new CreatorDb();

export const ALL_TABLES = ['collabs', 'invoices', 'rights', 'activity', 'settings'] as const;
