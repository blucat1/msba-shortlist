import { describe, expect, it } from 'vitest';
import { COHORT, mergeCohortPreferences } from '../../src/domain/cohort';
import { DEFAULT_PREFERENCES, type Job } from '../../src/domain/types';
import { createDemoSnapshot } from '../../src/domain/fixtures';
import { rankJob, rankJobs } from '../../src/domain/ranking';
import { assessExperience, matchesExperienceView } from '../../src/domain/experience';
import { extractExperience, classify } from '../../src/ingestion/classification';
import { normalizePosting } from '../../src/ingestion/normalize';
import { backupSchema } from '../../src/domain/transfer';

const now = new Date('2026-10-22T07:00:00Z');
function job(): Job { const value = createDemoSnapshot(now).jobs[0]; return { ...value, isDemo: undefined, timing: { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] }, experience: { minYears: 0, maxYears: 1, preferredYears: null, alternatives: [], evidence: '0–1 years required' } }; }

describe('cohort defaults respect chosen profiles', () => {
  it('defaults old empty profiles to the user-specified exact cohort', () => {
    const result = mergeCohortPreferences(DEFAULT_PREFERENCES, { graduationMonth: null, earliestStart: null });
    expect(result.graduationDate).toBe(COHORT.graduationDate); expect(result.earliestStart).toBe('2027-05-16');
    expect(result.yearsExperience).toBeNull(); expect(result.workAuthorization).toBeUndefined();
  });
  it('preserves explicit opt-out and custom month precision', () => {
    expect(mergeCohortPreferences(DEFAULT_PREFERENCES, { graduationDate: null, graduationMonth: null, earliestStart: null }).graduationDate).toBeNull();
    expect(mergeCohortPreferences(DEFAULT_PREFERENCES, { graduationMonth: '2028-06' }).graduationDate).toBeNull();
  });
});
describe('eligibility runs before preference sorting', () => {
  it('withholds timing conflicts and lets the user explicitly review them', () => {
    const value = job(); value.timing.latestStart = '2027-05-01';
    expect(rankJobs([value], DEFAULT_PREFERENCES, { now })).toEqual([]);
    const rows = rankJobs([value], DEFAULT_PREFERENCES, { now, includeEligibilityConflicts: true });
    expect(rows).toHaveLength(1); expect(rows[0].label).toBe('Known conflict'); expect(rows[0].eligibility.find(x => x.criterion === 'start')?.status).toBe('conflict');
  });
  it('does not hide unknown requirements or turn them into a pass', () => {
    const rows = rankJobs([job()], DEFAULT_PREFERENCES, { now });
    expect(rows).toHaveLength(1); expect(rows[0].eligibility.every(x => x.status === 'unknown')).toBe(true);
    expect(rows[0].label).not.toBe('Known conflict');
  });
  it('withholds an employer contradiction even when the aggregator says entry-level', () => {
    const value = job(); value.sourceReview = { status: 'employer-conflict', reason: 'Employer now requires 1–2 years.', evidenceUrl: 'https://jobs.lever.co/example/id', checkedAt: now.toISOString() };
    expect(rankJobs([value], DEFAULT_PREFERENCES, { now })).toEqual([]);
    expect(rankJob(value, DEFAULT_PREFERENCES, now).conflicts).toContain(value.sourceReview.reason);
  });
  it('withholds passed verified deadlines while preserving uncertain dates', () => {
    const value = job(); value.timing.deadline = '2026-10-21'; value.timing.deadlineVerified = true;
    expect(rankJobs([value], DEFAULT_PREFERENCES, { now })).toEqual([]);
    value.timing.deadlineVerified = false; expect(rankJobs([value], DEFAULT_PREFERENCES, { now })).toHaveLength(1);
  });
  it('does not let a matching location and skills erase an explicit sponsorship conflict', () => {
    const value = job(); value.eligibility = { degrees: [], gpa: [], workAuthorization: [], sponsorship: [{ value: 'unavailable', strength: 'required', evidence: 'No sponsorship now or in future.' }] };
    expect(rankJobs([value], { ...DEFAULT_PREFERENCES, requiresSponsorshipNowOrFuture: true, skills: value.requiredSkills }, { now })).toEqual([]);
  });
});
describe('zero experience and quantitative coverage', () => {
  it('keeps six months separate from an explicit zero requirement', () => {
    const value = job(); value.experience = extractExperience('Requirements\nAt least 6 months of professional data analysis experience.');
    expect(value.experience.minYears).toBe(.5); expect(assessExperience(value).label).toContain('0.5');
    expect(matchesExperienceView(assessExperience(value), 'zero-experience')).toBe(false);
    expect(matchesExperienceView(assessExperience(job()), 'zero-experience')).toBe(true);
  });
  it('requires quantitative context for ambiguous economic/advisory analyst titles', () => {
    const locations = [{ label: 'Boston, MA', country: 'US', city: 'Boston', region: 'MA' }];
    for (const title of ['Economics Consulting Analyst/Associate', 'Management Advisory Analyst/Associate', 'Research Analyst (Economics and Finance)', 'Energy Analyst (Economics)']) {
      expect(classify(title, 'Quantitative economic analysis using Python and statistical modeling.', locations, 'full-time', extractExperience('No prior experience required.')).classification.scope).toBe('included');
      expect(classify(title, 'Coordinate generic client requests and office supplies.', locations, 'full-time', extractExperience('')).classification.scope).toBe('excluded');
    }
  });
});
describe('production metadata and private backup roundtrip', () => {
  it('normalizes explicit source timing and eligibility instead of empty timing', () => {
    const source = createDemoSnapshot(now).sources[0];
    const value = normalizePosting({ externalId: 'cohort-test', title: 'Data Analyst – New Graduate', description: 'Requirements\nNo prior experience required.\nMust graduate between December 2026 and June 2027.\nMust start in July 2027.\nMinimum GPA 3.0 on a 4.0 scale.\nWe cannot provide visa sponsorship.', employment: 'full-time', workMode: null, locations: [{ label: 'Boston, MA', country: 'US', region: 'MA', city: 'Boston' }], salary: [], postingUrl: 'https://example.com/job', applicationUrl: 'https://example.com/job', sourcePostedAt: null, sourceUpdatedAt: null, sourcePublishedAt: null }, source, now.toISOString());
    expect(value.timing.graduationStart).toBe('2026-12-01'); expect(value.timing.latestStart).toBe('2027-07-31'); expect(value.eligibility?.gpa[0].value.minimum).toBe(3);
    const fixture = createDemoSnapshot(now); const opportunity = fixture.opportunities[0]; opportunity.snapshot = value;
    const restored = backupSchema.parse({ version: 1, exportedAt: now.toISOString(), preferences: { ...DEFAULT_PREFERENCES, educationLevel: 'masters', degreeField: 'business analytics', gpa: 3.4, gpaScale: 4, requiresSponsorshipNowOrFuture: true }, opportunities: [opportunity], events: [], tasks: [], companyNotes: [], jobPreferences: [] });
    expect(restored.opportunities[0].snapshot?.eligibility).toEqual(value.eligibility); expect(restored.preferences.graduationDate).toBe('2027-05-15'); expect(restored.preferences.gpa).toBe(3.4);
  });
});

