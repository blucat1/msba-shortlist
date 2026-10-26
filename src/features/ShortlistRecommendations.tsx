import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ChevronDown, FileText, SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../app/store';
import { useResumeWorkspace } from '../app/resume-store';
import { Empty, Modal } from '../components/ui';
import { JobCard } from '../components/JobCard';
import { createDiscoveryFilters, discoverJobs } from '../domain/discovery';
import { groupSimilarListings } from '../domain/grouping';
import { compareResumeToJob } from '../domain/resume-matching';
import { opportunityFromJob } from '../domain/records';
import { EXPERIENCE_VIEWS } from '../domain/experience';
import { ROLE_LABELS, type Job } from '../domain/types';
import { RecommendationControls } from './RecommendationControls';
import { DEFAULT_RECOMMENDATION_EXPERIENCE, readRecommendationOptions, recommendationFilters, recommendationMode, recommendationPreferences, recommendationResumePreferences, writeRecommendationOptions } from './recommendation-options';
import { prioritizeNewGradRecommendations } from '../domain/recommendations';

const ResumeWorkspace = lazy(() => import('./ResumeWorkspace').then(module => ({ default: module.ResumeWorkspace })));
const RECOMMENDATION_BATCH_SIZE = 25;

export function ShortlistRecommendations() {
  const { snapshot, repository, requireUser, run, notify, openApplication, showCoverage, showSettings } = useWorkspace();
  const resume = useResumeWorkspace();
  const [query, setQuery] = useSearchParams(), location = useLocation();
  const options = readRecommendationOptions(query), mode = recommendationMode(options);
  const [limit, setLimit] = useState(RECOMMENDATION_BATCH_SIZE), [adjusting, setAdjusting] = useState(false), [draft, setDraft] = useState('');
  const [resumeOpen, setResumeOpen] = useState(false);
  const returnToAdjustment = useRef(false);
  const ready = !!resume.profile && resume.reviewed;
  const optionKey = options.toString();

  const evaluate = useCallback((value: string) => {
    const selections = new URLSearchParams(value), method = recommendationMode(selections), usesResume = method !== 'filters';
    try {
      const preferences = method === 'resume' && ready ? recommendationResumePreferences(resume.profile!, snapshot.preferences.timezone) : recommendationPreferences(snapshot.preferences, selections);
      const filters = method === 'resume' ? createDiscoveryFilters('catalog') : recommendationFilters(selections);
      // Resume-only keeps qualifications in its explanation, rather than
      // secretly filtering them through the account's saved preferences.
      const filterProfile = method === 'resume' ? { ...preferences, educationLevel: null, degreeField: null } : preferences;
      const rows = usesResume && !ready ? [] : discoverJobs(snapshot.jobs, filterProfile, filters, {
        sources: snapshot.sources,
        trackedJobIds: snapshot.opportunities.flatMap(item => item.catalogJobId ? [item.catalogJobId] : []),
        dismissedJobIds: snapshot.jobPreferences.filter(item => item.dismissed).map(item => item.jobId),
      });
      const compatibility = new Map(usesResume && ready ? rows.map(row => [row.job.id, compareResumeToJob(resume.profile!, row.job)]) : []);
      if (usesResume) rows.sort((a, b) => (compatibility.get(a.job.id)?.conflicts.length ?? 0) - (compatibility.get(b.job.id)?.conflicts.length ?? 0)
        || (compatibility.get(b.job.id)?.score ?? -1) - (compatibility.get(a.job.id)?.score ?? -1)
        || (compatibility.get(b.job.id)?.coverage ?? 0) - (compatibility.get(a.job.id)?.coverage ?? 0) || a.job.id.localeCompare(b.job.id));
      const ordered = prioritizeNewGradRecommendations(rows, filters.experienceView);
      return { rows: ordered, groups: groupSimilarListings(ordered), compatibility, preferences, error: '', needsResume: usesResume && !ready };
    } catch (cause) {
      return { rows: [], groups: [], compatibility: new Map<string, ReturnType<typeof compareResumeToJob>>(), preferences: snapshot.preferences,
        error: cause instanceof Error ? cause.message : 'Check your preferences.', needsResume: usesResume && !ready };
    }
  }, [snapshot, ready, resume.profile]);
  // This comparison is intentionally scoped to the workspace. No resume-derived
  // values are serialized, persisted or sent to the repository.
  const current = useMemo(() => evaluate(optionKey), [optionKey, evaluate]);
  const preview = useMemo(() => adjusting ? evaluate(draft) : current, [adjusting, draft, evaluate, current]);
  const latestQuery = () => window.location.pathname === location.pathname ? new URLSearchParams(window.location.search) : new URLSearchParams(location.search);
  const apply = (value: string) => { setLimit(RECOMMENDATION_BATCH_SIZE); setQuery(writeRecommendationOptions(latestQuery(), new URLSearchParams(value)), { replace: true }); };
  const openAdjustment = () => { setDraft(optionKey); setAdjusting(true); };
  const openResume = (fromAdjustment = false) => { returnToAdjustment.current = fromAdjustment; if (fromAdjustment) setAdjusting(false); setResumeOpen(true); };
  const closeResume = () => { setResumeOpen(false); if (returnToAdjustment.current) { returnToAdjustment.current = false; setAdjusting(true); } };
  const useResume = () => {
    if (returnToAdjustment.current) { const next = new URLSearchParams(draft); if (recommendationMode(next) === 'filters') next.set('match', 'combined'); setDraft(next.toString()); }
    else if (mode === 'filters') { const next = new URLSearchParams(options); next.set('match', 'combined'); apply(next.toString()); }
    closeResume();
  };
  const browseAll = () => { const next = latestQuery(); next.set('view', 'all'); next.delete('job'); setQuery(next); };
  const view = (id: string) => { const next = latestQuery(); next.set('job', id); setQuery(next, { replace: true }); };
  async function save(job: Job) {
    if (!requireUser()) return;
    if (snapshot.opportunities.some(item => item.catalogJobId === job.id)) { notify('Already saved in My Search.'); return; }
    await run(() => repository.saveOpportunity(opportunityFromJob(job, snapshot.userId!)), 'Saved to My Search.').catch(() => {});
  }
  async function dismiss(job: Job) {
    if (!requireUser()) return;
    const previous = snapshot.jobPreferences.find(item => item.jobId === job.id);
    await run(() => repository.setJobPreference({ jobId: job.id, userId: snapshot.userId!, dismissed: !previous?.dismissed, seenAt: new Date().toISOString() }), 'Recommendation dismissed.').catch(() => {});
  }
  const personalized = mode !== 'filters' || !!(current.preferences.roleFamilies.length || current.preferences.locations.length || current.preferences.workArrangements.length || current.preferences.skills.length || current.preferences.yearsExperience !== null || current.preferences.desiredSalary !== null);
  const interestRoles = options.get('role')?.split(',').filter(Boolean) ?? current.preferences.roleFamilies;
  const roleText = interestRoles.length ? interestRoles.slice(0, 2).map(role => ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role).join(' · ') : 'All roles';
  const experienceView = options.get('career') || DEFAULT_RECOMMENDATION_EXPERIENCE;
  const scope = mode === 'resume' ? 'All experience levels' : experienceView === 'early-career' ? 'New grads first · early career included' : EXPERIENCE_VIEWS.find(item => item.value === experienceView)?.label ?? 'Choose an experience view';
  const renderCard = (row: typeof current.rows[number], rank: number) => <JobCard key={row.job.id} result={row} profile={current.preferences} recommendationRank={rank}
    resumeMatch={current.compatibility.get(row.job.id)} saved={snapshot.opportunities.some(item => item.catalogJobId === row.job.id)} dismissed={false}
    onSave={() => save(row.job)} onDismiss={() => dismiss(row.job)} onView={() => view(row.job.id)} onApply={() => openApplication(row.job)} />;

  return <section className="shortlist-recommendations" aria-label="Personalized recommendations">
    <div className="recommendation-heading"><div><h1>{personalized ? 'Top matches for you' : 'Explore opportunities'}</h1><p>{personalized ? 'Ranked for your current preferences.' : 'A starting point for your search. Adjust it to make it yours.'}</p></div><button type="button" className="button button-primary recommendation-adjust" aria-haspopup="dialog" aria-expanded={adjusting} onClick={openAdjustment}><SlidersHorizontal size={20} aria-hidden="true" />Adjust recommendations</button></div>
    <div className="recommendation-basis"><div><span>{mode === 'filters' ? 'Your preferences' : mode === 'resume' ? 'Your resume' : 'Preferences + resume'}</span><span>{scope}</span>{mode !== 'resume' && <span>{roleText}</span>}</div><div className="recommendation-basis-actions"><button type="button" className="text-link" aria-label="Profile preferences" onClick={showSettings}>Profile</button><button type="button" className="text-link resume-open" aria-label={resume.document ? 'Review resume' : 'Upload resume'} aria-haspopup="dialog" onClick={() => openResume()}><FileText size={18} aria-hidden="true" />{resume.document ? 'Resume' : 'Add resume'}</button></div></div>
    {mode !== 'filters' && ready && <p className="recommendation-session">Reviewed resume · This tab only</p>}
    {current.error && <p role="alert" className="filter-error">{current.error}</p>}
    {current.needsResume ? <Empty title="Add your resume to get matches" action={<button type="button" className="button button-primary" onClick={() => openResume()}>Add resume</button>}>Review your extracted profile before using it for recommendations.</Empty> : current.groups.length ? <>
      <div className="recommendation-result-count"><strong className="rec-page-count">Showing {Math.min(limit, current.groups.length)} of {current.groups.length} role groups</strong><p className="listing-count" aria-live="polite">{current.rows.length} listing{current.rows.length === 1 ? '' : 's'} in {current.groups.length} group{current.groups.length === 1 ? '' : 's'} · {snapshot.jobs.length.toLocaleString()} catalog records</p></div>
      <div className="recommendation-list">{current.groups.slice(0, limit).map((group, index) => <div className="listing-group" key={group.key}>{renderCard(group.representative, index + 1)}{!!group.variants.length && <details className="listing-variants"><summary>{group.listingCount} listings · {group.variants.length} more locations or requisitions</summary><p>Each listing keeps its own source and application link.</p><div className="recommendation-variants">{group.variants.map(row => renderCard(row, index + 1))}</div></details>}</div>)}</div>
      {current.groups.length > limit && <button type="button" className="button button-secondary recommendation-more" onClick={() => setLimit(value => value + RECOMMENDATION_BATCH_SIZE)}>Show more recommendations <ChevronDown size={18} aria-hidden="true" /></button>}
    </> : !current.error && <Empty title={mode === 'resume' ? 'No roles available to compare.' : 'No matches for these preferences.'} action={<div className="inline-actions"><button type="button" className="button button-primary" onClick={openAdjustment}>Change preferences</button><button type="button" className="button button-secondary" onClick={browseAll}>Browse all listings</button></div>}>Try a broader preference when you’re ready. Your current settings stay in place.</Empty>}
    {snapshot.catalogTruncated && <p className="warning-text">Recommendations use {snapshot.jobs.length} loaded catalog records; the catalog is limited.</p>}
    <div className="recommendation-footer"><span>Evidence-based comparisons, not hiring predictions.</span><button type="button" className="text-link" onClick={showCoverage}>Coverage & sources <ArrowUpRight size={16} aria-hidden="true" /></button></div>
    <Modal open={adjusting} onClose={() => setAdjusting(false)} title="Adjust recommendations" wide>
      <RecommendationControls value={draft} onChange={setDraft} resumeReady={ready} onReviewResume={() => openResume(true)} />
      <div className="recommendation-preview" role="status" aria-live="polite">{preview.error || (preview.needsResume ? 'Review a resume to preview these matches.' : `${preview.groups.length} matching group${preview.groups.length === 1 ? '' : 's'} · ${preview.rows.length} listings`)}</div>
      <div className="dialog-actions recommendation-dialog-actions"><button type="button" className="text-link" onClick={() => setDraft('')}>Reset recommendations</button><div><button type="button" className="button button-secondary" onClick={() => setAdjusting(false)}>Cancel</button><button type="button" className="button button-primary" aria-label="Update matches" disabled={!!preview.error || preview.needsResume} onClick={() => { apply(draft); setAdjusting(false); }}>Update matches <ArrowRight size={18} aria-hidden="true" /></button></div></div>
    </Modal>
    <Modal open={resumeOpen} onClose={closeResume} title="Resume & ATS review" wide><Suspense fallback={<p role="status">Opening resume…</p>}><ResumeWorkspace onUseResume={useResume} /></Suspense></Modal>
  </section>;
}
