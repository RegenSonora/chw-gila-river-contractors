// Timer rules (SPEC §5, decision 0009): survives reload, chip locked, discard confirms, too short.
import { expect, test } from '@playwright/test';
import { addEntry, expectAccessible, heading, setUp, taskBox, ZONE } from './helpers.js';

test.use({ timezoneId: ZONE });

test('survives a reload; no source chip with one source', async ({ page }) => {
  await setUp(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('Timer running · TISUPP')).toBeVisible();
  // Decision 0023: nothing to switch to, so no chip at all.
  await expect(page.getByRole('button', { name: /^Funding source/ })).toHaveCount(0);
});

test('Discard timer asks first', async ({ page }) => {
  await setUp(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.getByRole('button', { name: 'Discard timer' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard this timer?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep timing' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Discard timer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard timer' }).click();
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
});

test('a timer under 7.5 minutes is too short: keep timing or discard', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-30T09:00:00-07:00') });
  await setUp(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  // 7:00 leaves room for real time passing; the 449/450-second edge is a unit test.
  await page.clock.fastForward('07:00');
  await page.getByRole('button', { name: 'Stop' }).click();
  const dialog = page.getByRole('dialog', { name: 'Too short to bill' });
  await expect(dialog).toContainText("That's under 8 minutes, too short to bill.");
  await dialog.getByRole('button', { name: 'Keep timing' }).click();
  await expect(page.getByRole('timer')).toHaveText(/^0:07:\d\d$/);

  // Past 7.5 minutes it rounds up to 0.25 h.
  await page.clock.fastForward('01:00');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('0.25 hrs')).toBeVisible();
  await page.goBack();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard entry' }).click();
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();

  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
});

test('a timer that overlaps an entry goes to Enter times to fix it', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-30T09:00:00-07:00') });
  await setUp(page);
  // Typed in ahead of time, so a timer started now runs into it.
  await addEntry(page, { date: '2026-10-30', start: '10:15', end: '10:30' });
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward('02:00:00');
  await page.getByRole('button', { name: 'Stop' }).click();
  const dialog = page.getByRole('dialog', { name: 'This time overlaps another entry' });
  await expect(dialog).toContainText(
    'This timer overlaps your 10:15–10:30 AM entry on Oct 30 (Client check in).',
  );
  await dialog.getByRole('button', { name: 'Fix the times' }).click();
  await expect(heading(page, 'Enter times')).toBeVisible();
  await expect(page.getByLabel('Start')).toHaveValue('09:00');
  await expect(page.getByLabel('End')).toHaveValue('11:00');
  await expect(page.getByRole('alert')).toContainText('This overlaps your 10:15–10:30 AM entry');
  await page.getByLabel('End').fill('10:15');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(heading(page, 'What did you do?')).toBeVisible();
});

test('pause and resume: one entry, paused time not billed (decision 0027)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-30T09:00:00-07:00') });
  await setUp(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward('40:00');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused · TISUPP')).toBeVisible();
  await expect(page.getByText(/^Paused since 9:40 AM$/)).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(/^0:40:\d\d$/);
  await expectAccessible(page, 'timer paused');

  // A long pause survives closing the app, and the clock stays stopped.
  await page.clock.fastForward('20:00');
  await page.reload();
  await expect(page.getByText('Paused · TISUPP')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText(/^0:40:\d\d$/);

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Timer running · TISUPP')).toBeVisible();
  await page.clock.fastForward('30:00');
  await page.getByRole('button', { name: 'Stop' }).click();
  // 9:00–10:30 less the 20-minute pause: 1 h 10 worked, 1.25 hrs billed.
  await expect(heading(page, 'What did you do?')).toBeVisible();
  await expect(page.getByText(/Rounded from 1 hr 1\d min worked · 20 min paused/)).toBeVisible();
  await expect(page.getByText('1.25 hrs', { exact: true })).toBeVisible();
  await taskBox(page, 'Outreach').check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.getByText('1 entry · 1.25 hrs · $25.00')).toBeVisible();

  // Edit shows the pause; Remove breaks bills the whole span.
  await page.getByRole('button', { name: /Outreach/ }).click();
  await expect(page.getByText(/less 20 min paused/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove breaks' }).click();
  await expect(page.getByText('1.5 hrs', { exact: true })).toBeVisible();
});

test('stop while paused ends the entry at the pause', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-30T09:00:00-07:00') });
  await setUp(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward('01:00:00');
  await page.getByRole('button', { name: 'Pause' }).click();
  // Left paused for hours: none of it is billed.
  await page.clock.fastForward('05:00:00');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(heading(page, 'What did you do?')).toBeVisible();
  await expect(page.getByText('1 hr', { exact: true })).toBeVisible();
});
