import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, Clock3, FileText, Info, Banknote, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../app/store';
import { CompanyMark, Empty, formatDate, Modal, safeUrl } from '../components/ui';
import { dailyQueue } from '../domain/tasks';
import { rankJob, type RankedJob } from '../domain/ranking';
import { createDiscoveryFilters, discoverJobs } from '../domain/discovery';
import { compareResumeToJob } from '../domain/resume-matching';
import type { ResumeProfile } from '../domain/resume';
import { useResumeWorkspace } from '../app/resume-store';
import { ResumeCompatibility } from '../components/ResumeCompatibility';
import { DiscoveryFilterFields } from './DiscoveryFilterFields';
import { FILTER_KEYS, filtersFromParams, MATCHING_MODES, type MatchingMode } from './discovery-options';
import { opportunityFromJob } from '../domain/records';
import { groupSimilarListings } from '../domain/grouping';
import { isDateOnly } from '../domain/dates';
import { formatCompensation } from '../lib/compensation';
import { EXPERIENCE_VIEWS, type ExperienceView } from '../domain/experience';
import { DEFAULT_PREFERENCES, ROLE_FAMILIES, ROLE_LABELS, type Job, type Preferences } from '../domain/types';
import { MarketSearch } from './MarketSearch';
import { SourceAttribution } from '../components/SourceAttribution';
import { EligibilityEvidence } from '../components/EligibilityEvidence';
import { JobCard, ExperienceEvidence, cardLocations } from '../components/JobCard';
import { ShortlistRecommendations } from './ShortlistRecommendations';
import { readRecommendationOptions, recommendationPreferences, recommendationResumePreferences } from './recommendation-options';
const ResumeWorkspace = lazy(() => import('./ResumeWorkspace').then(module => ({ default: module.ResumeWorkspace })));

