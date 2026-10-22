import type { JobTiming } from './types';

export type EducationLevel = 'bachelors' | 'masters' | 'doctorate';
export type RequirementStrength = 'required' | 'preferred';
export interface EligibilityFact<T> { value: T; evidence: string; strength: RequirementStrength; }
export interface DegreeRequirement {
  levels: EducationLevel[];
  fields: string[];
  allowsRelatedFields: boolean;
  allowsEquivalentExperience: boolean;
  evidence: string;
  strength: RequirementStrength;
}
export interface JobEligibility {
  degrees: DegreeRequirement[];
  gpa: EligibilityFact<{ minimum: number; scale: number | null }>[];
  workAuthorization: EligibilityFact<'us-authorization' | 'us-citizen' | 'us-citizen-or-permanent-resident'>[];
  sponsorship: EligibilityFact<'available' | 'unavailable'>[];
}
export interface EligibilityProfile {
  educationLevel?: EducationLevel | null;
  degreeField?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  workAuthorization?: 'authorized' | 'needs-sponsorship' | 'unknown' | null;
  requiresSponsorshipNowOrFuture?: boolean | null;
  graduationDate?: string | null;
  graduationMonth?: string | null;
  earliestStart?: string | null;
}
export type EligibilityCriterion = 'graduation' | 'start' | 'degreeLevel' | 'degreeField' | 'gpa' | 'workAuthorization' | 'sponsorship';
export interface EligibilityAssessment {
  criterion: EligibilityCriterion;
  status: 'pass' | 'conflict' | 'unknown';
  reason: string;
  evidence: string[];
}
export interface EligibilityJob { eligibility?: JobEligibility; timing: JobTiming; }

