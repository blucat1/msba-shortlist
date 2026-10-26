import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob, type RankedJob } from '../../src/domain/ranking';
import { prioritizeNewGradRecommendations, recommendationHighlights } from '../../src/domain/recommendations';
import { compareResumeToJob } from '../../src/domain/resume-matching';
import type { ResumeProfile } from '../../src/domain/resume';
import { DEFAULT_PREFERENCES, type Job, type Preferences } from '../../src/domain/types';

const now = new Date('2026-10-22T12:00:00Z');
function job(changes: Partial<Job> = {}): Job {
  return { ...createDemoSnapshot(now).jobs[0], title: 'Business Analyst', roleFamilies: ['business-analytics'], primaryRoleFamily: 'business-analytics',
    requiredSkills: ['SQL', 'Python'], preferredSkills: [], locations: [{ label: 'Seattle, WA', city: 'Seattle', region: 'WA', country: 'US' }], workArrangement: 'remote',
    classification: { confidence: 'high', reasons: [], version: 'test', scope: 'included', seniority: 'early-career' },
    experience: { minYears: 0, maxYears: null, preferredYears: null, alternatives: [], evidence: 'No experience required.' },
    timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] },
    eligibility: { degrees: [], gpa: [], workAuthorization: [], sponsorship: [] }, availability: 'open', lastVerifiedAt: now.toISOString(), ...changes };
}
const preferences = (changes: Partial<Preferences> = {}): Preferences => ({ ...DEFAULT_PREFERENCES, graduationDate: null, graduationMonth: null, earliestStart: null, ...changes });
const profile = (changes: Partial<ResumeProfile> = {}): ResumeProfile => ({ skills: ['SQL'], roleInterests: ['business-analytics'], yearsExperience: null, educationLevel: null, degreeField: null, ...changes });
const row = (changes: Partial<Job> = {}, prefs: Partial<Preferences> = {}) => rankJob(job(changes), preferences(prefs), now);