export function Opportunities() {
  const { snapshot, base, showSettings, showCoverage, showManual, requireUser, repository, run, notify, openApplication } = useWorkspace();
  const [params, writeParams] = useSearchParams(); const location = useLocation();
  const setParams: typeof writeParams = (next, options) => {
    // BrowserRouter writes history before its deferred render. Its callback
    // setter is not a queued React-state updater: quick typing after Apply
    // must compose with that current URL, not the previous render's params.
    // MemoryRouter consumers instead keep their own router-local location.
    const latest = window.location.pathname === location.pathname ? new URLSearchParams(window.location.search) : new URLSearchParams(location.search);
    writeParams(typeof next === 'function' ? next(latest) : next, options);
  };
  const [filterDraft, setFilterDraft] = useState(''); const [filters, setFilters] = useState(false); const [sort, setSort] = useState('fit'); const [pageSize, setPageSize] = useState(15);
  const [resumeOpen, setResumeOpen] = useState(false);
  const tab = ['all', 'market'].includes(params.get('view') || '') ? params.get('view')! : 'for-you';
  const setTab = (value: string) => setFilter('view', value === 'for-you' ? '' : value);
  const resume = useResumeWorkspace();
  const matchingMode: MatchingMode = MATCHING_MODES.find(mode => mode.value === params.get('match'))?.value ?? 'filters';
  const useResume = matchingMode !== 'filters', resumeReady = !!resume.profile && resume.reviewed;
  const search = params.get('q') || '', family = (params.get('role') || '').split(',')[0], place = params.get('location') || '';
  const setFilter = (key: string, value: string) => { setPageSize(15); setParams(previous => { const p = new URLSearchParams(previous); if (value) p.set(key, value); else p.delete(key); return p; }, { replace: true }); };
  const flag = (key: string) => params.get(key) === '1';
  const experienceView: ExperienceView = EXPERIENCE_VIEWS.find(view => view.value === params.get('career'))?.value ?? (tab === 'all' ? 'all' : 'new-grad');
  const experienceDescription = EXPERIENCE_VIEWS.find(view => view.value === (matchingMode === 'resume' ? 'all' : experienceView))!.description;
  const queue = dailyQueue(snapshot).slice(0, 3);
  const expanded = useQuery({ queryKey: ['expanded-catalog', repository.mode, snapshot.userId], queryFn: () => repository.getExpandedCatalog!(), enabled: tab === 'all' && matchingMode !== 'resume' && flag('excluded') && !!repository.getExpandedCatalog, staleTime: 300_000, retry: 1 });
  const catalog = useMemo(() => [...new Map([...snapshot.jobs, ...(matchingMode !== 'resume' && flag('excluded') ? expanded.data?.jobs ?? [] : [])].map(job => [job.id, job])).values()], [snapshot.jobs, expanded.data, matchingMode, params]);
  const resumeMatches = useMemo(() => new Map(tab === 'all' && useResume && resumeReady ? catalog.map(job => [job.id, compareResumeToJob(resume.profile!, job)]) : []), [catalog, tab, useResume, resumeReady, resume.profile]);
  const discovery = useMemo(() => {
    try {
      if (tab !== 'all' || useResume && !resumeReady) return { rows: [], error: '' };
      const options = matchingMode === 'resume' ? { ...createDiscoveryFilters('catalog'), includeTracked: true, includeDismissed: true } : filtersFromParams(params, tab === 'all');
      // Resume-only evaluates confirmed qualifications in the compatibility
      // report rather than silently using them as eligibility filters.
      const preferences = matchingMode === 'resume' ? resumePreferences({ ...resume.profile!, educationLevel: null, degreeField: null }, snapshot.preferences.timezone) : snapshot.preferences;
      let rows = discoverJobs(catalog, preferences, options, { sources: snapshot.sources, trackedJobIds: snapshot.opportunities.flatMap(o => o.catalogJobId ? [o.catalogJobId] : []), dismissedJobIds: snapshot.jobPreferences.filter(p => p.dismissed).map(p => p.jobId) });
      const deadline = matchingMode !== 'resume' ? params.get('deadline') : null;
      if (deadline && !isDateOnly(deadline)) throw new Error('Enter a valid application deadline.');
      if (deadline) rows = rows.filter(({ job }) => job.timing.deadlineVerified && job.timing.deadline !== null && job.timing.deadline <= deadline);
      if (useResume && sort !== 'found') rows.sort((a, b) => (resumeMatches.get(a.job.id)?.conflicts.length ?? 0) - (resumeMatches.get(b.job.id)?.conflicts.length ?? 0) || (resumeMatches.get(b.job.id)?.score ?? -1) - (resumeMatches.get(a.job.id)?.score ?? -1) || (resumeMatches.get(b.job.id)?.coverage ?? 0) - (resumeMatches.get(a.job.id)?.coverage ?? 0) || a.job.id.localeCompare(b.job.id));
      if (sort === 'found') rows.sort((a, b) => b.job.firstSeenAt.localeCompare(a.job.firstSeenAt));
      return { rows, error: '' };
    } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Check your filter values.' }; }
  }, [snapshot, catalog, params, tab, sort, matchingMode, useResume, resumeReady, resume.profile, resumeMatches]);
  const results = discovery.rows;
  const groups = useMemo(() => tab === 'for-you' ? groupSimilarListings(results) : results.map(result => ({ key: result.job.id, representative: result, variants: [], listingCount: 1 })), [results, tab]);
  const activeFilters = [...params].filter(([key]) => FILTER_KEYS.includes(key as typeof FILTER_KEYS[number]));
  const resetFilters = () => { setPageSize(15); setParams(previous => { const next = new URLSearchParams(previous); for (const key of [...FILTER_KEYS, 'career', 'job']) next.delete(key); return next; }); };
  const openFilters = () => { const draft = new URLSearchParams(params); if (!draft.has('career')) draft.set('career', experienceView); if (tab === 'all') { if (!draft.has('details')) draft.set('details', '1'); if (!draft.has('show-saved')) draft.set('show-saved', '1'); } setFilterDraft(draft.toString()); setFilters(true); };
  const broaden = () => { setPageSize(15); setParams(previous => { const next = new URLSearchParams(previous); next.set('career', 'all'); next.set('details', '1'); return next; }); };
  async function save(job: Job) { if (!requireUser()) return; if (snapshot.opportunities.some(o => o.catalogJobId === job.id)) { notify('Already saved in My Search.'); return; } await run(() => repository.saveOpportunity(opportunityFromJob(job, snapshot.userId!)), 'Saved to My Search.').catch(() => {}); }
  async function dismiss(job: Job) { if (!requireUser()) return; const previous = snapshot.jobPreferences.find(p => p.jobId === job.id); await run(() => repository.setJobPreference({ jobId: job.id, userId: snapshot.userId!, dismissed: !previous?.dismissed, seenAt: new Date().toISOString() }), previous?.dismissed ? 'Opportunity restored.' : 'Dismissed. Show saved & dismissed to restore it.').catch(() => {}); }
  const card = (result: RankedJob) => <JobCard key={result.job.id} result={result} profile={matchingMode === 'resume' ? resumePreferences(resume.profile!, snapshot.preferences.timezone) : snapshot.preferences} resumeMatch={resumeMatches.get(result.job.id)} saved={snapshot.opportunities.some(o => o.catalogJobId === result.job.id)} dismissed={snapshot.jobPreferences.some(p => p.jobId === result.job.id && p.dismissed)} onSave={() => save(result.job)} onDismiss={() => dismiss(result.job)} onView={() => setFilter('job', result.job.id)} onApply={() => openApplication(result.job)} />;
  return <div className="page-content opportunities-page">
    {tab !== 'for-you' && <div className="page-heading"><h1>Opportunities</h1><button className="button button-secondary search-profile-button" aria-label="Preferences" onClick={showSettings}><SlidersHorizontal size={18} aria-hidden="true" /><span>Preferences</span></button></div>}
    {!!queue.length && <section className="today-section" aria-label="Today’s priorities"><details className="today-priorities"><summary>Next steps <span className="subtle-count">{dailyQueue(snapshot).length}</span></summary><div className="today-grid">{queue.map((item, i) => { const o = snapshot.opportunities.find(o => o.id === item.opportunityId); return <Link key={item.id} to={`${base}/my-search?view=tasks&opportunity=${item.opportunityId}`} className="today-card"><span className={`task-symbol task-symbol-${i}`}><Clock3 size={18} /></span><div><span className={item.tier === 1 ? 'task-time urgent' : 'task-time'}>{item.reason}</span><strong>{item.title}</strong><small>{o?.company} <span>·</span> {o?.title}</small></div><ArrowUpRight size={15} /></Link>; })}</div></details><Link className="text-link today-all-steps" to={`${base}/my-search?view=tasks`}>All next steps <ArrowRight size={14} aria-hidden="true" /></Link></section>}
    <div className="discovery-layout"><section className="results-section" aria-label="Job opportunities">
      <div className="results-header"><div className="view-tabs"><button className={tab === 'for-you' ? 'selected' : ''} aria-pressed={tab === 'for-you'} onClick={() => setTab('for-you')}>Shortlist</button><button className={tab === 'all' ? 'selected' : ''} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>All listings</button><button className={tab === 'market' ? 'selected' : ''} aria-pressed={tab === 'market'} onClick={() => setTab('market')}>Wider search</button></div></div>
      {tab === 'market' ? <MarketSearch initialQuery={search || (family && ROLE_FAMILIES.includes(family as typeof ROLE_FAMILIES[number]) ? ROLE_LABELS[family as typeof ROLE_FAMILIES[number]] : '')} initialLocation={place || snapshot.preferences.locations[0]} onAddOpportunity={() => { if (requireUser()) showManual(); }} /> : tab === 'for-you' ? <ShortlistRecommendations /> : <>
      <section className="discovery-workbench" aria-label="Search and matching">
        {matchingMode !== 'resume' && <div className="discovery-filters"><div className="search-box"><Search size={20} aria-hidden="true" /><input aria-label="Search opportunities" placeholder="Search" value={search} onChange={e => setFilter('q', e.target.value)} />{search && <button className="icon-button" aria-label="Clear search" onClick={() => setFilter('q', '')}><X size={18} /></button>}</div><button className="filter-button" aria-label="Filters" aria-haspopup="dialog" aria-expanded={filters} onClick={openFilters}><SlidersHorizontal size={20} aria-hidden="true" /><span>Filters</span>{activeFilters.length > 0 && <span className="filter-count">{activeFilters.length}</span>}</button></div>}
        <div className="discovery-options-row">
          {matchingMode !== 'resume' && <div className="experience-controls"><label htmlFor="experience-view">Experience</label><select id="experience-view" aria-label="Experience focus" value={experienceView} onChange={e => setFilter('career', e.target.value)}>{EXPERIENCE_VIEWS.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}</select></div>}
          <div className="matching-toolbar"><label htmlFor="matching-method">Matching method</label><select id="matching-method" className="matching-mode-mobile" aria-label="Matching method" aria-describedby="matching-method-help" value={matchingMode} onChange={event => setFilter('match', event.target.value === 'filters' ? '' : event.target.value)}>{MATCHING_MODES.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select><p id="matching-method-help" className="sr-only">{MATCHING_MODES.find(mode => mode.value === matchingMode)!.description}</p></div>
          <button className={`button button-secondary resume-open ${resumeReady ? 'resume-ready' : ''}`} aria-label={resume.document ? 'Review resume' : 'Upload resume'} onClick={() => setResumeOpen(true)}>{resumeReady ? <Check size={20} aria-hidden="true" /> : <FileText size={20} aria-hidden="true" />}<span>Resume</span></button>
        </div>
        {matchingMode === 'resume' && <div className="filters-paused"><span>Filters paused · all experience levels</span><button className="text-link" onClick={() => setFilter('match', 'combined')}>Use filters too <ArrowRight size={16} aria-hidden="true" /></button></div>}
        {resume.document && <p className="resume-session-status">{resume.reviewed ? matchingMode === 'filters' ? 'Resume ready · Not used in results' : 'Resume ready · This tab only' : 'Resume needs review'}</p>}
      </section>
      {discovery.error && <p role="alert" className="filter-error">{discovery.error} <button className="text-link" onClick={resetFilters}>Reset filters</button></p>}
      {flag('excluded') && matchingMode !== 'resume' && <div className="expanded-catalog-status" role="status">{expanded.isPending ? 'Loading more postings…' : expanded.isError ? <span>More postings couldn’t load. <button className="text-link" onClick={() => void expanded.refetch()}>Retry wider scope</button></span> : expanded.data ? `${expanded.data.jobs.length} additional records loaded${expanded.data.truncated ? ` of ${expanded.data.total} · limited to 1,500` : ''} · Wider scope included` : 'No additional postings available.'}</div>}
      <div className="results-bar"><p className="listing-count" aria-live="polite">{results.length} listing{results.length === 1 ? '' : 's'}{tab === 'for-you' && groups.length < results.length ? ` in ${groups.length} group${groups.length === 1 ? '' : 's'}` : ''}</p><div className="results-bar-actions">{matchingMode !== 'resume' && !!activeFilters.length && <button className="text-link clear-search-filters" onClick={resetFilters}>Clear filters</button>}<select aria-label="Sort opportunities" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}><option value="fit">{useResume ? 'Resume match' : 'Best match'}</option><option value="found">Newest found</option></select></div></div>
      {snapshot.catalogTruncated && <p role="status" className="warning-text">Showing a limited catalog of {snapshot.jobs.length} / {snapshot.catalogTotal ?? 'unknown'} records. Narrow your search; this ordering is within the loaded set.</p>}
      {!discovery.error && (useResume && !resumeReady ? <Empty title="Add a reviewed resume to see recommendations." action={<button className="button button-primary" onClick={() => setResumeOpen(true)}>{resume.document ? 'Review resume' : 'Upload resume'}</button>}>Upload PDF, DOCX or TXT, then review your profile to start matching.</Empty> : results.length ? <div className="job-list">{groups.slice(0, pageSize).map(group => <div className="listing-group" key={group.key}>{card(group.representative)}{!!group.variants.length && <details className="listing-variants"><summary>{group.listingCount} listings · {group.variants.length} more locations or requisitions</summary><p>Each listing has its own source and application link.</p><div className="job-list">{group.variants.map(card)}</div></details>}</div>)}{groups.length > pageSize && <button className="button button-secondary load-more" onClick={() => setPageSize(pageSize + 15)}>Show more opportunities <ChevronDown size={18} /></button>}</div> : <Empty title={matchingMode === 'resume' ? 'No roles available to compare.' : activeFilters.length ? 'No listings match these filters.' : experienceView === 'new-grad' ? 'No new-grad matches right now.' : 'No roles in this experience view.'} action={matchingMode === 'resume' ? <button className="button button-secondary" onClick={() => setFilter('match', '')}>Filters only</button> : <div className="inline-actions"><button className="button button-secondary" onClick={resetFilters}>Reset filters</button><button className="button button-primary" onClick={broaden}>All experience levels</button></div>}>{matchingMode === 'resume' ? 'No current roles are available for resume matching.' : 'Try fewer filters or a broader experience range.'}</Empty>)}
      <div className="results-footer"><button className="text-link" onClick={showCoverage}>Coverage & sources <ArrowUpRight size={16} aria-hidden="true" /></button><details className="experience-explainer"><summary><Info size={17} aria-hidden="true" /><span>About these results</span></summary><p>{experienceDescription}</p><p>{useResume ? 'Compatibility is recorded overlap, not an employer ATS score.' : 'Matches compare recorded evidence with your preferences.'} Feeds cover part of the market. Wider search opens external listings.</p></details></div></>}
    </section></div>
    <Modal open={filters} onClose={() => setFilters(false)} title="Filter opportunities" wide>
      <DiscoveryFilterFields value={filterDraft} onChange={setFilterDraft} sources={snapshot.sources} companies={[...new Set(catalog.map(job => job.company))].sort()} />
      <div className="dialog-actions"><button className="button button-quiet" onClick={() => { const reset = new URLSearchParams(filterDraft); for (const key of [...FILTER_KEYS, 'career', 'job']) reset.delete(key); reset.set('career', 'all'); setFilterDraft(reset.toString()); }}>Reset filters</button><button className="button button-primary" onClick={() => { setParams(new URLSearchParams(filterDraft), { replace: true }); setPageSize(15); setFilters(false); }}>Show opportunities <ArrowRight size={16} /></button></div>
    </Modal>
    <Modal open={resumeOpen} onClose={() => setResumeOpen(false)} title="Resume & ATS review" wide>
      <Suspense fallback={<p role="status">Opening resume workspace…</p>}><ResumeWorkspace onUseResume={() => { if (matchingMode === 'filters') setFilter('match', 'combined'); setResumeOpen(false); }} /></Suspense>
    </Modal>
    <JobDetails id={params.get('job')} onClose={() => setFilter('job', '')} onSave={save} />
  </div>;
}
function resumePreferences(profile: ResumeProfile, timezone: string): Preferences {
  return { ...DEFAULT_PREFERENCES, timezone, graduationMonth: null, graduationDate: null, earliestStart: null, roleFamilies: profile.roleInterests, primaryRoleFamilies: [], skills: profile.skills, yearsExperience: profile.yearsExperience, educationLevel: profile.educationLevel, degreeField: profile.degreeField };
}
function JobDetails({ id, onClose, onSave }: { id: string | null; onClose: () => void; onSave: (job: Job) => Promise<void> }) {
  const { repository, snapshot, openApplication, confirmApplication, run, notify } = useWorkspace();
  const details = useQuery({ queryKey: ['job-details', repository.mode, id], queryFn: () => repository.getJobDetails(id!), enabled: !!id });
  const job = details.data ?? snapshot.jobs.find(j => j.id === id);
  const [notes, setNotes] = useState('');
  const tracked = snapshot.opportunities.find(opportunity => opportunity.catalogJobId === id);
  useEffect(() => { setNotes(tracked?.notes || ''); }, [id, tracked?.notes]);
  const [params] = useSearchParams(); const resume = useResumeWorkspace();
  const personalized = !['all', 'market'].includes(params.get('view') || '');
  const options = personalized ? readRecommendationOptions(params) : params;
  const resumeActive = ['resume', 'combined'].includes(options.get('match') || '') && resume.reviewed && !!resume.profile;
  const comparison = (() => { try { return { profile: options.get('match') === 'resume' && resumeActive ? recommendationResumePreferences(resume.profile!, snapshot.preferences.timezone) : personalized ? recommendationPreferences(snapshot.preferences, options) : snapshot.preferences, invalid: false }; } catch { return { profile: snapshot.preferences, invalid: true }; } })();
  const comparisonProfile = comparison.profile;
  const match = job ? rankJob(job, comparisonProfile) : null;
  const compatibility = job && resumeActive ? compareResumeToJob(resume.profile!, job) : null;
  const locations = job ? cardLocations(job) : null;

  return <Modal open={!!id} onClose={onClose} title="Role details" description="Review the source posting and requirements before applying." drawer>
    {!job ? <p role="status">{details.isError ? <>Couldn’t load the role. <button type="button" className="text-link" onClick={() => void details.refetch()}>Try again</button></> : details.isPending ? 'Loading role details…' : 'This role is not in the current catalog.'}</p> : <div className="job-details" key={job.id}>
      <div className="detail-company"><CompanyMark company={job.company} /><span>{job.company}</span>{job.isDemo && <span className="sample-pill">Fictional sample</span>}</div>
      <h2>{job.title}</h2>
      {comparison.invalid && <p role="alert" className="filter-error">Fix your recommendation criteria. This comparison uses your saved profile.</p>}
      <div className="detail-metadata">
        <p><MapPin size={17} aria-hidden="true" /><span>{locations?.preview} · {job.workArrangement === 'unknown' ? 'Work arrangement unverified' : job.workArrangement}</span></p>
        {locations?.hasMore && <details className="detail-disclosure detail-locations"><summary>View all source locations</summary><ul>{locations.labels.map(location => <li key={location}>{location}</li>)}</ul><p className="hint">Location labels do not establish work authorization or remote eligibility.</p></details>}
        <p><Banknote size={17} aria-hidden="true" /><span>{formatCompensation(job.salary)}</span></p>
        <p><Clock3 size={17} aria-hidden="true" /><span>{job.employmentType === 'unknown' ? 'Full-time status unverified' : job.employmentType}</span></p>
      </div>
      {details.isError && <p role="alert" className="warning-text">Showing the catalog summary. Full details could not load. <button type="button" className="text-link" onClick={() => void details.refetch()}>Retry details</button></p>}
      <ExperienceEvidence job={job} full />
      <EligibilityEvidence profile={comparisonProfile} job={job} full />
      <SourceAttribution job={job} />
      <div className="inline-actions detail-actions"><button type="button" className="button button-primary" onClick={() => openApplication(job)}>Open application <ArrowUpRight size={16} aria-hidden="true" /></button><button type="button" className="button button-secondary" onClick={() => void onSave(job)}><Bookmark size={16} aria-hidden="true" />{tracked ? 'Saved' : 'Save role'}</button>{tracked && <button type="button" className="button button-secondary" onClick={() => confirmApplication(tracked)}>Mark applied</button>}</div>
      <p className="hint">Opening a link never marks your application submitted.</p>

      <section className="detail-section">
        <h3>About this role</h3><p>{job.summary}</p>
        <details className="detail-disclosure"><summary>Read full job description</summary><div className="plain-description">{job.description || (details.isPending ? 'Loading original description…' : 'The source has not supplied a description.')}</div></details>
      </section>
      {compatibility && <ResumeCompatibility result={compatibility} full />}
      <section className="detail-section">
        <h3>Skills in the posting</h3><p><strong>Required:</strong> {job.requiredSkills.join(', ') || 'Not specified'}</p><p><strong>Preferred:</strong> {job.preferredSkills.join(', ') || 'Not specified'}</p>
      </section>
      <section className="detail-section">
        <h3>Preference comparison</h3>
        <span className={`alignment-label ${match?.label === 'Preference overlap' ? 'strong' : match?.label === 'Known conflict' ? 'stretch' : ''}`}>{match?.label}</span>
        <details className="detail-disclosure"><summary>Preference reasons & what to check</summary><div className="evidence-list">{match?.reasons.length ? match.reasons.map(reason => <div key={reason.code}><Check size={16} aria-hidden="true" /><div><strong>{reason.text}</strong>{reason.evidence && <p>{reason.evidence}</p>}</div></div>) : <p>Add preferences to see personalized reasons.</p>}</div>{!!match?.caveats.length && <div className="check-details"><h4>Worth checking</h4>{match.caveats.map((caveat, index) => <p key={index}>{caveat}</p>)}</div>}<p className="hint">Evidence covers {match?.coverage}% of your active preference weights.{match?.missing.length ? ` Unknown: ${match.missing.join(', ')}.` : ''} This is not a chance of being hired.</p></details>
      </section>
      {!!job.salary.length && <details className="detail-disclosure detail-section"><summary>Compensation evidence</summary>{job.salary.map((band, index) => <p key={index}>{band.sourceText} <span className="hint">({band.currency}, {band.period}, {band.compensationType}{band.location ? `, ${band.location}` : ''})</span></p>)}</details>}
      <details className="detail-disclosure detail-section"><summary>Source & freshness</summary><p>First found {formatDate(job.firstSeenAt)} · Last feed check {formatDate(job.lastVerifiedAt)} · Availability: {job.availability.replaceAll('_', ' ')}</p>{job.sourceUpdatedAt && <p className="hint">Source updated {formatDate(job.sourceUpdatedAt)}. An update is not the original posting date.</p>}{job.sourcePublishedAt && <p className="hint">Last publication {formatDate(job.sourcePublishedAt)}; not necessarily first posted.</p>}{safeUrl(job.postingUrl) && <a className="text-link" href={safeUrl(job.postingUrl)!} target="_blank" rel="noopener noreferrer">{job.publisher ? `View listing on ${job.publisher.name}` : 'Original employer posting'} <ArrowUpRight size={16} aria-hidden="true" /></a>}</details>
      {tracked && <section className="detail-section"><h3>Private notes</h3><textarea aria-label="Private notes for this role" rows={4} placeholder="What would you like to remember?" value={notes} onChange={event => setNotes(event.target.value)} /><button type="button" className="button button-secondary" onClick={() => void run(() => repository.saveOpportunity({ ...tracked, notes, updatedAt: new Date().toISOString() }), 'Private notes saved.').catch(error => notify(error.message))}>Save notes</button></section>}
    </div>}
  </Modal>;
}
