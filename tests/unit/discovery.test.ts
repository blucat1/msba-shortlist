import { describe, expect, it } from 'vitest';
import { createDiscoveryFilters, discoverJobs, normalizeDiscoveryFilters, type DiscoveryContext, type DiscoveryFilters } from '../../src/domain/discovery';
import { assessExperience } from '../../src/domain/experience';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { DEFAULT_PREFERENCES, type Job, type JobSource, type SalaryBand } from '../../src/domain/types';

const now = new Date('2026-10-22T18:00:00Z');
const base = createDemoSnapshot(now);
function job(id: string, patch: Partial<Job> = {}): Job {
  return {
    ...structuredClone(base.jobs[0]), id, sourceId: 'source-a', company: 'Fictional Analytics', title: 'Business Analyst', summary: '', description: '',
    roleFamilies: ['business-analytics'], primaryRoleFamily: 'business-analytics', requiredSkills: [], preferredSkills: [],
    classification: { confidence: 'high', reasons: [], version: 'test', scope: 'included', seniority: 'early-career' },
    experience: { minYears: 0, maxYears: 0, preferredYears: null, alternatives: [], evidence: 'No prior experience required.' },
    timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] },
    salary: [], employmentType: 'full-time', workArrangement: 'remote', availability: 'open', eligibility: undefined,
    firstSeenAt: '2026-10-20T12:00:00Z', lastSeenAt: now.toISOString(), lastVerifiedAt: now.toISOString(),
    sourcePostedAt: null, sourcePublishedAt: null, sourceUpdatedAt: null, publisher: undefined, sourceReview: undefined, ...patch,
  };
}
function source(id = 'source-a', patch: Partial<JobSource> = {}): JobSource { return { ...base.sources[0], id, provider: 'greenhouse', enabled: true, state: 'verified', ...patch }; }
function experience(years: number | null, alternatives: string[] = []): Job['experience'] { return { minYears: years, maxYears: years, preferredYears: null, alternatives, evidence: years === null ? null : `${years} years required.` }; }
function scope(value: Job['classification']['scope']): Job['classification'] { return { confidence: 'high', reasons: [], version: 'test', scope: value, seniority: 'unknown' }; }
function salary(min: number | null, patch: Partial<SalaryBand> = {}): SalaryBand { return { min, max: min, currency: 'USD', period: 'year', compensationType: 'base', sourceText: 'Fictional pay evidence', location: null, ...patch }; }
const result = (jobs: Job[], filters: Partial<DiscoveryFilters> = {}, context: DiscoveryContext = {}) => discoverJobs(jobs, DEFAULT_PREFERENCES, filters, { now, ...context });
const ids = (jobs: Job[], filters: Partial<DiscoveryFilters> = {}, context: DiscoveryContext = {}) => result(jobs, filters, context).map(row => row.job.id).sort();

