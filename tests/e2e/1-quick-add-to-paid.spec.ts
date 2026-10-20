import { expect, test } from '@playwright/test';
import { openApp, sheet, sheetClosed } from './helpers';

test('quick add → delivered → approved → invoice → half → rest → Clear and Paid', async ({
  page,
}) => {
  await openApp(page);

  await page.getByRole('button', { name: 'Add collaboration' }).first().click();
  const add = sheet(page);
  await add.getByLabel('Brand').fill('Acme Studio');
  await add.getByLabel('Campaign or deliverable').fill('Launch reel');
  await add.getByLabel('Fee').fill('80000');
  await add.getByRole('button', { name: 'Save collaboration' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Launch reel' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Saved. Add details when you have them.');
  await sheetClosed(page);

  // Jump straight to Delivered from the full stage list.
  await page.getByRole('button', { name: 'Update stage' }).click();
  await sheet(page)
    .getByRole('radio', { name: /Delivered/ })
    .click();
  await sheetClosed(page);
  await expect(page.getByText('Stage 9 of 11')).toBeVisible();

  await page.getByRole('button', { name: 'Update stage' }).click();
  await sheet(page).getByRole('button', { name: 'Mark approved' }).click();
  await sheetClosed(page);
  await expect(page.getByText('Stage 11 of 11')).toBeVisible();

  await page.getByRole('button', { name: 'Invoice', exact: true }).click();
  const invoice = sheet(page);
  await expect(invoice.getByLabel('Amount')).toHaveValue('80000');
  await invoice.getByRole('button', { name: 'Record invoice' }).click();
  await sheetClosed(page);
  await expect(page.getByText(/^INV-2026-\d{3}$/)).toBeVisible();

  await page.getByRole('button', { name: 'Record payment' }).click();
  const pay = sheet(page);
  await pay.getByRole('button', { name: /^Half/ }).click();
  await expect(pay.getByText('Remaining after this: ₹40,000.')).toBeVisible();
  await pay.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('status')).toContainText('Payment recorded. ₹40,000 remaining.');
  await sheetClosed(page);

  await page.getByRole('button', { name: 'Record payment' }).click();
  const rest = sheet(page);
  await expect(rest.getByText('This settles the invoice.')).toBeVisible();
  await rest.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('status')).toContainText('Paid in full.');
  await sheetClosed(page);

  const status = page.getByLabel('Status');
  await expect(status.getByText('Clear', { exact: true })).toBeVisible();
  await expect(status.getByText('Paid', { exact: true })).toBeVisible();

  // Added from Home, so Back returns to Home.
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good');
  await page.getByRole('link', { name: 'Collabs' }).click();
  await page.getByRole('button', { name: /^Paid/ }).click();
  await expect(
    page.getByRole('button', { name: 'Acme Studio, Launch reel, Complete, Clear next' }),
  ).toBeVisible();
});
