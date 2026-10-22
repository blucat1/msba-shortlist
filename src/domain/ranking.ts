import { dateOnlyInTimezone, freshness } from './dates';
import { assessEligibility, type EligibilityAssessment } from './eligibility';
import { canonicalSkill } from './skills';
import { assessExperience, isLeadershipTitle, matchesExperienceView, type ExperienceView } from './experience';
import { ROLE_LABELS, type Job, type Preferences } from './types';

export interface MatchReason { code: string; text: string; evidence: string | null; dimension: string; }
export interface RankedJob { job: Job; score: number; coverage: number; label: 'Preference overlap' | 'Worth reviewing' | 'Experience stretch' | 'Check details' | 'Known conflict'; eligibility: EligibilityAssessment[]; conflicts: string[]; reasons: MatchReason[]; caveats: string[]; missing: string[]; }
const normalize = (text: string) => text.trim().toLowerCase();
export function rankJob(job: Job, preferences: Preferences, now = new Date()): RankedJob {
  const experienceAssessment = assessExperience(job);
  const eligibility = assessEligibility(preferences, job);
  const conflicts = eligibility.filter(item => item.status === 'conflict').map(item => item.reason);
  if (job.sourceReview) conflicts.push(job.sourceReview.reason);
  if (job.timing.deadlineVerified && job.timing.deadline && job.timing.deadline < dateOnlyInTimezone(now, preferences.timezone)) conflicts.push('The source application deadline has passed; confirm any extension with the employer.');
  let total = 0, weighted = 0, known = 0, stretch = false;
  const reasons: MatchReason[] = [], caveats: string[] = [], missing: string[] = [];
  const dimension = (name: string, weight: number, value: number, evidence: boolean, text?: string, excerpt?: string | null) => {
    total += weight; weighted += weight * value; if (evidence) known += weight; else missing.push(name);
    if (text) reasons.push({ code: `${name.replaceAll(' ', '_')}_${value >= .8 ? 'match' : value >= .5 ? 'partial' : 'mismatch'}`, text, evidence: excerpt ?? null, dimension: name });
  };
  if (preferences.roleFamilies.length) {
    const matches = job.roleFamilies.filter(f => preferences.roleFamilies.includes(f));
    const primaryMatch = matches.find(f => preferences.primaryRoleFamilies.includes(f));
    const interestValue = !job.roleFamilies.length ? .5 : !matches.length ? .2 : preferences.primaryRoleFamilies.length && !primaryMatch ? .85 : 1;
    dimension('role interest', 25, interestValue, job.roleFamilies.length > 0, matches.length ? `${ROLE_LABELS[primaryMatch ?? matches[0]]} matches your ${primaryMatch ? 'primary ' : ''}interests` : undefined);
    if (job.roleFamilies.length && !matches.length) caveats.push('Outside your selected role interests.');
  }
  if (preferences.locations.length || preferences.workArrangements.length) {
    const values: { score: number; known: boolean }[] = [];
    if (preferences.locations.length) {
      const has = job.locations.length > 0;
      const match = job.locations.some(l => preferences.locations.some(p => normalize(l.label).includes(normalize(p)) || normalize(p).includes(normalize(l.city ?? l.label))));
      values.push({ score: !has ? .5 : match ? 1 : .2, known: has });
      if (match) reasons.push({ code: 'location_match', text: 'Location matches your preferences', evidence: job.locations.map(l => l.label).join('; '), dimension: 'location & work' });
      else if (has) caveats.push('Location differs from your preferences.');
    }
    if (preferences.workArrangements.length) {
      const has = job.workArrangement !== 'unknown', match = preferences.workArrangements.some(w => w === job.workArrangement);
      values.push({ score: !has ? .5 : match ? 1 : .2, known: has });
      if (match) reasons.push({ code: 'work_match', text: `${job.workArrangement[0].toUpperCase()}${job.workArrangement.slice(1)} matches your preference`, evidence: job.workArrangement, dimension: 'location & work' });
      else if (has) caveats.push('Work arrangement differs from your preferences.');
    }
    dimension('location & work', 20, values.reduce((s, x) => s + x.score, 0) / values.length, values.every(x => x.known));
  }
  if (preferences.skills.length) {
    const skills = new Set(preferences.skills.map(canonicalSkill));
    const matched = job.requiredSkills.filter(s => skills.has(canonicalSkill(s)));
    dimension('required skills', 20, job.requiredSkills.length ? .5 + .5 * matched.length / job.requiredSkills.length : .5, job.requiredSkills.length > 0,
      matched.length ? `You listed ${matched.slice(0, 3).join(', ')}` : undefined, job.requiredSkills.join(', '));
    const remaining = job.requiredSkills.filter(s => !skills.has(canonicalSkill(s)));
    if (remaining.length) caveats.push(`Required skills to review: ${remaining.join(', ')}. Your skills list may be incomplete.`);
    const optional = job.preferredSkills.filter(s => skills.has(canonicalSkill(s)));
    if (optional.length) reasons.push({ code: 'preferred_skills', text: `Optional skill overlap: ${optional.join(', ')}`, evidence: job.preferredSkills.join(', '), dimension: 'preferred skills' });
  }
  if (preferences.yearsExperience !== null) {
    const years = experienceAssessment.requiredYears, has = years !== null;
    const difference = has ? Math.max(0, years - preferences.yearsExperience) : 0; stretch = difference > 0;
    dimension('experience', 15, !has ? .5 : difference ? Math.max(.1, 1 - difference * .3) : 1, has,
      has ? difference ? `Experience stretch: asks ${years} years; you listed ${preferences.yearsExperience} (${difference} more)` : 'Experience requirement aligns with what you listed' : undefined, job.experience.evidence);
    if (job.experience.alternatives.length) caveats.push(`Education/experience alternatives: ${job.experience.alternatives.join('; ')}`);
  }
  if (preferences.desiredSalary !== null) {
    const bands = job.salary.filter(s => s.currency === preferences.salaryCurrency && s.period === 'year' && s.compensationType === 'base');
    let score = .5, evidence = false;
    if (bands.length) {
      const scores = bands.map(b => b.min !== null && b.min >= preferences.desiredSalary! ? 1 : b.max !== null && b.max >= preferences.desiredSalary! ? .65 : b.max !== null ? .2 : .5);
      score = scores.reduce((s, v) => s + v, 0) / scores.length; evidence = bands.some(b => b.min !== null || b.max !== null);
      if (bands.length > 1 || bands.some(b => b.location)) caveats.push('Compensation has location-specific bands; verify which applies.');
    }
    dimension('compensation', 10, score, evidence, evidence ? score >= .95 ? 'Published base minimum meets your target' : score >= .6 ? 'Published base range overlaps your target; offer is not guaranteed' : undefined : undefined, bands.map(b => b.sourceText).join('; '));
    if (evidence && score < .5) caveats.push('Published annual base range is below your target.');
  }
  const timing = eligibility.filter(item => item.criterion === 'graduation' || item.criterion === 'start');
  if (timing.some(item => item.status === 'conflict')) caveats.push('Known graduation or start timing conflicts with your preferences.');
  for (const item of timing.filter(item => item.status === 'pass')) reasons.push({ code: `eligibility_${item.criterion}`, dimension: 'eligibility', text: item.reason, evidence: item.evidence.join('; ') || null });
  caveats.push(...conflicts);
  const score = total ? Math.round(weighted / total * 100) : 50;
  const coverage = total ? Math.round(known / total * 100) : 0;
  if (freshness(job.lastVerifiedAt, now) !== 'fresh') caveats.push('Source verification is stale; check the employer page.');
  if (job.availability !== 'open') caveats.push(job.availability === 'closed' ? 'Employer listing is closed.' : 'Availability needs confirmation.');
  if (job.classification.scope === 'needs-details') caveats.push('US location or full-time employment needs verification.');
  if (experienceAssessment.tier === 'unverified' || experienceAssessment.requiredYears === null) caveats.push(experienceAssessment.label);
  if (job.experience.preferredYears !== null) caveats.push(`${job.experience.preferredYears} years preferred by the employer; this is not treated as a required minimum.`);
  if (experienceAssessment.tier === 'experienced') caveats.push('This experienced role is outside the default graduate shortlist.');
  const experienced = experienceAssessment.tier === 'experienced';
  const label = conflicts.length ? 'Known conflict' : experienced ? 'Experience stretch' : experienceAssessment.requiredYears === null || experienceAssessment.tier === 'unverified' || job.classification.scope === 'needs-details' || coverage < 30 ? 'Check details' : stretch ? 'Experience stretch' : score >= 80 && coverage >= 60 ? 'Preference overlap' : 'Worth reviewing';
  return { job, score, coverage, label, eligibility, conflicts, reasons, caveats, missing };
}
export interface RankOptions { now?: Date; trackedJobIds?: string[]; dismissedJobIds?: string[]; includeTracked?: boolean; includeNeedsDetails?: boolean; includeStale?: boolean; includeEligibilityConflicts?: boolean; experienceView?: ExperienceView; }
export function rankJobs(jobs: Job[], preferences: Preferences, options: RankOptions = {}): RankedJob[] {
  const now = options.now ?? new Date(), hidden = new Set(options.includeTracked ? [] : [...options.trackedJobIds ?? [], ...options.dismissedJobIds ?? []]);
  const view = options.experienceView ?? 'new-grad';
  return jobs.filter(j => !hidden.has(j.id) && j.classification.scope !== 'excluded' && j.classification.seniority !== 'leadership' && !isLeadershipTitle(j.title) && j.availability !== 'closed' && !(j.publisher?.kind === 'aggregator' && j.availability === 'availability_unconfirmed')
    && matchesExperienceView(assessExperience(j), view) && (options.includeNeedsDetails || j.classification.scope !== 'needs-details')
    && (options.includeStale || freshness(j.lastVerifiedAt, now) !== 'expired')).map(job => rankJob(job, preferences, now)).filter(row => options.includeEligibilityConflicts || row.conflicts.length === 0)
    .sort((a, b) => a.conflicts.length - b.conflicts.length || b.score - a.score || b.coverage - a.coverage || Number(b.job.availability === 'open') - Number(a.job.availability === 'open') || b.job.firstSeenAt.localeCompare(a.job.firstSeenAt) || a.job.id.localeCompare(b.job.id));
}