describe('explicit discovery scope and independent protections', () => {
  const catalog = () => [
    job('zero'), job('one', { experience: experience(1) }), job('graduate', { title: 'Data Analyst — New Graduate', experience: experience(null) }),
    job('two', { experience: experience(2) }), job('experienced', { title: 'Senior Business Analyst', experience: experience(6) }), job('unknown', { experience: experience(null) }),
    job('uncertain-scope', { classification: scope('needs-details') }), job('excluded', { classification: scope('excluded') }),
    job('leadership', { title: 'Director of Analytics' }), job('closed', { availability: 'closed' }), job('unconfirmed', { availability: 'availability_unconfirmed' }),
    job('expired', { lastVerifiedAt: '2026-10-01T00:00:00Z' }),
    job('source-conflict', { sourceReview: { status: 'employer-conflict', reason: 'Employer source contradicts the publisher.', checkedAt: now.toISOString(), evidenceUrl: 'https://example.com/careers' } }),
    job('deadline', { timing: { ...job('copy').timing, deadline: '2026-10-20', deadlineVerified: true } }),
    job('tracked'), job('dismissed'),
  ];

  it('keeps strict graduate/open defaults without inventing zero years', () => {
    const rows = result(catalog(), {}, { trackedJobIds: ['tracked'], dismissedJobIds: ['dismissed'] });
    expect(rows.map(row => row.job.id).sort()).toEqual(['graduate', 'one', 'zero']);
    expect(assessExperience(rows.find(row => row.job.id === 'graduate')!.job).requiredYears).toBeNull();
    expect(assessExperience(rows.find(row => row.job.id === 'one')!.job).requiredYears).toBe(1);
  });

  it('broadens experience and uncertain scope explicitly while keeping other protections', () => {
    expect(ids(catalog(), createDiscoveryFilters('catalog'), { trackedJobIds: ['tracked'], dismissedJobIds: ['dismissed'] }))
      .toEqual(['experienced', 'graduate', 'one', 'two', 'uncertain-scope', 'unknown', 'zero']);
    expect(ids(catalog(), { experienceView: 'all' }, { trackedJobIds: ['tracked'], dismissedJobIds: ['dismissed'] })).not.toContain('uncertain-scope');
  });

  it('requires excluded-scope opt-in for leadership, internships, contracts and outside-US listings', () => {
    const outside = [
      job('intern', { employmentType: 'internship', classification: scope('excluded') }),
      job('contract', { employmentType: 'contract', classification: scope('excluded') }),
      job('outside-us', { locations: [{ label: 'Toronto, Canada', country: 'CA', city: 'Toronto', region: null }], classification: scope('excluded') }),
      job('leadership', { title: 'Director of Analytics' }),
    ];
    expect(result(outside, { mode: 'catalog' })).toEqual([]);
    const rows = result(outside, { mode: 'catalog', includeExcluded: true });
    expect(rows).toHaveLength(4); expect(rows.every(row => row.label === 'Check details')).toBe(true);
    expect(rows.find(row => row.job.id === 'contract')!.caveats.join(' ')).toContain('Outside the supported graduate catalog');
    expect(rows.find(row => row.job.id === 'leadership')!.caveats.join(' ')).toContain('People-leadership');
  });

  it('does not let broader or excluded scope bypass source, eligibility or deadline conflicts', () => {
    const selected = catalog().filter(row => ['source-conflict', 'deadline'].includes(row.id));
    selected.push(job('start-conflict', { timing: { ...job('copy').timing, latestStart: '2027-05-01' } }));
    expect(result(selected, { mode: 'catalog', includeExcluded: true })).toEqual([]);
    const rows = result(selected, { mode: 'catalog', includeExcluded: true, includeKnownConflicts: true });
    expect(rows).toHaveLength(3); expect(rows.every(row => row.label === 'Known conflict' && row.conflicts.length > 0)).toBe(true);
  });

  it('does not trust an old included classification over explicit employment or geographic exclusions', () => {
    const jobs = [job('intern', { employmentType: 'internship' }), job('part-time', { employmentType: 'part-time' }), job('foreign', { locations: [{ label: 'London', country: 'GB', region: null, city: 'London' }] }), job('mixed', { locations: [{ label: 'London', country: 'GB', region: null, city: 'London' }, { label: 'New York', country: 'US', region: null, city: 'New York' }] })];
    expect(ids(jobs, { mode: 'catalog' })).toEqual(['mixed']);
    expect(ids(jobs, { mode: 'catalog', includeExcluded: true })).toEqual(['foreign', 'intern', 'mixed', 'part-time']);
  });

  it('keeps saved, dismissed and stale opt-ins independent', () => {
    const jobs = [job('saved'), job('dismissed'), job('both'), job('expired', { lastVerifiedAt: null })];
    const context = { trackedJobIds: ['saved', 'both'], dismissedJobIds: ['dismissed', 'both'] };
    expect(ids(jobs, { includeTracked: true }, context)).toEqual(['saved']);
    expect(ids(jobs, { includeDismissed: true }, context)).toEqual(['dismissed']);
    expect(ids(jobs, { includeTracked: true, includeDismissed: true, includeStale: true }, context)).toEqual(['both', 'dismissed', 'expired', 'saved']);
  });

  it('makes unconfirmed and closed availability explicit, including publisher listings', () => {
    const jobs = [job('open'), job('unconfirmed', { availability: 'availability_unconfirmed', publisher: { name: 'Fictional publisher', url: 'https://example.com', kind: 'aggregator' } }), job('closed', { availability: 'closed' })];
    expect(ids(jobs)).toEqual(['open']); expect(ids(jobs, { availability: [] })).toEqual([]);
    const rows = result(jobs, { availability: ['availability_unconfirmed', 'closed'] });
    expect(rows.map(row => row.job.id).sort()).toEqual(['closed', 'unconfirmed']);
    expect(rows.every(row => row.label === 'Check details')).toBe(true);
    expect(rows.find(row => row.job.id === 'closed')!.caveats.join(' ')).toContain('not presented as an open vacancy');
  });

  it('never revives a manually disabled source, and requires actual metadata for provider selection', () => {
    const jobs = [job('active'), job('disabled', { sourceId: 'source-b' }), job('unknown-source', { sourceId: 'missing' })];
    const sources = [source(), source('source-b', { enabled: false, state: 'disabled' })];
    expect(ids(jobs, { mode: 'catalog', includeStale: true, includeExcluded: true }, { sources })).toEqual(['active', 'unknown-source']);
    expect(ids(jobs, { providers: ['greenhouse'] }, { sources })).toEqual(['active']);
    expect(ids([job('transient')], {}, { sources: [source('source-a', { state: 'failed' })] })).toEqual(['transient']);
  });
});

