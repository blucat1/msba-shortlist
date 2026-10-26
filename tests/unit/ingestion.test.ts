import { describe, expect, it, vi } from 'vitest';
import type { JobSource } from '../../src/domain/types';
import { fetchBoard } from '../../src/ingestion/adapters';
import { classify, employment, extractExperience, extractSkills, location, parseSalaryText, plainText, safePostingUrl } from '../../src/ingestion/classification';
import { fetchPublicJson } from '../../src/ingestion/http';
import { deduplicateJobs, normalizePosting, reconcileAbsences } from '../../src/ingestion/normalize';
import { assessExperience } from '../../src/domain/experience';

const now = '2026-10-21T08:00:00.000Z';
const source = (provider: JobSource['provider']): JobSource => ({ id: `${provider}-example`, employerId: 'example', company: 'Example (fixture)', careersUrl: 'https://example.com/careers', provider, board: 'example', state: 'verified', enabled: true, verifiedAt: now, evidenceUrl: 'https://example.com/careers', usageReview: 'Test fixture; never used for live imports.', lastSuccessfulCheck: null, lastAttemptAt: null, rawCount: null, relevantCount: null, error: null });
const gh = { jobs: [{ id: 123, title: 'Data Analyst', absolute_url: 'https://example.com/jobs/123', updated_at: now, location: { name: 'San Francisco, CA' }, offices: [{ name: 'NY', location: 'New York, NY, United States' }], content: '<p>This role is full-time.</p><p>Requirements</p><ul><li>SQL required</li><li>1–3 years of experience</li></ul>' }], meta: { total: 1 } };

