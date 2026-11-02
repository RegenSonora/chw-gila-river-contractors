// Settings (SPEC §4, decisions 0005, 0010): rate change check, adding a source, next number.
import { expect, test } from '@playwright/test';
import { addEntry, heading, setUp, ZONE } from './helpers.js';

test.use({ timezoneId: ZONE });

test('changing the rate with entries waiting asks first', async ({ page }) => {
  await setUp(page);
  await addEntry(page, { date: '2026-10-30', start: '09:12', end: '10:37' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(heading(page, 'Settings')).toBeVisible();
  await page.getByLabel('Hourly rate for TISUPP').fill('22.00');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const dialog = page.getByRole('dialog', { name: 'Change your TISUPP rate to $22.00?' });
  await expect(dialog).toContainText(
    'You have 1 entry not yet invoiced. If you change the rate now, they will be billed at $22.00 instead of $20.00.',
  );
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(heading(page, 'Settings')).toBeVisible();

  await page.getByRole('button', { name: 'Save changes' }).click();
  // "Create invoice first" keeps the old rate and opens the invoice preview (SPEC §4).
  await page.getByRole('dialog').getByRole('button', { name: 'Create invoice first' }).click();
  await expect(heading(page, 'New invoice')).toBeVisible();
  await expect(page.getByText('$20.00 / h')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(heading(page, 'CHW Gila River Contractors')).toBeVisible();
  await expect(page.getByText('1 entry · 1.5 h · $30.00')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate Regen Invoice' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Hourly rate for TISUPP').fill('22.00');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Change rate now' }).click();
  await expect(heading(page, 'CHW Gila River Contractors')).toBeVisible();
  await expect(page.getByText('1 entry · 1.5 h · $33.00')).toBeVisible();
});

test('TISUPP only, with the NTE prefilled and the raise named (decision 0023)', async ({
  page,
}) => {
  await page.goto('./');
  await expect(heading(page, 'Set up')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByLabel('Hourly rate for TISUPP')).toHaveValue('20.00');
  await expect(page.getByText(/It goes up to \$23\.00 after 240 hours\./)).toBeVisible();
  await expect(page.getByText(/Your not-to-exceed amount is set to \$10,320\.00\./)).toBeVisible();
  await setUp(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Not-to-exceed amount for TISUPP')).toHaveValue('10320.00');
  await expect(page.getByText(/It goes up to \$23\.00 after 240 hours\./)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(0);
  await expect(page.getByText(/all funding sources/)).toHaveCount(0);
});

test('NTE and next invoice number are saved', async ({ page }) => {
  await setUp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Not-to-exceed amount for TISUPP').fill('5,000');
  await page.getByLabel(/Next invoice number/).fill('4');
  await expect(page.getByText(/Your next invoice will be CC-\d{4}-004\./)).toBeVisible();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Not-to-exceed amount for TISUPP')).toHaveValue('5000.00');
  await expect(page.getByLabel(/Next invoice number/)).toHaveValue('4');
});