describe('OR within facets, AND across facets, and literal keyword words', () => {
  it('combines multiple roles, arrangements, employment types and location terms without turning them into AND requirements', () => {
    const jobs = [
      job('sf', { roleFamilies: ['business-analytics'], locations: [{ label: 'San Francisco, CA', city: 'San Francisco', region: 'CA', country: 'US' }] }),
      job('austin', { roleFamilies: ['data-science'], workArrangement: 'hybrid', employmentType: 'contract', classification: scope('excluded'), locations: [{ label: 'Austin, TX', city: 'Austin', region: 'TX', country: 'US' }] }),
      job('wrong-work', { roleFamilies: ['data-science'], workArrangement: 'onsite', locations: [{ label: 'Austin', city: 'Austin', region: null, country: 'US' }] }),
      job('wrong-role', { roleFamilies: ['financial-analytics'], locations: [{ label: 'San Francisco', city: null, region: null, country: 'US' }] }),
    ];
    expect(ids(jobs, { mode: 'catalog', includeExcluded: true, roleFamilies: ['business-analytics', 'data-science'], workArrangements: ['remote', 'hybrid'], employmentTypes: ['full-time', 'contract'], locations: [' SAN FRANCISCO ', 'Austin'] })).toEqual(['austin', 'sf']);
  });

  it('includes unknown arrangement or employment only when those values are selected', () => {
    const jobs = [job('known'), job('unknown', { workArrangement: 'unknown', employmentType: 'unknown', classification: scope('needs-details') })];
    expect(ids(jobs, { mode: 'catalog', workArrangements: ['remote'], employmentTypes: ['full-time'] })).toEqual(['known']);
    expect(ids(jobs, { mode: 'catalog', workArrangements: ['unknown'], employmentTypes: ['unknown'] })).toEqual(['unknown']);
  });

  it('supports case-insensitive any/all words across title, source text and skills', () => {
    const jobs = [job('sql', { requiredSkills: ['SQL'] }), job('python', { summary: 'Python analysis' }), job('both', { title: 'Python Business Analyst', requiredSkills: ['SQL'] }), job('none')];
    expect(ids(jobs, { keyword: ' SQL, pYtHoN ', keywordMode: 'any' })).toEqual(['both', 'python', 'sql']);
    expect(ids(jobs, { keyword: ' SQL pYtHoN ', keywordMode: 'all' })).toEqual(['both']);
    expect(ids(jobs, { keyword: 'SQL SQL', keywordMode: 'all' })).toEqual(['both', 'sql']);
  });

  it('does not match one-letter skills inside unrelated words and treats special skill characters literally', () => {
    const jobs = [job('research', { title: 'Research Business Analyst' }), job('r', { requiredSkills: ['R'] }), job('cpp', { requiredSkills: ['C++', '.NET'] })];
    expect(ids(jobs, { keyword: 'R' })).toEqual(['r']);
    expect(ids(jobs, { keyword: 'C++ .NET', keywordMode: 'all' })).toEqual(['cpp']);
  });

  it('selects source/provider and actual employer identity rather than an aggregator name', () => {
    const jobs = [job('a', { company: 'Actual Company', sourceId: 'source-market' }), job('b', { company: 'Another Company' })];
    const sources = [source(), source('source-market', { provider: 'jobicy', company: 'Publisher Inc.' })];
    expect(ids(jobs, { companies: ['  ACTUAL   COMPANY '], sourceIds: ['source-market'], providers: ['jobicy'] }, { sources })).toEqual(['a']);
    expect(ids(jobs, { companies: ['Publisher Inc.'] }, { sources })).toEqual([]);
  });
});

