import { z } from 'zod';
import type { JobSource, SalaryBand } from '../domain/types';
import { location, plainText, safePostingUrl } from './classification';
import type { JobLocation } from '../domain/types';
import { fetchJobicyWindow } from './jobicy';

const optionalText = z.string().nullish();
const id = z.union([z.string().min(1), z.number().int()]).transform(String);
const greenhouseJob = z.object({ id, title: z.string().min(1), absolute_url: z.string().url(), updated_at: optionalText, first_published: optionalText, content: optionalText, location: z.object({ name: z.string() }).nullish(), offices: z.array(z.object({ name: optionalText, location: optionalText })).nullish(), metadata: z.array(z.object({ name: z.string(), value: z.unknown() })).nullish() }).passthrough();
const leverJob = z.object({ id: z.string().min(1), text: z.string().min(1), hostedUrl: z.string().url(), applyUrl: z.string().url(), categories: z.object({ location: optionalText, allLocations: z.array(z.string()).nullish(), commitment: optionalText }).passthrough().nullish(), country: optionalText, descriptionPlain: optionalText, description: optionalText, additionalPlain: optionalText, lists: z.array(z.object({ text: z.string(), content: z.string() })).nullish(), workplaceType: optionalText, createdAt: z.number().nullish(), salaryRange: z.object({ currency: z.string(), interval: z.string(), min: z.number().nullish(), max: z.number().nullish() }).nullish(), salaryDescriptionPlain: optionalText }).passthrough();
const postal = z.object({ addressCountry: optionalText, addressRegion: optionalText, addressLocality: optionalText }).passthrough();
const ashbyJob = z.object({ id: optionalText, title: z.string().min(1), jobUrl: z.string().url(), applyUrl: z.string().url(), isListed: z.boolean(), location: optionalText, secondaryLocations: z.array(z.object({ location: optionalText, address: postal.nullish() })).nullish(), address: z.object({ postalAddress: postal.nullish() }).nullish(), descriptionPlain: optionalText, descriptionHtml: optionalText, workplaceType: optionalText, employmentType: optionalText, publishedAt: optionalText, compensation: z.object({ compensationTierSummary: optionalText, compensationTiers: z.array(z.object({ title: optionalText, tierSummary: optionalText, components: z.array(z.object({ compensationType: z.string(), interval: optionalText, currencyCode: optionalText, minValue: z.number().nullish(), maxValue: z.number().nullish(), summary: optionalText })) })).nullish() }).nullish() }).passthrough();
export const schemas = { greenhouse: z.object({ jobs: z.array(greenhouseJob), meta: z.object({ total: z.number().int().nonnegative() }) }), lever: z.array(leverJob), ashby: z.object({ apiVersion: z.string().optional(), jobs: z.array(ashbyJob) }) };

export interface ProviderPosting { externalId: string; title: string; companyName?: string; postingUrl: string; applicationUrl: string; locations: JobLocation[]; description: string; employment: string | null; workMode: string | null; sourcePostedAt: string | null; sourceUpdatedAt: string | null; sourcePublishedAt: string | null; salary: SalaryBand[]; }
export interface BoardSnapshot { postings: ProviderPosting[]; rawCount: number; complete: true; checkedAt: string; endpoint: string; reconciliation?: 'complete-board' | 'rolling-status'; }
export type Fetcher = (url: string) => Promise<unknown>;

