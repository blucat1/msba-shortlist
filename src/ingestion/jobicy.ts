import { z } from 'zod';
import type { SalaryBand } from '../domain/types';
import type { BoardSnapshot, Fetcher, ProviderPosting } from './adapters';
import { plainText } from './classification';

/** Public contract and republication/attribution terms, checked 2026-10-21:
 * https://jobicy.com/api/openapi.json
 * https://jobicy.com/jobs-rss-feed (Fair use)
 * No credentials are accepted or sent here. Public URLs must stay on Jobicy;
 * original ATS links belong to a separate, paid API and are not used.
 * This is a seven-day discovery window, not an all-active-jobs snapshot.
 */
const ENDPOINT = 'https://jobicy.com/api/jobs';
const PAGE_SIZE = 200;
const MAX_PAGES = 100;
const positiveId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime({ offset: true });
const text = z.string().max(1_000_000);
const postingSchema = z.object({
  id: positiveId,
  url: z.string().url().max(4096),
  jobTitle: text,
  companyName: text,
  jobType: z.array(z.string().max(500)).max(20),
  jobGeo: z.string().max(5000),
  jobDescription: text,
  pubDate: timestamp,
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  salaryCurrency: z.string().max(100).optional(),
  salaryPeriod: z.string().max(100).optional(),
}).passthrough();
const pageSchema = z.object({
  apiVersion: z.string().min(1),
  jobCount: z.number().int().nonnegative().max(PAGE_SIZE),
  nextCursor: z.string().min(1).max(2048).nullable(),
  hasMore: z.boolean(),
  appliedFilters: z.object({ count: z.number().int().positive().max(PAGE_SIZE), geo: z.literal('usa'), cursor: z.string().optional() }).passthrough(),
  jobs: z.array(postingSchema).max(PAGE_SIZE),
  statusCode: z.literal(200),
  success: z.literal(true),
}).passthrough();
export type JobicyStatus = { externalId: string; status: 'active' | 'closed' | 'unknown' };
const statusSchema = z.object({
  apiVersion: z.string().min(1),
  checkedAt: timestamp,
  count: z.number().int().positive().max(100),
  jobs: z.array(z.object({ id: positiveId, status: z.enum(['active', 'closed', 'unknown']) })).min(1).max(100),
  statusCode: z.literal(200),
  success: z.literal(true),
}).passthrough();

function postingUrl(value: string, externalId: string): string {
  const target = new URL(value);
  if (target.protocol !== 'https:' || target.hostname !== 'jobicy.com' || target.port || target.username || target.password
    || target.search || target.hash || !target.pathname.startsWith(`/jobs/${externalId}-`)
    || target.pathname.slice(`/jobs/${externalId}-`.length).includes('/') || target.pathname === `/jobs/${externalId}-`) {
    throw new Error('Jobicy returned a noncanonical public listing URL; window rejected.');
  }
  return target.href;
}

function salary(row: z.infer<typeof postingSchema>): SalaryBand[] {
  if (row.salaryMin === undefined && row.salaryMax === undefined) return [];
  if (row.salaryMin !== undefined && row.salaryMax !== undefined && row.salaryMax < row.salaryMin) {
    throw new Error('Jobicy salary bounds are inconsistent; window rejected.');
  }
  const value = row.salaryPeriod || '';
  const period: SalaryBand['period'] = /^(?:hour|hourly)$/i.test(value) ? 'hour'
    : /^(?:month|monthly)$/i.test(value) ? 'month'
      : /^(?:year|yearly|annual|annually)$/i.test(value) ? 'year' : 'unknown';
  return [{ min: row.salaryMin ?? null, max: row.salaryMax ?? null, currency: plainText(row.salaryCurrency || '') || 'unknown',
    period, compensationType: 'unknown', location: plainText(row.jobGeo) || null,
    sourceText: `Jobicy reports ${row.salaryMin ?? '?'}–${row.salaryMax ?? '?'} ${row.salaryCurrency || 'currency not stated'} ${row.salaryPeriod || 'period not stated'}.` }];
}

