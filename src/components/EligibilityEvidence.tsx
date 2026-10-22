import { assessEligibility, type EligibilityCriterion, type EligibilityProfile } from '../domain/eligibility';
import type { Job } from '../domain/types';
import { safeUrl } from './ui';

const labels: Record<EligibilityCriterion, string> = { graduation: 'Graduation', start: 'Start date', degreeLevel: 'Degree level', degreeField: 'Degree field', gpa: 'GPA', workAuthorization: 'Work authorization', sponsorship: 'Sponsorship' };
const statusLabels = { pass: 'Matches stated constraint', conflict: 'Known conflict', unknown: 'Needs checking' };
function calendarDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function dateRange(low: string | null, high: string | null): string {
  if (low && high) return low === high ? calendarDate(low) : `${calendarDate(low)} – ${calendarDate(high)}`;
  return low ? `On or after ${calendarDate(low)}` : high ? `On or before ${calendarDate(high)}` : 'No required date verified';
}

export function EligibilityEvidence({ profile, job, full = false }: { profile: EligibilityProfile; job: Job; full?: boolean }) {
  const checks = assessEligibility(profile, job), unknowns = checks.filter(check => check.status === 'unknown').length;
  const conflicts = checks.filter(check => check.status === 'conflict');
  const sourceLink = job.sourceReview && safeUrl(job.sourceReview.evidenceUrl);
  const heading = conflicts.length || job.sourceReview ? 'Known requirements conflict' : unknowns ? 'Requirements need checking' : 'Recorded constraints match';
  const rows = <ul className="eligibility-checks">{checks.map(check => <li key={check.criterion} className={`eligibility-check ${check.status}`}><div><strong>{labels[check.criterion]}</strong><span>{statusLabels[check.status]}</span></div><p>{check.reason}</p>{!!check.evidence.length && <blockquote>{[...new Set(check.evidence)].map((excerpt, index) => <p key={index}>{full ? excerpt : excerpt.slice(0, 280) + (excerpt.length > 280 ? '…' : '')}</p>)}</blockquote>}</li>)}</ul>;
  return <section className={`eligibility-evidence ${full ? 'eligibility-full' : 'eligibility-compact'} ${conflicts.length || job.sourceReview ? 'has-conflict' : ''}`} aria-label="Requirements evidence">
    {full ? <><h3>Requirements & your profile</h3><p className="eligibility-summary">{heading}. {unknowns > 0 ? `${unknowns} of ${checks.length} checks remain unknown.` : 'These checks do not confirm overall eligibility.'}</p>{rows}<dl className="eligibility-timing"><div><dt>Source graduation window</dt><dd>{dateRange(job.timing.graduationStart, job.timing.graduationEnd)}</dd></div><div><dt>Source start window</dt><dd>{dateRange(job.timing.earliestStart, job.timing.latestStart)}</dd></div><div><dt>Source application deadline</dt><dd>{job.timing.deadlineVerified && job.timing.deadline ? calendarDate(job.timing.deadline) : 'No exact deadline verified'}</dd></div></dl>{!!job.timing.evidence.length && <details><summary>Original timing evidence</summary>{job.timing.evidence.map((excerpt, index) => <blockquote key={index}>{excerpt}</blockquote>)}</details>}<p className="hint">Month-only dates use calendar bounds, not an assumed event day. Preferred criteria are not hard conflicts. Check the original posting for other requirements and deadline times.</p></> : <details><summary><strong>{heading}</strong><span>{unknowns} unknown{conflicts.length ? ` · ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}` : ''}</span></summary><p className="eligibility-summary">Unknown means unverified, even when preference overlap is high.</p>{rows}</details>}
    {job.sourceReview && <aside className="eligibility-source-conflict"><strong>Employer source conflict</strong><p>{job.sourceReview.reason}</p><small>Employer evidence reviewed {calendarDate(job.sourceReview.checkedAt.slice(0, 10))}; confirm the current posting.</small>{sourceLink && <a href={sourceLink} target="_blank" rel="noopener noreferrer">Review employer evidence ↗</a>}</aside>}
  </section>;
}
