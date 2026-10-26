import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const resumeFixture = fileURLToPath(new URL('../fixtures/resume/private-synthetic-9517.txt', import.meta.url));
const reviewName = 'I reviewed this profile. Use it for matches in this tab.';
const privateMarkers = ['RESUME_ONLY_SYNTHETIC_9517', 'resume-synthetic-9517@example.test', 'private-synthetic-9517'];

async function adjust(page: Page) {
  await page.getByRole('button', { name: 'Adjust recommendations', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Adjust recommendations', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function titles(page: Page) { return page.locator('.job-card h3').allTextContents(); }
async function update(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Adjust recommendations', exact: true });
  await dialog.getByRole('button', { name: 'Update matches', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/opportunities');
  await expect(page.getByRole('button', { name: 'Shortlist', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Top matches for you', exact: true, level: 1 })).toBeVisible();
});

test('Shortlist starts with five ranked matches and recorded reasons, then reveals five more', async ({ page }) => {
  await expect(page.getByLabel('Search opportunities', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Matching method', { exact: true })).toHaveCount(0);
  await expect(page.locator('.job-card')).toHaveCount(5);
  const total = Number((await page.locator('.listing-count').innerText()).match(/^\d+/)?.[0]);
  expect(total).toBeGreaterThan(5);
  for (const tier of ['experienced', 'early-career', 'unverified']) await expect(page.locator(`.job-card .experience-evidence.${tier}`)).toHaveCount(0);
  const reasons = page.locator('.recommendation-reasons').first();
  await expect(reasons).toBeVisible();
  await expect(reasons.locator('li').first()).toContainText(/matches|you listed|aligns|overlap|meets/i);
  await expect(reasons).not.toContainText(/outside your|differs from|experience stretch|missing/i);
  const firstFive = await titles(page);
  await page.getByRole('button', { name: 'Show more recommendations', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(Math.min(10, total));
  expect((await titles(page)).slice(0, 5)).toEqual(firstFive);
  expect(Number((await page.locator('.listing-count').innerText()).match(/^\d+/)?.[0])).toBe(total);
});

test('recommendation edits preview without applying; Cancel discards and Update changes actual results', async ({ page }) => {
  const originalUrl = page.url(), originalTitles = await titles(page);
  const dialog = await adjust(page);
  await dialog.getByRole('checkbox', { name: 'Product analytics', exact: true }).check();
  await dialog.getByLabel('Location', { exact: true }).fill('San Francisco');
  expect(page.url()).toBe(originalUrl);
  expect(await titles(page)).toEqual(originalTitles);
  await expect(dialog.getByRole('status')).toContainText(/\d/);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(page.url()).toBe(originalUrl);
  expect(await titles(page)).toEqual(originalTitles);

  const reopened = await adjust(page);
  await expect(reopened.getByRole('checkbox', { name: 'Product analytics', exact: true })).not.toBeChecked();
  await expect(reopened.getByLabel('Location', { exact: true })).toHaveValue('');
  await reopened.getByRole('checkbox', { name: 'Product analytics', exact: true }).check();
  await reopened.getByLabel('Location', { exact: true }).fill('San Francisco');
  await update(page);
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  await expect(page.locator('.recommendation-reasons')).toContainText('Product analytics matches');
  expect(new URL(page.url()).searchParams.get('rec-role')).toBe('product-analytics');
  expect(new URL(page.url()).searchParams.get('rec-location')).toBe('San Francisco');
  await page.reload();
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
});

test('empty recommendations offer a draft reset while keeping All listings filters intact', async ({ page }) => {
  await page.goto('/demo/opportunities?q=Principal&role=data-science&career=experienced&match=filters');
  const originalTitles = await titles(page);
  const dialog = await adjust(page);
  await dialog.getByLabel('Location', { exact: true }).fill('NO_SUCH_LOCATION_48219');
  await update(page);
  await expect(page.getByRole('heading', { name: 'No matches for these preferences.', exact: true })).toBeVisible();
  await expect(page.locator('.job-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Change preferences', exact: true }).click();
  const reopened = page.getByRole('dialog', { name: 'Adjust recommendations', exact: true });
  const beforeReset = page.url();
  await reopened.getByRole('button', { name: 'Reset recommendations', exact: true }).click();
  expect(page.url()).toBe(beforeReset);
  await expect(reopened.getByLabel('Location', { exact: true })).toHaveValue('');
  await expect(reopened.getByLabel('Experience', { exact: true })).toHaveValue('new-grad');
  await update(page);
  await expect(page.locator('.job-card h3')).toHaveText(originalTitles);
  const params = new URL(page.url()).searchParams;
  expect([...params.keys()].filter(key => key.startsWith('rec-'))).toEqual([]);
  expect(params.get('q')).toBe('Principal'); expect(params.get('role')).toBe('data-science');
  expect(params.get('career')).toBe('experienced'); expect(params.get('match')).toBe('filters');
});

test('Shortlist preferences and matching mode stay independent from the All listings search', async ({ page }) => {
  await page.goto('/demo/opportunities?view=all&q=Principal&role=data-science&career=experienced&match=filters');
  await expect(page.locator('.job-card h3')).toHaveText(['Principal Data Scientist']);
  await page.getByRole('button', { name: 'Shortlist', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(5);
  const dialog = await adjust(page);
  await dialog.getByRole('checkbox', { name: 'Product analytics', exact: true }).check();
  await dialog.getByLabel('Location', { exact: true }).fill('San Francisco');
  await update(page);
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  const adjusted = new URL(page.url()).searchParams;
  expect(adjusted.get('q')).toBe('Principal'); expect(adjusted.get('role')).toBe('data-science');
  expect(adjusted.get('career')).toBe('experienced'); expect(adjusted.get('match')).toBe('filters');

  await page.getByRole('button', { name: 'All listings', exact: true }).click();
  await expect(page.getByLabel('Search opportunities', { exact: true })).toHaveValue('Principal');
  await expect(page.getByLabel('Experience focus', { exact: true })).toHaveValue('experienced');
  await expect(page.getByLabel('Matching method', { exact: true })).toHaveValue('filters');
  await expect(page.locator('.job-card h3')).toHaveText(['Principal Data Scientist']);
  await page.getByLabel('Matching method', { exact: true }).selectOption('resume');
  await expect(page.getByRole('heading', { name: 'Add a reviewed resume to see recommendations.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Shortlist', exact: true }).click();
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  const resumeDraft = await adjust(page);
  await resumeDraft.getByRole('button', { name: /^Your resume/ }).click();
  await expect(resumeDraft.locator('.rec-preferences-paused')).toContainText('Preferences paused');
  await expect(resumeDraft.getByRole('button', { name: 'Update matches', exact: true })).toBeDisabled();
  await resumeDraft.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  const direct = new URL(page.url()); direct.searchParams.set('rec-match', 'resume');
  await page.goto(`${direct.pathname}${direct.search}`);
  await expect(page.getByRole('heading', { name: 'Add your resume to get matches', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('rec-match')).toBe('resume');
  await page.getByRole('button', { name: 'All listings', exact: true }).click();
  await expect(page.getByLabel('Matching method', { exact: true })).toHaveValue('resume');
  await expect(page.getByLabel('Search opportunities', { exact: true })).toHaveCount(0);
});

test('a card opens its exact requisition, saves it once and leaves application submission explicit', async ({ page }) => {
  const card = page.locator('.job-card').first(), title = await card.locator('h3').innerText();
  await card.getByRole('button', { name: 'View role', exact: true }).click();
  const detail = page.getByRole('dialog');
  await expect(detail).toContainText(title);
  const id = new URL(page.url()).searchParams.get('job');
  expect(id).toMatch(/^demo-job-/);
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: `Save ${title}`, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved to My Search');
  await expect(page.locator('.job-card').filter({ hasText: title })).toHaveCount(0);
  const saved = await page.evaluate(jobId => {
    const backup = JSON.parse(localStorage.getItem('msba-shortlist:demo:v1')!).backup;
    return backup.opportunities.filter((item: { catalogJobId: string }) => item.catalogJobId === jobId).map((item: { stage: string }) => item.stage);
  }, id);
  expect(saved).toEqual(['Saved']);
  const next = page.locator('.job-card').first(), nextTitle = await next.locator('h3').innerText();
  await next.getByRole('button', { name: `Open application for ${nextTitle}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Demo interaction');
  await expect(page.getByRole('dialog')).toContainText(nextTitle);
  await page.getByRole('button', { name: 'Not yet', exact: true }).click();
  const applied = await page.evaluate(target => {
    const backup = JSON.parse(localStorage.getItem('msba-shortlist:demo:v1')!).backup;
    return backup.opportunities.filter((item: { title: string; stage: string }) => item.title === target && item.stage === 'Applied').length;
  }, nextTitle);
  expect(applied).toBe(0);
});

test('resume matching returns to the unchanged draft, requires review and supports all three independent modes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/demo/opportunities?q=ALL_LISTINGS_QUERY_48219&career=zero-experience&role=machine-learning&match=filters');
  const originalUrl = page.url();
  const requests: { url: string; body: string }[] = [];
  page.on('request', request => requests.push({ url: request.url(), body: request.postData() || '' }));
  const adjustment = await adjust(page);
  await adjustment.getByRole('button', { name: /^Your resume/ }).click();
  await expect(adjustment.getByRole('button', { name: 'Update matches', exact: true })).toBeDisabled();
  await adjustment.getByRole('button', { name: 'Add resume', exact: true }).click();
  await expect(adjustment).toHaveCount(0);
  const resume = page.getByRole('dialog', { name: 'Resume & ATS review', exact: true });
  await resume.getByLabel('Choose resume file', { exact: true }).setInputFiles(resumeFixture);
  await expect(resume.getByLabel('Review and edit extracted resume text', { exact: true })).toHaveValue(/RESUME_ONLY_SYNTHETIC_9517/);
  await resume.getByRole('button', { name: 'Analyze resume', exact: true }).click();
  await expect(resume.getByLabel('Confirmed professional experience (years)', { exact: true })).toHaveValue('');
  await resume.getByLabel('Confirmed professional experience (years)', { exact: true }).fill('0');
  await resume.getByLabel('Highest completed degree (confirm yourself)', { exact: true }).selectOption('bachelors');
  await expect(resume.getByRole('button', { name: 'Use this resume', exact: true })).toBeDisabled();
  await resume.getByRole('checkbox', { name: reviewName, exact: true }).check();
  await resume.getByRole('button', { name: 'Use this resume', exact: true }).click();
  await expect(resume).toHaveCount(0);
  await expect(adjustment).toBeVisible();
  await expect(adjustment.getByRole('button', { name: /^Your resume/ })).toHaveAttribute('aria-pressed', 'true');
  expect(page.url()).toBe(originalUrl);
  await expect(page.locator('.job-card')).toHaveCount(5);
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  await update(page);
  await expect(page.locator('.job-card .resume-score strong').first()).toHaveText(/\d+\/100/);
  await expect(page.locator('.recommendation-reasons').first()).toContainText(/overlap/i);
  expect(new URL(page.url()).searchParams.get('rec-match')).toBe('resume');

  await adjust(page);
  await adjustment.getByRole('button', { name: /^Both/ }).click();
  await adjustment.getByRole('checkbox', { name: 'Product analytics', exact: true }).check();
  await adjustment.getByLabel('Location', { exact: true }).fill('San Francisco');
  await update(page);
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  await expect(page.locator('.resume-compatibility')).toHaveCount(1);
  await adjust(page);
  await adjustment.getByRole('button', { name: /^Your preferences/ }).click();
  await update(page);
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  const params = new URL(page.url()).searchParams;
  expect(params.get('q')).toBe('ALL_LISTINGS_QUERY_48219'); expect(params.get('career')).toBe('zero-experience');
  expect(params.get('role')).toBe('machine-learning'); expect(params.get('match')).toBe('filters');
  const stored = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
  for (const marker of privateMarkers) {
    expect(stored).not.toContain(marker); expect(page.url()).not.toContain(marker); expect(JSON.stringify(requests)).not.toContain(marker);
  }
  await page.reload();
  await expect(page.locator('.job-card h3')).toHaveText(['Growth Analyst']);
  await expect(page.locator('.resume-open')).toHaveAttribute('aria-label', 'Upload resume');
  await page.locator('.resume-open').click();
  await expect(resume.getByLabel('Or paste your resume text', { exact: true })).toHaveValue('');
});

test('Shortlist and its adjustment remain readable and usable from phone to desktop', async ({ page }) => {
  test.setTimeout(60_000);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const trigger = page.getByRole('button', { name: 'Adjust recommendations', exact: true });
    const triggerBounds = await trigger.boundingBox();
    expect(triggerBounds!.width).toBeGreaterThanOrEqual(48); expect(triggerBounds!.height).toBeGreaterThanOrEqual(48);
    const dialog = await adjust(page);
    for (const control of await dialog.locator('.rec-mode-choice, .rec-interest-choice, .rec-any-choice, select, input:not([type=checkbox]), .dialog-actions button').all()) {
      if (!await control.isVisible()) continue;
      await control.scrollIntoViewIfNeeded();
      const bounds = await control.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(48); expect(bounds!.width).toBeGreaterThanOrEqual(48);
      expect(bounds!.x).toBeGreaterThanOrEqual(-1); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(Number.parseFloat(await control.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
    await close.focus();
    for (let index = 0; index < 8; index++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true); }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('an empty preference profile uses an honest fallback instead of inventing positive match reasons', async ({ page }) => {
  await page.evaluate(() => {
    const envelope = JSON.parse(localStorage.getItem('msba-shortlist:demo:v1')!);
    Object.assign(envelope.backup.preferences, {
      roleFamilies: [], primaryRoleFamilies: [], locations: [], workArrangements: [], skills: [], desiredSalary: null,
      yearsExperience: null, graduationMonth: null, graduationDate: null, earliestStart: null,
    });
    localStorage.setItem('msba-shortlist:demo:v1', JSON.stringify(envelope));
  });
  await page.reload();
  await expect(page.locator('.job-card')).toHaveCount(5);
  await expect(page.locator('.recommendation-reasons')).toHaveCount(0);
  await expect(page.getByText('No specific overlap recorded yet.', { exact: true })).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Explore opportunities', exact: true, level: 1 })).toBeVisible();
  await page.goto('/demo/opportunities?rec-career=experienced');
  await expect(page.getByRole('heading', { name: 'Explore opportunities', exact: true, level: 1 })).toBeVisible();
});


test('resetting catalog filters preserves the active view and independent recommendation choices', async ({ page }) => {
  await page.goto('/demo/opportunities?view=all&q=NO_SUCH_ROLE_8184&career=experienced&rec-role=product-analytics&rec-location=San+Francisco&rec-match=combined');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Filter opportunities', exact: true });
  const beforeReset = page.url();
  await dialog.getByRole('button', { name: 'Reset filters', exact: true }).click();
  expect(page.url()).toBe(beforeReset);
  await expect(dialog.getByLabel('Experience focus', { exact: true })).toHaveValue('all');
  await dialog.getByRole('button', { name: 'Show opportunities', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All listings', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Search opportunities', { exact: true })).toHaveValue('');
  await expect(page.locator('.job-card').first()).toBeVisible();
  const params = new URL(page.url()).searchParams;
  expect(params.get('view')).toBe('all'); expect(params.has('q')).toBe(false);
  expect(params.get('rec-role')).toBe('product-analytics');
  expect(params.get('rec-location')).toBe('San Francisco');
  expect(params.get('rec-match')).toBe('combined');
});