describe('new-grad-first recommendation ordering', () => {
  it('prioritizes new grads while retaining the existing preference or resume order within each tier', () => {
    const threeYears = row({ id: 'early-three', experience: { ...job().experience, minYears: 3 } });
    const oneYear = row({ id: 'grad-one', experience: { ...job().experience, minYears: 1 } });
    const twoYears = row({ id: 'early-two', experience: { ...job().experience, minYears: 2 } });
    const zeroYears = row({ id: 'grad-zero' });
    const input = [threeYears, oneYear, twoYears, zeroYears];
    const before = JSON.stringify(input);
    const ordered = prioritizeNewGradRecommendations(input, 'early-career');
    expect(ordered.map(item => item.job.id)).toEqual(['grad-one', 'grad-zero', 'early-three', 'early-two']);
    expect(ordered[0]).toBe(oneYear); expect(ordered[2]).toBe(threeYears);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('does not promote missing/conditional years, senior titles or explicit non-graduate roles as new grads', () => {
    const uncertain = row({ id: 'unknown', experience: { ...job().experience, minYears: null } });
    const conditional = row({ id: 'conditional', title: 'Graduate Analyst', experience: { ...job().experience, alternatives: ['Master’s + 0 years or bachelor’s + 3 years'] } });
    const senior = row({ id: 'senior', title: 'Senior Analyst' });
    const notGraduate = row({ id: 'not-grad', classification: { ...job().classification, reasons: [{ code: 'experience.not_new_grad', text: 'This is not a new-graduate role.' }] } });
    const graduate = row({ id: 'graduate', title: 'Graduate Analyst', experience: { ...job().experience, minYears: null } });
    const ordered = prioritizeNewGradRecommendations([uncertain, conditional, senior, notGraduate, graduate], 'early-career');
    expect(ordered.map(item => item.job.id)).toEqual(['graduate', 'unknown', 'conditional', 'senior', 'not-grad']);
  });

  it.each(['new-grad', 'zero-experience', 'experienced', 'unverified', 'all'] as const)('preserves ranking for an explicitly selected %s view', view => {
    const input = [row({ id: 'first', experience: { ...job().experience, minYears: 3 } }), row({ id: 'second' })];
    expect(prioritizeNewGradRecommendations(input, view)).toEqual(input);
  });
});

describe('shortlist evidence highlights without a new ranking', () => {
  it('selects at most two specific positives from actual role and skill overlap', () => {
    const result = recommendationHighlights(row({}, { roleFamilies: ['business-analytics'], skills: ['SQL'], locations: ['Seattle'], workArrangements: ['remote'] }));
    expect(result.method).toBe('preferences'); expect(result.reasons).toEqual(['Business analytics matches your interests', 'You listed SQL']);
    expect(result.fallback).toBeNull(); expect(result.reasons).toHaveLength(2);
    expect(result.watchouts.join(' ')).toContain('Python');
  });

  it('does not turn a neutral default score into a claimed positive', () => {
    const ranked = row(); expect(ranked.score).toBe(50);
    const result = recommendationHighlights(ranked);
    expect(result.reasons).toEqual([]); expect(result.fallback).toBe('No specific overlap recorded yet.');
    expect(result.coverage).toBe(0); expect(result.coverageLabel).toContain('active preference weight');
  });

  it('does not promote mismatch or experience-stretch reasons, even with an artificially high score', () => {
    const ranked = row({ experience: { minYears: 4, maxYears: null, preferredYears: null, alternatives: [], evidence: 'Four years required.' } }, { roleFamilies: ['data-science'], skills: ['Tableau'], locations: ['Boston'], workArrangements: ['onsite'], yearsExperience: 0 });
    ranked.score = 100;
    const result = recommendationHighlights(ranked);
    expect(result.reasons).toEqual([]); expect(result.watchouts).toHaveLength(2); expect(result.fallback).not.toBeNull();
  });

  it('guards against positive reason records whose source fields are no longer known', () => {
    const ranked = row({ roleFamilies: [], requiredSkills: [], preferredSkills: [], locations: [], workArrangement: 'unknown' });
    ranked.reasons = [
      { code: 'role_interest_match', dimension: 'role interest', text: 'Role matches', evidence: null },
      { code: 'required_skills_match', dimension: 'required skills', text: 'Skills match', evidence: null },
      { code: 'location_match', dimension: 'location & work', text: 'Location matches', evidence: null },
      { code: 'work_match', dimension: 'location & work', text: 'Work matches', evidence: null },
    ];
    expect(recommendationHighlights(ranked).reasons).toEqual([]);
  });

  it('uses verified graduation/start passes and never turns missing dates into positive timing', () => {
    const timing = { ...job().timing, graduationStart: '2027-05-01', graduationEnd: '2027-06-01', earliestStart: '2027-06-01', latestStart: '2027-07-01', evidence: ['Graduating May–June 2027. Start June 2027.'] };
    const result = recommendationHighlights(row({ timing }, { graduationDate: '2027-05-15', earliestStart: '2027-05-16' }));
    expect(result.reasons).toEqual(['Your graduation date falls within the stated window.', 'You are available by the stated start window.']);
    const missing = row({}, { graduationDate: '2027-05-15', earliestStart: '2027-05-16' });
    missing.reasons = [{ code: 'eligibility_start', dimension: 'eligibility', text: 'Starts after graduation', evidence: null }];
    expect(recommendationHighlights(missing).reasons).toEqual([]);
  });

  it('keeps preferred skill mentions explicitly optional', () => {
    const result = recommendationHighlights(row({ requiredSkills: [], preferredSkills: ['Tableau'] }, { skills: ['Tableau'] }));
    expect(result.reasons).toEqual(['Optional skill overlap: Tableau']);
  });

  it('prioritizes conflicts and deduplicates them before the two-warning limit', () => {
    const ranked = row({ sourceReview: { status: 'employer-conflict', reason: 'Employer confirms this requisition is closed.', evidenceUrl: 'https://example.com/source', checkedAt: now.toISOString() }, availability: 'closed', classification: { ...job().classification, scope: 'excluded' } });
    ranked.conflicts.push('Another required qualification conflicts.');
    ranked.caveats.push('Employer confirms this requisition is closed.');
    expect(recommendationHighlights(ranked).watchouts).toEqual(['Employer confirms this requisition is closed.', 'Another required qualification conflicts.']);
  });

  it('retains explicit unconfirmed, wider-scope and stale source warnings', () => {
    const uncertain = recommendationHighlights(row({ availability: 'availability_unconfirmed', classification: { ...job().classification, scope: 'needs-details' } }));
    expect(uncertain.watchouts).toEqual(['Availability needs confirmation.', 'US location or full-time status needs verification.']);
    expect(recommendationHighlights(row({ lastVerifiedAt: null })).watchouts.join(' ')).toContain('Source verification is stale');
    expect(recommendationHighlights(row({ classification: { ...job().classification, scope: 'excluded' } })).watchouts.join(' ')).toContain('Outside the graduate catalog');
  });

  it('counts missing preference dimensions without substituting numeric zero requirements', () => {
    const ranked = row({ requiredSkills: [], workArrangement: 'unknown', locations: [], experience: { ...job().experience, minYears: null, evidence: null } }, { skills: ['SQL'], locations: ['Seattle'], workArrangements: ['remote'], yearsExperience: 0 });
    ranked.missing.push('required skills');
    const result = recommendationHighlights(ranked);
    expect(result.unknownCount).toBe(3); expect(result.unknownLabel).toBe('3 preference dimensions lack evidence');
    expect(result.reasons).toEqual([]); expect(result.coverage).toBe(0);
  });
});

describe('reviewed-resume highlights stay separate from saved preferences', () => {
  it('uses matched resume evidence and never inherits unrelated saved-preference positives or warnings', () => {
    const ranked = row({}, { locations: ['Boston'], roleFamilies: ['business-analytics'], skills: ['Python'] });
    const resume = compareResumeToJob(profile(), ranked.job);
    const result = recommendationHighlights(ranked, resume);
    expect(result.method).toBe('resume');
    expect(result.reasons).toEqual(['Recorded required skill mentions overlap: sql.', 'Listing role/title classification overlaps Business analytics.']);
    expect(result.watchouts.join(' ')).not.toContain('Location differs');
    expect(result.watchouts.join(' ')).toContain('python');
    expect(result.coverage).toBe(resume.coverage); expect(result.coverageLabel).toContain('resume comparison weight');
    expect(result.unknownCount).toBe(resume.unverified.length);
  });

  it('does not use missing or unverified resume terms as positives', () => {
    const ranked = row({}, { skills: ['SQL'], roleFamilies: ['business-analytics'] });
    const result = recommendationHighlights(ranked, compareResumeToJob(profile({ skills: [], roleInterests: [] }), ranked.job));
    expect(result.reasons).toEqual([]); expect(result.fallback).not.toBeNull();
    expect(result.coverage).toBe(0); expect(result.unknownCount).toBeGreaterThan(0);
  });

  it('keeps long skill summaries concise without pretending omitted matches do not exist', () => {
    const ranked = row({ requiredSkills: ['SQL', 'Python', 'Excel', 'Tableau', 'R'] });
    const resume = compareResumeToJob(profile({ skills: ['SQL', 'Python', 'Excel', 'Tableau', 'R'] }), ranked.job);
    expect(recommendationHighlights(ranked, resume).reasons[0]).toBe('Recorded required skill mentions overlap: sql, python, excel (+2 more).');
    expect(resume.matched.filter(item => item.id.startsWith('requiredSkills:'))).toHaveLength(5);
  });

  it('keeps known qualification conflicts ahead of strong skill overlap', () => {
    const ranked = row({ experience: { ...job().experience, minYears: 3, evidence: 'Three years required.' } });
    const resume = compareResumeToJob(profile({ skills: ['SQL', 'Python'], yearsExperience: 0 }), ranked.job);
    const result = recommendationHighlights(ranked, resume);
    expect(resume.scoreCap).toBe(49); expect(result.reasons[0]).toContain('sql, python');
    expect(result.watchouts[0]).toContain('below the recorded 3-year minimum');
    expect(result.reasons.join(' ')).not.toContain('meets the recorded');
  });

  it('leaves conditional degree/experience paths unverified rather than highlighting a low numeric alternative', () => {
    const ranked = row({ requiredSkills: [], experience: { ...job().experience, minYears: 0, alternatives: ['Master’s with zero years or bachelor’s with three years'] } });
    const result = recommendationHighlights(ranked, compareResumeToJob(profile({ roleInterests: [], yearsExperience: 0 }), ranked.job));
    expect(result.reasons).toEqual([]); expect(result.unknownCount).toBeGreaterThan(0);
  });

  it('ignores inconsistent non-matched entries and preserves source/deadline warnings in resume mode', () => {
    const ranked = row({ timing: { ...job().timing, deadline: '2026-10-01', deadlineVerified: true } });
    const resume = compareResumeToJob(profile({ skills: [], roleInterests: [] }), ranked.job);
    resume.matched.push({ id: 'requiredSkills:sql', label: 'SQL', status: 'unverified', strength: 'required', reason: 'Not confirmed', evidence: [] });
    const result = recommendationHighlights(ranked, resume);
    expect(result.reasons).toEqual([]); expect(result.watchouts[0]).toContain('deadline has passed');
  });

  it('is deterministic, does not mutate either comparison, and does not expose a new probability or score', () => {
    const ranked = row({}, { skills: ['SQL'] });
    const resume = compareResumeToJob(profile(), ranked.job);
    const before = JSON.stringify({ ranked, resume });
    const first = recommendationHighlights(ranked, resume);
    expect(recommendationHighlights(ranked, resume)).toEqual(first);
    expect(JSON.stringify({ ranked, resume })).toBe(before);
    expect(first).not.toHaveProperty('score'); expect(first).not.toHaveProperty('probability');
    expect(first.reasons.length).toBeLessThanOrEqual(2); expect(first.watchouts.length).toBeLessThanOrEqual(2);
  });

  it('does not report invalid coverage as complete evidence', () => {
    const ranked: RankedJob = { ...row(), coverage: Number.NaN };
    expect(recommendationHighlights(ranked).coverage).toBe(0);
  });
});