describe('unknown requirements and compensation are not numeric matches', () => {
  it('distinguishes known zero, one, missing years and conditional degree paths', () => {
    const jobs = [job('zero'), job('one', { experience: experience(1) }), job('graduate-unknown', { title: 'Business Analyst — New Graduate', experience: experience(null) }), job('unknown', { experience: experience(null) }), job('conditional', { experience: experience(0, ['Master’s plus no experience OR bachelor’s plus two years']) })];
    expect(ids(jobs, { mode: 'catalog', maxRequiredYears: 0 })).toEqual(['zero']);
    const rows = result(jobs, { mode: 'catalog', maxRequiredYears: 0, includeUnknownExperience: true });
    expect(rows.map(row => row.job.id).sort()).toEqual(['conditional', 'graduate-unknown', 'unknown', 'zero']);
    expect(assessExperience(rows.find(row => row.job.id === 'conditional')!.job).requiredYears).toBeNull();
    expect(rows.find(row => row.job.id === 'unknown')!.caveats.join(' ')).toContain('explicitly allowed');
    expect(rows.find(row => row.job.id === 'unknown')!.label).toBe('Check details');
  });

  it('uses a published USD annual base minimum rather than upper range, total pay, another currency or annualized hourly pay', () => {
    const jobs = [job('meets', { salary: [salary(110_000)] }), job('overlap', { salary: [salary(80_000, { max: 140_000 })] }), job('upper-only', { salary: [salary(null, { max: 180_000 })] }), job('hourly', { salary: [salary(150, { period: 'hour' })] }), job('cad', { salary: [salary(150_000, { currency: 'CAD' })] }), job('total', { salary: [salary(150_000, { compensationType: 'total' })] }), job('missing')];
    expect(ids(jobs, { minAnnualBaseUsd: 100_000 })).toEqual(['meets']);
    expect(ids(jobs, { minAnnualBaseUsd: 100_000, includeUnknownSalary: true })).toEqual(['cad', 'hourly', 'meets', 'missing', 'total', 'upper-only']);
    expect(result(jobs, { minAnnualBaseUsd: 100_000, includeUnknownSalary: true }).find(row => row.job.id === 'hourly')!.caveats.join(' ')).toContain('No currency conversion or annualization');
  });

  it('does not let an unknown second salary band override a known below-target minimum', () => {
    expect(result([job('low', { salary: [salary(80_000), salary(null)] })], { minAnnualBaseUsd: 100_000, includeUnknownSalary: true })).toEqual([]);
    expect(ids([job('multiple', { salary: [salary(80_000), salary(120_000)] })], { minAnnualBaseUsd: 100_000 })).toEqual(['multiple']);
  });
});

