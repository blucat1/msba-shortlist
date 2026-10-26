import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
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

export function EligibilityEvidence({ profile, job, full = false, alignmentReasons = [], checkReasons = [], checkIntro }: { profile: EligibilityProfile; job: Job; full?: boolean; alignmentReasons?: string[]; checkReasons?: string[]; checkIntro?: ReactNode }) {
  const checks = assessEligibility(profile, job);
  const unknowns = checks.filter(check => check.status === 'unknown').length;
  const conflicts = checks.filter(check => check.status === 'conflict');
  const aligned = checks.filter(check => check.status === 'pass');
  const matched = aligned.length;
  const unique = (values: string[]) => [...new Map(values.map(value => value.trim()).filter(Boolean).map(value => [value.normalize('NFKC').toLowerCase(), value])).values()];
  const positiveReasons = unique([...alignmentReasons, ...aligned.map(check => `${labels[check.criterion]}: ${check.reason}`)]).slice(0, 3);
  const watchouts = unique(checkReasons);
  const sourceLink = job.sourceReview && safeUrl(job.sourceReview.evidenceUrl);
  const countSummary = [
    matched ? `${matched} match${matched === 1 ? '' : 'es'}` : null,
    conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}` : null,
    unknowns ? `${unknowns} unknown` : null,
  ].filter(Boolean).join(' · ');
  const checkSummary = [
    conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}` : null,
    unknowns ? `${unknowns} unknown` : null,
  ].filter(Boolean).join(' · ');
  const order = { pass: 0, conflict: 1, unknown: 2 };
  const rows = <ul className="eligibility-checks">{[...checks].sort((a, b) => order[a.status] - order[b.status]).map(check => <li key={check.criterion} className={`eligibility-check ${check.status}`}>
    <div><strong>{labels[check.criterion]}</strong><span>{statusLabels[check.status]}</span></div>
    <p>{check.reason}</p>
    {!!check.evidence.length && <details className="eligibility-source-details"><summary>Source evidence for {labels[check.criterion].toLowerCase()}</summary><blockquote>{[...new Set(check.evidence)].map((excerpt, index) => <p key={index}>{excerpt}</p>)}</blockquote></details>}
  </li>)}</ul>;
  const alignmentSummary = <div className="eligibility-alignment">
    <div className="eligibility-heading"><strong>What aligns</strong>{matched > 0 && <span>{matched} confirmed</span>}</div>
    {positiveReasons.length ? <ul className="recommendation-reasons">{positiveReasons.map(reason => <li key={reason}><Check size={16} aria-hidden="true" /><span>{reason}</span></li>)}</ul> : <p>Profile requirements aren’t confirmed yet.</p>}
  </div>;
  const checkContext = <>
    {checkIntro && <div className="eligibility-check-intro">{checkIntro}</div>}
    {!!watchouts.length && <p className="recommendation-watchouts">{watchouts.join(' · ')}</p>}
  </>;
  const conflictSummary = !!conflicts.length && <div className="eligibility-known-conflict"><strong>Known requirements conflict</strong><ul className="eligibility-conflict-list">{conflicts.map(check => <li key={check.criterion}><strong>{labels[check.criterion]}:</strong> {check.reason}</li>)}</ul></div>;
  const sourceSummary = job.sourceReview?.reason.split(/(?<=[.!?])\s+(?=[A-Z])/)[0];

  return <section className={`eligibility-evidence ${full ? 'eligibility-full' : 'eligibility-compact'} ${conflicts.length || job.sourceReview ? 'has-conflict' : ''}`} aria-label="Requirements evidence">
    {full ? <>
      <h3>Requirements & your profile</h3>
      {alignmentSummary}
      <p className="eligibility-summary"><strong>{checkSummary || job.sourceReview ? 'What to check.' : 'Recorded checks match.'}</strong> {countSummary}. These checks do not confirm overall eligibility.</p>
      {checkContext}
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
      {alignmentSummary}
      <details><summary><strong>{checkSummary || job.sourceReview ? 'What to check' : 'Review all requirements'}</strong><span>{checkSummary || `${matched} matches`}</span></summary><p className="eligibility-summary">Unknown means unverified. Preference overlap does not confirm eligibility.</p>{rows}</details>
      {checkContext}
      {conflictSummary}
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
