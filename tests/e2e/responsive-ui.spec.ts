import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectReadable(locator: Locator, minimum = 14) {
  const failures = await locator.evaluateAll((elements, threshold) => elements.flatMap(element => {
    const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !bounds.width || !bounds.height) return [];
    const size = parseFloat(style.fontSize);
    return size < threshold ? [{ text: element.textContent?.trim().slice(0, 100), size }] : [];
  }), minimum);
  expect(failures, `Critical text must be at least ${minimum}px`).toEqual([]);
}

async function expectWithinViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

async function expectTouchTarget(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
}

async function expectSelectedLabelFits(locator: Locator) {
  const fits = await locator.evaluate(element => {
    const select = element as HTMLSelectElement, style = getComputedStyle(select);
    const context = document.createElement('canvas').getContext('2d')!; context.font = style.font;
    return context.measureText(select.selectedOptions[0].text).width <= select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24;
  });
  expect(fits, 'Selected label must remain legible beside its native arrow').toBe(true);
}

test('critical discovery, tracker and Insights text stays readable across supported widths', async ({ page }) => {
  test.setTimeout(90_000);
  const checks = {
    opportunities: '.job-card h3, .job-meta span, .experience-evidence > strong, .experience-controls > label, .experience-controls > p, .listing-count',
    'my-search': '.tracker-role strong, .tracker-role small, .tracker-next > span, .tracker-next small, .status-select, .tracker-priority',
    insights: '.metric-title, .metric-card p, .chart-caption, .bar-label, .bar-value, .horizontal-bar-row > span, .role-table td, .role-table th',
  };
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const [route, selectors] of Object.entries(checks)) {
      await page.goto(`/demo/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      await expectReadable(page.locator(selectors));
      if (route === 'insights') await expectSelectedLabelFits(page.getByLabel('Insights period', { exact: true }));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    if (width <= 390) {
      const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(navigation.getByRole('link')).toHaveCount(3);
      for (const action of await navigation.locator('a,button').all()) await expectTouchTarget(action);
      await page.goto('/demo/opportunities');
      const family = page.getByLabel('Role family', { exact: true });
      await family.selectOption('business-intelligence');
      await expectSelectedLabelFits(family);
      await page.goto('/opportunities');
      const signIn = page.getByRole('button', { name: 'Sign in with Google', exact: false });
      await expectWithinViewport(signIn, page);
      await expectTouchTarget(signIn);
      await expect(page.locator('.mobile-brand')).toBeVisible();
      const headerBottom = await page.locator('.topbar').evaluate(element => element.getBoundingClientRect().bottom);
      const actionBottom = await signIn.evaluate(element => element.getBoundingClientRect().bottom);
      expect(actionBottom, 'Wrapped sign-in action must stay inside the header').toBeLessThanOrEqual(headerBottom + 1);
    }
  }
});

test('small-screen tracker preserves a complete long title and actionable status and next step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/opportunities');
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  const title = 'Associate Business Intelligence and Customer Decision Analytics — Graduate Development Programme';
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Company *', { exact: true }).fill('Fictional Responsive Test Company');
  await dialog.getByLabel('Job title *', { exact: true }).fill(title);
  await dialog.getByLabel('Next action (optional)', { exact: true }).fill('Review the graduate programme and prepare examples');
  await dialog.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto('/demo/my-search');
  const row = page.locator('.tracker-row').filter({ hasText: title });
  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const roleTitle = row.locator('.tracker-role strong');
    await expect(roleTitle).toHaveText(title);
    await expectWithinViewport(roleTitle, page);
    const clipping = await roleTitle.evaluate(element => ({ width: element.scrollWidth > element.clientWidth + 1, height: element.scrollHeight > element.clientHeight + 1, lineClamp: getComputedStyle(element).webkitLineClamp }));
    expect(clipping).toEqual({ width: false, height: false, lineClamp: 'none' });
    await expectWithinViewport(row.getByRole('combobox'), page);
    await expectTouchTarget(row.getByRole('combobox'));
    await expectWithinViewport(row.locator('.tracker-next'), page);
    await expect(row.locator('.tracker-next')).toContainText('Review the graduate programme');
    await expectTouchTarget(row.locator('.tracker-next'));
  }
  await row.getByRole('combobox').selectOption('Interviewing');
  await expect(row.getByRole('combobox')).toHaveValue('Interviewing');
  await row.locator('.tracker-next').click();
  await expect(page.getByRole('dialog').getByLabel('Next step', { exact: true })).toHaveValue('Review the graduate programme and prepare examples');
});

test('mobile forms retain a reachable close button, readable inputs and trapped keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/demo/opportunities');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const trigger = page.getByRole('button', { name: 'Add opportunity', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectReadable(dialog.locator('input:not([type=checkbox]),select,textarea'), 16);
  const body = dialog.locator('.modal-body');
  await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
  await expectTouchTarget(close);
  const closeBounds = await close.boundingBox();
  expect(closeBounds!.y).toBeGreaterThanOrEqual(0);
  expect(closeBounds!.y + closeBounds!.height).toBeLessThanOrEqual(640);
  await close.focus();
  const controlCount = await dialog.locator('button,input,select,textarea,a[href],[tabindex="0"]').count();
  for (let i = 0; i < controlCount + 2; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.getByRole('button', { name: /Your preferences/ }).click();
  await expectReadable(dialog.locator('input:not([type=checkbox]),select,textarea'), 16);
  const save = dialog.getByRole('button', { name: 'Save preferences', exact: true });
  await save.scrollIntoViewIfNeeded();
  for (const name of ['Back', 'Continue', 'Save preferences']) {
    const action = dialog.getByRole('button', { name, exact: true });
    await expectWithinViewport(action, page);
    const dimensions = await action.evaluate(element => {
      const bounds = element.getBoundingClientRect(), rows: number[] = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) if (!rows.some(top => Math.abs(top - rect.top) < 1)) rows.push(rect.top);
      }
      return { width: bounds.width, top: bounds.top, bottom: bounds.bottom, clipped: element.scrollWidth > element.clientWidth + 1, textRows: rows.length };
    });
    expect(dimensions.width, `${name} must retain a usable label width`).toBeGreaterThanOrEqual(88);
    expect(dimensions.top).toBeGreaterThanOrEqual(0);
    expect(dimensions.bottom).toBeLessThanOrEqual(640);
    expect(dimensions.clipped).toBe(false);
    expect(dimensions.textRows, `${name} must not break into narrow character columns`).toBeLessThanOrEqual(2);
  }
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog).toHaveCount(0);
});

test('Insights keeps its readable table locally scrollable by keyboard at narrow and reflow widths', async ({ page }) => {
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/demo/insights');
    const region = page.getByRole('region', { name: 'Role family results' });
    await expect(region).toBeVisible();
    await expectWithinViewport(region, page);
    await expectReadable(region.locator('th,td'));
    await expect(region.getByRole('columnheader')).toHaveCount(4);
    await expect(region.getByRole('row').nth(1)).toContainText(/\d/);
    const dimensions = await region.evaluate(element => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    if (dimensions.scrollWidth > dimensions.clientWidth) {
      await region.focus();
      await expect(region).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('compact cards keep evidence and the original description reachable by keyboard on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/demo/opportunities');
  const experienceExplanation = page.locator('.experience-explainer');
  await experienceExplanation.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(experienceExplanation).toHaveAttribute('open', '');
  await expect(experienceExplanation).toContainText(/missing years never count as zero/i);
  await expectReadable(experienceExplanation.locator('p'));
  await page.keyboard.press('Enter');
  await expect(experienceExplanation).not.toHaveAttribute('open', '');
  const priorities = page.locator('.today-priorities');
  await expect(priorities).not.toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'All next steps', exact: false })).toBeVisible();
  await expect(priorities.locator('.today-card').first()).toBeHidden();
  await priorities.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(priorities).toHaveAttribute('open', '');
  await expect(priorities.locator('.today-card').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(priorities).not.toHaveAttribute('open', '');
  const card = page.locator('.job-card').first();
  const title = await card.locator('h3').innerText();
  const supporting = card.locator('.job-supporting-details');
  const summary = supporting.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(supporting).toHaveAttribute('open', '');
  await expect(supporting).toContainText('Experience evidence');
  await expectReadable(supporting.locator('p,li,summary'));
  await card.getByRole('button', { name: 'View role', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(title);
  const description = dialog.locator('details').filter({ has: page.locator('summary', { hasText: 'Read full job description' }) });
  await expect(description.locator('.plain-description')).toBeHidden();
  await description.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(description.locator('.plain-description')).toContainText('This is a fictional demonstration role');
  await expectWithinViewport(description, page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('glass navigation keeps contrast over changing content and offers an opaque reduced-motion alternative', async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/demo/opportunities');
    const navigation = page.getByRole('navigation', { name: width === 1440 ? 'Main navigation' : 'Mobile navigation' });
    await expect(navigation.getByRole('link')).toHaveCount(3);
    const glass = await page.locator(width === 1440 ? '.glass-header' : '.mobile-nav').evaluate(element => {
      const style = getComputedStyle(element), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!; context.fillStyle = style.backgroundColor; context.fillRect(0, 0, 1, 1);
      return { supported: CSS.supports('backdrop-filter', 'blur(1px)'), backdrop: style.backdropFilter, alpha: context.getImageData(0, 0, 1, 1).data[3] };
    });
    expect(glass.supported, 'Chromium must exercise the supported glass enhancement').toBe(true);
    expect(glass.backdrop).not.toBe('none');
    expect(glass.alpha, 'Supported material must retain real translucency').toBeLessThan(255);
    await expectReadable(navigation.locator('a > span, button > span'));
    await page.locator('.job-card').first().scrollIntoViewIfNeeded();
    const contrast = await navigation.evaluate(root => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      const color = (value: string) => {
        context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data]; return [...channels.slice(0, 3), channels[3] / 255];
      };
      const composite = (foreground: number[], background: number[]) => foreground.slice(0, 3).map((channel, index) => channel * foreground[3] + background[index] * (1 - foreground[3]));
      const luminance = (channels: number[]) => channels.map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const material = root.closest('.glass-header') ?? root;
      return [...root.querySelectorAll('a > span, button > span')].filter(element => element.getBoundingClientRect().width > 0).map(element => {
        const ancestors: Element[] = [];
        for (let parent: Element | null = element; parent; parent = parent.parentElement) { ancestors.unshift(parent); if (parent === material) break; }
        const ratios = [[0, 0, 0], [255, 255, 255]].map(underlying => {
          const background = ancestors.reduce((result, ancestor) => composite(color(getComputedStyle(ancestor).backgroundColor), result), underlying);
          const foreground = composite(color(getComputedStyle(element).color), background), first = luminance(background), second = luminance(foreground);
          return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
        });
        return { label: element.textContent, minimum: Math.min(...ratios) };
      });
    });
    expect(contrast.length).toBeGreaterThanOrEqual(3);
    for (const item of contrast) expect(item.minimum, `${item.label} contrast over black and white content`).toBeGreaterThanOrEqual(4.5);
    for (const action of await navigation.locator('a,button').all()) await expectTouchTarget(action);
    if (width < 768) {
      const bounds = await navigation.boundingBox();
      expect(bounds!.x, 'Floating navigation retains an inset').toBeGreaterThan(0);
      expect(bounds!.x + bounds!.width).toBeLessThan(width);
    }
    await navigation.getByRole('link', { name: 'Insights', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Insights', level: 1, exact: true })).toBeVisible();
  }
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches && matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/demo/opportunities');
    const material = page.locator(width === 1440 ? '.glass-header' : '.mobile-nav');
    const fallback = await material.evaluate(element => {
      const style = getComputedStyle(element), canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!; context.fillStyle = style.backgroundColor; context.fillRect(0, 0, 1, 1);
      return { backdrop: style.backdropFilter, alpha: context.getImageData(0, 0, 1, 1).data[3] };
    });
    expect(fallback).toEqual({ backdrop: 'none', alpha: 255 });
  }
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  const motion = await page.getByRole('dialog').evaluate(element => ({ animation: parseFloat(getComputedStyle(element).animationDuration), transition: parseFloat(getComputedStyle(element).transitionDuration) }));
  expect(motion.animation).toBeLessThanOrEqual(.01);
  expect(motion.transition).toBeLessThanOrEqual(.01);
});
