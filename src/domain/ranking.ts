import { freshness } from './dates';
import { canonicalSkill } from './skills';
import { ROLE_LABELS, type Job, type Preferences } from './types';

export interface MatchReason { code: string; text: string; evidence: string | null; dimension: string; }
export interface RankedJob { job: Job; score: number; coverage: number; label: 'Strong alignment' | 'Worth reviewing' | 'Experience stretch' | 'Check details'; reasons: MatchReason[]; caveats: string[]; missing: string[]; }
const normalize = (text: string) => text.trim().toLowerCase();
export function rankJob(job: Job, preferences: Preferences, now = new Date()): RankedJob {
  let total = 0, weighted = 0, known = 0, stretch = false, timingMismatch = false;
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
    const years = job.experience.minYears, has = years !== null;
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
  if (preferences.graduationMonth || preferences.earliestStart) {
    const checks: boolean[] = [];
    if (preferences.graduationMonth && (job.timing.graduationStart || job.timing.graduationEnd)) {
      checks.push((!job.timing.graduationStart || preferences.graduationMonth >= job.timing.graduationStart.slice(0, 7)) && (!job.timing.graduationEnd || preferences.graduationMonth <= job.timing.graduationEnd.slice(0, 7)));
    }
    if (preferences.earliestStart && job.timing.latestStart) checks.push(preferences.earliestStart <= job.timing.latestStart);
    timingMismatch = checks.includes(false);
    dimension('timing', 10, checks.length ? timingMismatch ? .1 : 1 : .5, checks.length > 0, checks.length && !timingMismatch ? 'Known graduation/start timing aligns' : undefined, job.timing.evidence.join('; '));
    if (timingMismatch) caveats.push('Known graduation or start timing conflicts with your preferences.');
  }
  const score = total ? Math.round(weighted / total * 100) : 50;
  const coverage = total ? Math.round(known / total * 100) : 0;
  if (freshness(job.lastVerifiedAt, now) !== 'fresh') caveats.push('Source verification is stale; check the employer page.');
  if (job.availability !== 'open') caveats.push(job.availability === 'closed' ? 'Employer listing is closed.' : 'Availability needs confirmation.');
  if (job.classification.scope === 'needs-details') caveats.push('US location or full-time employment needs verification.');
  const label = job.classification.scope === 'needs-details' || coverage < 30 ? 'Check details' : stretch ? 'Experience stretch' : score >= 80 && coverage >= 60 && !timingMismatch ? 'Strong alignment' : 'Worth reviewing';
  return { job, score, coverage, label, reasons, caveats, missing };
}
export interface RankOptions { now?: Date; trackedJobIds?: string[]; dismissedJobIds?: string[]; includeTracked?: boolean; includeLargerStretches?: boolean; includeNeedsDetails?: boolean; includeStale?: boolean; }
export function rankJobs(jobs: Job[], preferences: Preferences, options: RankOptions = {}): RankedJob[] {
  const now = options.now ?? new Date(), hidden = new Set(options.includeTracked ? [] : [...options.trackedJobIds ?? [], ...options.dismissedJobIds ?? []]);
  return jobs.filter(j => !hidden.has(j.id) && j.classification.scope !== 'excluded' && j.classification.seniority !== 'leadership' && j.availability !== 'closed'
    && (options.includeLargerStretches || j.classification.seniority !== 'senior') && (options.includeNeedsDetails || j.classification.scope !== 'needs-details')
    && (options.includeStale || freshness(j.lastVerifiedAt, now) !== 'expired')).map(job => rankJob(job, preferences, now))
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage || Number(b.job.availability === 'open') - Number(a.job.availability === 'open') || b.job.firstSeenAt.localeCompare(a.job.firstSeenAt) || a.job.id.localeCompare(b.job.id));
}
