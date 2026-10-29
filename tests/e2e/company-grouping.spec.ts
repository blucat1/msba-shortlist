import { expect, test } from '@playwright/test';

test('All listings keeps each hiring company together while search narrows its roles', async ({ page }) => {
  await page.goto('/demo/opportunities?view=all');
  const companies = page.locator('.catalog-company-list > .company-role-group');
  await expect(companies.first()).toBeVisible();
  const groups = await companies.evaluateAll(elements => elements.map(element => ({
    name: element.querySelector('h2')!.textContent!.trim(),
    labels: Array.from(element.querySelectorAll('.job-card')).map(card => card.getAttribute('aria-label')),
  })));
  expect(groups.length).toBeGreaterThan(1);
  expect(groups.length).toBeLessThanOrEqual(15);
  expect(new Set(groups.map(group => group.name)).size).toBe(groups.length);
  for (const group of groups) {
    expect(group.labels.length).toBeGreaterThan(0);
    expect(group.labels.every(label => label?.endsWith(` at ${group.name}`))).toBe(true);
  }
  const company = groups[0];
  await page.getByRole('textbox', { name: 'Search opportunities', exact: true }).fill(company.name);
  await expect(companies).toHaveCount(1);
  await expect(companies.locator('h2')).toHaveText(company.name);
  await expect(companies.locator('.job-card')).toHaveCount(company.labels.length);
  await expect(companies.locator('.company-mark').first()).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(companies).toHaveCount(groups.length);
});
