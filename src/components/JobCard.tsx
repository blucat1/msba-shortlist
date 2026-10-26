import { ArrowRight, ArrowUpRight, Banknote, Bookmark, Check, Clock3, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import { CompanyMark, formatDate } from './ui';
import { assessExperience } from '../domain/experience';
import { freshness } from '../domain/dates';
import type { RankedJob } from '../domain/ranking';
import type { compareResumeToJob } from '../domain/resume-matching';
import type { Job, Preferences } from '../domain/types';
import { ROLE_LABELS } from '../domain/types';
import { formatCompensation } from '../lib/compensation';
import { EligibilityEvidence } from './EligibilityEvidence';
import { SourceAttribution } from './SourceAttribution';
import { ResumeCompatibility } from './ResumeCompatibility';
import { recommendationHighlights } from '../domain/recommendations';

export function profileDate(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
export function cardLocations(job: Job) {
  const labels = [...new Set(job.locations.flatMap(location => location.label.split(/\s*;\s*/)).map(label => label.trim()).filter(Boolean))];
  const first = labels[0] || 'Location unknown';
  return { labels, preview: first.length > 80 ? `${first.slice(0, 80).trimEnd()}…` : first, hasMore: labels.length > 1 || first.length > 80 };
}
export function JobCard({ result, profile, resumeMatch, saved, dismissed, onSave, onDismiss, onView, onApply, recommendationRank }: { result: RankedJob; profile: Preferences; resumeMatch?: ReturnType<typeof compareResumeToJob>; saved: boolean; dismissed: boolean; onSave: () => void | Promise<void>; onDismiss: () => void | Promise<void>; onView: () => void; onApply: () => void; recommendationRank?: number }) {
  const { job, label, reasons, caveats } = result;
  const mutation = useRef(false);
  const [pending, setPending] = useState<'save' | 'dismiss' | null>(null);
  async function act(action: 'save' | 'dismiss') {
    if (mutation.current || (action === 'save' && saved)) return;
    mutation.current = true; setPending(action);
    try { await (action === 'save' ? onSave() : onDismiss()); }
    finally { mutation.current = false; setPending(null); }
  }
  const stale = freshness(job.lastVerifiedAt) !== 'fresh';
  const experience = assessExperience(job);
  const locations = cardLocations(job);
  const pay = formatCompensation(job.salary);
  const sourceUnknowns = [job.employmentType === 'unknown' ? 'Full-time status unverified' : null, !job.locations.some(location => location.country === 'US') ? 'US location unverified' : null, job.availability === 'availability_unconfirmed' ? 'Availability unconfirmed' : job.availability === 'closed' ? 'Listing closed' : null].filter(Boolean);

  const highlights = recommendationHighlights(result, resumeMatch);
  const actions = <div className="job-bottom">
      <span className={`freshness-note ${stale ? 'warning-text' : ''}`}><span className={stale ? 'stale-dot' : 'fresh-dot'} />{job.isDemo ? 'Sample · simulated dates' : stale ? `Feed stale · checked ${formatDate(job.lastVerifiedAt)}` : `Feed checked ${formatDate(job.lastVerifiedAt)}`}</span>
      <div className="job-actions">{recommendationRank && <button type="button" className="button button-primary recommendation-save" onClick={() => void act('save')} disabled={saved || pending !== null} aria-label={saved ? `${job.title} is saved` : `Save ${job.title}`} aria-busy={pending === 'save'}><Bookmark size={17} aria-hidden="true" />{saved ? 'Saved' : pending === 'save' ? 'Saving…' : 'Save role'}</button>}<button type="button" className="card-dismiss" aria-label={dismissed ? `Restore ${job.title}` : `Dismiss ${job.title}`} disabled={pending !== null} onClick={() => void act('dismiss')}>{pending === 'dismiss' ? 'Updating…' : dismissed ? 'Restore' : 'Dismiss'}</button><button type="button" className={`button ${recommendationRank ? 'button-secondary' : 'button-quiet small'}`} onClick={onView}>View role <ArrowRight size={16} aria-hidden="true" /></button><button type="button" className="application-link" onClick={onApply} aria-label={`Open application for ${job.title}`} title="Open application — confirm submission separately"><ArrowUpRight size={18} aria-hidden="true" /></button></div>
    </div>;
  return <article className={`job-card ${recommendationRank ? 'recommendation-card' : ''} ${dismissed ? 'dismissed-card' : ''}`} aria-label={`${job.title} at ${job.company}`}>
    <div className="job-card-main">
      <div className="job-top">
        <CompanyMark company={job.company} />
        <div className="job-title"><div className="company-line"><span>{job.company}</span>{recommendationRank && <span className="recommendation-rank" aria-label={`Recommendation ${recommendationRank}`}>#{recommendationRank}</span>}</div><h3><button type="button" onClick={onView}>{job.title}</button></h3></div>
        {!recommendationRank && <button type="button" className={`icon-button bookmark-button ${saved ? 'is-saved' : ''}`} onClick={() => void act('save')} disabled={saved || pending !== null} aria-busy={pending === 'save'} aria-label={saved ? `${job.title} is saved` : `Save ${job.title}`}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /></button>}
      </div>
      <div className="job-meta">
        <span className="job-meta-item job-location-summary"><MapPin size={16} aria-hidden="true" /><span>{locations.preview}{job.workArrangement !== 'unknown' ? ` · ${job.workArrangement}` : ''}{locations.hasMore && <> <button type="button" className="text-link" onClick={onView} aria-label={`View all locations for ${job.title}`}>All locations</button></>}</span></span>
        <span className="job-meta-item"><Banknote size={16} aria-hidden="true" /><span>{pay.length > 110 ? <button type="button" className="text-link" onClick={onView}>See published pay details</button> : pay}</span></span>
        {job.timing.deadlineVerified && job.timing.deadline && <span className="job-meta-item job-deadline"><Clock3 size={16} aria-hidden="true" />Apply by {profileDate(job.timing.deadline)}</span>}
      </div>
      <section className="recommendation-why" aria-label="Role alignment">
        <EligibilityEvidence profile={profile} job={job} alignmentReasons={highlights.reasons} checkReasons={highlights.watchouts} checkIntro={<>
          <div className="job-card-status"><ExperienceEvidence job={job} />{(label === 'Experience stretch' || label === 'Known conflict') && <span className="alignment-label stretch">{label}</span>}</div>
          {!!sourceUnknowns.length && <p className="job-source-summary warning-text">{sourceUnknowns.join(' · ')}</p>}
        </>} />
        {recommendationRank && <span className="recommendation-evidence" title={highlights.coverageLabel}>{highlights.method === 'resume' ? `Resume evidence coverage: ${highlights.coverage}%` : highlights.coverage === 100 ? 'Source evidence covers all your selected preferences' : `Source evidence covers ${highlights.coverage}% of your selected preferences`}{highlights.unknownCount > 0 ? ` · ${highlights.unknownLabel}` : ''}</span>}
      </section>
      <SourceAttribution job={job} />
      {job.classification.scope === 'excluded' && <div className="scope-warning"><strong>Outside the graduate catalog</strong><p>{job.classification.reasons.map(reason => reason.text).join(' · ') || 'Check employment type, location and seniority before applying.'}</p></div>}
      {resumeMatch && <ResumeCompatibility result={resumeMatch} />}
      {!recommendationRank && <details className="job-supporting-details">
        <summary>Experience and match details</summary>
        <div className="job-supporting-content"><p className="job-preference-summary"><strong>Preference comparison:</strong> {label}</p>{job.primaryRoleFamily && <p className="job-role-family"><strong>Role family:</strong> {ROLE_LABELS[job.primaryRoleFamily]}</p>}
          <div className="job-experience-context"><strong>Experience evidence</strong><p>{experience.evidence || (experience.requiredYears !== null ? `The source reports a minimum of ${experience.requiredYears} years.` : 'Required years are unverified; review the original posting.')}</p>{!!job.experience.alternatives.length && <p>Degree and experience paths are conditional. Confirm which path you meet before applying.</p>}</div>
          {!!reasons.length && <ul className="job-reason-list">{reasons.map(reason => <li key={reason.code}><Check size={15} aria-hidden="true" /><span>{reason.text}</span></li>)}</ul>}
          {!!caveats.length && <div className="check-details"><strong>Worth checking</strong><ul className="job-caveat-list">{caveats.map((caveat, index) => <li key={index}>{caveat}</li>)}</ul></div>}
          <p className="hint">First found {formatDate(job.firstSeenAt)}. Preference overlap is not a hiring prediction.</p>
        </div>
      </details>}
    </div>
    {actions}
  </article>;
}
export function ExperienceEvidence({ job, full = false }: { job: Job; full?: boolean }) {
  const assessment = assessExperience(job);
  const evidence = assessment.evidence && assessment.evidence !== job.title ? assessment.evidence : null;
  return <div className={`experience-evidence ${assessment.tier}`}>
    <strong>{assessment.label}</strong>
    {full && evidence && <details className="experience-source-details"><summary>Read experience evidence</summary><p>{evidence}</p></details>}
    {full && !evidence && <p>{assessment.requiredYears !== null ? `The source reports a minimum of ${assessment.requiredYears} years. Confirm the full requirements on the employer’s posting.` : assessment.explicitGraduate ? 'The employer targets graduate/entry-level hiring; a numeric minimum was not stated.' : 'Required experience is unverified. Missing years do not mean zero.'}</p>}
    {full && job.experience.alternatives.length > 0 && <p>Degree and experience paths are conditional. Confirm which path you meet before applying.</p>}
  </div>;
}
