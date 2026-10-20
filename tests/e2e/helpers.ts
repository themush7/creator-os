import { expect, type Page } from '@playwright/test';
import { buildSeed, SEED_TODAY } from '../../src/db/seed';

export const TODAY = SEED_TODAY;

/** Opens the app with the demo date pinned (remembered for the session). */
export async function openApp(page: Page, path = '/') {
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${path}${sep}today=${TODAY}`);
  await expect(page.locator('main')).toBeVisible();
}

/**
 * Writes the sample data straight into IndexedDB, then reloads. The production build has no
 * "Load sample data" button, and going through raw IndexedDB keeps the app code untouched.
 */
export async function seed(page: Page) {
  await openApp(page);
  const { data, settings } = buildSeed();
  await page.evaluate(
    async ({ data, settings }) => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open('creator-os');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const stores = ['collabs', 'invoices', 'rights', 'activity', 'settings'];
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(stores, 'readwrite');
        for (const s of stores) tx.objectStore(s).clear();
        for (const c of data.collabs) tx.objectStore('collabs').put(c);
        for (const i of data.invoices) tx.objectStore('invoices').put(i);
        for (const r of data.rights) tx.objectStore('rights').put(r);
        for (const a of data.activity) tx.objectStore('activity').put(a);
        tx.objectStore('settings').put(settings);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { data, settings },
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sarthak');
}

export function sheet(page: Page) {
  return page.getByRole('dialog');
}

/** Waits for a sheet to finish closing, so the next tap reaches the page underneath. */
export async function sheetClosed(page: Page) {
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
