import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Banknote, MapPin, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../app/store';
import { CompanyMark, Empty, Field, formatDate, Modal, safeUrl } from '../components/ui';
import { dailyQueue } from '../domain/tasks';
import { rankJob, rankJobs, type RankedJob } from '../domain/ranking';
import { opportunityFromJob } from '../domain/records';
import { groupSimilarListings } from '../domain/grouping';
import { freshness } from '../domain/dates';
import { formatCompensation } from '../lib/compensation';
import { assessExperience, EXPERIENCE_VIEWS, type ExperienceView } from '../domain/experience';
import { ROLE_FAMILIES, ROLE_LABELS, type Job, type Preferences } from '../domain/types';
import { MarketSearch } from './MarketSearch';
import { SourceAttribution } from '../components/SourceAttribution';
import { EligibilityEvidence } from '../components/EligibilityEvidence';

export function Opportunities() {
  const { snapshot, base, showSettings, showCoverage, showManual, requireUser, repository, run, notify, openApplication } = useWorkspace();
  const [params, setParams] = useSearchParams(); const [filterFlags, setFilterFlags] = useState<Record<string, boolean>>({}); const [filters, setFilters] = useState(false); const [tab, setTab] = useState('for-you'); const [sort, setSort] = useState('fit'); const [pageSize, setPageSize] = useState(15);
  const search = params.get('q') || '', family = params.get('role') || '', place = params.get('location') || '';
  const setFilter = (key: string, value: string) => setParams(_previous => { const p = new URLSearchParams(window.location.search); if (value) p.set(key, value); else p.delete(key); return p; }, { replace: true });
  const flag = (key: string) => params.get(key) === '1';
  const experienceView: ExperienceView = EXPERIENCE_VIEWS.find(view => view.value === params.get('career'))?.value ?? 'new-grad';
  const experienceDescription = EXPERIENCE_VIEWS.find(view => view.value === experienceView)!.description;
  const queue = dailyQueue(snapshot).slice(0, 3);
  const results = useMemo(() => {
    let rows = rankJobs(snapshot.jobs, snapshot.preferences, { trackedJobIds: snapshot.opportunities.flatMap(o => o.catalogJobId ? [o.catalogJobId] : []), dismissedJobIds: snapshot.jobPreferences.filter(p => p.dismissed).map(p => p.jobId), includeTracked: flag('show-saved') || tab === 'all', experienceView, includeNeedsDetails: flag('details'), includeStale: flag('stale'), includeEligibilityConflicts: flag('conflicts') });
    rows = rows.filter(({ job }) => (!search || [job.title, job.company, job.summary, ...job.requiredSkills, ...job.preferredSkills].join(' ').toLowerCase().includes(search.toLowerCase())) && (!family || job.roleFamilies.includes(family as typeof ROLE_FAMILIES[number])) && (!place || job.locations.some(l => l.label.toLowerCase().includes(place.toLowerCase()))) && (!params.get('work') || job.workArrangement === params.get('work')) && (!params.get('experience') || (assessExperience(job).requiredYears !== null && assessExperience(job).requiredYears! <= Number(params.get('experience')))) && (!params.get('pay') || job.salary.some(s => s.currency === 'USD' && s.period === 'year' && s.compensationType === 'base' && s.min !== null && s.min >= Number(params.get('pay')))) && (!params.get('deadline') || (job.timing.deadlineVerified && job.timing.deadline !== null && job.timing.deadline <= params.get('deadline')!)));
    if (sort === 'found') rows.sort((a, b) => b.job.firstSeenAt.localeCompare(a.job.firstSeenAt));
    return rows;
  }, [snapshot, search, family, place, params, tab, sort, experienceView]);
  const groups = useMemo(() => tab === 'for-you' ? groupSimilarListings(results) : results.map(result => ({ key: result.job.id, representative: result, variants: [], listingCount: 1 })), [results, tab]);
  const activeFilters = [...params].filter(([key]) => !['job', 'career', 'stretch'].includes(key));
  async function save(job: Job) { if (!requireUser()) return; if (snapshot.opportunities.some(o => o.catalogJobId === job.id)) { notify('Already saved in My Search.'); return; } await run(() => repository.saveOpportunity(opportunityFromJob(job, snapshot.userId!)), 'Saved to My Search.').catch(() => {}); }
  async function dismiss(job: Job) { if (!requireUser()) return; const previous = snapshot.jobPreferences.find(p => p.jobId === job.id); await run(() => repository.setJobPreference({ jobId: job.id, userId: snapshot.userId!, dismissed: !previous?.dismissed, seenAt: new Date().toISOString() }), previous?.dismissed ? 'Opportunity restored.' : 'Dismissed. Show saved & dismissed to restore it.').catch(() => {}); }
  const card = (result: RankedJob) => <JobCard key={result.job.id} result={result} profile={snapshot.preferences} saved={snapshot.opportunities.some(o => o.catalogJobId === result.job.id)} dismissed={snapshot.jobPreferences.some(p => p.jobId === result.job.id && p.dismissed)} onSave={() => void save(result.job)} onDismiss={() => void dismiss(result.job)} onView={() => setFilter('job', result.job.id)} onApply={() => openApplication(result.job)} />;
  return <div className="page-content opportunities-page">
    <div className="page-heading"><div><span className="eyebrow">A LITTLE FOCUS. A BETTER NEXT STEP.</span><h1>Find your kind of opportunity<span className="green-dot">.</span></h1><p>Thoughtfully shortlisted. Ready for your next chapter.</p></div><button className="button button-secondary desktop-only" onClick={showSettings}><SlidersHorizontal size={16} /> Your preferences</button></div>
    <section className="cohort-focus" aria-label="Your graduation and availability"><div><span className="eyebrow">YOUR TIMING</span><p>Graduation <strong>{snapshot.preferences.graduationDate ? profileDate(snapshot.preferences.graduationDate) : snapshot.preferences.graduationMonth ? `${snapshot.preferences.graduationMonth} (month only)` : 'Not set'}</strong><span> · </span>Available from <strong>{snapshot.preferences.earliestStart ? profileDate(snapshot.preferences.earliestStart) : 'Not set'}</strong></p><small>Known conflicts hidden by default. Check unknown requirements.</small></div><button className="text-link" onClick={showSettings}>Edit timing & profile <ArrowRight size={14} /></button></section>
    {!!queue.length && <section className="today-section" aria-label="Today’s priorities"><div className="section-top"><h2><span className="today-indicator" /> A few things for today <span className="subtle-count">{dailyQueue(snapshot).length}</span></h2><Link className="text-link" to={`${base}/my-search?view=tasks`}>All next steps <ArrowRight size={14} /></Link></div><details className="today-priorities"><summary>Show today’s priorities</summary><div className="today-grid">{queue.map((item, i) => { const o = snapshot.opportunities.find(o => o.id === item.opportunityId); return <Link key={item.id} to={`${base}/my-search?view=tasks&opportunity=${item.opportunityId}`} className="today-card"><span className={`task-symbol task-symbol-${i}`}><Clock3 size={18} /></span><div><span className={item.tier === 1 ? 'task-time urgent' : 'task-time'}>{item.reason}</span><strong>{item.title}</strong><small>{o?.company} <span>·</span> {o?.title}</small></div><ArrowUpRight size={15} /></Link>; })}</div></details></section>}
    <div className="discovery-layout"><section className="results-section" aria-label="Job opportunities">
      <div className="results-header"><div className="view-tabs"><button className={tab === 'for-you' ? 'selected' : ''} aria-pressed={tab === 'for-you'} onClick={() => setTab('for-you')}><Sparkles size={16} /> For you <span>{results.length}</span></button><button className={tab === 'all' ? 'selected' : ''} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>All catalog</button><button className={tab === 'market' ? 'selected' : ''} aria-pressed={tab === 'market'} onClick={() => setTab('market')}>Search the market <ArrowUpRight size={14} /></button></div>{tab !== 'market' && <select aria-label="Sort opportunities" className="sort-select" value={sort} onChange={e => setSort(e.target.value)}><option value="fit">Preference overlap</option><option value="found">First found: newest</option></select>}</div>
      {tab === 'market' ? <MarketSearch initialQuery={search || (family && ROLE_FAMILIES.includes(family as typeof ROLE_FAMILIES[number]) ? ROLE_LABELS[family as typeof ROLE_FAMILIES[number]] : '')} initialLocation={place || snapshot.preferences.locations[0]} onAddOpportunity={() => { if (requireUser()) showManual(); }} /> : <>
      <div className="experience-controls"><label htmlFor="experience-view">Experience focus</label><select id="experience-view" aria-label="Experience focus" value={experienceView} onChange={e => setFilter('career', e.target.value === 'new-grad' ? '' : e.target.value)}>{EXPERIENCE_VIEWS.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}</select><p>{experienceDescription}</p></div>
      <div className="discovery-filters"><div className="search-box"><Search size={17} /><input aria-label="Search opportunities" placeholder="Title, company, or keyword" value={search} onChange={e => setFilter('q', e.target.value)} />{search && <button className="icon-button" aria-label="Clear search" onClick={() => setFilter('q', '')}><X size={14} /></button>}</div><select aria-label="Role family" value={family} onChange={e => setFilter('role', e.target.value)}><option value="">All roles</option>{ROLE_FAMILIES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button className="filter-button" aria-label="Filters" aria-haspopup="dialog" aria-expanded={filters} onClick={() => { setFilterFlags(Object.fromEntries(['show-saved', 'details', 'stale', 'conflicts'].map(key => [key, flag(key)]))); setFilters(true); }}><SlidersHorizontal size={16} /><span>Filters</span>{activeFilters.length > 0 && <span className="filter-count">{activeFilters.length}</span>}</button></div>
      {!!activeFilters.length && <div className="active-filters">{activeFilters.map(([key, value]) => <button key={key} className="filter-chip active" onClick={() => setFilter(key, '')}>{key === 'role' && ROLE_FAMILIES.includes(value as typeof ROLE_FAMILIES[number]) ? ROLE_LABELS[value as typeof ROLE_FAMILIES[number]] : value === '1' ? key === 'conflicts' ? 'Known requirements conflicts included' : key.replaceAll('-', ' ') : `${key}: ${value}`}<X size={12} /></button>)}<button className="text-link" onClick={() => setParams(params.get('job') ? { job: params.get('job')! } : {})}>Reset</button></div>}
      <div className="results-explainer"><span>{tab === 'for-you' ? 'Connected-feed shortlist · wider results in Search the market' : 'All catalog matches within this experience focus'}</span><button className="icon-button" aria-label="How prioritization works" onClick={showSettings}><CircleHelp size={14} /></button></div>
      <p className="listing-count" aria-live="polite">{results.length} listing{results.length === 1 ? '' : 's'}{tab === 'for-you' ? ` in ${groups.length} group${groups.length === 1 ? '' : 's'}` : ''}{tab === 'for-you' && groups.length < results.length ? ' · Matching recorded requirements are grouped; expand for every location and requisition.' : ''}</p>
      {snapshot.catalogTruncated && <p role="status" className="warning-text">Showing a limited catalog of {snapshot.jobs.length} / {snapshot.catalogTotal ?? 'unknown'} records. Narrow your search; this ordering is within the loaded set.</p>}
      {results.length ? <div className="job-list">{groups.slice(0, pageSize).map(group => <div className="listing-group" key={group.key}>{card(group.representative)}{!!group.variants.length && <details className="listing-variants"><summary>{group.listingCount} listings · Show {group.variants.length} more with matching recorded requirements</summary><p>Each location or requisition keeps its own source, save button and application link. Confirm the full posting before applying.</p><div className="job-list">{group.variants.map(card)}</div></details>}</div>)}{groups.length > pageSize && <button className="button button-secondary load-more" onClick={() => setPageSize(pageSize + 15)}>Show more opportunities <ChevronDown size={16} /></button>}</div> : <Empty title={activeFilters.length ? 'A little too specific, perhaps.' : experienceView === 'new-grad' ? 'No verified new-grad matches right now.' : 'No roles in this experience view.'} action={<div className="inline-actions"><button className="button button-secondary" onClick={() => setParams({})}>Reset filters</button><button className="button button-primary" onClick={showCoverage}>Check coverage</button></div>}>{activeFilters.length ? 'Try a broader search or reset your filters. You can always add an opportunity you found elsewhere.' : 'We do not fill the graduate shortlist with experienced or unverified roles. Check coverage, choose another experience focus, or track a suitable role you found elsewhere.'}</Empty>}
      <p className="results-footnote"><ShieldIcon /> Alignment labels explain preferences and evidence. They aren’t hiring predictions.</p></>}
    </section><aside className="discovery-aside">
      <div className="aside-card search-glance"><div className="aside-heading"><span className="eyebrow">YOUR SEARCH, AT A GLANCE</span><ArrowUpRight size={15} /></div><div className="glance-number">{snapshot.opportunities.filter(o => !['Rejected', 'Withdrawn'].includes(o.stage)).length}<span>open possibilities</span></div><div className="glance-grid"><div><strong>{snapshot.opportunities.filter(o => o.stage === 'Saved').length}</strong><span>Saved</span></div><div><strong>{snapshot.opportunities.filter(o => ['Applied', 'Assessment', 'Interviewing'].includes(o.stage)).length}</strong><span>In progress</span></div><div><strong>{snapshot.opportunities.filter(o => o.stage === 'Offer').length}</strong><span>Offers</span></div></div><Link className="aside-footer-link" to={`${base}/my-search`}>Keep your search moving <ArrowRight size={15} /></Link></div>
      <div className="aside-card preferences-card"><span className="eyebrow">A SHORTLIST THAT KNOWS YOUR DIRECTION</span><h3>Your interests.<br />Your next move.</h3><p>Roles rise to the top for reasons you can actually see.</p><div className="interest-pills">{snapshot.preferences.roleFamilies.length ? snapshot.preferences.roleFamilies.slice(0, 3).map(f => <span key={f}>{ROLE_LABELS[f]}</span>) : <span>Exploring all role families</span>}</div><div className="preference-mini"><MapPin size={14} /><span>{snapshot.preferences.locations.join(' · ') || 'Location is open'}</span></div><div className="preference-mini"><CheckCheck size={14} /><span>{snapshot.preferences.skills.length ? `${snapshot.preferences.skills.length} skills in your toolkit` : 'Add skills to see overlap'}</span></div><button className="text-link" onClick={showSettings}>Fine-tune your preferences <ArrowRight size={14} /></button></div>
      <div className="coverage-teaser"><span className="coverage-line" /><h3>More ways to find roles.</h3><p>Employer feeds, a remote market feed, and wider searches. Check the source and requirements before applying.</p><button className="text-link" onClick={showCoverage}>See our coverage <ArrowUpRight size={14} /></button></div>
    </aside></div>
    <Modal open={filters} onClose={() => setFilters(false)} title="A more focused shortlist" description="These are explicit filters. Unknown values won’t match a numeric requirement.">
      <div className="filter-form"><Field label="Location contains"><input value={place} onChange={e => setFilter('location', e.target.value)} placeholder="City, state, or country" /></Field><Field label="Work arrangement"><select value={params.get('work') || ''} onChange={e => setFilter('work', e.target.value)}><option value="">Any arrangement</option><option value="remote">Remote (verify restrictions)</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option></select></Field><Field label="Maximum required years of experience"><input type="number" min="0" max="50" value={params.get('experience') || ''} onChange={e => setFilter('experience', e.target.value)} /></Field><Field label="Minimum published annual base (USD)"><input type="number" min="0" value={params.get('pay') || ''} onChange={e => setFilter('pay', e.target.value)} /></Field><Field label="Verified deadline on or before"><input type="date" value={params.get('deadline') || ''} onChange={e => setFilter('deadline', e.target.value)} /></Field>{[['show-saved', 'Show saved & dismissed roles'], ['details', 'Include “Needs details checked”'], ['stale', 'Include results unverified for 72+ hours'], ['conflicts', 'Include known requirements conflicts']].map(([key, label]) => <label className="checkbox-label" key={key}><input type="checkbox" checked={filterFlags[key] ?? flag(key)} onChange={e => setFilterFlags(current => ({ ...current, [key]: e.target.checked }))} />{label}</label>)}</div><div className="dialog-actions"><button className="button button-quiet" onClick={() => { setParams({}); setFilterFlags({}); }}>Reset filters</button><button className="button button-primary" onClick={() => { setParams(_previous => { const updated = new URLSearchParams(window.location.search); for (const [key, enabled] of Object.entries(filterFlags)) { if (enabled) updated.set(key, '1'); else updated.delete(key); } return updated; }, { replace: true }); setFilters(false); }}>Show opportunities <ArrowRight size={16} /></button></div>
    </Modal>
    <JobDetails id={params.get('job')} onClose={() => setFilter('job', '')} onSave={save} />
  </div>;
}
function profileDate(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
function ShieldIcon() { return <CheckCheck size={14} />; }
function cardLocations(job: Job) {
  const labels = [...new Set(job.locations.flatMap(location => location.label.split(/\s*;\s*/)).map(label => label.trim()).filter(Boolean))];
  const first = labels[0] || 'Location unknown';
  return { labels, preview: first.length > 80 ? `${first.slice(0, 80).trimEnd()}…` : first, hasMore: labels.length > 1 || first.length > 80 };
}
function JobCard({ result, profile, saved, dismissed, onSave, onDismiss, onView, onApply }: { result: RankedJob; profile: Preferences; saved: boolean; dismissed: boolean; onSave: () => void; onDismiss: () => void; onView: () => void; onApply: () => void }) {
  const { job, label, reasons, caveats } = result;
  const stale = freshness(job.lastVerifiedAt) !== 'fresh';
  const experience = assessExperience(job);
  const locations = cardLocations(job);
  const pay = formatCompensation(job.salary);
  const sourceUnknowns = [job.employmentType === 'unknown' ? 'Full-time status unverified' : null, !job.locations.some(location => location.country === 'US') ? 'US location unverified' : null, job.availability === 'availability_unconfirmed' ? 'Availability unconfirmed' : job.availability === 'closed' ? 'Listing closed' : null].filter(Boolean);

  return <article className={`job-card ${dismissed ? 'dismissed-card' : ''}`} aria-label={`${job.title} at ${job.company}`}>
    <div className="job-card-main">
      <div className="job-top">
        <CompanyMark company={job.company} />
        <div className="job-title"><div className="company-line"><span>{job.company}</span><span className="dot-separator">·</span><span>{job.primaryRoleFamily ? ROLE_LABELS[job.primaryRoleFamily] : 'Role details unknown'}</span></div><h3><button type="button" onClick={onView}>{job.title}</button></h3></div>
        <button type="button" className={`icon-button bookmark-button ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-label={saved ? `${job.title} is saved` : `Save ${job.title}`}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      </div>
      <div className="job-meta">
        <span className="job-meta-item job-location-summary"><MapPin size={16} aria-hidden="true" /><span>{locations.preview}{job.workArrangement !== 'unknown' ? ` · ${job.workArrangement}` : ''}{locations.hasMore && <> <button type="button" className="text-link" onClick={onView} aria-label={`View all locations for ${job.title}`}>All locations</button></>}</span></span>
        <span className="job-meta-item"><Banknote size={16} aria-hidden="true" /><span>{pay.length > 110 ? <button type="button" className="text-link" onClick={onView}>See published pay details</button> : pay}</span></span>
        {job.timing.deadlineVerified && job.timing.deadline && <span className="job-meta-item job-deadline"><Clock3 size={16} aria-hidden="true" />Apply by {profileDate(job.timing.deadline)}</span>}
      </div>
      <div className="job-card-status"><ExperienceEvidence job={job} /><span className={`alignment-label ${label === 'Preference overlap' ? 'strong' : label === 'Experience stretch' || label === 'Known conflict' ? 'stretch' : ''}`}><span />{label}</span></div>
      {!!sourceUnknowns.length && <p className="job-source-summary warning-text">{sourceUnknowns.join(' · ')}</p>}
      <EligibilityEvidence profile={profile} job={job} />
      <SourceAttribution job={job} />
      <details className="job-supporting-details">
        <summary>Why this role & experience evidence</summary>
        <div className="job-supporting-content">
          <div className="job-experience-context"><strong>Experience evidence</strong><p>{experience.evidence || (experience.requiredYears !== null ? `The source reports a minimum of ${experience.requiredYears} years.` : 'Required years are unverified; review the original posting.')}</p>{!!job.experience.alternatives.length && <p>Degree and experience paths are conditional. Confirm which path you meet before applying.</p>}</div>
          {!!reasons.length && <ul className="job-reason-list">{reasons.map(reason => <li key={reason.code}><Check size={15} aria-hidden="true" /><span>{reason.text}</span></li>)}</ul>}
          {!!caveats.length && <div className="check-details"><strong>Worth checking</strong><ul className="job-caveat-list">{caveats.map((caveat, index) => <li key={index}>{caveat}</li>)}</ul></div>}
          <p className="hint">First found {formatDate(job.firstSeenAt)}. Preference overlap is not a hiring prediction.</p>
        </div>
      </details>
    </div>
    <div className="job-bottom">
      <span className={`freshness-note ${stale ? 'warning-text' : ''}`}><span className={stale ? 'stale-dot' : 'fresh-dot'} />{job.isDemo ? 'Sample · simulated dates' : stale ? `Feed stale · checked ${formatDate(job.lastVerifiedAt)}` : `Feed checked ${formatDate(job.lastVerifiedAt)}`}</span>
      <div className="job-actions"><button type="button" className="card-dismiss" aria-label={dismissed ? `Restore ${job.title}` : `Dismiss ${job.title}`} onClick={onDismiss}>{dismissed ? 'Restore' : 'Dismiss'}</button><button type="button" className="button button-quiet small" onClick={onView}>View role <ArrowRight size={16} aria-hidden="true" /></button><button type="button" className="application-link" onClick={onApply} aria-label={`Open application for ${job.title}`}><ArrowUpRight size={18} aria-hidden="true" /></button></div>
    </div>
  </article>;
}
function JobDetails({ id, onClose, onSave }: { id: string | null; onClose: () => void; onSave: (job: Job) => Promise<void> }) {
  const { repository, snapshot, openApplication, confirmApplication, run, notify } = useWorkspace();
  const details = useQuery({ queryKey: ['job-details', repository.mode, id], queryFn: () => repository.getJobDetails(id!), enabled: !!id });
  const job = details.data ?? snapshot.jobs.find(j => j.id === id);
  const [notes, setNotes] = useState('');
  const tracked = snapshot.opportunities.find(opportunity => opportunity.catalogJobId === id);
  useEffect(() => { setNotes(tracked?.notes || ''); }, [id, tracked?.notes]);
  const match = job ? rankJob(job, snapshot.preferences) : null;
  const locations = job ? cardLocations(job) : null;

  return <Modal open={!!id} onClose={onClose} title="A closer look" description="The requirements, the source, and your next step." drawer>
    {!job ? <p role="status">{details.isError ? 'Couldn’t load the role. Close and retry, or check the original source.' : details.isPending ? 'Loading role details…' : 'This role is not in the current catalog.'}</p> : <div className="job-details" key={job.id}>
      <div className="detail-company"><CompanyMark company={job.company} /><span>{job.company}</span>{job.isDemo && <span className="sample-pill">Fictional sample</span>}</div>
      <h2>{job.title}</h2>
      <div className="detail-metadata">
        <p><MapPin size={17} aria-hidden="true" /><span>{locations?.preview} · {job.workArrangement === 'unknown' ? 'Work arrangement unverified' : job.workArrangement}</span></p>
        {locations?.hasMore && <details className="detail-disclosure detail-locations"><summary>View all source locations</summary><ul>{locations.labels.map(location => <li key={location}>{location}</li>)}</ul><p className="hint">Location labels do not establish work authorization or remote eligibility.</p></details>}
        <p><Banknote size={17} aria-hidden="true" /><span>{formatCompensation(job.salary)}</span></p>
        <p><Clock3 size={17} aria-hidden="true" /><span>{job.employmentType === 'unknown' ? 'Full-time status unverified' : job.employmentType}</span></p>
      </div>
      <ExperienceEvidence job={job} full />
      <EligibilityEvidence profile={snapshot.preferences} job={job} full />
      <SourceAttribution job={job} />
      <div className="inline-actions detail-actions"><button type="button" className="button button-primary" onClick={() => openApplication(job)}>Open application <ArrowUpRight size={16} aria-hidden="true" /></button><button type="button" className="button button-secondary" onClick={() => void onSave(job)}><Bookmark size={16} aria-hidden="true" />{tracked ? 'Saved' : 'Save role'}</button>{tracked && <button type="button" className="button button-secondary" onClick={() => confirmApplication(tracked)}>Mark applied</button>}</div>
      <p className="hint">Opening a link never marks your application submitted.</p>

      <section className="detail-section">
        <h3>About this role</h3><p>{job.summary}</p>
        <details className="detail-disclosure"><summary>Read full job description</summary><div className="plain-description">{job.description || (details.isPending ? 'Loading original description…' : 'The source has not supplied a description.')}</div></details>
      </section>
      <section className="detail-section">
        <h3>Skills in the posting</h3><p><strong>Required:</strong> {job.requiredSkills.join(', ') || 'Not specified'}</p><p><strong>Preferred:</strong> {job.preferredSkills.join(', ') || 'Not specified'}</p>
      </section>
      <section className="detail-section">
        <h3>Why it’s on your shortlist</h3>
        <span className={`alignment-label ${match?.label === 'Preference overlap' ? 'strong' : match?.label === 'Known conflict' ? 'stretch' : ''}`}>{match?.label}</span>
        <details className="detail-disclosure"><summary>Preference reasons & what to check</summary><div className="evidence-list">{match?.reasons.length ? match.reasons.map(reason => <div key={reason.code}><Check size={16} aria-hidden="true" /><div><strong>{reason.text}</strong>{reason.evidence && <p>{reason.evidence}</p>}</div></div>) : <p>Add preferences to see personalized reasons.</p>}</div>{!!match?.caveats.length && <div className="check-details"><h4>Worth checking</h4>{match.caveats.map((caveat, index) => <p key={index}>{caveat}</p>)}</div>}<p className="hint">Evidence covers {match?.coverage}% of your active preference weights.{match?.missing.length ? ` Unknown: ${match.missing.join(', ')}.` : ''} This is not a chance of being hired.</p></details>
      </section>
      {!!job.salary.length && <details className="detail-disclosure detail-section"><summary>Compensation evidence</summary>{job.salary.map((band, index) => <p key={index}>{band.sourceText} <span className="hint">({band.currency}, {band.period}, {band.compensationType}{band.location ? `, ${band.location}` : ''})</span></p>)}</details>}
      <details className="detail-disclosure detail-section"><summary>Source & freshness</summary><p>First found {formatDate(job.firstSeenAt)} · Last feed check {formatDate(job.lastVerifiedAt)} · Availability: {job.availability.replaceAll('_', ' ')}</p>{job.sourceUpdatedAt && <p className="hint">Source updated {formatDate(job.sourceUpdatedAt)}. An update is not the original posting date.</p>}{job.sourcePublishedAt && <p className="hint">Last publication {formatDate(job.sourcePublishedAt)}; not necessarily first posted.</p>}{safeUrl(job.postingUrl) && <a className="text-link" href={safeUrl(job.postingUrl)!} target="_blank" rel="noopener noreferrer">{job.publisher ? `View listing on ${job.publisher.name}` : 'Original employer posting'} <ArrowUpRight size={16} aria-hidden="true" /></a>}</details>
      {tracked && <section className="detail-section"><h3>Private notes</h3><textarea aria-label="Private notes for this role" rows={4} placeholder="What would you like to remember?" value={notes} onChange={event => setNotes(event.target.value)} /><button type="button" className="button button-secondary" onClick={() => void run(() => repository.saveOpportunity({ ...tracked, notes, updatedAt: new Date().toISOString() }), 'Private notes saved.').catch(error => notify(error.message))}>Save notes</button></section>}
    </div>}
  </Modal>;
}

function ExperienceEvidence({ job, full = false }: { job: Job; full?: boolean }) {
  const assessment = assessExperience(job);
  const evidence = assessment.evidence && assessment.evidence !== job.title ? assessment.evidence : null;
  return <div className={`experience-evidence ${assessment.tier}`}>
    <strong>{assessment.label}</strong>
    {full && evidence && <details className="experience-source-details"><summary>Read experience evidence</summary><p>{evidence}</p></details>}
    {full && !evidence && <p>{assessment.requiredYears !== null ? `The source reports a minimum of ${assessment.requiredYears} years. Confirm the full requirements on the employer’s posting.` : assessment.explicitGraduate ? 'The employer targets graduate/entry-level hiring; a numeric minimum was not stated.' : 'Required experience is unverified. Missing years do not mean zero.'}</p>}
    {full && job.experience.alternatives.length > 0 && <p>Degree and experience paths are conditional. Confirm which path you meet before applying.</p>}
  </div>;
}
