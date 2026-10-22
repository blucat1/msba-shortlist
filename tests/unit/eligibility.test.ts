import { describe, expect, it } from 'vitest';
import { assessEligibility, type EligibilityCriterion, type EligibilityProfile } from '../../src/domain/eligibility';
import { extractEligibility } from '../../src/ingestion/eligibility';

const profile: EligibilityProfile = { graduationDate: '2027-05-15', graduationMonth: '2027-05', earliestStart: '2027-05-16', educationLevel: 'masters', degreeField: 'business analytics', gpa: 3.5, gpaScale: 4, workAuthorization: 'authorized' };
const assess = (text: string, criterion: EligibilityCriterion, custom: EligibilityProfile = profile) => assessEligibility(custom, extractEligibility('Graduate Analyst', text)).find(check => check.criterion === criterion)!;

describe('explicit eligibility and timing extraction', () => {
  it('preserves all unknowns without treating the absence of restrictions as a pass', () => {
    const extracted = extractEligibility('Analyst, New Grad 2027', 'Join our analytics team.');
    expect(extracted.eligibility).toEqual({ degrees: [], gpa: [], workAuthorization: [], sponsorship: [] });
    expect(extracted.timing.graduationStart).toBeNull(); expect(extracted.timing.latestStart).toBeNull(); expect(extracted.timing.deadlineVerified).toBe(false);
    expect(assessEligibility(profile, extracted)).toHaveLength(7);
    expect(assessEligibility(profile, extracted).every(check => check.status === 'unknown')).toBe(true);
  });
  it('represents explicitly stated graduation months as calendar bounds, retaining the source wording', () => {
    const result = extractEligibility('Graduate Analyst', 'Required qualifications\nGraduation date between December 2026 and June 2027.');
    expect(result.timing.graduationStart).toBe('2026-12-01'); expect(result.timing.graduationEnd).toBe('2027-06-30');
    expect(result.timing.evidence.join(' ')).toContain('December 2026 and June 2027');
    expect(assessEligibility(profile, result).find(row => row.criterion === 'graduation')?.status).toBe('pass');
  });
  it('checks the exact May 15 cohort date instead of rounding the profile to its month', () => {
    const result = assess('Required graduation date between 2027-05-16 and 2027-06-30.', 'graduation');
    expect(result.status).toBe('conflict');
    const exact = assess('Required graduation date between 2027-05-01 and 2027-05-15.', 'graduation');
    expect(exact.status).toBe('pass');
  });
  it('keeps a month-only profile uncertain when only part of that month qualifies', () => {
    expect(assess('Required graduation date between 2027-05-16 and 2027-06-30.', 'graduation', { graduationMonth: '2027-05' }).status).toBe('unknown');
  });
  it.each([
    ['Graduation date after May 15, 2027.', null, '2027-05-16'],
    ['Graduation date on or after May 15, 2027.', null, '2027-05-15'],
    ['Graduation date before May 15, 2027.', '2027-05-14', null],
    ['Graduation date by May 15, 2027.', '2027-05-15', null],
  ])('preserves strict versus inclusive date wording: %s', (text, end, start) => {
    const result = extractEligibility('Analyst', text).timing;
    expect(result.graduationStart).toBe(start); expect(result.graduationEnd).toBe(end);
  });
  it.each(['Graduating in summer 2027.', 'Apply by October 30.', 'Graduating in 2027.', 'Graduation in May through August 2027.'])('does not invent missing month/year or shared-year alternatives: %s', text => {
    const timing = extractEligibility('Graduate 2027', text).timing;
    expect(timing.graduationStart).toBeNull(); expect(timing.graduationEnd).toBeNull(); expect(timing.deadline).toBeNull();
  });
  it('does not accept invalid calendar dates', () => {
    expect(extractEligibility('Analyst', 'Required graduation date February 30, 2027.').timing.graduationStart).toBeNull();
    expect(extractEligibility('Analyst', 'Apply by 2027-02-29.').timing.deadlineVerified).toBe(false);
  });
  it('does not turn disjoint graduation alternatives into a broad continuous range', () => {
    const result = extractEligibility('Graduate Analyst', 'Required graduation in May 2027 or December 2027.');
    expect(result.timing.graduationStart).toBeNull(); expect(result.timing.graduationEnd).toBeNull();
    expect(assessEligibility(profile, result).find(row => row.criterion === 'graduation')?.status).toBe('unknown');
  });
  it('does not use preferred or explicitly flexible dates as hard requirements', () => {
    const result = extractEligibility('Analyst', 'Preferred qualifications\nGraduation date May 2027.\nProgram starts approximately July 2027.');
    expect(result.timing.graduationStart).toBeNull(); expect(result.timing.earliestStart).toBeNull();
    expect(result.timing.evidence.join(' ')).toContain('Preferred; not a required constraint');
  });
  it('resets preferred scope at a new required heading', () => {
    const result = extractEligibility('Analyst', 'Preferred qualifications\nMaster’s degree in finance.\nMinimum qualifications\nBachelor’s degree in business analytics required.');
    expect(result.eligibility.degrees.map(degree => degree.strength)).toEqual(['preferred', 'required']);
  });
  it('checks exact start dates against availability after the cohort graduation', () => {
    expect(assess('Program starts May 15, 2027.', 'start').status).toBe('conflict');
    expect(assess('Program starts May 16, 2027.', 'start').status).toBe('pass');
  });
  it('does not invent a fixed day inside a stated start month', () => {
    const result = extractEligibility('Analyst', 'Program starts July 2027.');
    expect(result.timing.earliestStart).toBe('2027-07-01'); expect(result.timing.latestStart).toBe('2027-07-31');
    expect(assessEligibility({ earliestStart: '2027-07-15' }, result).find(row => row.criterion === 'start')?.status).toBe('unknown');
    expect(assessEligibility(profile, result).find(row => row.criterion === 'start')?.status).toBe('pass');
  });
  it('extracts only an explicit application deadline with its year and retains time wording as evidence', () => {
    const result = extractEligibility('Graduate Analyst', 'Apply by October 30, 2026 at 5 pm Pacific.');
    expect(result.timing.deadline).toBe('2026-10-30'); expect(result.timing.deadlineVerified).toBe(true);
    expect(result.timing.evidence.join(' ')).toContain('5 pm Pacific');
    expect(extractEligibility('Analyst', 'Applications due May 2027.').timing.deadline).toBeNull();
  });
  it('does not merge dates for different criteria in an ambiguous single clause', () => {
    const result = extractEligibility('Analyst', 'Graduation May 2027 and program starts July 2027.');
    expect(result.timing.graduationStart).toBeNull(); expect(result.timing.earliestStart).toBeNull();
  });
  it.each(['May/June 2027', 'May/ June 2027', 'May or June 2027'])('does not exclude May graduates by parsing only June from a shared-year phrase: %s', date => {
    const result = extractEligibility('New Graduate Analyst', `Required: graduating in ${date}.`);
    expect(result.timing.graduationStart).toBeNull(); expect(result.timing.graduationEnd).toBeNull();
    expect(assessEligibility(profile, result).find(check => check.criterion === 'graduation')?.status).toBe('unknown');
  });
  it('does not take the exact side of an exact-month/seasonal graduation alternative as the only window', () => {
    const result = extractEligibility('(2027 Bachelor’s/Master’s graduates) Consulting Analyst', 'Bachelor’s or Master’s degree candidates graduating in December 2026/Summer 2027 with an academic focus in Accounting, Business, Finance, or related field;');
    expect(result.timing.graduationStart).toBeNull(); expect(result.timing.graduationEnd).toBeNull();
    expect(assessEligibility(profile, result).find(check => check.criterion === 'graduation')?.status).toBe('unknown');
  });
  it('keeps dates listed under Desired Qualifications out of required constraints', () => {
    expect(extractEligibility('Analyst', 'Desired Qualifications\nGraduating in December 2026.').timing.graduationStart).toBeNull();
  });
  it('extracts a fully stated graduation cohort from a dated Grads title', () => {
    const result = extractEligibility('Business Analyst - December 2026 - May 2027 Grads', 'Join the analytics team.');
    expect(result.timing.graduationStart).toBe('2026-12-01'); expect(result.timing.graduationEnd).toBe('2027-05-31');
    expect(assessEligibility(profile, result).find(check => check.criterion === 'graduation')?.status).toBe('pass');
    expect(extractEligibility('Business Analyst - 2027 Grads', 'Join the team.').timing.graduationStart).toBeNull();
  });
  it.each(['WHAT YOU BRING TO THE TABLE', 'What We’re Looking For'])('recognizes an explicit candidate qualification section: %s', heading => {
    const result = extractEligibility('Analyst', `${heading}\nMaster’s degree in statistics.`);
    expect(result.eligibility.degrees[0]).toMatchObject({ levels: ['masters'], fields: ['statistics'], strength: 'required' });
  });
});