describe('reviewed market patterns preserve boundaries', () => {
  it('extracts an explicit Experience required prefix without a trailing experience word', () => {
    expect(extractExperience('Experience required: 0 to 5 years')).toMatchObject({ minYears: 0, maxYears: 5 });
    expect(extractExperience('Our company is 5 years old.').minYears).toBeNull();
  });
  it('keeps combined analyst/senior-analyst hiring in review rather than assuming a degree/level path', () => {
    const value = job(); value.title = 'Project Finance - Analyst / Senior Analyst';
    expect(assessExperience(value).tier).toBe('unverified');
    expect(rankJobs([value], DEFAULT_PREFERENCES, { now })).toEqual([]);
  });
  it('does not broaden specialized engineer, medical researcher or generic associate titles', () => {
    const places = [{ label: 'Boston', country: 'US', region: null, city: 'Boston' }];
    for (const title of ['Implementation Engineer', 'Medical Research Analyst', 'Senior Associate', 'Business Systems Analyst']) {
      expect(classify(title, 'Coordinate office administration.', places, 'full-time', extractExperience('')).classification.scope).toBe('excluded');
    }
    expect(classify('Implementation Engineer', 'Build data pipelines with Python and SQL.', places, 'full-time', extractExperience('2 years experience')).roleFamilies).toContain('data-engineering');
  });
});
