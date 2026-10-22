import { assessEligibility } from './eligibility';
import { assessExperience } from './experience';
import type { ResumeProfile } from './resume';
import { canonicalSkill } from './skills';
import { ROLE_LABELS, type Job } from './types';

export type CompatibilityStatus = 'matched' | 'missing' | 'unverified' | 'conflict';
export interface CompatibilityRequirement {
  id: string; label: string; status: CompatibilityStatus;
  strength: 'required' | 'preferred' | 'context'; reason: string; evidence: string[];
}
export interface CompatibilityComponent {
  id: 'requiredSkills' | 'preferredSkills' | 'role' | 'experience' | 'education';
  label: string; weight: number; maximum: number; earned: number | null;
  status: CompatibilityStatus | 'partial'; reason: string; evidence: string[];
}
export interface ResumeCompatibility {
  score: number | null; uncappedScore: number | null; scoreCap: number | null;
  scoreLabel: string; coverage: number; scoredWeight: number; possibleWeight: number;
  assessedRequirements: number; totalRequirements: number;
  breakdown: CompatibilityComponent[];
  matched: CompatibilityRequirement[]; missing: CompatibilityRequirement[];
  unverified: CompatibilityRequirement[]; conflicts: CompatibilityRequirement[];
  recommendations: string[];
}

/** Recorded evidence overlap, never an employer ATS result or hiring probability.
 * Unknown components earn no success credit and stay outside the scored weight;
 * coverage reports the unresolved requirements alongside the conditional score. */
