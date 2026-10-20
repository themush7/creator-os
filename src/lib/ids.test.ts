import { describe, expect, it } from 'vitest';
import { newId, uuidFromRandomValues } from './ids';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('ids', () => {
  it('fallback produces unique v4 UUIDs (insecure contexts have no randomUUID)', () => {
    const ids = new Set(Array.from({ length: 1000 }, uuidFromRandomValues));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(V4);
  });

  it('newId works when randomUUID is missing', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(newId()).toMatch(V4);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