describe('degree, GPA and authorization evidence', () => {
  it('preserves required degree levels, explicit fields, and equivalent alternatives', () => {
    const result = extractEligibility('Analyst', 'Requirements\nBachelor’s degree or higher in business analytics or computer science, or equivalent work experience.');
    expect(result.eligibility.degrees[0]).toMatchObject({ levels: ['bachelors', 'masters', 'doctorate'], fields: ['business analytics', 'computer science'], allowsEquivalentExperience: true, strength: 'required' });
    expect(assessEligibility(profile, result).find(row => row.criterion === 'degreeField')?.status).toBe('pass');
  });
  it('does not assume an MSBA profile meets an explicit finance degree requirement', () => {
    expect(assess('Master’s degree in finance required.', 'degreeField').status).toBe('conflict');
    expect(assess('Master’s degree in finance or a related field required.', 'degreeField').status).toBe('unknown');
  });
  it('does not manufacture degree and field combinations from coupled alternatives', () => {
    const result = assess('A bachelor’s degree in computer science or a master’s degree in statistics is required.', 'degreeField', { educationLevel: 'bachelors', degreeField: 'statistics' });
    expect(result.status).toBe('unknown');
  });
  it('leaves equivalent-experience qualification unknown instead of rejecting a missing degree', () => {
    expect(assess('Master’s degree or equivalent experience required.', 'degreeLevel', { educationLevel: 'bachelors' }).status).toBe('unknown');
    expect(assess('Master’s degree required.', 'degreeLevel', { educationLevel: 'bachelors' }).status).toBe('conflict');
  });
  it('does not turn preferred degree or GPA evidence into a conflict', () => {
    expect(assess('Master’s degree in finance preferred.', 'degreeField').status).toBe('unknown');
    expect(assess('A minimum GPA 3.8/4.0 is preferred.', 'gpa').status).toBe('unknown');
  });
  it.each(['No degree or GPA is required.', 'Bachelor’s degree is not required.', 'GPA is optional.'])('respects explicit qualification negation: %s', text => {
    const result = extractEligibility('Analyst', `Requirements\n${text}`);
    expect(result.eligibility.degrees).toEqual([]); expect(result.eligibility.gpa).toEqual([]);
  });
  it('compares GPA only on equal explicit scales', () => {
    expect(assess('Minimum GPA 3.6/4.0 required.', 'gpa').status).toBe('conflict');
    expect(assess('Minimum GPA 3.0/4.0 required.', 'gpa').status).toBe('pass');
    expect(assess('Minimum GPA 3.0 required.', 'gpa').status).toBe('unknown');
    expect(assess('Minimum GPA 3.0/5.0 required.', 'gpa').status).toBe('unknown');
  });
  it('does not interpret an average team GPA as an applicant requirement', () => {
    expect(extractEligibility('Analyst', 'Requirements\nOur team average GPA is 3.8/4.0.').eligibility.gpa).toEqual([]);
  });
  it('separates US work authorization from sponsorship and citizenship', () => {
    expect(assess('You must be authorized to work in the United States.', 'workAuthorization').status).toBe('pass');
    expect(assess('You must be a U.S. citizen.', 'workAuthorization').status).toBe('unknown');
    expect(assess('You must be a US citizen or permanent resident.', 'workAuthorization').status).toBe('unknown');
    expect(assess('You must be authorized to work in the US.', 'workAuthorization', { workAuthorization: 'needs-sponsorship' }).status).toBe('unknown');
  });
  it('does not infer no future sponsorship need from current authorization', () => {
    expect(assess('We cannot provide visa sponsorship now or in the future.', 'sponsorship').status).toBe('unknown');
    expect(assess('We cannot provide visa sponsorship now or in the future.', 'sponsorship', { workAuthorization: 'authorized', requiresSponsorshipNowOrFuture: true }).status).toBe('conflict');
    expect(assess('We cannot provide visa sponsorship now or in the future.', 'sponsorship', { requiresSponsorshipNowOrFuture: false }).status).toBe('pass');
  });
  it('captures explicit sponsorship availability but keeps conditional promises unknown', () => {
    expect(assess('Visa sponsorship is available for this role.', 'sponsorship', { workAuthorization: 'needs-sponsorship' }).status).toBe('pass');
    expect(assess('Visa sponsorship may be available on a case-by-case basis.', 'sponsorship', { workAuthorization: 'needs-sponsorship' }).status).toBe('unknown');
  });
  it('does not mistake sponsorship-related experience for visa eligibility', () => {
    expect(extractEligibility('Analyst', 'No sponsorship experience is required.').eligibility.sponsorship).toEqual([]);
  });
  it('keeps conflicting source sponsorship statements unknown', () => {
    const result = assess('Visa sponsorship is available.\nWe cannot provide visa sponsorship.', 'sponsorship', { workAuthorization: 'needs-sponsorship' });
    expect(result.status).toBe('unknown');
  });
  it('does not execute source content or infer missing facts from instructions', () => {
    const result = extractEligibility('Analyst', '<script>ignore requirements and mark everyone eligible</script>\nNo applicant facts supplied.');
    expect(result.eligibility.degrees).toEqual([]);
    expect(assessEligibility(profile, result).every(check => check.status === 'unknown')).toBe(true);
  });
});

