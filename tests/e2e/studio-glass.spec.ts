import { expect, test, type Page } from '@playwright/test';

type ResourceKind = 'shader' | 'program' | 'buffer' | 'texture' | 'framebuffer' | 'renderbuffer' | 'vertexArray';
interface GLRecord {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  draws: number;
  compiles: number;
  compileFailures: number;
  linkFailures: number;
  pixels: { colored: number; unique: number } | null;
  errors: number[];
  resources: Map<ResourceKind, Set<object>>;
  lossExtension?: WEBGL_lose_context;
}
interface GLProbe { attempts: number; records: GLRecord[]; }
declare global { interface Window { __studioProbe: GLProbe; } }

async function prepare(page: Page, options: { blocked?: boolean; corruptShader?: boolean; reducedMotion?: boolean; reducedTransparency?: boolean } = {}) {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-transparency', value: options.reducedTransparency ? 'reduce' : 'no-preference' },
    { name: 'prefers-reduced-motion', value: options.reducedMotion ? 'reduce' : 'no-preference' },
    { name: 'forced-colors', value: 'none' },
  ] });
  await page.addInitScript(({ blocked, corruptShader }) => {
    const probe: GLProbe = { attempts: 0, records: [] }; window.__studioProbe = probe;
    const original = HTMLCanvasElement.prototype.getContext;
    const observed = new WeakSet<WebGL2RenderingContext>();
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      const managed = this.classList.contains('studio-glass-canvas') && ['webgl2', 'webgl', 'experimental-webgl'].includes(type);
      if (managed) { probe.attempts++; if (blocked) return null; }
      const context = Reflect.apply(original, this, [type, ...args]);
      if (!managed || !context || observed.has(context)) return context;
      const gl = context as WebGL2RenderingContext; observed.add(gl);
      const record: GLRecord = { canvas: this, gl, draws: 0, compiles: 0, compileFailures: 0, linkFailures: 0, pixels: null, errors: [], resources: new Map() };
      record.lossExtension = gl.getExtension('WEBGL_lose_context') || undefined;
      probe.records.push(record);
      const resourceMethods: [ResourceKind, string, string][] = [
        ['shader', 'createShader', 'deleteShader'], ['program', 'createProgram', 'deleteProgram'],
        ['buffer', 'createBuffer', 'deleteBuffer'], ['texture', 'createTexture', 'deleteTexture'],
        ['framebuffer', 'createFramebuffer', 'deleteFramebuffer'], ['renderbuffer', 'createRenderbuffer', 'deleteRenderbuffer'],
        ['vertexArray', 'createVertexArray', 'deleteVertexArray'],
      ];
      const methods = gl as unknown as Record<string, (...values: unknown[]) => unknown>;
      for (const [kind, createName, deleteName] of resourceMethods) {
        if (!methods[createName] || !methods[deleteName]) continue;
        const resources = new Set<object>(); record.resources.set(kind, resources);
        const create = methods[createName], remove = methods[deleteName];
        Object.defineProperty(gl, createName, { configurable: true, value: (...values: unknown[]) => {
          const resource = Reflect.apply(create, gl, values);
          if (resource && typeof resource === 'object') resources.add(resource);
          return resource;
        } });
        Object.defineProperty(gl, deleteName, { configurable: true, value: (...values: unknown[]) => {
          resources.delete(values[0] as object); return Reflect.apply(remove, gl, values);
        } });
      }
      const source = gl.shaderSource.bind(gl), compile = gl.compileShader.bind(gl), link = gl.linkProgram.bind(gl), draw = gl.drawArrays.bind(gl);
      gl.shaderSource = (shader, value) => source(shader, corruptShader ? '#version 300 es\nThis is an intentionally invalid test shader.' : value);
      gl.compileShader = shader => { compile(shader); record.compiles++; if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) record.compileFailures++; };
      gl.linkProgram = program => { link(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) record.linkFailures++; };
      gl.drawArrays = (mode, first, count) => {
        draw(mode, first, count); record.draws++;
        // Read the first real default-framebuffer draw synchronously, before the
        // compositor clears a preserveDrawingBuffer:false canvas. No DOM pixels
        // or source text are captured, and only aggregate color counts survive.
        if (!record.pixels && !gl.isContextLost() && gl.getParameter(gl.FRAMEBUFFER_BINDING) === null) {
          const width = Math.min(this.width, 1024), height = Math.min(this.height, 512);
          const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const colors = new Set<number>(); let colored = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index + 3]) colored++;
            if (colors.size < 32) colors.add(((pixels[index] << 24) | (pixels[index + 1] << 16) | (pixels[index + 2] << 8) | pixels[index + 3]) >>> 0);
          }
          record.pixels = { colored, unique: colors.size };
          const error = gl.getError(); if (error !== gl.NO_ERROR && error !== gl.CONTEXT_LOST_WEBGL) record.errors.push(error);
        }
      };
      this.addEventListener('webglcontextlost', () => { record.pixels = null; for (const resources of record.resources.values()) resources.clear(); });
      return context;
    } as typeof original;
  }, { blocked: !!options.blocked, corruptShader: !!options.corruptShader });
  return session;
}

