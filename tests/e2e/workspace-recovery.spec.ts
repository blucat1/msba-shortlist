import { expect, test } from '@playwright/test';

const catalog = '/demo/opportunities?view=all&career=new-grad&show-saved=0&details=0';
const storageKey = 'msba-shortlist:demo:v1';

test('future application dates do not save and a valid retry accepts one reminder', async ({ page }) => {
  await page.goto(catalog);
  await expect(page.locator('.job-card').first()).toBeVisible();
  const original = await page.evaluate(key => localStorage.getItem(key), storageKey);
  const title = await page.locator('.job-card').first().locator('h3').innerText();
  await page.getByRole('button', { name: `Open application for ${title}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Did you submit this application?' });
  const date = dialog.getByLabel('Application date', { exact: true });
  const today = await date.inputValue();
  const future = new Date(`${today}T12:00:00Z`); future.setUTCDate(future.getUTCDate() + 1);
  const futureDate = future.toISOString().slice(0, 10);
  await date.fill(futureDate);
  await dialog.getByRole('button', { name: 'Yes, I applied', exact: true }).click();

  await expect(dialog.getByRole('alert')).toContainText('The application date cannot be in the future.');
  await expect(date).toHaveValue(futureDate);
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(original);

  await date.fill(today);
  await dialog.getByRole('button', { name: 'Yes, I applied', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const reminder = page.getByRole('button', { name: 'Accept reminder', exact: false });
  await reminder.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole('status')).toContainText('Review reminder accepted');
  await page.reload();
  const counts = await page.evaluate(({ key, title }) => {
    const { backup } = JSON.parse(localStorage.getItem(key)!);
    const role = backup.opportunities.find((item: { title: string }) => item.title === title);
    return {
      reminders: backup.tasks.filter((item: { opportunityId: string; type: string; origin: string }) => item.opportunityId === role.id && item.type === 'review' && item.origin === 'suggested').length,
      submissions: backup.events.filter((item: { opportunityId: string; newStage: string }) => item.opportunityId === role.id && item.newStage === 'Applied').length,
    };
  }, { key: storageKey, title });
  expect(counts).toEqual({ reminders: 1, submissions: 1 });
});

test('mobile primary navigation has three routes, updates the title, and manages route focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(catalog);
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(navigation.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  const search = page.getByLabel('Search opportunities', { exact: true });
  await search.fill('Analyst');
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(/q=Analyst/);
  await navigation.getByRole('link', { name: 'My Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Search', exact: true, level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/My Search/);
  await expect(page.locator('#main-content')).toBeFocused();
  await navigation.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Insights', exact: true, level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/Insights/);
  await expect(page.locator('#main-content')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
