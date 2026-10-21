import type { Job } from './types';

export type ExperienceView = 'new-grad' | 'early-career' | 'experienced' | 'unverified' | 'all';
export type ExperienceTier = Exclude<ExperienceView, 'all'>;
type ExperienceJob = Pick<Job, 'title' | 'experience' | 'classification'>;
export interface ExperienceAssessment {
  tier: ExperienceTier; label: string; evidence: string | null;
  requiredYears: number | null; explicitGraduate: boolean;
}

// Job titles are independent evidence: an old or incomplete import must not
// promote a Director or Senior role because its numeric requirement is missing.
export function isLeadershipTitle(title: string): boolean {
  return /\b(?:chief|vice[ -]president|vp|director|head of|group product manager|engineering manager|manager,? (?:data engineering|analytics engineering|machine learning|data science|business intelligence|analytics)|(?:data science|business intelligence|data engineering|analytics engineering|machine learning|analytics) manager)\b/i.test(title)
    || /^(?:(?:senior|sr\.?|associate)\s+)?manager\b/i.test(title);
}
const seniorTitle = (title: string) => /\b(?:principal|staff|senior|sr\.?|lead(?![ -]+(?:generation|gen)\b))\b/i.test(title);
export const explicitGraduateTitle = (title: string): boolean => /\b(?:new[ -]grad(?:uate)?s?|(?:recent|university|college)[ -]graduates?|entry[ -]level|graduate (?:analyst|engineer|data|product|consultant|quantitative|researcher|program|programme|scheme))\b/i.test(title);

export function assessExperience(job: ExperienceJob): ExperienceAssessment {
  const { minYears, alternatives, evidence } = job.experience;
  const positive = job.classification.reasons.find(r => ['experience.entry_level_explicit', 'experience.no_experience_required'].includes(r.code));
  const explicitGraduate = explicitGraduateTitle(job.title) || !!positive;
  const notGraduate = job.classification.reasons.find(r => r.code === 'experience.not_new_grad');
  const uncertainRequirement = job.classification.reasons.find(r => r.code === 'experience.advanced_unspecified');
  const sourceEvidence = notGraduate?.text || uncertainRequirement?.text || evidence || positive?.text || (explicitGraduate ? job.title : null);
  const result = (tier: ExperienceTier, label: string, requiredYears = minYears): ExperienceAssessment => ({
    tier, label, requiredYears, evidence: sourceEvidence, explicitGraduate: explicitGraduate && !notGraduate,
  });
  if (isLeadershipTitle(job.title) || job.classification.seniority === 'leadership') return result('experienced', 'Leadership role');
  if (seniorTitle(job.title) || job.classification.seniority === 'senior' || (minYears !== null && minYears > 3)) {
    return result('experienced', minYears !== null ? `Experienced role · ${minYears}+ years required` : 'Experienced title · years unverified');
  }
  // A conditional education path is not an unconditional low requirement. The
  // profile does not establish which degree/experience alternative is satisfied.
  if (alternatives.length || uncertainRequirement) return result('unverified', alternatives.length ? 'Degree/experience conditions need review' : 'Experience requirement needs review', null);
  if (notGraduate) return result('early-career', 'Employer says this is not a new-grad role');
  if (minYears !== null && minYears > 1) return result('early-career', `${minYears} years required · early-career stretch`);
  if (minYears === 1) return result('new-grad', '1 year required · check your experience');
  if (minYears === 0) return result('new-grad', 'No prior experience required');
  if (explicitGraduate) return result('new-grad', 'Graduate / entry-level hiring · years not stated');
  return result('unverified', 'Required experience unverified', null);
}

export function matchesExperienceView(assessment: ExperienceAssessment, view: ExperienceView): boolean {
  if (view === 'all') return true;
  if (view === 'early-career') return assessment.tier === 'new-grad' || assessment.tier === 'early-career';
  return assessment.tier === view;
}

export const EXPERIENCE_VIEWS: { value: Exclude<ExperienceView, 'all'>; label: string; description: string }[] = [
  { value: 'new-grad', label: 'New grad & 0–1 years', description: 'Explicit graduate/entry-level hiring or 0–1 years required. A one-year requirement is labeled; missing years never count as zero.' },
  { value: 'early-career', label: 'Early career · 0–3 years', description: 'Includes roles requiring 2–3 years. These are experience stretches for graduates without that background.' },
  { value: 'experienced', label: 'Experienced · 4+ / senior', description: 'Experienced individual-contributor roles, separate from the graduate shortlist. People-leadership roles remain excluded.' },
  { value: 'unverified', label: 'Experience unverified', description: 'Missing requirements or conditional degree/experience paths. Review the employer posting; these are not verified new-grad roles.' },
];
