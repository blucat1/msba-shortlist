import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, type Preferences } from '../../src/domain/types';
import type { ResumeProfile } from '../../src/domain/resume';
import { filtersFromParams } from '../../src/features/discovery-options';
import { DEFAULT_RECOMMENDATION_EXPERIENCE, readRecommendationOptions, recommendationFilters, recommendationMode, recommendationPreferences, recommendationResumePreferences, writeRecommendationOptions } from '../../src/features/recommendation-options';

const base = (): Preferences => ({ ...structuredClone(DEFAULT_PREFERENCES), roleFamilies: ['business-analytics', 'data-science'], primaryRoleFamilies: ['data-science'],
  locations: ['Boston'], workArrangements: ['hybrid'], desiredSalary: 95_000, salaryCurrency: 'EUR', skills: ['SQL'], yearsExperience: 1,
  educationLevel: 'bachelors', degreeField: 'statistics', graduationDate: '2027-05-15', graduationMonth: '2027-05', earliestStart: '2027-05-16',
  workAuthorization: 'needs-sponsorship', requiresSponsorshipNowOrFuture: true, gpa: 3.5, gpaScale: 4 });

describe('recommendation URL isolation', () => {
  it('reads only public rec-* options, never the All listings controls or private profile-shaped keys', () => {
    const query = new URLSearchParams('view=all&q=All%20query&role=machine-learning&career=experienced&match=resume&job=public-job&rec-q=Shortlist%20query&rec-role=data-science&rec-career=zero-experience&rec-match=combined&rec-pay=0&rec-experience=0&rec-resume=PRIVATE_CV&rec-skills=PRIVATE_SKILL&rec-notes=PRIVATE_NOTE&rec-yearsExperience=50&rec-user_id=other&rec-excluded=1&rec-availability=closed&rec-gpa=4');
    const before = query.toString(); const result = readRecommendationOptions(query);
    expect(Object.fromEntries(result)).toEqual({ q: 'Shortlist query', role: 'data-science', career: 'zero-experience', match: 'combined', pay: '0', experience: '0' });
    expect(result.toString()).not.toContain('PRIVATE_'); expect(query.toString()).toBe(before);
  });

  it('writes only allowed recommendation keys while preserving every All listings value and duplicate', () => {
    const query = new URLSearchParams('view=all&q=All%20query&q=second&role=machine-learning&career=experienced&match=resume&job=public-job&pay=125000&rec-q=old&rec-role=business-analytics&rec-resume=PRIVATE_CV&rec-unknown=x');
    const draft = new URLSearchParams('match=combined&q=New&role=data-science&pay=0&experience=0&details=0&skills=PRIVATE_SKILL&resume=PRIVATE_CV&job=replace-job&view=market&excluded=1&rec-skills=PRIVATE_SKILL');
    const before = query.toString(), draftBefore = draft.toString(); const written = writeRecommendationOptions(query, draft);
    for (const key of ['view', 'q', 'role', 'career', 'match', 'job', 'pay']) expect(written.getAll(key)).toEqual(query.getAll(key));
    expect(Object.fromEntries(readRecommendationOptions(written))).toEqual({ match: 'combined', q: 'New', role: 'data-science', pay: '0', experience: '0', details: '0' });
    expect(written.toString()).not.toContain('PRIVATE_'); expect(written.has('rec-unknown')).toBe(false);
    expect(written.has('rec-excluded')).toBe(false); expect(written.has('rec-view')).toBe(false);
    expect(query.toString()).toBe(before); expect(draft.toString()).toBe(draftBefore);
  });

  it('resets recommendation options without resetting the All listings URL', () => {
    const query = new URLSearchParams('view=all&q=SQL&role=data-science&career=all&match=combined&job=role-id&rec-career=early-career&rec-role=product-management&rec-details=1&rec-private=discard');
    const written = writeRecommendationOptions(query, new URLSearchParams());
    expect(written.toString()).toBe('view=all&q=SQL&role=data-science&career=all&match=combined&job=role-id');
    expect(readRecommendationOptions(written).toString()).toBe('');
  });

  it('preserves explicit empty facets and zero/false overrides through a read/write round trip', () => {
    const draft = new URLSearchParams('role=&location=&work=&pay=0&experience=0&unknown-pay=0&unknown-experience=0&details=0');
    const result = readRecommendationOptions(writeRecommendationOptions(new URLSearchParams('view=all'), draft));
    for (const key of ['role', 'location', 'work']) { expect(result.has(key)).toBe(true); expect(result.get(key)).toBe(''); }
    expect(filtersFromParams(result)).toMatchObject({ roleFamilies: [], locations: [], workArrangements: [], minAnnualBaseUsd: 0, maxRequiredYears: 0, includeUnknownSalary: false, includeUnknownExperience: false, includeNeedsDetails: false });
  });

  it('includes early career in recommendations without importing broader All listings settings', () => {
    const options = readRecommendationOptions(new URLSearchParams('view=all&career=all&details=1&excluded=1&conflicts=1&stale=1&availability=closed&rec-excluded=1&rec-conflicts=1&rec-stale=1&rec-availability=closed&rec-show-saved=1'));
    expect(recommendationMode(options)).toBe('filters');
    expect(DEFAULT_RECOMMENDATION_EXPERIENCE).toBe('early-career');
    expect(recommendationFilters(options)).toMatchObject({ mode: 'shortlist', experienceView: 'early-career', availability: ['open'], includeNeedsDetails: false, includeExcluded: false, includeKnownConflicts: false, includeStale: false, includeTracked: false, includeDismissed: false });
    expect(options.toString()).toBe('');
    expect(filtersFromParams(new URLSearchParams()).experienceView).toBe('new-grad');
  });

  it.each(['new-grad', 'zero-experience', 'experienced', 'unverified', 'all'] as const)('preserves an explicit recommendation experience view: %s', career => {
    const options = new URLSearchParams({ career });
    expect(recommendationFilters(options).experienceView).toBe(career);
    expect(options.get('career')).toBe(career);
  });

  it('applies the same early-career default to empty/reset selections and rejects invalid explicit selections', () => {
    expect(recommendationFilters(new URLSearchParams('career=')).experienceView).toBe('early-career');
    expect(() => recommendationFilters(new URLSearchParams('career=not-a-view'))).toThrow();
  });

  it('supports only explicit resume/combined modes and safely defaults unknown method names', () => {
    expect(recommendationMode(new URLSearchParams('match=resume'))).toBe('resume');
    expect(recommendationMode(new URLSearchParams('match=combined'))).toBe('combined');
    expect(recommendationMode(new URLSearchParams('match=arbitrary'))).toBe('filters');
    expect(recommendationMode(new URLSearchParams())).toBe('filters');
  });
});

