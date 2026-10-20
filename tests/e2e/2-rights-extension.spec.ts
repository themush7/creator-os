import { expect, test } from '@playwright/test';
import { seed, sheet, sheetClosed } from './helpers';

test('Kohl Coffee: rights end in 3 days → ask → pending → extend 30 days for ₹20,000', async ({
  page,
}) => {
  await seed(page);

  const item = page.getByRole('button', { name: /Kohl Coffee · rights end in 3 days/ });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Morning ritual reel' })).toBeVisible();

  await page.getByRole('button', { name: 'Ask about extension' }).click();
  await expect(page.getByRole('status')).toContainText('Marked as extension pending.');

  // The Rights tab now lists Kohl under Extension pending.
  await page.getByRole('button', { name: /Home/ }).click();
  await page.getByRole('link', { name: 'Rights' }).click();
  const pending = page.getByRole('region', { name: 'Extension pending' });
  await expect(pending.getByText('Kohl Coffee')).toBeVisible();
  await pending.getByRole('button', { name: /Kohl Coffee/ }).click();

  await page.getByRole('button', { name: 'Record extension' }).click();
  const ext = sheet(page);
  await expect(ext.getByText(/New period 5 Oct – 3 Nov/)).toBeVisible();
  await ext.getByLabel('Extension fee').fill('20000');
  await ext.getByRole('button', { name: 'Record extension' }).click();
  await sheetClosed(page);
  await expect(page.getByRole('status')).toContainText(/Extension recorded with INV-2026-\d{3}\./);

  await expect(page.getByText('5 Oct – 3 Nov · 30 days')).toBeVisible();
  await expect(page.getByText('Instagram · extension')).toBeVisible();
  await expect(page.getByText('Rights extension', { exact: true })).toBeVisible();
  await expect(page.getByText('₹20,000', { exact: true }).first()).toBeVisible();
});
