import { expect, test, type Locator, type Page } from '@playwright/test';

async function standardMaterial(page: Page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-transparency', value: 'no-preference' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
    { name: 'prefers-contrast', value: 'no-preference' },
    { name: 'forced-colors', value: 'none' },
  ] });
  return session;
}

async function settledFrame(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function field(host: Locator) {
  return host.evaluate(element => ({
    state: (element as HTMLElement).dataset.studioBackdrop,
    width: Number((element as HTMLElement).dataset.refractionWidth),
    height: Number((element as HTMLElement).dataset.refractionHeight),
    revision: (element as HTMLElement).dataset.refractionRevision,
    href: element.querySelector('feImage')?.getAttribute('href'),
    scale: element.querySelector('feDisplacementMap')?.getAttribute('scale'),
    backdrop: getComputedStyle(element).backdropFilter,
  }));
}

async function comparePixels(page: Page, first: Buffer, second: Buffer, radius: number) {
  return page.evaluate(async ({ first, second, radius }) => {
    const decode = (encoded: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Diagnostic image could not be decoded.'));
      image.src = `data:image/png;base64,${encoded}`;
    });
    const images = await Promise.all([decode(first), decode(second)]);
    const canvas = document.createElement('canvas'); canvas.width = images[0].width; canvas.height = images[0].height;
    const context = canvas.getContext('2d')!;
    const pixels = images.map(image => { context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0); return context.getImageData(0, 0, canvas.width, canvas.height).data; });
    const regions = { rim: { count: 0, sum: 0, changed: 0 }, center: { count: 0, sum: 0, changed: 0 } };
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const qx = Math.abs(x + .5 - canvas.width / 2) - (canvas.width / 2 - radius);
      const qy = Math.abs(y + .5 - canvas.height / 2) - (canvas.height / 2 - radius);
      const distance = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
      // The production Snell field bends only the outer 22 CSS pixels.
      // Exclude the antialiased edge and the unchanged band beyond that field.
      const region = distance < -3 && distance > -22 ? regions.rim : distance < -44 ? regions.center : null;
      if (!region) continue;
      const index = (y * canvas.width + x) * 4;
      const delta = [0, 1, 2].reduce((sum, channel) => sum + Math.abs(pixels[0][index + channel] - pixels[1][index + channel]), 0) / 3;
      region.count++; region.sum += delta; if (delta > 12) region.changed++;
    }
    return Object.fromEntries(Object.entries(regions).map(([name, region]) => [name, { mean: region.sum / region.count, visiblyChanged: region.changed / region.count, count: region.count }])) as Record<'rim' | 'center', { mean: number; visiblyChanged: number; count: number }>;
  }, { first: first.toString('base64'), second: second.toString('base64'), radius });
}