describe('effective recommendation preferences', () => {
  it('applies only explicit normalized facets and annual USD pay without mutating saved preferences', () => {
    const saved = base(), before = structuredClone(saved);
    Object.freeze(saved.roleFamilies); Object.freeze(saved.primaryRoleFamilies); Object.freeze(saved.locations); Object.freeze(saved.workArrangements); Object.freeze(saved.skills); Object.freeze(saved);
    const result = recommendationPreferences(saved, new URLSearchParams('role=data-science,product-management&location=%20Seattle%20,%20San%20Francisco&work=remote,unknown&pay=120000'));
    expect(result).toMatchObject({ roleFamilies: ['data-science', 'product-management'], primaryRoleFamilies: ['data-science'], locations: ['seattle', 'san francisco'], workArrangements: ['remote'], desiredSalary: 120_000, salaryCurrency: 'USD' });
    expect(result.skills).toEqual(['SQL']); expect(result.earliestStart).toBe('2027-05-16');
    expect(saved).toEqual(before); expect(result).not.toBe(saved);
    result.roleFamilies.push('financial-analytics'); expect(saved.roleFamilies).toEqual(before.roleFamilies);
  });

  it('leaves saved preferences intact when optional facets are absent', () => {
    const saved = base();
    const result = recommendationPreferences(saved, new URLSearchParams('career=all&q=Python&experience=0&details=1'));
    expect(result).toEqual(saved); expect(result).not.toBe(saved);
  });

  it('treats explicitly empty facets as removal of inherited ranking preferences, rather than restoring them', () => {
    const saved = base(); const result = recommendationPreferences(saved, new URLSearchParams('role=&location=&work=&pay='));
    expect(result).toMatchObject({ roleFamilies: [], primaryRoleFamilies: [], locations: [], workArrangements: [], desiredSalary: null, salaryCurrency: 'USD' });
    expect(saved.locations).toEqual(['Boston']); expect(saved.desiredSalary).toBe(95_000);
  });

  it('keeps a genuine zero salary target and removes stale primary-role emphasis when roles change', () => {
    expect(recommendationPreferences(base(), new URLSearchParams('pay=0&role=product-management'))).toMatchObject({ desiredSalary: 0, salaryCurrency: 'USD', roleFamilies: ['product-management'], primaryRoleFamilies: [] });
  });

  it('does not import hidden resume or qualification profile values from recommendation options', () => {
    const saved = base(); const result = recommendationPreferences(saved, new URLSearchParams('skills=PRIVATE_SKILL&resume=PRIVATE_CV&yearsExperience=50&educationLevel=doctorate&degreeField=anything&gpa=4&workAuthorization=authorized'));
    expect(result).toEqual(saved); expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  });

  it.each(['pay=0x10', 'pay=%20', 'experience=-1', 'role=imaginary', 'work=anywhere'])('rejects an invalid public override rather than silently keeping older preferences: %s', query => {
    const saved = base(), before = structuredClone(saved);
    expect(() => recommendationPreferences(saved, new URLSearchParams(query))).toThrow();
    expect(saved).toEqual(before);
  });
});

describe('reviewed resume preferences', () => {
  it('uses the reviewed resume only and neutralizes the default cohort, location and salary settings', () => {
    const profile: ResumeProfile = { skills: ['SQL', 'Python'], roleInterests: ['data-science'], yearsExperience: 0, educationLevel: 'bachelors', degreeField: 'statistics' };
    const before = structuredClone(profile); const result = recommendationResumePreferences(profile, 'America/New_York');
    expect(result).toMatchObject({ roleFamilies: ['data-science'], primaryRoleFamilies: [], skills: ['SQL', 'Python'], yearsExperience: 0, educationLevel: 'bachelors', degreeField: 'statistics', timezone: 'America/New_York',
      locations: [], workArrangements: [], desiredSalary: null, graduationDate: null, graduationMonth: null, earliestStart: null });
    expect(result.gpa).toBeUndefined(); expect(result.workAuthorization).toBeUndefined(); expect(result.requiresSponsorshipNowOrFuture).toBeUndefined();
    expect(profile).toEqual(before); expect(DEFAULT_PREFERENCES.graduationDate).toBe('2027-05-15');
  });

  it('preserves unconfirmed qualifications as unknown instead of manufacturing zeros or completed degrees', () => {
    const result = recommendationResumePreferences({ skills: [], roleInterests: [], yearsExperience: null, educationLevel: null, degreeField: null }, 'UTC');
    expect(result).toMatchObject({ yearsExperience: null, educationLevel: null, degreeField: null, roleFamilies: [], skills: [], graduationDate: null, earliestStart: null });
  });
});