describe('public adapters and provenance', () => {
  it('validates and normalizes Greenhouse with multiple locations and honest update provenance', async () => {
    const board = await fetchBoard(source('greenhouse'), async () => gh, now); const job = normalizePosting(board.postings[0], source('greenhouse'), now);
    expect(job.externalId).toBe('123'); expect(job.locations).toHaveLength(2); expect(job.sourceUpdatedAt).toBe(now); expect(job.sourcePostedAt).toBeNull(); expect(job.sourcePublishedAt).toBeNull();
    expect(job.requiredSkills).toEqual(['SQL']); expect(job.experience.minYears).toBe(1); expect(job.classification.scope).toBe('included');
  });
  it('rejects malformed or truncated Greenhouse boards and unsafe source links', async () => {
    await expect(fetchBoard(source('greenhouse'), async () => ({ ...gh, meta: { total: 2 } }))).rejects.toThrow('incomplete');
    await expect(fetchBoard(source('greenhouse'), async () => ({ jobs: [null] }))).rejects.toThrow();
    await expect(fetchBoard(source('greenhouse'), async () => ({ ...gh, jobs: [{ ...gh.jobs[0], absolute_url: 'javascript:alert(1)' }] }))).rejects.toThrow();
  });
  it('paginates Lever through a terminal page and supports EU and optional salary', async () => {
    const posting = { id: 'a', text: 'Product Manager', hostedUrl: 'https://jobs.eu.lever.co/example/a', applyUrl: 'https://jobs.eu.lever.co/example/a/apply', categories: { commitment: 'Full-time', allLocations: ['Boston, MA', 'Seattle, WA'] }, country: 'US', descriptionPlain: 'Product manager. SQL preferred.', salaryRange: { currency: 'USD', interval: 'hour', min: 45, max: 65 }, createdAt: 1680000000000 };
    const fetcher = vi.fn(async (_url: string) => [posting]); const board = await fetchBoard({ ...source('lever'), region: 'eu' }, fetcher, now);
    expect(fetcher.mock.calls[0][0]).toContain('api.eu.lever.co'); const job = normalizePosting(board.postings[0], source('lever'), now);
    expect(job.locations).toHaveLength(2); expect(job.salary[0]).toMatchObject({ period: 'hour', min: 45, max: 65 }); expect(job.sourcePostedAt).toBeNull(); expect(job.preferredSkills).toEqual(['SQL']); expect(job.requiredSkills).toEqual([]);
    const hundred = Array.from({ length: 100 }, (_, i) => ({ ...posting, id: `id-${i}` })); let count = 0;
    const pages = vi.fn(async (_url: string) => count++ === 0 ? hundred : []); const paginated = await fetchBoard(source('lever'), pages, now); expect(paginated.rawCount).toBe(100); expect(pages).toHaveBeenCalledTimes(2); expect(pages.mock.calls[1][0]).toContain('skip=100');
  });
  it('rejects repeated Lever pagination rather than considering it a complete board', async () => {
    const page = Array.from({ length: 100 }, (_, i) => ({ id: String(i), text: 'Data Engineer', hostedUrl: `https://example.com/${i}`, applyUrl: `https://example.com/${i}/apply` }));
    await expect(fetchBoard(source('lever'), async () => page, now)).rejects.toThrow('Duplicate');
  });
  it('filters unlisted Ashby postings and preserves last-publication and separate compensation tiers', async () => {
    const posting = { id: 'a', title: 'Associate Product Manager 2027', jobUrl: 'https://jobs.ashbyhq.com/example/a', applyUrl: 'https://jobs.ashbyhq.com/example/a/application', isListed: true, location: 'Austin', address: { postalAddress: { addressCountry: 'USA', addressRegion: 'Texas' } }, secondaryLocations: [{ location: 'Toronto', address: { addressCountry: 'CA' } }], employmentType: 'FullTime', workplaceType: 'Hybrid', publishedAt: now, compensation: { compensationTiers: [{ title: 'US Zone A', components: [{ compensationType: 'Salary', currencyCode: 'USD', interval: '1 YEAR', minValue: 85000, maxValue: 105000 }, { compensationType: 'Bonus', currencyCode: 'USD', interval: '1 YEAR', minValue: 10000, maxValue: 15000 }] }, { title: 'Canada', components: [{ compensationType: 'Salary', currencyCode: 'CAD', interval: '1 YEAR', minValue: 90000, maxValue: 110000 }] }] } };
    const board = await fetchBoard(source('ashby'), async () => ({ apiVersion: '1', jobs: [posting, { ...posting, id: 'private', isListed: false }] }), now); const job = normalizePosting(board.postings[0], source('ashby'), now);
    expect(board.rawCount).toBe(2); expect(board.postings).toHaveLength(1); expect(job.locations).toHaveLength(2); expect(job.sourcePublishedAt).toBe(now); expect(job.sourcePostedAt).toBeNull(); expect(job.salary).toHaveLength(2); expect(job.salary[1].currency).toBe('CAD'); expect(job.timing.graduationStart).toBeNull();
  });
  it('keeps missing values unknown and content hashes stable across repeated imports', async () => {
    const board = await fetchBoard(source('lever'), async () => [{ id: 'a', text: 'Data Engineer', hostedUrl: 'https://example.com/a', applyUrl: 'https://example.com/a/apply' }], now);
    const a = normalizePosting(board.postings[0], source('lever'), now); const b = normalizePosting(board.postings[0], source('lever'), '2026-10-22T08:00:00Z');
    expect(a.employmentType).toBe('unknown'); expect(a.experience.minYears).toBeNull(); expect(a.salary).toEqual([]); expect(a.classification.scope).toBe('needs-details'); expect(a.contentHash).toBe(b.contentHash); expect(deduplicateJobs([a, a, { ...b, externalId: 'different-requisition', id: 'different' }])).toHaveLength(2);
  });
});