test('Landmarks composition adapts its three routes and uses the actual locally served typeface', async ({ page }) => {
  test.setTimeout(60_000);
  const session = await standardMaterial(page);
  const fontRequests: string[] = [];
  page.on('request', request => { if (/\.woff2(?:\?|$)/.test(request.url())) fontRequests.push(request.url()); });
  for (const width of [1440, 1024, 900, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/demo/opportunities'); await expect(page.getByRole('heading', { name: 'Opportunities', level: 1, exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const wide = width > 900;
    const navigation = page.getByRole('navigation', { name: wide ? 'Main navigation' : 'Mobile navigation' });
    await expect(navigation).toBeVisible(); await expect(navigation.getByRole('link')).toHaveCount(3);
    await expect(page.getByRole('navigation', { name: wide ? 'Mobile navigation' : 'Main navigation' })).toBeHidden();
    const bounds = await page.locator('.glass-header').boundingBox();
    if (wide) {
      expect(bounds!.height).toBeGreaterThan(bounds!.width * 2);
      const rows = await navigation.getByRole('link').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
      expect(rows[1]).toBeGreaterThan(rows[0]); expect(rows[2]).toBeGreaterThan(rows[1]);
      const heading = await page.locator('h1').boundingBox();
      expect(heading!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width);
    } else {
      expect(bounds!.height).toBeLessThan(160);
      const dock = await navigation.boundingBox(); expect(dock!.x).toBeGreaterThan(0); expect(dock!.x + dock!.width).toBeLessThan(width);
    }
    for (const action of await navigation.locator('a,button').all()) {
      const box = await action.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await navigation.getByRole('link', { name: 'Insights', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Insights', level: 1, exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Insights', exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await session.send('DOM.enable'); await session.send('CSS.enable');
  const documentTree = await session.send('DOM.getDocument');
  const node = await session.send('DOM.querySelector', { nodeId: documentTree.root.nodeId, selector: 'h1' });
  const actual = await session.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
  expect(actual.fonts.some(font => font.isCustomFont && /Google Sans Flex/i.test(font.familyName) && font.glyphCount > 0), 'Native Chromium must actually render the local typeface, not only declare a CSS family.').toBe(true);
  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) expect(new URL(url).origin).toBe(new URL(page.url()).origin);
});

test('the real host bends its live DOM backdrop, and changing that backdrop needs no new displacement map', async ({ page }, testInfo) => {
  await standardMaterial(page); await page.goto('/demo/opportunities');
  await page.addStyleTag({ content: `
    html, body { background: repeating-linear-gradient(0deg,#151515 0 8px,#fff 8px 16px) !important; }
    .application, .workspace-body { background: transparent !important; }
    .workspace-scene { display: none !important; }
    main, footer, .mobile-nav, .demo-banner { visibility: hidden !important; }
    .glass-header { position: fixed !important; inset: 96px auto auto 48px !important; margin: 0 !important; padding: 0 !important; width: 320px !important; min-width: 320px !important; max-width: 320px !important; height: 200px !important; min-height: 200px !important; max-height: 200px !important; border: 0 !important; border-radius: 52px !important; background: #ffffff1a !important; box-shadow: none !important; }
    .glass-header > *:not(svg) { visibility: hidden !important; }
  ` });
  const host = page.locator('.glass-header');
  await expect(host).toHaveAttribute('data-studio-backdrop', 'ready');
  await expect.poll(async () => { const value = await field(host); return value.width === 320 && value.height === 200 && !!value.href?.startsWith('data:image/png'); }).toBe(true);
  await settledFrame(page);
  const original = await field(host); expect(Number(original.scale)).toBeGreaterThan(0); expect(original.backdrop).toContain('url(');
  const normal = await host.screenshot({ animations: 'disabled' });
  const displacement = host.locator('feDisplacementMap'); await displacement.evaluate(element => element.setAttribute('scale', '0'));
  await settledFrame(page); const zero = await host.screenshot({ animations: 'disabled' });
  await displacement.evaluate((element, scale) => element.setAttribute('scale', scale!), original.scale);
  const difference = await comparePixels(page, normal, zero, 52);
  await testInfo.attach('live-DOM-refraction', { body: normal, contentType: 'image/png' });
  await testInfo.attach('same-backdrop-zero-displacement', { body: zero, contentType: 'image/png' });
  expect(difference.rim.count).toBeGreaterThan(1000);
  expect(difference.rim.mean, 'The visible rim must bend actual background features beyond a barely measurable tint.').toBeGreaterThan(8);
  expect(difference.rim.visiblyChanged).toBeGreaterThan(.1);
  expect(difference.rim.mean).toBeGreaterThan(difference.center.mean * 2);
  await page.evaluate(() => { document.body.style.setProperty('background-position', '0 5px', 'important'); document.documentElement.style.setProperty('background-position', '0 5px', 'important'); });
  await settledFrame(page); const shifted = await host.screenshot({ animations: 'disabled' });
  expect((await comparePixels(page, normal, shifted, 52)).rim.mean, 'Changing the real DOM backdrop must update the refractive edge without regenerating its geometry.').toBeGreaterThan(20);
  const after = await field(host); expect(after.href).toBe(original.href); expect(after.revision).toBe(original.revision);
  await testInfo.attach('same-map-shifted-DOM-backdrop', { body: shifted, contentType: 'image/png' });
});

test('displacement maps stay bounded and protective preferences remove the filter without blocking controls', async ({ page }) => {
  const session = await standardMaterial(page);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('/demo/opportunities');
    await expect(page.locator('.glass-header')).toHaveAttribute('data-studio-backdrop', 'ready');
    const hosts = await page.locator('.studio-surface[data-studio-backdrop="ready"]').evaluateAll(elements => elements.map(element => ({
      width: Number((element as HTMLElement).dataset.refractionWidth), height: Number((element as HTMLElement).dataset.refractionHeight),
    })));
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) { expect(host.width).toBeGreaterThan(0); expect(host.height).toBeGreaterThan(0); expect(host.width * host.height).toBeLessThanOrEqual(131_072); expect(Math.max(host.width, host.height)).toBeLessThanOrEqual(512); }
  }
  for (const preference of ['prefers-reduced-transparency', 'prefers-contrast', 'forced-colors']) {
    await session.send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-reduced-transparency', value: preference === 'prefers-reduced-transparency' ? 'reduce' : 'no-preference' },
      { name: 'prefers-contrast', value: preference === 'prefers-contrast' ? 'more' : 'no-preference' },
      { name: 'forced-colors', value: preference === 'forced-colors' ? 'active' : 'none' },
    ] });
    await expect(page.locator('.glass-header')).toHaveAttribute('data-studio-backdrop', 'reduced');
    expect((await field(page.locator('.glass-header'))).backdrop).toBe('none');
    await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel('Company *', { exact: true })).toBeEditable();
    await page.keyboard.press('Escape');
  }
  // Exercise the deliberate unverified-engine fallback policy in Chromium;
  // this does not claim that Firefox itself was run.
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Firefox/142.0' }));
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-contrast', value: 'no-preference' }, { name: 'forced-colors', value: 'none' }] });
  await page.goto('/demo/opportunities');
  await expect(page.locator('.glass-header')).toHaveAttribute('data-studio-backdrop', 'fallback');
  expect((await field(page.locator('.glass-header'))).backdrop).not.toContain('url(');
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Company *', { exact: true })).toBeEditable();
});