export async function fetchJobicyWindow(fetchJson: Fetcher, now: string): Promise<BoardSnapshot> {
  timestamp.parse(now);
  const endpoint = `${ENDPOINT}?count=${PAGE_SIZE}&geo=usa`;
  const postings: ProviderPosting[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const request = new URL(endpoint);
    if (cursor !== null) request.searchParams.set('cursor', cursor);
    const parsed = pageSchema.parse(await fetchJson(request.href));
    if (parsed.jobCount !== parsed.jobs.length || parsed.hasMore !== (parsed.nextCursor !== null)
      || parsed.hasMore && !parsed.jobs.length || parsed.appliedFilters.cursor !== undefined && parsed.appliedFilters.cursor !== cursor) {
      throw new Error('Jobicy pagination or count is inconsistent; incomplete window rejected.');
    }
    for (const row of parsed.jobs) {
      const externalId = String(row.id);
      if (ids.has(externalId)) throw new Error('Duplicate Jobicy posting IDs; incomplete window rejected.');
      ids.add(externalId);
      const title = plainText(row.jobTitle), description = plainText(row.jobDescription), geo = plainText(row.jobGeo), companyName = plainText(row.companyName);
      if (!title || !description) throw new Error('Jobicy posting lacks usable title or requirements; window rejected.');
      if (!companyName || companyName.length > 240) throw new Error('Jobicy posting lacks a usable employer name within the catalog limit; window rejected.');
      const canonicalUrl = postingUrl(row.url, externalId);
      postings.push({ externalId, title, companyName,
        postingUrl: canonicalUrl, applicationUrl: canonicalUrl,
        // The USA query also returns Anywhere. A remote/global label alone does
        // not establish US eligibility; preserve it for Needs details checked.
        locations: [{ label: geo || 'Location not supplied', country: /\b(?:USA|US|United States(?: of America)?)\b/i.test(geo) ? 'US' : null, city: null, region: null }],
        description, employment: row.jobType.map(plainText).filter(Boolean).join(', ') || null, workMode: 'remote',
        // Publication on this aggregator does not prove when the employer first
        // posted the opening. Keep those two kinds of provenance separate.
        sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: new Date(row.pubDate).toISOString(), salary: salary(row) });
    }
    if (parsed.nextCursor === null) return { postings, rawCount: postings.length, complete: true, checkedAt: now, endpoint, reconciliation: 'rolling-status' };
    if (cursors.has(parsed.nextCursor)) throw new Error('Jobicy pagination cursor repeated; incomplete window rejected.');
    cursors.add(parsed.nextCursor);
    cursor = parsed.nextCursor;
  }
  throw new Error('Jobicy page safety limit reached; refusing an incomplete window.');
}

/** Results describe Jobicy's listing state, not a live employer ATS probe.
 * Absence from the discovery window and an explicit unknown are never closed.
 * Validate the entire requested batch sequence before returning any updates.
 */
export async function fetchJobicyStatuses(ids: string[], fetchJson: Fetcher): Promise<JobicyStatus[]> {
  const uniqueIds = [...new Set(ids)];
  for (const id of uniqueIds) {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error('Invalid Jobicy status ID; no status synchronization performed.');
  }
  const output: JobicyStatus[] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const batch = uniqueIds.slice(offset, offset + 100);
    const request = new URL(`${ENDPOINT}/status`);
    request.searchParams.set('ids', batch.join(','));
    const parsed = statusSchema.parse(await fetchJson(request.href));
    const results = new Map(parsed.jobs.map(row => [String(row.id), row.status]));
    if (parsed.count !== batch.length || parsed.jobs.length !== batch.length || results.size !== batch.length || batch.some(id => !results.has(id))) {
      throw new Error('Jobicy status IDs or counts are incomplete; no status synchronization performed.');
    }
    output.push(...batch.map(externalId => ({ externalId, status: results.get(externalId)! })));
  }
  return output;
}