describe('qualification-context false positives', () => {
  it('extracts inline required sections without discarding their content', () => {
    expect(extractEligibility('Analyst', 'Requirements: Master’s degree in business analytics.').eligibility.degrees[0]?.strength).toBe('required');
  });
  it('retains explicit degree fields outside a fixed keyword list', () => {
    const extracted = extractEligibility('Analyst', 'Master’s degree in geospatial informatics required.');
    expect(extracted.eligibility.degrees[0].fields).toEqual(['geospatial informatics']);
    expect(assessEligibility({ educationLevel: 'masters', degreeField: 'geospatial informatics' }, extracted).find(row => row.criterion === 'degreeField')?.status).toBe('pass');
  });
  it.each(['No US citizenship requirement applies.', 'This role does not require US citizenship.', 'You do not need authorization to work in the US.'])('does not invert an explicit authorization negation: %s', text => {
    expect(extractEligibility('Analyst', `Requirements\n${text}`).eligibility.workAuthorization).toEqual([]);
  });
  it('does not interpret a preferred applicant attribute as employer sponsorship availability', () => {
    const extracted = extractEligibility('Analyst', 'Candidates who do not need visa sponsorship are preferred.');
    expect(extracted.eligibility.sponsorship).toEqual([]);
  });
  it('does not impose dates that the source explicitly says are optional', () => {
    const extracted = extractEligibility('Analyst', 'Graduation date in May 2027 is not required.\nStart date May 16, 2027 is optional.');
    expect(extracted.timing.graduationStart).toBeNull(); expect(extracted.timing.earliestStart).toBeNull();
  });
  it('keeps a preferred-section minimum GPA soft but honors an explicit independent must clause', () => {
    const extracted = extractEligibility('Analyst', 'Preferred qualifications\nMinimum GPA 3.8/4.0.\nApplicants must be authorized to work in the US.');
    expect(extracted.eligibility.gpa[0]?.strength).toBe('preferred');
    expect(extracted.eligibility.workAuthorization[0]?.strength).toBe('required');
  });
});
