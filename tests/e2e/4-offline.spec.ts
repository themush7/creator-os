import { expect, test } from '@playwright/test';
import { openApp, sheet } from './helpers';

// Service-worker interception is reliable in Playwright's Chromium; WebKit is skipped here.
test('@chromium-only after the first load the app reloads and works offline', async ({
  page,
  context,
}) => {
  await openApp(page);
  // Wait until the service worker has installed and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Navigate and write while offline.
  await page.getByRole('link', { name: 'Collabs' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Collabs' })).toBeVisible();
  await page.getByRole('button', { name: 'Add collaboration' }).click();
  await sheet(page).getByLabel('Brand').fill('Offline Brand');
  await sheet(page).getByLabel('Campaign or deliverable').fill('Plane reel');
  await sheet(page).getByRole('button', { name: 'Save collaboration' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Plane reel' })).toBeVisible();

  // A deep link also works offline (navigation fallback to the cached shell).
  await page.goto('/rights');
  await expect(page.getByRole('heading', { level: 1, name: 'Rights' })).toBeVisible();
  await context.setOffline(false);
});
