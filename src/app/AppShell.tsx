import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, BarChart3, Bookmark, Check, Compass, Layers2, Plus, Settings2, ShieldCheck, WifiOff, X } from 'lucide-react';
import { createDemoRepository } from '../repositories/demo';
import { createSupabaseRepository } from '../repositories/supabase';
import { getConfigurationError, getSupabaseClient, signInWithGoogle, signOut } from '../lib/supabase';
import { WorkspaceContext } from './store';
import { Busy, dateToday, Empty, Modal, NoticeContext, safeUrl } from '../components/ui';
import { SettingsDialog, InformationDialog } from '../features/Settings';
import { OpportunityForm } from '../features/OpportunityForm';
import { createTask, opportunityFromJob } from '../domain/records';
import { addDays, dateOnlyInTimezone } from '../domain/dates';
import type { Job, Opportunity } from '../domain/types';
import type { Repository } from '../repositories/types';
import { appConfig } from '../config';
import { StudioGlass } from '../components/glass/StudioGlass';

export function AppShell({ mode }: { mode: 'demo' | 'live' }) {
  const cache = useQueryClient();
  const [authId, setAuthId] = useState<string | null>(null); const previousAuth = useRef<string | null>(null);
  const [toast, setToast] = useState(''); const [settings, setSettings] = useState(false);
  const [information, setInformation] = useState<'coverage' | 'privacy' | 'terms' | null>(null);
  const [manual, setManual] = useState<Opportunity | 'new' | null>(null);
  const [application, setApplication] = useState<Job | Opportunity | null>(null);
  const [reviewSuggestion, setReviewSuggestion] = useState<Opportunity | null>(null);
  const [applicationDate, setApplicationDate] = useState(dateToday()); const applyKey = useRef(crypto.randomUUID()); const [applying, setApplying] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const base = mode === 'demo' ? '/demo' : '';
  const configError = mode === 'live' ? getConfigurationError() : null;
  const repository = useMemo<Repository | null>(() => mode === 'demo' ? createDemoRepository() : configError ? null : createSupabaseRepository(), [mode, configError]);
  const queryKey = ['snapshot', mode, authId];
  const query = useQuery({ queryKey, queryFn: () => repository!.getSnapshot(), enabled: !!repository });
  useEffect(() => {
    if (mode === 'demo' || configError) return;
    const client = getSupabaseClient();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id !== previousAuth.current) { cache.clear(); setApplication(null); setReviewSuggestion(null); setManual(null); setSettings(false); if (previousAuth.current) { try { for (const key of Object.keys(sessionStorage)) { if (key.startsWith('msba-shortlist:pending-application:live:')) sessionStorage.removeItem(key); } } catch { /* Storage may be disabled. */ } } previousAuth.current = id; }
      setAuthId(id);
    });
    return () => data.subscription.unsubscribe();
  }, [mode, configError, cache]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  const notify = (message: string) => setToast(message);
  async function run<T,>(work: () => Promise<T>, success?: string): Promise<T> { try { const result = await work(); await cache.invalidateQueries({ queryKey: ['snapshot', mode] }); if (success) notify(success); return result; } catch (error) { await cache.invalidateQueries({ queryKey: ['snapshot', mode] }); notify(error instanceof Error ? error.message : 'Something went wrong. Your changes were not saved.'); throw error; } }
  const openSettings = () => { if (!query.data) { notify(configError || 'Settings will be available once your workspace loads.'); return; } setSettings(true); };
  const requireUser = () => { if (mode === 'demo' || query.data?.userId) return true; setSettings(true); notify('Sign in with Google to save your personal search.'); return false; };
  function openApplication(job: Job) {
    if (mode === 'live') { const url = safeUrl(job.applicationUrl || job.postingUrl); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else { notify('The source has not provided a safe application link.'); return; } }
    if (mode === 'demo' || query.data?.userId) {
      setApplication(job); applyKey.current = crypto.randomUUID(); setApplicationDate(dateOnlyInTimezone(new Date(), query.data?.preferences.timezone));
      const tracked = query.data?.opportunities.find(o => o.catalogJobId === job.id);
      if (tracked) void run(() => repository!.recordApplicationOpened(tracked.id, crypto.randomUUID())).catch(() => {});
    } else notify('Application opened. Sign in to track it after you submit.');
  }
  async function confirmApplied() {
    if (!application || !repository || !query.data?.userId || !applicationDate || applying) return;
    setApplying(true);
    try {
      let tracked: Opportunity;
      if ('sourceId' in application) { tracked = query.data.opportunities.find(o => o.catalogJobId === application.id) ?? await repository.saveOpportunity(opportunityFromJob(application, query.data.userId)); }
      else tracked = application;
      const confirmed = await run(() => repository.changeStage(tracked.id, 'Applied', { applicationDate, idempotencyKey: applyKey.current }), 'Application confirmed.');
      setApplication(null); setReviewSuggestion(confirmed);
    } catch { /* Keep confirmation open so the date is not lost. */ } finally { setApplying(false); }
  }
  const navigation = [{ path: '/opportunities', label: 'Opportunities', icon: Compass }, { path: '/my-search', label: 'My Search', icon: Bookmark }, { path: '/insights', label: 'Insights', icon: BarChart3 }];
  const snapshot = query.data;
  const pendingKey = `msba-shortlist:pending-application:${mode}:${snapshot?.userId || 'guest'}`;
  const restoredPending = useRef<string | null>(null);
  useEffect(() => {
    if (!snapshot?.userId || restoredPending.current === pendingKey) return;
    restoredPending.current = pendingKey;
    try { const saved = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); if (saved?.id) { const target = saved.kind === 'job' ? snapshot.jobs.find(j => j.id === saved.id) : snapshot.opportunities.find(o => o.id === saved.id); if (target) { setApplication(target); setApplicationDate(saved.date || dateOnlyInTimezone(new Date(), snapshot.preferences.timezone)); } } } catch { /* An expired local draft never blocks the workspace. */ }
  }, [pendingKey, snapshot]);
  useEffect(() => {
    if (!snapshot?.userId || restoredPending.current !== pendingKey) return;
    try { if (application) sessionStorage.setItem(pendingKey, JSON.stringify({ id: application.id, kind: 'sourceId' in application ? 'job' : 'opportunity', date: applicationDate })); else sessionStorage.removeItem(pendingKey); } catch { /* Draft persistence is optional; saves still report repository failures. */ }
  }, [application, applicationDate, pendingKey, snapshot?.userId]);
  const promptedOnboarding = useRef<string | null>(null);
  useEffect(() => { if (mode === 'live' && snapshot?.userId && !snapshot.preferences.onboardingComplete && promptedOnboarding.current !== snapshot.userId) { promptedOnboarding.current = snapshot.userId; setSettings(true); } }, [mode, snapshot?.userId, snapshot?.preferences.onboardingComplete]);
  return <NoticeContext.Provider value={toast}><div className="application landmarks-workspace">
    <div className="workspace-scene" aria-hidden="true" />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="workspace-body">
      {mode === 'demo' && <div className="demo-banner"><span><span className="demo-dot" /> <strong>Demo</strong> — sample jobs; changes stay in this browser.</span><Link to="/opportunities">View live mode <ArrowUpRight size={13} /></Link></div>}
      <header className="topbar glass-header studio-surface">
        <StudioGlass tone="chrome" />
        <Link to={`${base}/opportunities`} className="brand shell-brand" aria-label={appConfig.name}>
          <span className="brand-mark"><Layers2 size={22} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className="brand-wordmark mobile-brand">{appConfig.name.split(' ').at(-1)}<small className="brand-caption">{appConfig.name.split(' ').slice(0, -1).join(' ')}</small></span>
        </Link>
        <nav className="desktop-navigation" aria-label="Main navigation">{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`${base}${path}`} className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></NavLink>)}</nav>
        <div className="topbar-actions">
          {mode === 'live' && !authId ? <button className="button button-primary small" onClick={() => void signInWithGoogle().catch(e => notify(e.message))}>Sign in with Google <ArrowRight size={15} aria-hidden="true" /></button> : <button className="button button-primary small" onClick={() => { if (requireUser()) setManual('new'); }}><Plus size={16} aria-hidden="true" /> Add opportunity</button>}
          <button className="icon-button header-settings" aria-label="Settings" onClick={openSettings}><Settings2 size={20} aria-hidden="true" /><span className="header-settings-label">Settings</span></button>
        </div>
      </header>
      {offline && <div className="offline-banner" role="status"><WifiOff size={16} /> You’re offline. {mode === 'demo' ? 'Your demo changes still stay in this browser.' : 'Cloud changes need a connection. Retry when you’re back online.'}</div>}
      {reviewSuggestion && snapshot?.userId && <div className="followup-suggestion"><span>Application confirmed. Would a review reminder in 10 days help?</span><button onClick={() => { const opportunity = reviewSuggestion; if (snapshot.tasks.some(t => t.opportunityId === opportunity.id && t.type === 'review' && t.origin === 'suggested')) { notify('A review reminder already exists for this role.'); setReviewSuggestion(null); return; } void run(() => repository!.saveTask({ ...createTask(opportunity.id, snapshot.userId!, 'Review application status'), type: 'review', origin: 'suggested', dueDate: addDays(dateOnlyInTimezone(new Date(), snapshot.preferences.timezone), 10) }), 'Review reminder accepted. No email will be sent.').then(() => setReviewSuggestion(null)).catch(() => {}); }}>Accept reminder <Plus size={13} /></button><button aria-label="Dismiss reminder suggestion" onClick={() => setReviewSuggestion(null)}><X size={15} /></button></div>}
      <main id="main-content" tabIndex={-1}>
        {configError ? <div className="config-state"><span className="eyebrow">LIVE CATALOG</span><h1>The live workspace needs setup.</h1><p role="alert">{configError}</p><p>You can explore every workflow in the separate demo while the owner connects Supabase.</p><Link className="button button-primary" to="/demo">Try the demo <ArrowRight size={17} /></Link><button className="button button-quiet" onClick={() => setInformation('privacy')}>Privacy & storage</button></div> : query.isPending ? <Busy /> : query.isError || !snapshot || !repository ? <Empty title="Your workspace couldn’t load" action={<div className="inline-actions"><button className="button button-primary" onClick={() => void query.refetch()}>Try again</button>{mode === 'demo' && <button className="button button-secondary" onClick={() => void run(() => repository!.resetDemo!(), 'Demo reset.').catch(() => {})}>Reset demo</button>}</div>}>{query.error?.message || 'Check your connection and try again. The demo remains available at /demo.'}</Empty> : <WorkspaceContext.Provider value={{ snapshot, repository, mode, base, run, notify, requireUser, showSettings: () => setSettings(true), showCoverage: () => setInformation('coverage'), showManual: o => { if (requireUser()) setManual(o ?? 'new'); }, openApplication, confirmApplication: o => { setApplication(o); applyKey.current = crypto.randomUUID(); setApplicationDate(o.applicationDate || dateOnlyInTimezone(new Date(), snapshot.preferences.timezone)); } }}>
          <Outlet />
          <SettingsDialog open={settings} onClose={() => setSettings(false)} onSignOut={async () => { cache.clear(); setApplication(null); await signOut(); }} />
          <OpportunityForm open={manual !== null} opportunity={manual && manual !== 'new' ? manual : undefined} onClose={() => setManual(null)} />
        </WorkspaceContext.Provider>}
      </main>
      <footer className="page-footer"><span>{appConfig.name}</span><div><button onClick={() => setInformation('coverage')}>Coverage</button><button onClick={() => setInformation('privacy')}>Privacy</button><button onClick={() => setInformation('terms')}>Terms</button><a href="/licenses/" target="_blank" rel="noopener noreferrer">Credits</a><span>Independent. Not affiliated with Cal Poly.</span></div></footer>
    </div>
    <nav className="mobile-nav studio-surface" aria-label="Mobile navigation"><StudioGlass tone="chrome" />{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={`${base}${path}`}><Icon size={21} /><span>{label}</span></NavLink>)}<button onClick={openSettings} aria-label="Settings"><Settings2 size={21} aria-hidden="true" /><span>Settings</span></button></nav>
    <InformationDialog kind={information} sources={snapshot?.sources ?? []} snapshot={snapshot} onClose={() => setInformation(null)} />
    <Modal open={application !== null} onClose={() => setApplication(null)} title="Did you submit this application?" description={mode === 'demo' ? 'Demo interaction — no real vacancy was opened. Opening an application never counts as a submission.' : 'The employer page opened in a new tab. Only confirm after you have submitted your application.'}>
      <div className="application-confirm"><span className="confirmation-icon"><Check size={24} /></span><h3>{application?.title}</h3><p>{application?.company}</p></div><label className="field"><span>Application date</span><input type="date" value={applicationDate} max={dateOnlyInTimezone(new Date(), snapshot?.preferences.timezone)} onChange={e => setApplicationDate(e.target.value)} /></label><p className="hint">Confirmation adds an application event to your private search. You can correct the date later.</p><div className="dialog-actions"><button className="button button-quiet" onClick={() => setApplication(null)}>Not yet</button><button className="button button-primary" disabled={applying || !applicationDate} onClick={() => void confirmApplied()}>{applying ? 'Saving…' : 'Yes, I applied'}<ArrowRight size={16} /></button></div><button className="dismiss-link" onClick={() => setApplication(null)}>Dismiss</button>
    </Modal>
    {toast && <div className="toast" role="status"><ShieldCheck size={18} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div></NoticeContext.Provider>;
}