function timestamp(value: string | number | null | undefined): string | null { if (value === null || value === undefined) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function period(value: string): SalaryBand['period'] { return /hour/i.test(value) ? 'hour' : /year|annual/i.test(value) ? 'year' : /month/i.test(value) ? 'month' : 'unknown'; }
function url(value: string): string { const safe = safePostingUrl(value); if (!safe) throw new Error('Source included an unsafe posting URL; snapshot rejected.'); return safe; }
function uniqueLocations(values: JobLocation[]): JobLocation[] { return [...new Map(values.filter(v => v.label).map(v => [`${v.label}:${v.country}`, v])).values()]; }
function uniqueIds(postings: ProviderPosting[]): void { if (new Set(postings.map(p => p.externalId)).size !== postings.length) throw new Error('Duplicate provider posting IDs; snapshot completeness cannot be established.'); }

export async function fetchBoard(source: JobSource, fetchJson: Fetcher, now = new Date().toISOString()): Promise<BoardSnapshot> {
  if (source.provider === 'jobicy') {
    if (source.board !== 'usa' || source.region === 'eu') throw new Error('Unsupported Jobicy market identity.');
    return fetchJobicyWindow(fetchJson, now);
  }
  const board = encodeURIComponent(source.board);
  if (source.provider === 'greenhouse') {
    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    const parsed = schemas.greenhouse.parse(await fetchJson(endpoint));
    if (parsed.meta.total !== parsed.jobs.length) throw new Error('Greenhouse meta.total differs from received jobs: incomplete snapshot.');
    const postings = parsed.jobs.map(j => ({ externalId: j.id, title: plainText(j.title), postingUrl: url(j.absolute_url), applicationUrl: url(j.absolute_url), locations: uniqueLocations([...(j.location?.name ? [location(j.location.name)] : []), ...(j.offices || []).filter(o => o.location).map(o => location(o.location!))]), description: plainText(j.content || ''), employment: (j.metadata || []).find(m => /employment type|commitment|job type/i.test(m.name) && typeof m.value === 'string')?.value as string | undefined || null, workMode: null, sourcePostedAt: timestamp(j.first_published), sourceUpdatedAt: timestamp(j.updated_at), sourcePublishedAt: null, salary: [] }));
    uniqueIds(postings); return { postings, rawCount: parsed.jobs.length, complete: true, checkedAt: now, endpoint };
  }
  if (source.provider === 'lever') {
    const host = source.region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co'; const endpoint = `https://${host}/v0/postings/${board}`;
    const postings: ProviderPosting[] = [];
    const limit = 100;
    for (let page = 0; page < 200; page++) {
      const parsed = schemas.lever.parse(await fetchJson(`${endpoint}?mode=json&skip=${page * limit}&limit=${limit}`));
      for (const j of parsed) postings.push({ externalId: j.id, title: plainText(j.text), postingUrl: url(j.hostedUrl), applicationUrl: url(j.applyUrl), locations: uniqueLocations([...(j.categories?.allLocations || []), ...(j.categories?.location ? [j.categories.location] : [])].map(l => location(l, j.country))), description: plainText([j.descriptionPlain || j.description || '', ...(j.lists || []).map(l => `${l.text}\n${l.content}`), j.additionalPlain || ''].join('\n\n')), employment: j.categories?.commitment || null, workMode: j.workplaceType || null, sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: null, salary: j.salaryRange ? [{ min: j.salaryRange.min ?? null, max: j.salaryRange.max ?? null, currency: j.salaryRange.currency, period: period(j.salaryRange.interval), compensationType: 'unknown', location: null, sourceText: j.salaryDescriptionPlain || `${j.salaryRange.min ?? '?'}–${j.salaryRange.max ?? '?'} ${j.salaryRange.currency} ${j.salaryRange.interval}` }] : [] });
      uniqueIds(postings);
      if (parsed.length < limit) return { postings, rawCount: postings.length, complete: true, checkedAt: now, endpoint };
    }
    throw new Error('Lever page safety limit reached; refusing partial snapshot.');
  }
  const endpoint = `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`;
  const parsed = schemas.ashby.parse(await fetchJson(endpoint));
  const postings = parsed.jobs.filter(j => j.isListed).map(j => {
    const postalAddress = j.address?.postalAddress; const salary: SalaryBand[] = [];
    for (const tier of j.compensation?.compensationTiers || []) for (const c of tier.components) if (c.compensationType === 'Salary') salary.push({ min: c.minValue ?? null, max: c.maxValue ?? null, currency: c.currencyCode || 'unknown', period: period(c.interval || ''), compensationType: 'base', location: tier.title || null, sourceText: c.summary || tier.tierSummary || j.compensation?.compensationTierSummary || '' });
    const externalId = j.id || new URL(j.jobUrl).pathname.split('/').filter(Boolean).at(-1);
    if (!externalId) throw new Error('Ashby posting lacks stable identity.');
    return { externalId, title: plainText(j.title), postingUrl: url(j.jobUrl), applicationUrl: url(j.applyUrl), locations: uniqueLocations([...(j.location ? [location(j.location, postalAddress?.addressCountry, postalAddress?.addressRegion, postalAddress?.addressLocality)] : []), ...(j.secondaryLocations || []).filter(l => l.location).map(l => location(l.location!, l.address?.addressCountry, l.address?.addressRegion, l.address?.addressLocality))]), description: plainText(j.descriptionPlain || j.descriptionHtml || ''), employment: j.employmentType || null, workMode: j.workplaceType || null, sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: timestamp(j.publishedAt), salary };
  });
  uniqueIds(postings); return { postings, rawCount: parsed.jobs.length, complete: true, checkedAt: now, endpoint };
}
