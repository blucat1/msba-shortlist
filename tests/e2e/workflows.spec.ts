import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/demo'); await expect(page.getByRole('heading', { name: /Find your kind/ })).toBeVisible(); });

test('discovery saves, dismisses, restores, filters, deep links, and persists', async ({ page }) => {
  await expect(page.getByText('— sample jobs; changes stay in this browser.', { exact: false })).toBeVisible();
  const card = page.locator('.job-card').first();
  const title = await card.locator('h3').innerText();
  await card.getByRole('button', { name: `Save ${title}`, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved to My Search');
  await page.reload();
  await page.goto('/demo/my-search');
  await expect(page.locator('.tracker-role').filter({ hasText: title })).toBeVisible();
  await page.goto('/demo/opportunities');
  const dismissedTitle = await page.locator('.job-card').first().locator('h3').innerText();
  await page.locator('.job-card').first().getByRole('button', { name: `Dismiss ${dismissedTitle}`, exact: true }).click();
  await expect(page.locator('.job-card').filter({ hasText: dismissedTitle })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filters', exact: false }).first().click();
  await page.getByLabel('Show saved & dismissed roles').check();
  await page.getByRole('button', { name: 'Show opportunities', exact: true }).click();
  await page.getByLabel('Search opportunities').fill(dismissedTitle);
  await expect(page.locator('.job-card')).toHaveCount(1);
  await page.getByRole('button', { name: `Restore ${dismissedTitle}`, exact: true }).click();
  await page.getByRole('button', { name: 'View role', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(dismissedTitle);
  const deepLink = page.url(); await page.reload();
  await expect(page.getByRole('dialog')).toContainText(dismissedTitle);
  expect(deepLink).toContain('job=');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.job-card').first()).toBeVisible();
});

test('opening an application never submits; explicit confirmation updates history and insights once', async ({ page }) => {
  await page.goto('/demo/insights');
  const original = Number(await page.locator('.metric-card').first().locator('strong').innerText());
  await page.goto('/demo/opportunities');
  const title = await page.locator('.job-card').first().locator('h3').innerText();
  await page.getByRole('button', { name: `Open application for ${title}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Demo interaction');
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText(title);
  await page.getByRole('button', { name: 'Not yet', exact: true }).click();
  await page.goto('/demo/insights');
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText(String(original));
  await page.goto('/demo/opportunities');
  await page.getByRole('button', { name: `Open application for ${title}`, exact: true }).click();
  await page.getByRole('button', { name: 'Yes, I applied', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept reminder', exact: false }).click();
  await expect(page.getByRole('status')).toContainText('Review reminder accepted');
  await page.goto('/demo/insights');
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText(String(original + 1));
  const appliedEvents = await page.evaluate((target) => {
    const state = JSON.parse(localStorage.getItem('msba-shortlist:demo:v1')!).backup;
    const record = state.opportunities.find((o: { title: string }) => o.title === target);
    return state.events.filter((e: { opportunityId: string; newStage: string }) => e.opportunityId === record.id && e.newStage === 'Applied').length;
  }, title);
  expect(appliedEvents).toBe(1);
});

test('manual roles edit, group by exact company, create/snooze/complete tasks, and preserve history', async ({ page }) => {
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Company *', { exact: true }).fill('Example Harbor');
  await dialog.getByLabel('Job title *', { exact: true }).fill('Decision Analytics Associate');
  await dialog.getByLabel('Private notes', { exact: true }).fill('Bring a thoughtful question.');
  await dialog.getByLabel('Next action (optional)', { exact: true }).fill('Review the analytics team');
  await dialog.getByLabel('Next action date', { exact: true }).fill('2026-10-22');
  await dialog.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/demo/my-search');
  await page.getByRole('button', { name: 'Group by company', exact: true }).click();
  await expect(page.locator('.company-group-heading').filter({ hasText: 'Example Harbor' })).toBeVisible();
  const row = page.locator('.tracker-row').filter({ hasText: 'Decision Analytics Associate' }).filter({ hasText: 'Example Harbor' });
  await row.getByRole('combobox').selectOption('Interviewing');
  await expect(row.getByRole('combobox')).toHaveValue('Interviewing');
  await row.getByRole('button', { name: /Decision Analytics Associate Example Harbor/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Unknown — excluded');
  await expect(page.getByRole('dialog')).toContainText('Saved → Interviewing');
  await page.getByRole('button', { name: 'Edit role', exact: true }).click();
  await page.getByLabel('Private notes', { exact: true }).fill('Edited after reviewing.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /^Next steps/ }).click();
  await page.getByRole('button', { name: 'Review the analytics team', exact: true }).click();
  await page.getByLabel('State', { exact: true }).selectOption('snoozed');
  await page.getByLabel('Snooze until', { exact: true }).fill('2026-10-25');
  await page.getByRole('button', { name: 'Save next step', exact: true }).click();
  await expect(page.locator('.task-list-row').filter({ hasText: 'Review the analytics team' })).toContainText('Snoozed');
  await page.getByRole('button', { name: 'Complete Review the analytics team', exact: true }).click();
  await expect(page.locator('.task-list-row').filter({ hasText: 'Review the analytics team' })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.completed-tasks')).toContainText('completed steps');
});

test('preferences change ranking, JSON round-trip skips duplicates, CSV previews row errors', async ({ page }) => {
  const initial = await page.locator('.job-card').first().locator('h3').innerText();
  await page.getByRole('button', { name: 'Your preferences', exact: true }).click();
  while (await page.locator('.choice.chosen').count()) await page.locator('.choice.chosen').first().click();
  await page.getByRole('button', { name: 'Data engineering', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Preferred locations', { exact: true }).fill('Denver');
  await page.getByLabel('Years of relevant experience', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('.job-card').first().locator('h3')).not.toHaveText(initial);
  await expect(page.locator('.job-card').first()).toContainText('Data engineering matches');
  await page.getByRole('button', { name: 'Your preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Data & account', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.getByLabel('Import JSON or CSV backup').setInputFiles(path!);
  await expect(page.getByText('Review this import', { exact: true })).toBeVisible();
  await expect(page.locator('.import-preview')).toContainText('12 duplicates');
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('skipped 12 duplicates');
  await page.getByLabel('Import JSON or CSV backup').setInputFiles({ name: 'roles.csv', mimeType: 'text/csv', buffer: Buffer.from('company,title,application_date\nNorthstar,Data Analyst,2026-02-30\nNorthstar,Product Analyst,2026-10-01\n') });
  await expect(page.locator('.import-preview')).toContainText('Row 2:');
  await expect(page.locator('.import-preview')).toContainText('1 opportunities from CSV');
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click();
  await page.keyboard.press('Escape');
});

test('mobile/tablet/desktop, keyboard, honest live configuration and empty states', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['opportunities', 'my-search', 'insights']) {
      await page.goto(`/demo/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  await page.goto('/demo/opportunities');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByLabel('Search opportunities').fill('nothing-will-match-this-unique-query');
  await expect(page.getByRole('heading', { name: 'A little too specific, perhaps.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.locator('.job-card').first()).toBeVisible();
  await page.goto('/opportunities');
  await expect(page.getByRole('heading', { name: 'The live workspace needs setup.' })).toBeVisible();
  await expect(page.locator('.job-card')).toHaveCount(0);
  await page.getByRole('link', { name: 'Try the demo', exact: true }).click();
  await expect(page.locator('.job-card').first()).toBeVisible();
});

test('corrupt demo storage has an honest recovery path', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('msba-shortlist:demo:v1', '{broken'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your workspace couldn’t load' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Find your kind/ })).toBeVisible();
});
