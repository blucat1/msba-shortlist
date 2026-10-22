import { describe, expect, it, vi } from 'vitest';
import { assessExperience } from '../../src/domain/experience';
import { classify, employment, extractExperience } from '../../src/ingestion/classification';
import { fetchJobicyStatuses, fetchJobicyWindow } from '../../src/ingestion/jobicy';

const now = '2026-10-21T12:00:00.000Z';
const row = (id = 1, overrides: Record<string, unknown> = {}) => ({
  id, url: `https://jobicy.com/jobs/${id}-data-analyst`, jobSlug: `${id}-data-analyst`,
  jobTitle: 'Data Analyst (Entry-Level)', companyName: 'Example Employer (fixture)', companyLogo: false,
  jobIndustry: ['Data Science & Analytics'], jobType: ['Full-Time'], jobGeo: 'USA', jobLevel: 'Senior',
  jobExcerpt: 'Example fixture only.', jobDescription: '<h2>Requirements</h2><p>Recent graduates are welcome. SQL required.</p>',
  pubDate: '2026-10-20T09:00:00+00:00', ...overrides,
});
const page = (jobs = [row()], overrides: Record<string, unknown> = {}) => ({
  apiVersion: '2.2.19', documentationUrl: 'https://jobicy.com/jobs-rss-feed',
  jobCount: jobs.length, nextCursor: null, hasMore: false, jobs,
  appliedFilters: { count: 200, geo: 'usa' }, statusCode: 200, success: true, ...overrides,
});
const statuses = (jobs = [{ id: 1, status: 'active' }], overrides: Record<string, unknown> = {}) => ({
  apiVersion: '2.2.19', checkedAt: now, count: jobs.length, jobs, statusCode: 200, success: true, ...overrides,
});