describe('conservative classification and extraction', () => {
  const experience = extractExperience('');
  const classifyTitle = (title: string, places = [location('Boston, MA')], type = 'full-time' as const) => classify(title, '', places, type, experience);
  it('distinguishes supported roles from ambiguous analyst/manager titles and leadership', () => {
    for (const title of ['APM', 'Product Manager', 'Data Engineer', 'Machine Learning Engineer', 'Software Engineer, Machine Learning', 'Software Engineer, Data Platform', 'Business Intelligence Analyst', 'Strategy & Operations Associate']) expect(classifyTitle(title).classification.scope).toBe('included');
    for (const title of ['Store Manager', 'Clinical Laboratory Analyst', 'Sales Representative', 'Software Engineer', 'Construction Project Manager', 'Engineering Manager, Data Engineering', 'Manager, Data Science', 'Data Science Manager', 'Group Product Manager']) expect(classifyTitle(title).classification.scope).toBe('excluded');
    expect(classifyTitle('Staff Data Engineer').classification.seniority).toBe('senior'); expect(classifyTitle('Associate Product Manager').classification.seniority).toBe('early-career');
  });
  it('does not treat remote as US or unknown type as full time', () => {
    expect(classifyTitle('Data Analyst', [location('Remote')]).classification.scope).toBe('needs-details'); expect(classifyTitle('Data Analyst', [location('London, United Kingdom')]).classification.scope).toBe('excluded');
    expect(classifyTitle('Product Manager, New Grad (2027) - Belgrade', [location('Belgrade, Serbia'), location('Amsterdam, Netherlands')]).classification.scope).toBe('excluded');
    expect(classify('Data Analyst', '', [location('Remote', 'US')], 'unknown', experience).classification.scope).toBe('needs-details'); expect(classify('Data Analyst', '', [location('Boston, MA')], 'internship', experience).classification.scope).toBe('excluded');
    expect(employment(null, 'Data Science Intern').type).toBe('internship'); expect(employment('Contract').type).toBe('contract'); expect(employment('Part-Time').type).toBe('part-time');
  });
  it('keeps explicitly China-only locations out of the US catalog while preserving US multi-location roles', () => {
    const experience = extractExperience('No prior experience required.');
    for (const label of ['China', 'Beijing, China', 'Shanghai']) {
      const classified = classify('Graduate Data Analyst', 'Full-time role.', [location(label)], 'full-time', experience);
      expect(classified.classification.scope, label).toBe('excluded');
      expect(classified.classification.reasons).toContainEqual(expect.objectContaining({ code: 'country.international_only' }));
    }
    expect(classify('Graduate Data Analyst', '', [location('China'), location('Boston, MA')], 'full-time', experience).classification.scope).toBe('included');
    expect(classify('Graduate Data Analyst', '', [location('Remote')], 'full-time', experience).classification.scope).toBe('needs-details');
  });
  it('requires actual experience language and preserves degree alternatives and preferred requirements', () => {
    expect(extractExperience('Our company was founded 20 years ago. We serve 3 million people.').minYears).toBeNull();
    expect(extractExperience('3 years of experience preferred.').preferredYears).toBe(3); expect(extractExperience('3 years of experience preferred.').minYears).toBeNull();
    const value = extractExperience("Bachelor's degree + 3 years of experience OR master's degree + 1 year of experience."); expect(value.minYears).toBeNull(); expect(value.alternatives).toHaveLength(1);
  });
  it('emits graduate evidence only when supported, without promoting product-specific experience exemptions', () => {
    const reasons = (text: string) => classify('Data Analyst', text, [location('Boston, MA')], 'full-time', extractExperience(text)).classification.reasons;
    expect(reasons('No experience required with our platform.')).not.toContainEqual(expect.objectContaining({ code: 'experience.no_experience_required' }));
    expect(reasons('No prior professional experience required.')).toContainEqual(expect.objectContaining({ code: 'experience.no_experience_required' }));
    expect(reasons('Recent university graduates are encouraged to apply.')).toContainEqual(expect.objectContaining({ code: 'experience.entry_level_explicit' }));
    expect(reasons('This is not a new grad role.')).toContainEqual(expect.objectContaining({ code: 'experience.not_new_grad' }));
  });
  it('keeps explicit qualitative requirements out of the graduate shortlist without inventing a numeric floor', () => {
    for (const text of [
      'Several years of professional experience required.',
      'Requirements\nMany years of relevant industry experience.',
      'Minimum qualification\nMultiple years of product management experience.',
      'You must have extensive professional experience.',
      'Significant analytics experience is required.',
      'Required qualifications\nSubstantial experience with data pipelines.',
      'No prior professional experience required.\nRequirements\nExtensive relevant experience is required.',
    ]) {
      const experience = extractExperience(text);
      const classified = classify('New Graduate Data Analyst', text, [location('Boston, MA')], 'full-time', experience);
      expect(classified.classification.reasons, text).toContainEqual(expect.objectContaining({ code: 'experience.advanced_unspecified' }));
      expect(assessExperience({ title: 'New Graduate Data Analyst', experience, classification: classified.classification }).tier, text).toBe('unverified');
    }
  });
  it('does not turn preferred qualitative experience or company/team narrative into a hard requirement', () => {
    for (const text of [
      'Preferred qualifications\nExtensive professional experience.',
      'Qualifications\nSignificant experience with SQL is preferred.',
      'Requirements\nSubstantial professional experience would be helpful.',
      'About us\nOur team has many years of professional experience.',
      'Requirements\nYou will work with a team with extensive professional experience.',
      'Qualifications\nWith substantial industry experience, our company builds useful products.',
    ]) {
      const classified = classify('Data Analyst', text, [location('Boston, MA')], 'full-time', extractExperience(text));
      expect(classified.classification.reasons, text).not.toContainEqual(expect.objectContaining({ code: 'experience.advanced_unspecified' }));
    }
  });
  it('preserves explicit graduate exclusions ahead of positive title or targeting text', () => {
    for (const text of [
      'This role is not open to recent graduates.',
      'New graduates are not eligible for this role.',
      'This is not an entry-level position.',
    ]) {
      const experience = extractExperience(text), classified = classify('New Graduate Data Analyst', text, [location('Boston, MA')], 'full-time', experience);
      expect(classified.classification.reasons, text).toContainEqual(expect.objectContaining({ code: 'experience.not_new_grad' }));
      expect(classified.classification.reasons, text).not.toContainEqual(expect.objectContaining({ code: 'experience.entry_level_explicit' }));
      expect(assessExperience({ title: 'New Graduate Data Analyst', experience, classification: classified.classification }).tier, text).toBe('early-career');
    }
  });
  it('recognizes explicit employer hiring of graduates without lowering independent experience requirements', () => {
    const excerpt = 'We are hiring recent university graduates to grow the next generation of consultants through our Business Consultant Development Program (BCDP).';
    const experience = extractExperience(excerpt), classified = classify('Business Consultant', excerpt, [location('Boston, MA')], 'full-time', experience);
    expect(experience.minYears).toBeNull();
    expect(classified.classification.reasons).toContainEqual({ code: 'experience.entry_level_explicit', text: excerpt.slice(0, -1) });
    expect(assessExperience({ title: 'Business Consultant', experience, classification: classified.classification })).toMatchObject({ tier: 'new-grad', requiredYears: null });
    const withRequirement = `${excerpt}\nRequirements\n2 years of relevant professional experience required.`;
    const required = extractExperience(withRequirement), second = classify('Business Consultant', withRequirement, [location('Boston, MA')], 'full-time', required);
    expect(assessExperience({ title: 'Business Consultant', experience: required, classification: second.classification }).tier).toBe('early-career');
    const unrelated = classify('Data Analyst', 'Our platform helps recent university graduates find jobs.', [location('Boston, MA')], 'full-time', extractExperience(''));
    expect(unrelated.classification.reasons).not.toContainEqual(expect.objectContaining({ code: 'experience.entry_level_explicit' }));
  });
  it('does not turn optional skills or short substrings into mandatory skills', () => {
    expect(extractSkills('SQL preferred. R&D and customer service.')).toEqual({ required: [], preferred: ['SQL'] });
    expect(extractSkills('Requirements\nProficiency in R, PostgreSQL, and PowerBI.')).toEqual({ required: ['SQL', 'R', 'Power BI'], preferred: [] });
  });
  it('keeps currencies and hourly periods separate without annualizing or assuming dollars are USD', () => {
    expect(parseSalaryText('Base salary USD $45 - $60 per hour.')[0]).toMatchObject({ min: 45, max: 60, currency: 'USD', period: 'hour', compensationType: 'base' });
    expect(parseSalaryText('Annual salary $85,000 - $95,000.')[0]).toMatchObject({ currency: 'unknown', period: 'year' });
  });
  it('strips untrusted HTML/scripts, bounds descriptions and accepts only secure safe links', () => {
    expect(plainText('&lt;p&gt;Hello&lt;/p&gt;&lt;script&gt;evil()&lt;/script&gt;')).toBe('Hello'); expect(plainText('x'.repeat(40000))).toHaveLength(32000);
    for (const value of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', 'not a URL']) expect(safePostingUrl(value)).toBeNull();
  });
});

describe('safe complete snapshots and HTTP failures', () => {
  const records = [{ externalId: 'a', availability: 'open' as const, missingSince: null, missingCount: 0 }];
  it('requires two successful absences at least twelve hours apart and resets on reappearance', () => {
    const first = reconcileAbsences(records, new Set(), now, true, 1, 0); expect(first.records[0].availability).toBe('availability_unconfirmed');
    const soon = reconcileAbsences(first.records, new Set(), '2026-10-21T19:59:59.000Z', true, 1, 0); expect(soon.records[0].availability).toBe('availability_unconfirmed');
    const later = reconcileAbsences(soon.records, new Set(), '2026-10-21T20:00:00.000Z', true, 1, 0); expect(later.records[0].availability).toBe('closed');
    expect(reconcileAbsences(later.records, new Set(['a']), now, true, 1, 1).records[0]).toMatchObject({ availability: 'open', missingCount: 0, missingSince: null });
  });
  it('preserves jobs on partial, failed or suspicious mass-drop runs', () => {
    expect(reconcileAbsences(records, new Set(), now, false, 100, 0).records).toEqual(records);
    expect(reconcileAbsences(records, new Set(), now, true, 100, 0)).toEqual({ records, quarantined: true });
  });
  it('uses bounded retries and honors long Retry-After without premature retry', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } })).mockResolvedValueOnce(new Response('{"jobs":[]}', { status: 200 })); const sleep = vi.fn(async () => {});
    expect(await fetchPublicJson('https://api.ashbyhq.com/posting-api/job-board/example', { fetch: fetcher, sleep })).toEqual({ jobs: [] }); expect(sleep).toHaveBeenCalledWith(2000); expect(fetcher).toHaveBeenCalledTimes(2);
    const long = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } })); await expect(fetchPublicJson('https://api.lever.co/v0/postings/example', { fetch: long, sleep })).rejects.toThrow('deferred'); expect(long).toHaveBeenCalledTimes(1);
  });
  it('rejects unknown hosts and malformed JSON', async () => {
    await expect(fetchPublicJson('https://example.com/a')).rejects.toThrow('approved'); await expect(fetchPublicJson('https://api.lever.co/v0/postings/example', { fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response('not json')) })).rejects.toThrow('not valid JSON');
  });
  it('bounds network failures at three attempts', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('simulated timeout')); const pause = vi.fn(async () => {});
    await expect(fetchPublicJson('https://api.lever.co/v0/postings/example', { fetch: fetcher, sleep: pause })).rejects.toThrow('no reconciliation'); expect(fetcher).toHaveBeenCalledTimes(3); expect(pause).toHaveBeenCalledTimes(2);
  });
});
