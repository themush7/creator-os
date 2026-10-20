import type { Collab, DataSet, Invoice, RightsPeriod, ActivityEntry } from './types';

/** Lookups built once per data change, so list derivations stay O(n). */
export interface DataIndex {
  data: DataSet;
  collabById: Map<string, Collab>;
  invoicesByCollab: Map<string, Invoice[]>;
  rightsByCollab: Map<string, RightsPeriod[]>;
  activityByCollab: Map<string, ActivityEntry[]>;
}

function groupBy<T extends { collabId: string }>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.collabId);
    if (list) list.push(item);
    else map.set(item.collabId, [item]);
  }
  return map;
}

export function buildIndex(data: DataSet): DataIndex {
  return {
    data,
    collabById: new Map(data.collabs.map((c) => [c.id, c])),
    invoicesByCollab: groupBy(data.invoices),
    rightsByCollab: groupBy(data.rights),
    activityByCollab: groupBy(data.activity),
  };
}

export function invoicesOf(index: DataIndex, collabId: string): Invoice[] {
  return index.invoicesByCollab.get(collabId) ?? [];
}

export function rightsOf(index: DataIndex, collabId: string): RightsPeriod[] {
  return index.rightsByCollab.get(collabId) ?? [];
}

export function activityOf(index: DataIndex, collabId: string): ActivityEntry[] {
  return index.activityByCollab.get(collabId) ?? [];
}

export const EMPTY_DATA: DataSet = { collabs: [], invoices: [], rights: [], activity: [] };
