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
  const checks = assessEligibility(profile, job);
  const unknowns = checks.filter(check => check.status === 'unknown').length;
  const conflicts = checks.filter(check => check.status === 'conflict');
  const matched = checks.filter(check => check.status === 'pass').length;
  const sourceLink = job.sourceReview && safeUrl(job.sourceReview.evidenceUrl);
  const heading = conflicts.length || job.sourceReview ? 'Known requirements conflict' : unknowns ? 'Requirements need checking' : 'Recorded checks match';
  const countSummary = [
    conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}` : null,
    unknowns ? `${unknowns} unknown` : null,
    matched ? `${matched} match${matched === 1 ? '' : 'es'}` : null,
  ].filter(Boolean).join(' · ');
  const rows = <ul className="eligibility-checks">{checks.map(check => <li key={check.criterion} className={`eligibility-check ${check.status}`}>
    <div><strong>{labels[check.criterion]}</strong><span>{statusLabels[check.status]}</span></div>
    <p>{check.reason}</p>
    {!!check.evidence.length && <details className="eligibility-source-details"><summary>Source evidence for {labels[check.criterion].toLowerCase()}</summary><blockquote>{[...new Set(check.evidence)].map((excerpt, index) => <p key={index}>{excerpt}</p>)}</blockquote></details>}
  </li>)}</ul>;
  const conflictSummary = !!conflicts.length && <ul className="eligibility-conflict-list">{conflicts.map(check => <li key={check.criterion}><strong>{labels[check.criterion]}:</strong> {check.reason}</li>)}</ul>;
  const sourceSummary = job.sourceReview?.reason.split(/(?<=[.!?])\s+(?=[A-Z])/)[0];

  return <section className={`eligibility-evidence ${full ? 'eligibility-full' : 'eligibility-compact'} ${conflicts.length || job.sourceReview ? 'has-conflict' : ''}`} aria-label="Requirements evidence">
    {full ? <>
      <h3>Requirements & your profile</h3>
      <p className="eligibility-summary"><strong>{heading}.</strong> {countSummary}. These checks do not confirm overall eligibility.</p>
      {conflictSummary}
      <details className="eligibility-check-details"><summary>Compare all {checks.length} requirements</summary>{rows}</details>
      <dl className="eligibility-timing">
        <div><dt>Source graduation window</dt><dd>{dateRange(job.timing.graduationStart, job.timing.graduationEnd)}</dd></div>
        <div><dt>Source start window</dt><dd>{dateRange(job.timing.earliestStart, job.timing.latestStart)}</dd></div>
        <div><dt>Source application deadline</dt><dd>{job.timing.deadlineVerified && job.timing.deadline ? calendarDate(job.timing.deadline) : 'No exact deadline verified'}</dd></div>
      </dl>
      {!!job.timing.evidence.length && <details className="eligibility-source-details"><summary>Original timing evidence</summary>{job.timing.evidence.map((excerpt, index) => <blockquote key={index}>{excerpt}</blockquote>)}</details>}
      <p className="hint">Month-only dates show calendar bounds. Preferred criteria are not hard conflicts. Check the original posting for other requirements and deadline times.</p>
    </> : <>
      {conflictSummary}
      <details><summary><strong>{heading}</strong><span>{countSummary}</span></summary><p className="eligibility-summary">Unknown means unverified. Preference overlap does not confirm eligibility.</p>{rows}</details>
    </>}
    {job.sourceReview && <aside className="eligibility-source-conflict">
      <strong>Employer source conflict</strong>
      <p>{full ? job.sourceReview.reason : sourceSummary}</p>
      {!full && sourceSummary !== job.sourceReview.reason && <details className="eligibility-source-details"><summary>Read the full source comparison</summary><p>{job.sourceReview.reason}</p></details>}
      <small>Employer evidence reviewed {calendarDate(job.sourceReview.checkedAt.slice(0, 10))}; confirm the current posting.</small>
      {sourceLink && <a href={sourceLink} target="_blank" rel="noopener noreferrer" aria-label="Review employer evidence (opens in a new tab)">Review employer evidence ↗</a>}
    </aside>}
  </section>;
}