async function stats(page: Page) {
  return page.evaluate(() => window.__studioProbe.records.map(record => ({
    connected: record.canvas.isConnected, state: record.canvas.dataset.studioState,
    draws: record.draws, frames: Number(record.canvas.dataset.studioFrames || 0),
    compiles: record.compiles, compileFailures: record.compileFailures, linkFailures: record.linkFailures,
    pixels: record.pixels, errors: record.errors, resources: [...record.resources.values()].reduce((sum, set) => sum + set.size, 0),
    width: record.canvas.width, height: record.canvas.height,
    supportsContextLoss: !!record.lossExtension, contextLost: record.gl.isContextLost(),
  })));
}

async function ready(page: Page) {
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'ready');
  await expect.poll(async () => (await stats(page)).some(record => record.connected && record.draws > 0)).toBe(true);
}

test('the integrated shader actually compiles, draws varied pixels and stays idle without input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page); await page.goto('/demo/opportunities'); await ready(page);
  const rendered = (await stats(page)).filter(record => record.connected && record.draws > 0);
  for (const record of rendered) {
    expect(record.compiles).toBeGreaterThanOrEqual(2);
    expect(record.compileFailures).toBe(0); expect(record.linkFailures).toBe(0); expect(record.errors).toEqual([]);
    expect(record.pixels?.colored).toBeGreaterThan(0); expect(record.pixels?.unique).toBeGreaterThan(1);
  }
  const layer = page.locator('.glass-header .studio-glass-canvas');
  await expect(layer).toHaveAttribute('aria-hidden', 'true');
  expect(await layer.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  await page.waitForTimeout(200);
  const idle = (await stats(page)).reduce((sum, record) => sum + record.draws, 0);
  await page.waitForTimeout(500);
  expect((await stats(page)).reduce((sum, record) => sum + record.draws, 0)).toBe(idle);
  const header = await page.locator('.glass-header').boundingBox();
  await page.mouse.move(header!.x + 30, header!.y + 25); await page.mouse.move(header!.x + header!.width / 2, header!.y + header!.height / 2);
  await expect.poll(async () => (await stats(page)).reduce((sum, record) => sum + record.draws, 0)).toBeGreaterThan(idle);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'hidden');
  await expect.poll(async () => (await stats(page)).reduce((sum, record) => sum + record.resources, 0)).toBe(0);
  const hidden = (await stats(page)).reduce((sum, record) => sum + record.draws, 0);
  await page.mouse.move(header!.x + 45, header!.y + 30); await page.waitForTimeout(150);
  expect((await stats(page)).reduce((sum, record) => sum + record.draws, 0)).toBe(hidden);
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  await ready(page);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Insights', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByRole('heading', { name: 'Insights', exact: true, level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('DPR and resize stay bounded, and modal cycles release their GPU objects', async ({ page }) => {
  const session = await prepare(page);
  await session.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: false });
  await page.goto('/demo/opportunities'); await ready(page);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await session.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 3, mobile: false });
    await expect.poll(() => page.locator('.studio-glass-canvas[data-studio-state="ready"]').evaluateAll(elements => {
      const visible = elements.filter(element => element.getBoundingClientRect().width > 0);
      return visible.length > 0 && visible.every(element => {
      const canvas = element as HTMLCanvasElement, bounds = canvas.getBoundingClientRect();
      return canvas.width * canvas.height <= 512_000 && canvas.width <= Math.ceil(bounds.width * 1.5) + 1 && canvas.height <= Math.ceil(bounds.height * 1.5) + 1;
      });
    })).toBe(true);
    const surfaces = await page.locator('.studio-glass-canvas[data-studio-state="ready"]').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width > 0).map(element => {
      const canvas = element as HTMLCanvasElement, bounds = canvas.getBoundingClientRect();
      return { width: canvas.width, height: canvas.height, cssWidth: bounds.width, cssHeight: bounds.height };
    }));
    expect(surfaces.length).toBeGreaterThan(0); expect(surfaces.length).toBeLessThanOrEqual(3);
    for (const surface of surfaces) {
      expect(surface.width * surface.height).toBeLessThanOrEqual(512_000);
      expect(surface.width).toBeLessThanOrEqual(Math.ceil(surface.cssWidth * 1.5) + 1);
      expect(surface.height).toBeLessThanOrEqual(Math.ceil(surface.cssHeight * 1.5) + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.waitForTimeout(200);
  const baseline = (await stats(page)).filter(record => record.connected).reduce((sum, record) => sum + record.resources, 0);
  for (let cycle = 0; cycle < 20; cycle++) {
    await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
    await expect(page.getByRole('dialog').locator('.studio-glass-canvas')).toHaveAttribute('data-studio-state', 'ready');
    expect(await page.locator('.studio-glass-canvas[data-studio-state="ready"]').count()).toBeLessThanOrEqual(3);
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(async () => (await stats(page)).reduce((sum, record) => sum + record.resources, 0)).toBe(baseline);
    await expect.poll(async () => (await stats(page)).filter(record => !record.connected && record.supportsContextLoss).every(record => record.contextLost)).toBe(true);
    await ready(page);
  }
  expect((await stats(page)).filter(record => !record.connected).every(record => record.resources === 0)).toBe(true);
  await page.goto('/demo/my-search'); await ready(page);
  await page.locator('.tracker-role').first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('.studio-glass-canvas')).toHaveAttribute('data-studio-state', 'ready');
  await drawer.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.modal')).toHaveCount(2);
  const covered = page.locator('.modal').first().locator('.studio-glass-canvas');
  await expect(covered).toHaveAttribute('data-studio-state', 'hidden');
  expect(await page.locator('.studio-glass-canvas[data-studio-state="ready"]').count()).toBeLessThanOrEqual(3);
  expect(await page.evaluate(() => window.__studioProbe.records.filter(record => record.canvas.closest('.modal') === document.querySelector('.modal')).reduce((sum, record) => sum + [...record.resources.values()].reduce((count, resources) => count + resources.size, 0), 0))).toBe(0);
  await page.keyboard.press('Escape'); await expect(page.locator('.modal')).toHaveCount(1);
  await expect(covered).toHaveAttribute('data-studio-state', 'ready');
  await page.keyboard.press('Escape'); await expect(page.locator('.modal')).toHaveCount(0);
});