describe('source date provenance, freshness and deterministic resets', () => {
  it('never replaces original posting with publication, source edit or first discovery dates', () => {
    const jobs = [job('old', { sourcePostedAt: '2025-01-01T00:00:00Z', sourcePublishedAt: now.toISOString(), sourceUpdatedAt: now.toISOString(), firstSeenAt: now.toISOString() }), job('missing', { sourcePublishedAt: now.toISOString(), firstSeenAt: now.toISOString() })];
    expect(result(jobs, { maxAgeDays: 3, dateBasis: 'posted' })).toEqual([]);
    expect(ids(jobs, { maxAgeDays: 3, dateBasis: 'published' })).toEqual(['missing', 'old']);
    expect(ids(jobs, { maxAgeDays: 3, dateBasis: 'found' })).toEqual(['missing', 'old']);
    const rows = result(jobs, { maxAgeDays: 3, dateBasis: 'posted', includeUnknownDate: true });
    expect(rows.map(row => row.job.id)).toEqual(['missing']); expect(rows[0].job.sourcePostedAt).toBeNull();
    expect(rows[0].caveats.join(' ')).toContain('original posting date is unverified');
  });

  it('uses profile-timezone calendar ranges while leaving genuine date-only values unchanged', () => {
    const jobs = [job('timestamp', { sourcePostedAt: '2026-10-22T01:00:00Z' }), job('date-only', { sourcePostedAt: '2026-10-21' })];
    expect(ids(jobs, { dateFrom: '2026-10-21', dateTo: '2026-10-21' })).toEqual(['date-only', 'timestamp']);
    expect(ids(jobs, { dateFrom: '2026-10-22' })).toEqual([]);
  });

  it('uses a rolling freshness boundary and rejects future known dates even when unknown dates are allowed', () => {
    const jobs = [job('boundary', { sourcePostedAt: '2026-10-21T18:00:00Z' }), job('too-old', { sourcePostedAt: '2026-10-21T17:59:59Z' }), job('future', { sourcePostedAt: '2026-10-23T00:00:00Z' }), job('invalid', { sourcePostedAt: 'invalid' })];
    expect(ids(jobs, { maxAgeDays: 1 })).toEqual(['boundary']);
    expect(ids(jobs, { maxAgeDays: 1, includeUnknownDate: true })).toEqual(['boundary', 'invalid']);
  });

  it('sorts by the chosen source date with missing dates last and stable ties, without mutating jobs or options', () => {
    const jobs = [job('z', { sourcePostedAt: null, firstSeenAt: now.toISOString() }), job('b', { sourcePostedAt: '2026-10-20T00:00:00Z' }), job('a', { sourcePostedAt: '2026-10-20T00:00:00Z' })];
    const filters = createDiscoveryFilters(); filters.sort = 'date-newest';
    const before = structuredClone({ jobs, filters });
    expect(result(jobs, filters).map(row => row.job.id)).toEqual(['a', 'b', 'z']);
    expect(result([...jobs].reverse(), filters).map(row => row.job.id)).toEqual(['a', 'b', 'z']);
    expect({ jobs, filters }).toEqual(before);
    expect(result(jobs, { sort: 'found-newest' })[0].job.id).toBe('z');
  });

  it('creates a clean strict reset with independent arrays after deliberate broadening', () => {
    const broad = createDiscoveryFilters('catalog'); broad.availability.push('closed'); broad.roleFamilies.push('data-science'); broad.includeExcluded = true; broad.includeKnownConflicts = true;
    const reset = createDiscoveryFilters();
    expect(reset).toMatchObject({ mode: 'shortlist', experienceView: 'new-grad', includeNeedsDetails: false, includeExcluded: false, includeKnownConflicts: false, availability: ['open'], roleFamilies: [], maxRequiredYears: null, minAnnualBaseUsd: null, maxAgeDays: null });
    const normalized = normalizeDiscoveryFilters(broad); normalized.roleFamilies.push('business-analytics');
    expect(broad.roleFamilies).toEqual(['data-science']);
  });

  it.each([
    { maxRequiredYears: Number.NaN }, { maxRequiredYears: -1 }, { minAnnualBaseUsd: Infinity }, { maxAgeDays: 0 },
    { dateFrom: '2026-02-29' }, { dateFrom: '2026-10-22', dateTo: '2026-10-01' },
  ])('rejects invalid filter input rather than silently dropping a constraint: %j', filters => {
    expect(() => result([job('a')], filters)).toThrow();
  });
});