export function compareResumeToJob(profile: ResumeProfile, job: Job): ResumeCompatibility {
  const requirements: CompatibilityRequirement[] = [], breakdown: CompatibilityComponent[] = [];
  let scoredWeight = 0, earnedWeight = 0, observedUnits = 0;
  const add = (id: string, label: string, status: CompatibilityStatus, reason: string, evidence: string[] = [], strength: CompatibilityRequirement['strength'] = 'required') => {
    const item = { id, label, status, reason, evidence, strength }; requirements.push(item); return item;
  };
  const component = (id: CompatibilityComponent['id'], label: string, weight: number, value: number | null, status: CompatibilityComponent['status'], reason: string, evidence: string[] = []) => {
    const earned = value === null ? null : weight * value;
    breakdown.push({ id, label, weight, maximum: weight, earned, status, reason, evidence });
    if (earned !== null) { scoredWeight += weight; earnedWeight += earned; }
  };
  const unique = (values: string[]) => [...new Set(values.map(canonicalSkill).filter(Boolean))];
  const skills = new Set(unique(profile.skills));
  const required = unique(job.requiredSkills), preferred = unique(job.preferredSkills).filter(skill => !required.includes(skill));
  for (const [id, label, weight, items, strength] of [
    ['requiredSkills', 'Recorded required skills', 45, required, 'required'],
    ['preferredSkills', 'Recorded preferred skills', 15, preferred, 'preferred'],
  ] as const) {
    if (!items.length || !skills.size) {
      const reason = !items.length ? 'The source did not verify a skill list for this category; no match is assumed.' : 'Review and confirm your skills before comparing this category.';
      add(id, label, 'unverified', reason, [], strength);
      component(id, label, weight, null, 'unverified', reason); continue;
    }
    let matches = 0;
    for (const skill of items) {
      const found = skills.has(skill); if (found) matches += 1;
      add(`${id}:${skill}`, skill, found ? 'matched' : 'missing', found ? 'Present in your reviewed skills. A keyword mention does not verify proficiency.' : 'Not recorded in your reviewed skills; this does not establish that you lack the skill.', [skill], strength);
    }
    observedUnits += items.length;
    component(id, label, weight, matches / items.length, matches === items.length ? 'matched' : matches ? 'partial' : 'missing', `${matches} of ${items.length} recorded skills overlap.`, items);
  }
  const interests = new Set(profile.roleInterests);
  const roleMatches = job.roleFamilies.filter(family => interests.has(family));
  if (interests.size && job.roleFamilies.length) {
    observedUnits += 1;
    const found = roleMatches.length > 0;
    const reason = found ? `Listing role/title classification overlaps ${roleMatches.map(family => ROLE_LABELS[family]).join(', ')}.` : 'The listing is outside your reviewed role interests; this is a preference difference, not a qualification failure.';
    add('role', 'Role interests', found ? 'matched' : 'missing', reason, [job.title], 'context');
    component('role', 'Role/title relevance', 20, found ? 1 : 0, found ? 'matched' : 'missing', reason, [job.title]);
  } else {
    const reason = 'Both a recorded listing role family and reviewed role interests are needed.';
    add('role', 'Role interests', 'unverified', reason, [job.title], 'context'); component('role', 'Role/title relevance', 20, null, 'unverified', reason, [job.title]);
  }
  const experience = assessExperience(job);
  const confirmedYears = profile.yearsExperience !== null && Number.isFinite(profile.yearsExperience) && profile.yearsExperience >= 0 && profile.yearsExperience <= 80 ? profile.yearsExperience : null;
  const minimum = experience.requiredYears;
  if (minimum !== null && Number.isFinite(minimum) && minimum >= 0 && confirmedYears !== null && !job.experience.alternatives.length) {
    observedUnits += 1;
    const pass = confirmedYears >= minimum, reason = pass ? `Your confirmed ${confirmedYears} years meets the recorded ${minimum}-year minimum. Relevance and employment type still need review.` : `Your confirmed ${confirmedYears} years is below the recorded ${minimum}-year minimum.`;
    const evidence = experience.evidence ? [experience.evidence] : [];
    add('experience', 'Required experience', pass ? 'matched' : 'conflict', reason, evidence);
    component('experience', 'Confirmed experience', 15, pass ? 1 : 0, pass ? 'matched' : 'conflict', reason, evidence);
  } else {
    const reason = job.experience.alternatives.length ? 'Degree/experience alternatives need review as complete paths; a low number alone cannot verify a match.' : minimum === null ? 'An unconditional numeric experience minimum was not verified; missing years do not mean zero.' : 'Confirm relevant experience yourself; dates and coursework are not totaled automatically.';
    const evidence = [experience.evidence, ...job.experience.alternatives].filter((value): value is string => !!value);
    add('experience', 'Required experience', 'unverified', reason, evidence); component('experience', 'Confirmed experience', 15, null, 'unverified', reason, evidence);
  }
  const eligibility = assessEligibility({ educationLevel: profile.educationLevel, degreeField: profile.degreeField }, job);
  const degreeFacts = job.eligibility?.degrees.filter(fact => fact.strength === 'required') || [];
  const applicableDegrees = eligibility.filter(check => check.criterion === 'degreeLevel' && degreeFacts.some(fact => fact.levels.length) || check.criterion === 'degreeField' && degreeFacts.some(fact => fact.fields.length));
  for (const check of applicableDegrees) add(check.criterion, check.criterion === 'degreeLevel' ? 'Required education level' : 'Required degree field', check.status === 'pass' ? 'matched' : check.status === 'conflict' ? 'conflict' : 'unverified', check.reason, check.evidence);
  if (!applicableDegrees.length) add('education', 'Required education', 'unverified', 'A required degree level/field was not verified. Resume mentions do not establish a completed qualification.');
  const degreeConflict = applicableDegrees.find(check => check.status === 'conflict');
  const degreeVerified = applicableDegrees.length > 0 && applicableDegrees.every(check => check.status === 'pass');
  if (degreeConflict || degreeVerified) observedUnits += 1;
  component('education', 'Confirmed education', 5, degreeConflict ? 0 : degreeVerified ? 1 : null, degreeConflict ? 'conflict' : degreeVerified ? 'matched' : 'unverified', degreeConflict?.reason || (degreeVerified ? 'Your confirmed level/field matches the recorded requirement.' : 'Confirm education and review any degree alternatives; an in-progress degree is not assumed complete.'), degreeFacts.map(fact => fact.evidence));
  // These constraints are deliberately never inferred from a resume, including
  // citizenship, sponsorship need, GPA, graduation dates and start availability.
  for (const check of eligibility) {
    const explicit = check.criterion === 'gpa' ? job.eligibility?.gpa.some(fact => fact.strength === 'required')
      : check.criterion === 'workAuthorization' ? job.eligibility?.workAuthorization.some(fact => fact.strength === 'required')
      : check.criterion === 'sponsorship' ? job.eligibility?.sponsorship.some(fact => fact.strength === 'required')
      : check.criterion === 'graduation' ? !!(job.timing.graduationStart || job.timing.graduationEnd)
      : check.criterion === 'start' ? !!(job.timing.earliestStart || job.timing.latestStart) : false;
    if (explicit) add(check.criterion, check.criterion === 'workAuthorization' ? 'Work authorization' : check.criterion === 'gpa' ? 'GPA' : check.criterion === 'start' ? 'Start availability' : check.criterion === 'graduation' ? 'Graduation window' : 'Sponsorship', 'unverified', 'This recorded requirement needs separate confirmation; it is not inferred from your resume.', check.evidence);
  }
  if (job.sourceReview) add('employer-source', 'Employer source conflict', 'conflict', job.sourceReview.reason, [job.sourceReview.evidenceUrl]);
  const matched = requirements.filter(item => item.status === 'matched'), missing = requirements.filter(item => item.status === 'missing');
  const unverified = requirements.filter(item => item.status === 'unverified'), conflicts = requirements.filter(item => item.status === 'conflict');
  const assessedRequirements = matched.length + missing.length + conflicts.length, totalRequirements = requirements.length;
  const coverage = Math.round(scoredWeight);
  const uncappedScore = scoredWeight >= 35 && observedUnits >= 2 ? Math.round(earnedWeight / scoredWeight * 100) : null;
  const scoreCap = conflicts.length ? 49 : null;
  const score = uncappedScore === null ? null : scoreCap === null ? uncappedScore : Math.min(scoreCap, uncappedScore);
  const scoreLabel = conflicts.length ? 'Known requirement conflict' : score === null ? 'Insufficient evidence to score' : score >= 80 ? coverage < 70 ? 'High overlap · limited evidence' : 'High recorded overlap' : score >= 50 ? 'Partial recorded overlap' : 'Limited recorded overlap';
  const recommendations = [
    ...(conflicts.length ? ['Review the known requirement conflicts before prioritizing this listing. The displayed score is capped at 49 while a conflict remains.'] : []),
    ...(missing.some(item => item.strength === 'required') ? ['If accurate, add concrete project or work evidence for required skills absent from the reviewed profile. Do not add unsupported keywords.'] : []),
    ...(unverified.length ? ['Check unverified requirements on the employer posting. Unknown details do not establish a match.'] : []),
    ...(profile.yearsExperience === null ? ['Confirm relevant experience; coursework and overlapping dates do not establish employment years.'] : []),
    'This is deterministic overlap with recorded listing information, not an employer ATS score or hiring probability.',
  ];
  return { score, uncappedScore, scoreCap, scoreLabel, coverage, scoredWeight, possibleWeight: 100, assessedRequirements, totalRequirements, breakdown, matched, missing, unverified, conflicts, recommendations };
}
