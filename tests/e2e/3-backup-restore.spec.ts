import { expect, test } from '@playwright/test';
import { openApp, seed } from './helpers';

test('export backup → clear all records → import → replace restores everything', async ({
  page,
}, testInfo) => {
  // On a real iPhone, export opens the share sheet. Hide it here so the file arrives as a download.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await seed(page);
  await openApp(page, '/settings');
  const counts = page.getByText(/collaborations, \d+ invoices, \d+ rights periods/);
  await expect(counts).toHaveText(/^10 collaborations, 5 invoices, 4 rights periods/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^creator-os-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);

  await page.getByRole('button', { name: 'Clear all records' }).click();
  const clear = page.getByRole('button', { name: 'Clear all', exact: true });
  await expect(clear).toBeDisabled();
  await page.getByLabel(/Type “delete”/).fill('delete');
  await clear.click();
  await expect(counts).toHaveText(/^0 collaborations, 0 invoices, 0 rights periods/);

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByText(/^Backup from /)).toBeVisible();
  await expect(page.getByText('10 collaborations · 5 invoices · 4 rights periods')).toBeVisible();
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await page.getByRole('button', { name: 'Replace', exact: true }).click(); // confirm
  await expect(page.getByRole('status')).toContainText('Backup restored.');
  await expect(counts).toHaveText(/^10 collaborations, 5 invoices, 4 rights periods/);

  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByText('Kohl Coffee · invoice overdue')).toBeVisible();
});

test('rejects a file that is not a backup', async ({ page }, testInfo) => {
  await openApp(page, '/settings');
  const file = testInfo.outputPath('not-a-backup.json');
  await (await import('node:fs/promises')).writeFile(file, '{"hello":"world"}');
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('alert')).toHaveText('This file is not a Creator OS backup.');
});