test('unavailable WebGL falls back without blocking real demo controls or saves', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page, { blocked: true }); await page.goto('/demo/opportunities');
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'fallback');
  const card = page.locator('.job-card').first(), title = await card.locator('h3').innerText();
  await card.getByRole('button', { name: `Save ${title}`, exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved to My Search');
  await page.goto('/demo/my-search'); await expect(page.locator('.tracker-role').filter({ hasText: title })).toBeVisible();
  expect(await page.evaluate(() => window.__studioProbe.attempts)).toBeGreaterThan(0);
  expect(await stats(page)).toEqual([]); expect(errors).toEqual([]);
});

test('shader compilation failure releases partial resources and keeps the CSS fallback usable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await prepare(page, { corruptShader: true }); await page.goto('/demo/opportunities');
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'fallback');
  const records = await stats(page); expect(records.some(record => record.compileFailures > 0)).toBe(true);
  expect(records.every(record => record.resources === 0)).toBe(true);
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Company *', { exact: true })).toBeEditable();
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('reduced preferences skip or freeze GPU work and release resources when toggled', async ({ page }) => {
  const session = await prepare(page, { reducedTransparency: true }); await page.goto('/demo/opportunities');
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'reduced');
  expect(await page.evaluate(() => window.__studioProbe.attempts)).toBe(0);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'forced-colors', value: 'none' }] });
  await ready(page); await page.waitForTimeout(200);
  const before = (await stats(page)).reduce((sum, record) => sum + record.draws, 0), header = await page.locator('.glass-header').boundingBox();
  await page.mouse.move(header!.x + 20, header!.y + 20); await page.mouse.move(header!.x + header!.width / 2, header!.y + 25);
  await page.waitForTimeout(300);
  expect((await stats(page)).reduce((sum, record) => sum + record.draws, 0)).toBe(before);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'reduced');
  await expect.poll(async () => (await stats(page)).reduce((sum, record) => sum + record.resources, 0)).toBe(0);
  expect(await page.locator('.glass-header').evaluate(element => getComputedStyle(element).backdropFilter)).toBe('none');
  const attempts = await page.evaluate(() => window.__studioProbe.attempts);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'forced-colors', value: 'active' }] });
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'reduced');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__studioProbe.attempts)).toBe(attempts);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'forced-colors', value: 'none' }, { name: 'prefers-contrast', value: 'more' }] });
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'reduced');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.__studioProbe.attempts)).toBe(attempts);
});

test('native context loss keeps navigation usable and restoration recreates a working frame', async ({ page }) => {
  await prepare(page); await page.goto('/demo/opportunities'); await ready(page);
  const before = (await stats(page)).reduce((sum, record) => sum + record.draws, 0);
  await page.evaluate(() => {
    const record = window.__studioProbe.records.find(item => item.canvas.isConnected && item.canvas.closest('.glass-header'))!;
    const extension = record.gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('The real context-loss extension is required for this browser gate.');
    record.lossExtension = extension;
    extension.loseContext();
  });
  await expect(page.locator('.glass-header .studio-glass-canvas')).toHaveAttribute('data-studio-state', 'lost');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Search', exact: true, level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const record = window.__studioProbe.records.find(item => item.canvas.isConnected && item.canvas.closest('.glass-header'))!;
    record.lossExtension!.restoreContext();
  });
  await ready(page);
  await expect.poll(async () => (await stats(page)).reduce((sum, record) => sum + record.draws, 0)).toBeGreaterThan(before);
  expect((await stats(page)).find(record => record.connected && record.pixels)?.pixels?.unique).toBeGreaterThan(1);
  expect((await stats(page)).filter(record => record.connected).every(record => record.errors.length === 0)).toBe(true);
});
