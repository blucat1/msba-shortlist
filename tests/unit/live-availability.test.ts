import { describe, expect, it, vi } from 'vitest';
import { checkLiveSite } from '../../scripts/check-live';

const site = 'https://msba-shortlist.pages.dev';
const backend = 'https://xglakzqorbjvganpbilu.supabase.co';
const publicKey = 'sb_publishable_public_test_value_1234567890';
const shell = '<div id="root"></div><script type="module" src="/assets/index-test.js"></script>';
const bundle = `const config={url:"${backend}",key:"${publicKey}"};`;
const auth = { external: { google: true }, disable_signup: false };
function server(options: { module?: string; html?: string; catalog?: unknown; settings?: unknown } = {}) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith('.js')) return new Response(options.module ?? bundle);
    if (url.includes('/rest/v1/')) return Response.json(options.catalog ?? [{ id: 'public-listing-id' }]);
    if (url.includes('/auth/v1/')) return Response.json(options.settings ?? auth);
    return new Response(options.html ?? shell);
  });
}

describe('free public availability checks', () => {
  it('checks all three public routes, anonymous catalog and open signup with GET requests and the public bundle key', async () => {
    const fetcher = server();
    await expect(checkLiveSite(fetcher)).resolves.toMatchObject({ primaryRoutes: 3, anonymousCatalog: true, googleEnabled: true, newAccountSignup: true });
    expect(fetcher).toHaveBeenCalledTimes(6);
    for (const [url, init] of fetcher.mock.calls) {
      expect(init?.method).toBe('GET'); expect(init?.redirect).toBe('error');
      expect([site, backend]).toContain(new URL(String(url)).origin);
      if (String(url).startsWith(backend)) expect(init?.headers).toEqual({ apikey: publicKey, Accept: 'application/json' });
    }
  });
  it('never substitutes a privileged key or follows a different backend', async () => {
    await expect(checkLiveSite(server({ module: `const config={url:"${backend}",key:"sb_secret_example_privileged_value_1234567890"};` }))).rejects.toThrow('browser-safe');
    await expect(checkLiveSite(server({ module: bundle + 'const other="https://otherproject.supabase.co";' }))).rejects.toThrow('browser-safe');
  });
  it('rejects an external application script before requesting it', async () => {
    const fetcher = server({ html: '<div id="root"></div><script src="https://example.com/app.js"></script>' });
    await expect(checkLiveSite(fetcher)).rejects.toThrow('outside local'); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('detects missing public rows, malformed responses and disabled signup', async () => {
    for (const catalog of [{ code: '42501' }, [], [{}], [123], [{ id: '' }]]) await expect(checkLiveSite(server({ catalog }))).rejects.toThrow('catalog access');
    await expect(checkLiveSite(server({ settings: { ...auth, disable_signup: true } }))).rejects.toThrow('signup');
    await expect(checkLiveSite(server({ settings: { external: { google: false }, disable_signup: false } }))).rejects.toThrow('Google');
  });
});
