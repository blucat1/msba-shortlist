import { expect, test, type Locator, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/resume/${name}`, import.meta.url));
const privateMarkers = ['RESUME_ONLY_SYNTHETIC_9517', 'resume-synthetic-9517@example.test', 'private-synthetic-9517'];
const reviewName = 'I reviewed this profile. Use it for optional role comparisons in this tab.';

async function openResume(page: Page) {
  await page.locator('.resume-open').click();
  const dialog = page.getByRole('dialog', { name: 'Resume & ATS review', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function importText(page: Page) {
  const dialog = await openResume(page);
  await dialog.getByLabel('Choose resume file', { exact: true }).setInputFiles(fixture('private-synthetic-9517.txt'));
  await expect(dialog.getByLabel('Review and edit extracted resume text', { exact: true })).toHaveValue(/RESUME_ONLY_SYNTHETIC_9517/);
  await expect(dialog.getByRole('heading', { name: 'Local resume report', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Analyze resume', exact: true }).click();
  const report = dialog.getByRole('heading', { name: 'Local resume report', exact: true });
  await expect(report).toBeVisible(); await expect(report).toBeFocused(); await expect(report).toBeInViewport({ ratio: 1 });
  return dialog;
}
async function confirmProfile(dialog: Locator) {
  const years = dialog.getByLabel('Confirmed professional experience (years)', { exact: true });
  const education = dialog.getByLabel('Highest completed degree (confirm yourself)', { exact: true });
  await expect(years).toHaveValue(''); await expect(education).toHaveValue('');
  await dialog.getByLabel('Skills to compare', { exact: true }).fill('PostgreSQL, Python, Excel, Tableau, Statistics');
  await years.fill('0'); await education.selectOption('bachelors');
  await dialog.getByLabel('Completed degree field', { exact: true }).fill('statistics');
  await expect(dialog.getByRole('button', { name: 'Use this resume', exact: true })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: reviewName, exact: true }).check();
  await years.fill('0.5');
  await expect(dialog.getByRole('checkbox', { name: reviewName, exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Use this resume', exact: true })).toBeDisabled();
  await years.fill('0');
  await dialog.getByRole('checkbox', { name: reviewName, exact: true }).check();
  await dialog.getByRole('button', { name: 'Use this resume', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
async function reviewedResume(page: Page) { await confirmProfile(await importText(page)); }
async function listingCount(page: Page) { return Number((await page.locator('.listing-count').innerText()).match(/^\d+/)?.[0]); }
async function loadAll(page: Page) {
  const more = page.getByRole('button', { name: 'Show more opportunities', exact: true });
  for (let index = 0; index < 5 && await more.count(); index++) await more.click();
  await expect(more).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/demo/opportunities');
  await expect(page.getByRole('heading', { name: 'Opportunities', level: 1, exact: true })).toBeVisible();
});

test('TXT analysis requires explicit review, remains private and is cleared by removal and reload', async ({ page }) => {
  test.setTimeout(60_000);
  const requests: { url: string; method: string; body: string }[] = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() || '' }));
  await reviewedResume(page);
  await expect(page.getByRole('group', { name: 'Choose matching method' }).getByRole('button', { name: 'Resume + filters', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.job-card .resume-score strong').first()).toHaveText(/\d+\/100/);
  const stored = await page.evaluate(() => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage) }));
  for (const marker of privateMarkers) {
    expect(stored).not.toContain(marker); expect(page.url()).not.toContain(marker);
    expect(JSON.stringify(requests)).not.toContain(marker);
  }
  for (const request of requests) {
    expect(new URL(request.url).origin).toBe(new URL(page.url()).origin);
    expect(request.method).toBe('GET');
  }
  const dialog = await openResume(page);
  await dialog.getByRole('button', { name: 'Remove resume', exact: true }).click();
  await expect(dialog.getByLabel('Or paste your resume text', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('heading', { name: 'Local resume report', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  await reviewedResume(page);
  await expect(page.locator('.resume-compatibility').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  await expect(page.locator('.resume-open')).toHaveAttribute('aria-label', 'Upload resume');
  await expect(page.getByRole('heading', { name: 'Add a reviewed resume to see recommendations.', exact: true })).toBeVisible();
  const afterReload = await openResume(page);
  await expect(afterReload.getByLabel('Or paste your resume text', { exact: true })).toHaveValue('');
});

test('matching modes keep filters independent and resume-only pauses rather than discards the saved URL', async ({ page }) => {
  test.setTimeout(60_000);
  await reviewedResume(page);
  const modes = page.getByRole('group', { name: 'Choose matching method' });
  await modes.getByRole('button', { name: 'Filters only', exact: true }).click();
  expect(await page.locator('.job-card').count()).toBeGreaterThan(0);
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  await expect(page.locator('.resume-session-status')).toContainText('Not used in results');
  await modes.getByRole('button', { name: 'Resume + filters', exact: true }).click();
  await page.getByLabel('Search opportunities', { exact: true }).fill('NO_MATCH_QUERY_48219');
  await page.getByLabel('Role family', { exact: true }).selectOption('machine-learning');
  await page.getByLabel('Experience focus', { exact: true }).selectOption('zero-experience');
  await expect(page.locator('.job-card')).toHaveCount(0);
  expect(await listingCount(page)).toBe(0);
  const saved = new URL(page.url()).searchParams;
  await modes.getByRole('button', { name: 'Resume only', exact: true }).click();
  await expect(page.locator('.filters-paused')).toContainText('all experience levels');
  const resumed = new URL(page.url()).searchParams;
  for (const key of ['q', 'role', 'career']) expect(resumed.get(key)).toBe(saved.get(key));
  expect(await listingCount(page)).toBeGreaterThan(15);
  await expect(page.getByLabel('Sort opportunities', { exact: true })).toHaveValue('fit');
  await loadAll(page);
  await expect(page.locator('.job-card').filter({ hasText: 'Principal Data Scientist' })).toBeVisible();
  await expect(page.locator('.job-card').filter({ hasText: 'Senior Product Manager' })).toBeVisible();
  const ranked = await page.locator('.job-card').evaluateAll(cards => cards.map(card => ({ conflict: !!card.querySelector('.resume-score.has-conflict'), score: Number(card.querySelector('.resume-score strong')?.textContent?.match(/^\d+/)?.[0] ?? -1) })));
  for (let index = 1; index < ranked.length; index++) {
    expect(Number(ranked[index].conflict)).toBeGreaterThanOrEqual(Number(ranked[index - 1].conflict));
    if (ranked[index].conflict === ranked[index - 1].conflict) expect(ranked[index].score).toBeLessThanOrEqual(ranked[index - 1].score);
  }
  await modes.getByRole('button', { name: 'Resume + filters', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(0);
  await expect(page.getByLabel('Search opportunities', { exact: true })).toHaveValue('NO_MATCH_QUERY_48219');
  await expect(page.getByLabel('Role family', { exact: true })).toHaveValue('machine-learning');
  await expect(page.getByLabel('Experience focus', { exact: true })).toHaveValue('zero-experience');
});

for (const extension of ['pdf', 'docx'] as const) test(`the real lazy ${extension.toUpperCase()} parser extracts a synthetic document before explicit analysis`, async ({ page }) => {
  const errors: string[] = [], workers: string[] = [];
  const requests: { url: string; body: string }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('worker', worker => workers.push(worker.url()));
  page.on('request', request => requests.push({ url: request.url(), body: request.postData() || '' }));
  const dialog = await openResume(page);
  await dialog.getByLabel('Choose resume file', { exact: true }).setInputFiles(fixture(`private-synthetic-9517.${extension}`));
  const text = dialog.getByLabel('Review and edit extracted resume text', { exact: true });
  await expect(text).toHaveValue(/resume-synthetic-9517@example\.test/);
  await expect(text).toHaveValue(/PostgreSQL, Python, Excel, Tableau, Statistics/);
  await expect(dialog.locator('.resume-file-summary')).toContainText(extension.toUpperCase());
  await expect(dialog.getByRole('heading', { name: 'Local resume report', exact: true })).toHaveCount(0);
  if (extension === 'pdf') {
    expect(workers.some(url => /pdf\.worker/.test(url)), 'PDF extraction must start the actual local PDF.js worker.').toBe(true);
    for (const url of workers) expect(new URL(url).origin).toBe(new URL(page.url()).origin);
    await expect(dialog.locator('.resume-file-summary')).toContainText('1 page');
  }
  await dialog.getByRole('button', { name: 'Analyze resume', exact: true }).click();
  const report = dialog.getByRole('heading', { name: 'Local resume report', exact: true });
  await expect(report).toBeVisible(); await expect(report).toBeFocused(); await expect(report).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByLabel('Skills to compare', { exact: true })).toHaveValue(/sql/);
  await expect(dialog.getByLabel('Confirmed professional experience (years)', { exact: true })).toHaveValue('');
  for (const marker of privateMarkers) expect(JSON.stringify(requests)).not.toContain(marker);
  for (const request of requests) expect(new URL(request.url).origin).toBe(new URL(page.url()).origin);
  expect(errors).toEqual([]);
});

test('unsupported, damaged and image-only files fail clearly without inventing resume text', async ({ page }) => {
  test.setTimeout(60_000);
  const dialog = await openResume(page), input = dialog.getByLabel('Choose resume file', { exact: true });
  await input.setInputFiles({ name: 'old-format.doc', mimeType: 'application/msword', buffer: Buffer.from('Unsupported synthetic Word data') });
  await expect(dialog.getByRole('alert')).toContainText('Choose a .txt, .docx or .pdf');
  await input.setInputFiles({ name: 'damaged.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nThis is an intentionally damaged public test file.\n%%EOF') });
  await expect(dialog.getByRole('alert')).toContainText('This PDF could not be read');
  await input.setInputFiles({ name: 'damaged.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK\x03\x04Damaged synthetic ZIP metadata') });
  await expect(dialog.getByRole('alert')).toContainText('DOCX archive is incomplete or damaged');
  await input.setInputFiles(fixture('image-only-synthetic.pdf'));
  await expect(dialog.getByRole('alert')).toContainText('No usable resume text was found');
  await expect(dialog.getByLabel('Or paste your resume text', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('heading', { name: 'Local resume report', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Analyze resume', exact: true })).toBeDisabled();
});

test('phone resume review keeps text and controls within the dialog and keyboard focus inside it', async ({ page }) => {
  test.setTimeout(60_000);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    const method = page.getByRole('combobox', { name: 'Matching method', exact: true });
    await expect(method).toBeVisible();
    for (const control of [method, page.locator('.resume-open')]) {
      const bounds = await control.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44); expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    expect(Number.parseFloat(await method.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    const dialog = await importText(page);
    for (const field of await dialog.locator('input:not([type=checkbox]),select,textarea').all()) {
      if (!await field.isVisible()) continue;
      await field.scrollIntoViewIfNeeded();
      const bounds = await field.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(Number.parseFloat(await field.evaluate(element => getComputedStyle(element).fontSize)), `Readable phone field: ${await field.getAttribute('type') || await field.evaluate(element => element.tagName)}`).toBeGreaterThanOrEqual(16);
    }
    for (const action of await dialog.getByRole('button').all()) {
      if (!await action.isVisible()) continue;
      await action.scrollIntoViewIfNeeded(); const bounds = await action.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44); expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    const clipped = await dialog.locator('h2,h3,p,label,.resume-file-summary').evaluateAll(elements => elements.filter(element => element.getClientRects().length && element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1).map(element => element.tagName));
    expect(clipped).toEqual([]);
    const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
    await close.focus();
    for (let index = 0; index < 12; index++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true); }
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(page.locator('.resume-open')).toBeFocused();
    await confirmProfile(await openResume(page));
    await expect(method).toHaveValue('combined');
    await expect(page.locator('.resume-compatibility').first()).toBeVisible();
    await method.selectOption('resume');
    await expect(page.locator('.filters-paused')).toContainText('all experience levels');
    await method.selectOption('filters');
    await expect(page.locator('.resume-compatibility')).toHaveCount(0);
    const reopened = await openResume(page); await reopened.getByRole('button', { name: 'Remove resume', exact: true }).click(); await page.keyboard.press('Escape');
  }
});

test('the broader catalog exposes more records than the strict shortlist and show-more expands real cards', async ({ page }) => {
  const strict = await listingCount(page);
  await page.getByRole('button', { name: 'All listings', exact: true }).click();
  await expect.poll(() => listingCount(page)).toBeGreaterThan(strict);
  const initial = await page.locator('.job-card').count();
  await expect(page.getByRole('button', { name: 'Show more opportunities', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show more opportunities', exact: true }).click();
  await expect.poll(() => page.locator('.job-card').count()).toBeGreaterThan(initial);
  await expect(page.locator('.job-card').filter({ hasText: 'Principal Data Scientist' })).toBeVisible();
  await expect(page.locator('.resume-compatibility')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('view')).toBe('all');
  await page.reload();
  await expect(page.getByRole('button', { name: 'All listings', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => listingCount(page)).toBeGreaterThan(strict);
});
