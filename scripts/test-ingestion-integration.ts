/** Real local Supabase integration; only the external HTTP boundary is replaced.
 * Never accepts cloud credentials or a remote Supabase URL. No live feed polls.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchBoard } from '../src/ingestion/adapters';
import { fetchPublicJson } from '../src/ingestion/http';
import { normalizePosting } from '../src/ingestion/normalize';
import { loadRegistry } from '../src/ingestion/registry';
import { opportunityFromJob, createTask } from '../src/domain/records';
import { parseBackup } from '../src/domain/transfer';
import type { Database } from '../src/lib/database.types';
import { createSupabaseRepository } from '../src/repositories/supabase';

const fixture = JSON.parse(readFileSync(new URL('../tests/integration/fixtures/public-feeds.json', import.meta.url), 'utf8'));
const selectedIds = ['greenhouse-figma', 'lever-veeva', 'ashby-linear', 'jobicy-usa'];
const nativeFetch = globalThis.fetch;
const runTag = randomUUID();
const createdUsers: string[] = [];
let admin: SupabaseClient<Database> | undefined;
let server: ChildProcess | undefined;
let label = 'local preflight';
let passed = 0;
let mode: 'baseline' | 'partial' | 'empty-window' = 'baseline';
let agedOutStatus: 'unknown' | 'closed' = 'unknown';
let providerCalls = 0;
let seeded = false;
const localOrigin = 'http://127.0.0.1:54321';
const browserOrigin = 'http://127.0.0.1:5183';
function invariant(value: unknown): asserts value { if (!value) throw new Error('Integration assertion failed'); }
function data<R extends { data: unknown; error: unknown }>(result: R): NonNullable<R['data']> {
  invariant(!result.error); return result.data as NonNullable<R['data']>;
}
async function check(name: string, work: () => Promise<void>) { label = name; await work(); passed++; console.log(`PASS ${name}`); }
function requestUrl(input: RequestInfo | URL): URL { return new URL(input instanceof Request ? input.url : String(input)); }
function boundaryFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  if ([localOrigin, browserOrigin].includes(url.origin)) return nativeFetch(input, init);
  providerCalls++;
  invariant(init?.redirect === 'error');
  invariant(new Headers(init?.headers).get('Accept') === 'application/json');
  let payload: unknown;
  if (url.hostname === 'boards-api.greenhouse.io' && url.pathname === '/v1/boards/figma/jobs') payload = fixture.greenhouse;
  else if (url.hostname === 'api.lever.co' && url.pathname === '/v0/postings/veeva') payload = fixture.lever;
  else if (url.hostname === 'api.ashbyhq.com' && url.pathname === '/posting-api/job-board/Linear') payload = fixture.ashby;
  else if (url.origin === 'https://jobicy.com' && url.pathname === '/api/jobs') {
    invariant(url.searchParams.get('count') === '200' && url.searchParams.get('geo') === 'usa');
    if (mode === 'empty-window') return Promise.resolve(new Response(JSON.stringify({ ...fixture.jobicy, jobs: [], jobCount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const second = url.searchParams.has('cursor');
    if (second) invariant(url.searchParams.get('cursor') === 'offline-page-2');
    payload = { ...fixture.jobicy, jobs: [fixture.jobicy.jobs[second ? 1 : 0]], jobCount: 1,
      hasMore: !second, nextCursor: second ? null : 'offline-page-2',
      appliedFilters: { count: 200, geo: 'usa', ...(second ? { cursor: 'offline-page-2' } : {}) },
      ...(mode === 'partial' && second ? { success: false } : {}) };
  } else if (url.origin === 'https://jobicy.com' && url.pathname === '/api/jobs/status') {
    const ids = (url.searchParams.get('ids') || '').split(',');
    invariant(ids.length === 2 && ids.every(id => fixture.jobicy.jobs.some((job: { id: number }) => String(job.id) === id)));
    payload = { apiVersion: fixture.jobicy.apiVersion, checkedAt: new Date().toISOString(), count: ids.length,
      jobs: ids.map(id => ({ id: Number(id), status: id === String(fixture.jobicy.jobs[0].id) ? 'active' : agedOutStatus })), statusCode: 200, success: true };
  } else throw new Error('Unexpected external request in integration gate');
  return Promise.resolve(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}
function localConfiguration(): { url: string; anonymous: string; secret: string } {
  const result = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--output', 'json'], { encoding: 'utf8', timeout: 20_000 });
  if (result.status !== 0) throw new Error('Local Supabase not running');
  const values = JSON.parse(result.stdout);
  invariant(values.API_URL === localOrigin && new URL(values.DB_URL).hostname === '127.0.0.1');
  invariant(typeof values.ANON_KEY === 'string' && typeof values.SERVICE_ROLE_KEY === 'string');
  invariant(JSON.parse(Buffer.from(values.ANON_KEY.split('.')[1], 'base64url').toString()).role === 'anon');
  invariant(JSON.parse(Buffer.from(values.SERVICE_ROLE_KEY.split('.')[1], 'base64url').toString()).role === 'service_role');
  return { url: localOrigin, anonymous: values.ANON_KEY, secret: values.SERVICE_ROLE_KEY };
}
async function runActualIngestion(sourceId: string, config: ReturnType<typeof localConfiguration>): Promise<number> {
  const beforeArgs = process.argv, beforeExit = process.exitCode;
  const beforeUrl = process.env.SUPABASE_URL, beforeSecret = process.env.SUPABASE_SECRET_KEY;
  try {
    process.argv = [process.execPath, 'scripts/ingest.ts', '--source', sourceId];
    process.env.SUPABASE_URL = config.url; process.env.SUPABASE_SECRET_KEY = config.secret; process.exitCode = undefined;
    const entry = new URL('./ingest.ts', import.meta.url); entry.searchParams.set('integration', randomUUID());
    seeded = true;
    await import(entry.href);
    return Number(process.exitCode || 0);
  } finally {
    process.argv = beforeArgs; process.exitCode = beforeExit;
    if (beforeUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = beforeUrl;
    if (beforeSecret === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = beforeSecret;
  }
}
async function waitForBrowserServer(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await nativeFetch(browserOrigin)).ok) return; } catch { /* Wait for local startup only. */ }
    invariant(server?.exitCode === null);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Local browser server did not start');
}
async function main() {
  const fixturesOnly = process.argv.includes('--fixtures-only');
  invariant(process.argv.slice(2).every(arg => arg === '--fixtures-only'));
  globalThis.fetch = boundaryFetch;
  const registry = await loadRegistry();
  const sources = selectedIds.map(id => registry.find(source => source.id === id));
  invariant(sources.every(source => source?.enabled && source.state === 'verified'));
  await check('shared HTTP policy, four production adapters, pagination and normalization', async () => {
    for (const source of sources) {
      invariant(source);
      const snapshot = await fetchBoard(source, fetchPublicJson);
      const jobs = snapshot.postings.map(posting => normalizePosting(posting, source, new Date().toISOString()));
      invariant(snapshot.complete && jobs.length > 0 && jobs.every(job => job.externalId && job.company));
      if (source.provider === 'jobicy') {
        invariant(snapshot.reconciliation === 'rolling-status' && jobs.length === 2);
        invariant(jobs[0].employerGroupingKey !== jobs[1].employerGroupingKey);
        invariant(jobs.every(job => job.publisher?.name === 'Jobicy' && job.publisher.url === job.postingUrl));
      }
    }
    invariant(providerCalls === 5);
  });
  if (fixturesOnly) {
    console.log('FIXTURE TRANSPORT PASS. Supabase/Auth/SQL/browser integration NOT EXECUTED (--fixtures-only).');
    return;
  }
  label = 'local Supabase configuration (Docker/local stack required)';
  const config = localConfiguration();
  const client = (key = config.anonymous) => createClient<Database>(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  admin = client(config.secret);
  await check('disposable local stack is empty before any test writes', async () => {
    for (const table of ['employers', 'job_sources', 'catalog_jobs', 'opportunities'] as const) {
      const result = await admin!.from(table).select('*', { count: 'exact', head: true }); data(result); invariant(result.count === 0);
    }
  });
  await check('actual production ingestion entry point finalizes all four providers through real SQL RPCs', async () => {
    for (const id of selectedIds) invariant(await runActualIngestion(id, config) === 0);
    const jobs = data(await admin!.from('catalog_jobs').select('*').in('source_id', selectedIds));
    invariant(jobs.length === 5 && new Set(jobs.map(job => job.source_id)).size === 4);
    const runs = data(await admin!.from('source_runs').select('status,complete').in('source_id', selectedIds));
    invariant(runs.length === 4 && runs.every(run => run.status === 'success' && run.complete));
  });
  const accounts: { id: string; client: SupabaseClient<Database> }[] = [];
  await check('two disposable local Auth accounts obtain independent real sessions', async () => {
    for (const suffix of ['a', 'b']) {
      const credentials = { email: `integration-${runTag}-${suffix}@example.invalid`, password: `A!9${randomBytes(30).toString('base64url')}` };
      const created = data(await admin!.auth.admin.createUser({ ...credentials, email_confirm: true, user_metadata: { integration_run: runTag } })).user;
      invariant(created); createdUsers.push(created.id);
      const userClient = client(); const signed = data(await userClient.auth.signInWithPassword(credentials));
      invariant(signed.user?.id === created.id && signed.session);
      accounts.push({ id: created.id, client: userClient });
    }
  });
  const repositoryA = createSupabaseRepository(accounts[0].client), repositoryB = createSupabaseRepository(accounts[1].client);
  const snapshotA = await repositoryA.getSnapshot();
  const marketJobs = snapshotA.jobs.filter(job => job.sourceId === 'jobicy-usa');
  invariant(marketJobs.length === 2);
  const first = marketJobs.find(job => job.externalId === String(fixture.jobicy.jobs[0].id))!;
  const second = marketJobs.find(job => job.externalId === String(fixture.jobicy.jobs[1].id))!;
  await check('real repository save keeps actual companies, grouping and public-source provenance', async () => {
    const firstSaved = await repositoryA.saveOpportunity({ ...opportunityFromJob(first, accounts[0].id), notes: 'Disposable private integration marker' });
    const secondSaved = await repositoryA.saveOpportunity(opportunityFromJob(second, accounts[0].id));
    invariant(firstSaved.companyKey !== secondSaved.companyKey && firstSaved.companyKey === first.employerGroupingKey);
    invariant(firstSaved.snapshot?.publisher?.url === first.postingUrl && secondSaved.snapshot?.company === second.company);
    await repositoryA.recordApplicationOpened(firstSaved.id, `integration-open-${runTag}`);
    await repositoryA.changeStage(firstSaved.id, 'Applied', { idempotencyKey: `integration-stage-${runTag}`, applicationDate: new Date().toISOString().slice(0, 10) });
    await repositoryA.saveTask(createTask(firstSaved.id, accounts[0].id, 'Disposable integration follow-up'));
    const next = await repositoryA.getSnapshot();
    invariant(next.opportunities.length === 2 && next.tasks.length === 1 && next.events.some(event => event.type === 'application_opened'));
    invariant((await repositoryB.getSnapshot()).opportunities.length === 0);
    const forbidden = await accounts[1].client.from('opportunities').select('id').eq('id', firstSaved.id);
    invariant(!forbidden.error && forbidden.data.length === 0);
  });
  await check('live backup validation and real import preserve snapshots, history and company identity', async () => {
    const backup = parseBackup(JSON.stringify(await repositoryA.exportBackup()));
    invariant(backup.sourceMode === 'live' && backup.opportunities.length === 2 && backup.tasks.length === 1);
    const imported = await repositoryB.importBackup(backup);
    invariant(imported.imported === 2 && imported.skipped === 0);
    const restored = await repositoryB.getSnapshot();
    invariant(restored.opportunities.every(opportunity => opportunity.userId === accounts[1].id));
    invariant(restored.tasks.length === 1 && restored.events.some(event => event.type === 'application_opened'));
    for (const original of backup.opportunities) {
      const copy = restored.opportunities.find(opportunity => opportunity.catalogJobId === original.catalogJobId);
      invariant(copy?.companyKey === original.companyKey && copy.snapshot?.publisher?.url === original.snapshot?.publisher?.url);
    }
    const duplicate = await repositoryB.importBackup(backup); invariant(duplicate.imported === 0 && duplicate.skipped === 2);
  });
  await check('actual rolling-window entry point checks aged-out IDs and only explicit closure closes a listing', async () => {
    const baseline = data(await admin!.from('catalog_jobs').select('external_id,first_seen_at').eq('source_id', 'jobicy-usa'));
    const expireLocalCooldown = async () => { data(await admin!.from('job_sources').update({ last_check_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }).eq('id', 'jobicy-usa')); };
    mode = 'empty-window'; await expireLocalCooldown();
    invariant(await runActualIngestion('jobicy-usa', config) === 0);
    let rows = data(await admin!.from('catalog_jobs').select('external_id,availability').eq('source_id', 'jobicy-usa'));
    invariant(rows.find(row => row.external_id === first.externalId)?.availability === 'open');
    invariant(rows.find(row => row.external_id === second.externalId)?.availability === 'availability_unconfirmed');
    invariant((await repositoryA.getSnapshot()).opportunities.every(opportunity => opportunity.snapshot?.availability === 'open'));
    agedOutStatus = 'closed'; await expireLocalCooldown();
    invariant(await runActualIngestion('jobicy-usa', config) === 0);
    rows = data(await admin!.from('catalog_jobs').select('external_id,availability').eq('source_id', 'jobicy-usa'));
    invariant(rows.find(row => row.external_id === first.externalId)?.availability === 'open');
    invariant(rows.find(row => row.external_id === second.externalId)?.availability === 'closed');
    mode = 'baseline'; await expireLocalCooldown();
    invariant(await runActualIngestion('jobicy-usa', config) === 0);
    const reopened = data(await admin!.from('catalog_jobs').select('external_id,first_seen_at,availability').eq('source_id', 'jobicy-usa'));
    invariant(reopened.every(row => row.availability === 'open' && baseline.find(original => original.external_id === row.external_id)?.first_seen_at === row.first_seen_at));
  });
  await check('incomplete captured HTTP pages fail before a new snapshot and real SQL retains prior records', async () => {
    const before = data(await admin!.from('catalog_jobs').select('*').eq('source_id', 'jobicy-usa').order('id'));
    mode = 'partial';
    let rejected = false;
    try { await fetchBoard(sources[3]!, fetchPublicJson); } catch { rejected = true; }
    invariant(rejected);
    data(await admin!.rpc('finalize_market_source_run', { p_source_id: 'jobicy-usa', p_run_key: randomUUID(), p_jobs: [], p_statuses: [], p_complete: false, p_raw_count: 0 }));
    const after = data(await admin!.from('catalog_jobs').select('*').eq('source_id', 'jobicy-usa').order('id'));
    invariant(JSON.stringify(after) === JSON.stringify(before)); mode = 'baseline';
  });
  await check('persisted cooldown prevents repeat production entry-point requests and health changes', async () => {
    const before = data(await admin!.from('job_sources').select('*').eq('id', 'jobicy-usa').single());
    const calls = providerCalls;
    invariant(await runActualIngestion('jobicy-usa', config) === 0 && calls === providerCalls);
    const after = data(await admin!.from('job_sources').select('*').eq('id', 'jobicy-usa').single());
    invariant(JSON.stringify(after) === JSON.stringify(before));
  });
  await check('anonymous browser renders persisted source identity and credit at desktop and mobile widths', async () => {
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/SECRET|TOKEN|SUPABASE/i.test(key)));
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5183', '--strictPort'], {
      env: { ...environment, VITE_APP_MODE: 'production', VITE_SUPABASE_URL: config.url, VITE_SUPABASE_PUBLISHABLE_KEY: config.anonymous, VITE_SITE_URL: browserOrigin },
      stdio: 'ignore',
    });
    await waitForBrowserServer();
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch(process.platform === 'darwin' && existsSync(chrome) ? { executablePath: chrome } : {});
    try {
      const page = await browser.newPage();
      await page.route('**/*', route => [browserOrigin, localOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${browserOrigin}/opportunities?job=${first.id}`);
        const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('link', { name: /Source: Jobicy/ })).toHaveAttribute('href', first.postingUrl!);
        await expect(dialog.getByRole('heading', { name: first.title, exact: true })).toBeVisible();
        await expect(dialog.getByText(first.company, { exact: true }).first()).toBeVisible();
        invariant(!(await page.getByText('Disposable private integration marker').count()));
        invariant(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      }
      await page.close();
    } finally { await browser.close(); }
  });
  console.log(`LOCAL INTEGRATION PASS: ${passed} groups; four real ingestion paths, local Auth/REST/SQL, save/backup and browser. Google OAuth and human usefulness NOT EXECUTED.`);
}

try { await main(); }
catch { console.error(`LOCAL INTEGRATION FAILED / NOT COMPLETE: ${label}. No cloud or live feed requests are permitted. Details withheld to protect credentials and private test fields.`); process.exitCode = 1; }
finally {
  globalThis.fetch = nativeFetch;
  server?.kill('SIGTERM');
  if (admin) {
    let cleanupFailed = false;
    for (const id of createdUsers) {
      if ((await admin.auth.admin.deleteUser(id)).error) cleanupFailed = true;
      const remaining = await admin.auth.admin.getUserById(id);
      if (remaining.data.user || remaining.error && remaining.error.status !== 404 && remaining.error.code !== 'user_not_found') cleanupFailed = true;
    }
    if (seeded) {
      const registry = await loadRegistry();
      if ((await admin.from('catalog_jobs').delete().in('source_id', selectedIds)).error) cleanupFailed = true;
      if ((await admin.from('job_sources').delete().in('id', registry.map(source => source.id))).error) cleanupFailed = true;
      if ((await admin.from('employers').delete().in('id', [...new Set(registry.map(source => source.employerId))])).error) cleanupFailed = true;
    }
    if (cleanupFailed) { console.error('LOCAL INTEGRATION CLEANUP FAILED: inspect the disposable local stack; no production cleanup was attempted.'); process.exitCode = 1; }
    else console.log('PASS disposable local integration cleanup');
  }
}
