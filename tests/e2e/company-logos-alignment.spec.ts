import { expect, test } from '@playwright/test';

test('known employer logos load locally and an unavailable image falls back to initials', async ({ page }) => {
  const imageOrigins = new Set<string>();
  page.on('request', request => { if (request.resourceType() === 'image' && request.url().startsWith('http')) imageOrigins.add(new URL(request.url()).origin); });
  await page.goto('/demo/my-search');
  for (const company of ['CertiK', 'Precision Medicine Group', 'ERG (Eastern Research Group)', 'Solace']) {
    await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Company *', { exact: true }).fill(company);
    await dialog.getByLabel('Job title *', { exact: true }).fill('Local logo rendering check');
    await dialog.getByRole('button', { name: 'Add opportunity', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.locator('.tracker-row').filter({ hasText: company }).filter({ hasText: 'Local logo rendering check' });
    const logo = row.locator('.company-logo-image');
    await expect(logo).toHaveAttribute('src', /^\/logos\//);
    await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect([...imageOrigins]).toEqual([new URL(page.url()).origin]);
  await page.route('**/logos/certik.webp', route => route.abort());
  await page.reload();
  const fallback = page.locator('.tracker-row').filter({ hasText: 'CertiK' }).filter({ hasText: 'Local logo rendering check' }).locator('.company-mark');
  await expect(fallback).toHaveText('C');
  await expect(fallback.locator('img')).toHaveCount(0);
});

test('job cards show alignment before review items on desktop and phone', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demo/opportunities');
    const card = page.locator('.job-card').first();
    await expect(card).toBeVisible();
    const aligned = card.locator('.eligibility-alignment');
    const review = card.locator('.eligibility-check-intro');
    const disclosure = card.locator('.eligibility-compact > details');
    await expect(aligned.getByText('What aligns', { exact: true })).toBeVisible();
    await expect(aligned.locator('.recommendation-reasons li').first()).toBeVisible();
    expect(await aligned.locator('.recommendation-reasons li').count()).toBeLessThanOrEqual(3);
    expect(await aligned.evaluate(element => !!(element.compareDocumentPosition(element.parentElement!.querySelector('.eligibility-check-intro')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(review).toBeVisible();
    await expect(disclosure.locator('summary').first()).toContainText('What to check');
    await expect(disclosure).not.toHaveAttribute('open');
    await disclosure.locator('summary').first().click();
    await expect(disclosure.locator('.eligibility-check')).toHaveCount(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
