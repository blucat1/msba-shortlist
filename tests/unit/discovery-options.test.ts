import { describe, expect, it } from 'vitest';
import { FILTER_KEYS, MATCHING_MODES, filtersFromParams } from '../../src/features/discovery-options';

const parse = (query = '', catalog = false) => filtersFromParams(new URLSearchParams(query), catalog);

describe('URL discovery options', () => {
  it('defaults to strict open new-grad filters and offers all three explicit matching modes', () => {
    expect(parse()).toMatchObject({ mode: 'shortlist', experienceView: 'new-grad', availability: ['open'], includeNeedsDetails: false, includeExcluded: false, includeKnownConflicts: false, includeTracked: false, includeDismissed: false, includeStale: false });
    expect(MATCHING_MODES.map(mode => mode.value)).toEqual(['filters', 'resume', 'combined']);
  });

  it('explicit All listings restores tracked and dismissed rows without enabling exclusions, conflicts, stale or closed rows', () => {
    expect(parse('', true)).toMatchObject({ mode: 'catalog', experienceView: 'all', includeNeedsDetails: true, includeTracked: true, includeExcluded: false, includeKnownConflicts: false, includeDismissed: true, includeStale: false, availability: ['open'] });
    expect(parse('details=0&career=new-grad', true)).toMatchObject({ experienceView: 'new-grad', includeNeedsDetails: false });
    expect(parse('show-saved=0&details=0', true)).toMatchObject({ includeTracked: false, includeDismissed: false, includeNeedsDetails: false, experienceView: 'all' });
    expect(parse('show-saved=0&details=0')).toMatchObject({ includeTracked: false, includeDismissed: false, includeNeedsDetails: false, experienceView: 'new-grad' });
    expect(parse('career=all')).toMatchObject({ experienceView: 'all', includeNeedsDetails: false, includeExcluded: false });
  });

  it('keeps a genuine numeric zero distinct from an unset filter or an unknown-inclusion option', () => {
    expect(parse()).toMatchObject({ maxRequiredYears: null, minAnnualBaseUsd: null, includeUnknownExperience: false, includeUnknownSalary: false });
    expect(parse('experience=0&pay=0')).toMatchObject({ maxRequiredYears: 0, minAnnualBaseUsd: 0, includeUnknownExperience: false, includeUnknownSalary: false });
    expect(parse('experience=0&unknown-experience=1&pay=90000&unknown-pay=1')).toMatchObject({ maxRequiredYears: 0, minAnnualBaseUsd: 90_000, includeUnknownExperience: true, includeUnknownSalary: true });
    expect(parse('experience=0.5')).toMatchObject({ maxRequiredYears: .5 });
  });

  it('preserves OR lists and explicit independent opt-ins with validated known values', () => {
    const result = parse('role=data-science,business-analytics&work=remote,hybrid&employment=full-time,internship&location=San%20Francisco,Austin&companies=Actual%20Company,Other&sources=a,b&providers=greenhouse,jobicy&availability=open,availability_unconfirmed&words=any&q=SQL%20Python');
    expect(result).toMatchObject({ roleFamilies: ['data-science', 'business-analytics'], workArrangements: ['remote', 'hybrid'], employmentTypes: ['full-time', 'internship'], locations: ['san francisco', 'austin'], companies: ['actual company', 'other'], sourceIds: ['a', 'b'], providers: ['greenhouse', 'jobicy'], availability: ['open', 'availability_unconfirmed'], keywordMode: 'any', keyword: 'SQL Python' });
    expect(parse('show-saved=1&details=1&stale=1&conflicts=1&excluded=1')).toMatchObject({ includeTracked: true, includeDismissed: true, includeNeedsDetails: true, includeStale: true, includeKnownConflicts: true, includeExcluded: true });
    expect(parse('availability=')).toMatchObject({ availability: [] });
  });

  it('distinguishes original posting, last publication and first discovery dates without copying evidence', () => {
    expect(parse('date-basis=posted&from=2026-10-01&through=2026-10-22&age=7&unknown-date=1')).toMatchObject({ dateBasis: 'posted', dateFrom: '2026-10-01', dateTo: '2026-10-22', maxAgeDays: 7, includeUnknownDate: true });
    expect(parse('date-basis=published').dateBasis).toBe('published');
    expect(parse().dateBasis).toBe('found');
  });

  it.each(['experience=NaN', 'experience=-1', 'experience=81', 'pay=Infinity', 'pay=-1', 'pay=10000001', 'age=0', 'age=3651', 'age=not-a-number', 'experience=1year', 'experience=%20', 'pay=%20', 'experience=0x10', 'pay=0b10'])('rejects an invalid numeric URL rather than silently removing a filter: %s', query => {
    expect(() => parse(query)).toThrow();
  });

  it.each(['from=2026-02-29', 'through=2026-2-3', 'from=2026-10-22&through=2026-10-01', 'date-basis=updated', 'career=imaginary', 'words=phrase', 'role=software-engineering', 'work=anywhere', 'employment=permanent', 'providers=service_role', 'availability=available'])('rejects invalid dates, ranges and selector values: %s', query => {
    expect(() => parse(query)).toThrow();
  });

  it('does not read resume text, private notes, ownership or hidden profile values from discovery URLs', () => {
    const params = new URLSearchParams('resume=Private%20CV%20text&skills=SQL&notes=Private%20notes&user_id=other-person&yearsExperience=99&match=resume');
    expect(filtersFromParams(params)).toEqual(parse());
    const keys = FILTER_KEYS as readonly string[];
    for (const key of ['resume', 'cv', 'skills', 'notes', 'user_id', 'yearsExperience']) expect(keys).not.toContain(key);
    expect(params.get('resume')).toBe('Private CV text');
  });

  it('resets all broadening by parsing a new empty query and does not mutate the caller URL', () => {
    const params = new URLSearchParams('career=all&excluded=1&conflicts=1&availability=closed&role=data-science');
    const before = params.toString(); const first = filtersFromParams(params); first.roleFamilies.push('business-analytics');
    expect(params.toString()).toBe(before);
    expect(parse()).toMatchObject({ experienceView: 'new-grad', includeExcluded: false, includeKnownConflicts: false, availability: ['open'], roleFamilies: [] });
  });
});