/** Evidence checks are individual constraints, never an overall hiring/eligibility decision. */
export function assessEligibility(profile: EligibilityProfile, job: EligibilityJob): EligibilityAssessment[] {
  const facts = job.eligibility;
  const normalized = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const validDay = (value: string | null | undefined): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const result = (criterion: EligibilityCriterion, status: EligibilityAssessment['status'], reason: string, evidence: string[] = []): EligibilityAssessment => ({ criterion, status, reason, evidence });
  const combine = (criterion: EligibilityCriterion, checks: { status: EligibilityAssessment['status']; reason: string }[], evidence: string[]): EligibilityAssessment => {
    const chosen = checks.find(check => check.status === 'conflict') || checks.find(check => check.status === 'unknown') || checks[0];
    return result(criterion, chosen?.status || 'unknown', chosen?.reason || 'No explicit required criterion was verified.', evidence);
  };
  const timingEvidence = job.timing.evidence;
  let graduation = result('graduation', 'unknown', 'A required graduation window was not verified.', timingEvidence);
  const low = job.timing.graduationStart, high = job.timing.graduationEnd;
  if ((low || high) && (!low || validDay(low)) && (!high || validDay(high)) && !(low && high && low > high)) {
    let from: string | null = null, to: string | null = null;
    if (validDay(profile.graduationDate)) from = to = profile.graduationDate;
    else if (!profile.graduationDate && profile.graduationMonth && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(profile.graduationMonth)) {
      from = `${profile.graduationMonth}-01`;
      const [year, month] = profile.graduationMonth.split('-').map(Number);
      to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    }
    if (!from || !to) graduation = result('graduation', 'unknown', 'Add a valid graduation date to check this source window.', timingEvidence);
    else if (low && to < low || high && from > high) graduation = result('graduation', 'conflict', 'Your graduation date is outside the stated required window.', timingEvidence);
    else if ((!low || from >= low) && (!high || to <= high)) graduation = result('graduation', 'pass', 'Your graduation date falls within the stated window.', timingEvidence);
    else graduation = result('graduation', 'unknown', 'Your graduation month overlaps the window; the exact graduation date is needed.', timingEvidence);
  }
  let start = result('start', 'unknown', 'A required start-date window was not verified.', timingEvidence);
  const earliest = job.timing.earliestStart, latest = job.timing.latestStart;
  if ((earliest || latest) && (!earliest || validDay(earliest)) && (!latest || validDay(latest)) && !(earliest && latest && earliest > latest)) {
    if (!validDay(profile.earliestStart)) start = result('start', 'unknown', 'Add your earliest available start date.', timingEvidence);
    else if (latest && profile.earliestStart > latest) start = result('start', 'conflict', 'You become available after the latest stated start date.', timingEvidence);
    else if (earliest && profile.earliestStart > earliest) start = result('start', 'unknown', 'Availability overlaps an imprecise start window; confirm the actual start date.', timingEvidence);
    else start = result('start', 'pass', 'You are available by the stated start window.', timingEvidence);
  }
  const degrees = facts?.degrees.filter(fact => fact.strength === 'required') || [];
  const degreeEvidence = facts?.degrees.map(fact => fact.evidence) || [];
  const ranks: Record<EducationLevel, number> = { bachelors: 0, masters: 1, doctorate: 2 };
  const coupled = (fact: DegreeRequirement) => fact.levels.length > 1 && /\b(?:or|either)\b/i.test(fact.evidence) && (fact.evidence.match(/\bin\s+/gi)?.length || 0) > 1;
  const degreeLevel = combine('degreeLevel', degrees.map(fact => {
    if (!profile.educationLevel || !fact.levels.length) return { status: 'unknown' as const, reason: 'The required degree level or your education level is unknown.' };
    if (coupled(fact)) return { status: 'unknown' as const, reason: 'Degree/field alternatives need review as complete qualification paths.' };
    if (fact.levels.includes(profile.educationLevel)) return { status: 'pass' as const, reason: 'Your stated education level is explicitly listed.' };
    if (fact.allowsEquivalentExperience) return { status: 'unknown' as const, reason: 'An equivalent-experience alternative needs individual review.' };
    if (fact.levels.every(level => ranks[level] > ranks[profile.educationLevel!])) return { status: 'conflict' as const, reason: 'The stated required degree level exceeds your profile.' };
    return { status: 'unknown' as const, reason: 'A higher level alone does not verify the particular degree requested.' };
  }), degreeEvidence);
  const degreeField = combine('degreeField', degrees.map(fact => {
    if (!profile.degreeField || !fact.fields.length) return { status: 'unknown' as const, reason: 'A specific required degree field or your field is unknown.' };
    if (coupled(fact)) return { status: 'unknown' as const, reason: 'Degree/field alternatives need review as complete qualification paths.' };
    if (fact.fields.some(field => normalized(field) === normalized(profile.degreeField!))) return { status: 'pass' as const, reason: 'Your stated degree field is explicitly listed.' };
    if (fact.allowsRelatedFields || fact.allowsEquivalentExperience) return { status: 'unknown' as const, reason: 'Related-field or equivalent-experience acceptance needs employer confirmation.' };
    return { status: 'conflict' as const, reason: 'Your stated degree field is not in the explicit required list.' };
  }), degreeEvidence);
  const requiredGpa = facts?.gpa.filter(fact => fact.strength === 'required') || [];
  const gpa = combine('gpa', requiredGpa.map(fact => {
    if (profile.gpa === null || profile.gpa === undefined || !Number.isFinite(profile.gpa) || profile.gpa < 0) return { status: 'unknown' as const, reason: 'Your GPA is not supplied.' };
    if (!profile.gpaScale || !fact.value.scale || profile.gpaScale !== fact.value.scale || profile.gpa > profile.gpaScale) return { status: 'unknown' as const, reason: 'Matching, explicit GPA scales are needed; no conversion is assumed.' };
    return profile.gpa < fact.value.minimum ? { status: 'conflict' as const, reason: 'Your GPA is below the explicit required minimum on the same scale.' } : { status: 'pass' as const, reason: 'Your GPA meets the explicit minimum on the same scale.' };
  }), facts?.gpa.map(fact => fact.evidence) || []);
  const authorization = combine('workAuthorization', (facts?.workAuthorization.filter(fact => fact.strength === 'required') || []).map(fact => {
    if (fact.value !== 'us-authorization') return { status: 'unknown' as const, reason: 'Work authorization does not establish citizenship or permanent residency.' };
    if (profile.workAuthorization === 'authorized') return { status: 'pass' as const, reason: 'Your stated US work authorization matches this requirement.' };
    return { status: 'unknown' as const, reason: 'Current US work authorization needs confirmation; sponsorship need alone does not establish it.' };
  }), facts?.workAuthorization.map(fact => fact.evidence) || []);
  const sponsorFacts = facts?.sponsorship.filter(fact => fact.strength === 'required') || [];
  let sponsorship = result('sponsorship', 'unknown', 'Employer sponsorship availability was not explicitly verified.', facts?.sponsorship.map(fact => fact.evidence) || []);
  const sponsorValues = new Set(sponsorFacts.map(fact => fact.value));
  if (sponsorValues.size === 1) {
    const needs = profile.requiresSponsorshipNowOrFuture === true || profile.workAuthorization === 'needs-sponsorship';
    if (sponsorValues.has('unavailable') && needs) sponsorship = result('sponsorship', 'conflict', 'You need sponsorship and the employer explicitly says it is unavailable.', sponsorship.evidence);
    else if (profile.requiresSponsorshipNowOrFuture === false) sponsorship = result('sponsorship', 'pass', 'You explicitly stated that you do not require employer sponsorship.', sponsorship.evidence);
    else if (sponsorValues.has('available') && needs) sponsorship = result('sponsorship', 'pass', 'The employer explicitly offers sponsorship; confirm individual program conditions.', sponsorship.evidence);
    else sponsorship = result('sponsorship', 'unknown', 'Current authorization alone does not establish whether you need sponsorship now or later.', sponsorship.evidence);
  } else if (sponsorValues.size > 1) sponsorship = result('sponsorship', 'unknown', 'The source has conflicting sponsorship statements; review the original.', sponsorship.evidence);
  return [graduation, start, degreeLevel, degreeField, gpa, authorization, sponsorship];
}
