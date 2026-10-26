import { pathToFileURL } from 'node:url';

const SITE = 'https://msba-shortlist.pages.dev';
const BACKEND = 'https://xglakzqorbjvganpbilu.supabase.co';

/** Read-only checks of the published app and its browser-safe API access.
 * No privileged environment variables, sessions, source feeds or user records.
 */
export async function checkLiveSite(fetcher: typeof fetch = fetch) {
  async function get(url: string, headers: Record<string, string> = {}): Promise<string> {
    const origin = new URL(url).origin;
    if (origin !== SITE && origin !== BACKEND) throw new Error('Health check origin is not approved.');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetcher(url, { method: 'GET', headers, redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error(`Public service returned HTTP ${response.status}.`);
      const body = await response.text();
      if (body.length > 4_000_000) throw new Error('Public health response exceeded the supported size.');
      return body;
    } finally { clearTimeout(timer); }
  }

  let entry = '';
  for (const route of ['/opportunities', '/my-search', '/insights']) {
    const html = await get(`${SITE}${route}`);
    if (!/<div\s+id=["']root["']/.test(html)) throw new Error('A primary route did not serve the application shell.');
    if (!entry) entry = html;
  }
  const path = entry.match(/<script\b[^>]*\bsrc=["']([^"']+)["']/)?.[1];
  if (!path) throw new Error('Published application module is missing.');
  const moduleUrl = new URL(path, SITE);
  if (moduleUrl.origin !== SITE || !/^\/assets\/[a-zA-Z0-9_.-]+\.js$/.test(moduleUrl.pathname)) throw new Error('Published module is outside local application assets.');
  const module = await get(moduleUrl.href);
  const origins = new Set(module.match(/https:\/\/[a-z0-9]+\.supabase\.co/g));
  const keys = [...new Set(module.match(/sb_publishable_[a-zA-Z0-9_-]{20,}/g))];
  if (origins.size !== 1 || !origins.has(BACKEND) || keys.length !== 1) throw new Error('Published browser-safe backend configuration could not be verified.');
  // The key comes only from the public browser bundle. Never fall back to a
  // server key, even if a privileged variable is present in the environment.
  const headers = { apikey: keys[0], Accept: 'application/json' };
  const catalog: unknown = JSON.parse(await get(`${BACKEND}/rest/v1/catalog_jobs?select=id&limit=1`, headers));
  if (!Array.isArray(catalog) || catalog.length !== 1 || !catalog[0] || typeof catalog[0] !== 'object'
    || typeof catalog[0].id !== 'string' || !catalog[0].id.trim()) throw new Error('Anonymous catalog access is unavailable or the published catalog is empty.');
  const settings: unknown = JSON.parse(await get(`${BACKEND}/auth/v1/settings`, headers));
  if (!settings || typeof settings !== 'object' || !('external' in settings) || !settings.external || typeof settings.external !== 'object'
    || !('google' in settings.external) || settings.external.google !== true || !('disable_signup' in settings) || settings.disable_signup !== false) {
    throw new Error('Google sign-in or new-account signup is unavailable.');
  }
  return { site: SITE, primaryRoutes: 3, anonymousCatalog: true, googleEnabled: true, newAccountSignup: true, checkedAt: new Date().toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { console.log(JSON.stringify(await checkLiveSite())); break; }
    catch {
      if (attempt === 1) { console.error('Live availability check failed after two attempts. Inspect public hosting, catalog access and signup settings. No credentials or response bodies are logged.'); process.exitCode = 1; }
      else await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