describe('Jobicy free public discovery window', () => {
  it('retrieves every cursor page, keeps employer attribution and marks rolling-window reconciliation', async () => {
    const cursor = 'opaque/+token?=&';
    const fetcher = vi.fn<(url: string) => Promise<unknown>>()
      .mockResolvedValueOnce(page([row()], { nextCursor: cursor, hasMore: true }))
      .mockResolvedValueOnce(page([row(2, { companyName: 'Another Employer (fixture)' })], { appliedFilters: { count: 200, geo: 'usa', cursor } }));
    const result = await fetchJobicyWindow(fetcher, now);
    expect(result).toMatchObject({ complete: true, reconciliation: 'rolling-status', rawCount: 2, checkedAt: now });
    expect(result.postings.map(j => j.companyName)).toEqual(['Example Employer (fixture)', 'Another Employer (fixture)']);
    expect(result.postings[0]).toMatchObject({ externalId: '1', postingUrl: 'https://jobicy.com/jobs/1-data-analyst', applicationUrl: 'https://jobicy.com/jobs/1-data-analyst', sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: '2026-10-20T09:00:00.000Z' });
    expect(fetcher.mock.calls).toHaveLength(2);
    for (const call of fetcher.mock.calls) {
      expect(call).toHaveLength(1);
      const url = new URL(call[0]);
      expect(url.origin).toBe('https://jobicy.com');
      expect(url.pathname).toBe('/api/jobs');
      expect(url.searchParams.get('geo')).toBe('usa');
      expect(url.searchParams.get('count')).toBe('200');
      expect([...url.searchParams.keys()].sort()).toEqual(url.searchParams.has('cursor') ? ['count', 'cursor', 'geo'] : ['count', 'geo']);
    }
    expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('cursor')).toBe(cursor);
  });

  it('does not turn Anywhere, Remote, or a city label into explicit US eligibility', async () => {
    const result = await fetchJobicyWindow(async () => page([
      row(1, { jobGeo: 'Anywhere' }), row(2, { jobGeo: 'Remote' }), row(3, { jobGeo: 'San Francisco' }),
      row(4, { jobGeo: 'Canada, USA' }), row(5, { jobGeo: 'United States' }),
    ]), now);
    expect(result.postings.map(j => j.locations[0].country)).toEqual([null, null, null, 'US', 'US']);
    const posting = result.postings[0];
    expect(classify(posting.title, posting.description, posting.locations, employment(posting.employment).type, extractExperience(posting.description)).classification.scope).toBe('needs-details');
  });

  it('sanitizes feed text and preserves unknown requirements despite an unreliable source seniority label', async () => {
    const result = await fetchJobicyWindow(async () => page([row(1, { companyName: '<b>Example</b>', jobDescription: '<h2>Requirements</h2><p>Recent graduates are welcome.</p><script>steal()</script>' })]), now);
    const posting = result.postings[0];
    expect(posting.companyName).toBe('Example');
    expect(posting.description).not.toContain('<');
    expect(posting.description).not.toContain('steal');
    const experience = extractExperience(posting.description);
    const classification = classify(posting.title, posting.description, posting.locations, 'full-time', experience).classification;
    expect(experience.minYears).toBeNull();
    expect(assessExperience({ title: posting.title, experience, classification })).toMatchObject({ tier: 'new-grad', requiredYears: null });
  });

  it('keeps supplied salary currencies and periods without annualizing or inventing base compensation', async () => {
    const result = await fetchJobicyWindow(async () => page([
      row(1, { salaryMin: 35, salaryMax: 50, salaryCurrency: 'CAD', salaryPeriod: 'hourly' }),
      row(2, { salaryMax: 90000 }), row(3),
    ]), now);
    expect(result.postings[0].salary[0]).toMatchObject({ min: 35, max: 50, currency: 'CAD', period: 'hour', compensationType: 'unknown' });
    expect(result.postings[1].salary[0]).toMatchObject({ min: null, max: 90000, currency: 'unknown', period: 'unknown' });
    expect(result.postings[2].salary).toEqual([]);
  });

  it('accepts a complete empty window without claiming it is a complete employer board', async () => {
    expect(await fetchJobicyWindow(async () => page([]), now)).toMatchObject({ rawCount: 0, postings: [], reconciliation: 'rolling-status' });
  });

  it.each([
    ['count mismatch', page([row()], { jobCount: 2 })],
    ['missing cursor', page([row()], { hasMore: true, nextCursor: null })],
    ['contradictory cursor', page([row()], { hasMore: false, nextCursor: 'next' })],
    ['empty intermediate page', page([], { hasMore: true, nextCursor: 'next' })],
    ['wrong filter scope', page([row()], { appliedFilters: { count: 200, geo: 'europe' } })],
    ['API error', page([row()], { success: false })],
    ['missing requirements', page([row(1, { jobDescription: '' })])],
    ['blank employer', page([row(1, { companyName: '   ' })])],
    ['employer removed by sanitization', page([row(1, { companyName: '<script>untrusted()</script>' })])],
    ['employer exceeding catalog limit', page([row(1, { companyName: 'x'.repeat(241) })])],
    ['unsafe numeric identity', page([row(Number.MAX_SAFE_INTEGER + 1)])],
    ['invalid publication date', page([row(1, { pubDate: 'yesterday' })])],
    ['reversed salary bounds', page([row(1, { salaryMin: 100, salaryMax: 50 })])],
  ])('rejects %s before returning a snapshot', async (_reason, payload) => {
    await expect(fetchJobicyWindow(async () => payload, now)).rejects.toThrow();
  });

  it.each([
    'https://example.com/jobs/1-data-analyst', 'http://jobicy.com/jobs/1-data-analyst',
    'https://user:password@jobicy.com/jobs/1-data-analyst', 'https://jobicy.com/jobs/2-another-job',
    'https://jobicy.com/jobs/1-data-analyst?api_key=unexpected', 'https://jobicy.com/jobs/1-data-analyst/apply',
    'https://jobicy.com/jobs/1-', 'https://jobicy.com:8443/jobs/1-data-analyst',
  ])('requires the canonical free Jobicy URL: %s', async url => {
    await expect(fetchJobicyWindow(async () => page([row(1, { url })]), now)).rejects.toThrow('noncanonical');
  });

  it('accepts an encoded slug without changing the source URL or external identity', async () => {
    const url = 'https://jobicy.com/jobs/1-0%e2%86%921-product-leader';
    expect((await fetchJobicyWindow(async () => page([row(1, { url })]), now)).postings[0].postingUrl).toBe(url);
  });

  it('rejects duplicate IDs across pages and repeated cursors', async () => {
    const duplicate = vi.fn<(url: string) => Promise<unknown>>()
      .mockResolvedValueOnce(page([row()], { nextCursor: 'first', hasMore: true }))
      .mockResolvedValueOnce(page([row()]));
    await expect(fetchJobicyWindow(duplicate, now)).rejects.toThrow('Duplicate');
    const cycle = vi.fn<(url: string) => Promise<unknown>>()
      .mockResolvedValueOnce(page([row()], { nextCursor: 'same', hasMore: true }))
      .mockResolvedValueOnce(page([row(2)], { nextCursor: 'same', hasMore: true }));
    await expect(fetchJobicyWindow(cycle, now)).rejects.toThrow('cursor repeated');
  });

  it('rejects a later page failure or cursor mismatch instead of publishing a partial window', async () => {
    const failed = vi.fn<(url: string) => Promise<unknown>>()
      .mockResolvedValueOnce(page([row()], { nextCursor: 'first', hasMore: true }))
      .mockRejectedValueOnce(new Error('temporary provider failure'));
    await expect(fetchJobicyWindow(failed, now)).rejects.toThrow('temporary provider failure');
    const wrong = vi.fn<(url: string) => Promise<unknown>>()
      .mockResolvedValueOnce(page([row()], { nextCursor: 'first', hasMore: true }))
      .mockResolvedValueOnce(page([row(2)], { appliedFilters: { count: 200, geo: 'usa', cursor: 'different' } }));
    await expect(fetchJobicyWindow(wrong, now)).rejects.toThrow('inconsistent');
  });

  it('bounds an endless feed even when IDs and cursors never repeat', async () => {
    let count = 0;
    const fetcher = vi.fn(async () => { count++; return page([row(count)], { hasMore: true, nextCursor: `next-${count}` }); });
    await expect(fetchJobicyWindow(fetcher, now)).rejects.toThrow('safety limit');
    expect(fetcher).toHaveBeenCalledTimes(100);
  });
});

describe('Jobicy explicit listing status synchronization', () => {
  it('uses sequential batches of 100, stable deduplication, and exact requested order', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => String(i + 1));
    let requests = 0;
    const fetcher = vi.fn(async (value: string) => {
      requests++;
      const url = new URL(value), batch = url.searchParams.get('ids')!.split(',');
      expect(url.origin).toBe('https://jobicy.com'); expect(url.pathname).toBe('/api/jobs/status');
      expect([...url.searchParams.keys()]).toEqual(['ids']);
      expect(batch.length).toBe(requests === 1 ? 100 : 1);
      return statuses(batch.map(id => ({ id: Number(id), status: 'active' })).reverse());
    });
    const result = await fetchJobicyStatuses([...ids, '1'], fetcher);
    expect(result.map(row => row.externalId)).toEqual(ids);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('preserves unknown as unconfirmed rather than treating it as closed', async () => {
    const result = await fetchJobicyStatuses(['1', '2', '3'], async () => statuses([
      { id: 1, status: 'active' }, { id: 2, status: 'closed' }, { id: 3, status: 'unknown' },
    ]));
    expect(result).toEqual([{ externalId: '1', status: 'active' }, { externalId: '2', status: 'closed' }, { externalId: '3', status: 'unknown' }]);
  });

  it('makes no request for no IDs and validates every input before the first request', async () => {
    const fetcher = vi.fn(async () => statuses());
    expect(await fetchJobicyStatuses([], fetcher)).toEqual([]);
    for (const invalid of ['0', '-1', '1.0', '01', '1e3', ' 1', '9007199254740992', '1&api_key=unexpected']) {
      await expect(fetchJobicyStatuses(['1', invalid], fetcher)).rejects.toThrow('Invalid');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['missing ID', statuses([{ id: 1, status: 'active' }])],
    ['unknown unrequested ID', statuses([{ id: 1, status: 'active' }, { id: 3, status: 'unknown' }])],
    ['duplicate ID', statuses([{ id: 1, status: 'active' }, { id: 1, status: 'closed' }])],
    ['count mismatch', statuses([{ id: 1, status: 'active' }, { id: 2, status: 'active' }], { count: 1 })],
    ['invalid status', statuses([{ id: 1, status: 'deleted' }, { id: 2, status: 'active' }])],
    ['API failure', statuses([{ id: 1, status: 'active' }, { id: 2, status: 'active' }], { success: false })],
  ])('rejects %s without manufacturing closure evidence', async (_reason, payload) => {
    await expect(fetchJobicyStatuses(['1', '2'], async () => payload)).rejects.toThrow();
  });

  it('rejects an incomplete later batch instead of returning the first batch as complete', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => String(i + 1));
    const fetcher = vi.fn(async (url: string) => {
      const batch = new URL(url).searchParams.get('ids')!.split(',');
      return batch.length === 100 ? statuses(batch.map(id => ({ id: Number(id), status: 'active' }))) : statuses([{ id: 102, status: 'closed' }]);
    });
    await expect(fetchJobicyStatuses(ids, fetcher)).rejects.toThrow('incomplete');
  });
});
