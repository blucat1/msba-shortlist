import { useEffect, useId, useRef, useState } from 'react';
import { Check, FileText, Trash2, Upload } from 'lucide-react';
import { useResumeWorkspace, type ResumeDocument } from '../app/resume-store';
import { MAX_RESUME_TEXT_LENGTH, type ResumeProfile } from '../domain/resume';
import { ROLE_FAMILIES, ROLE_LABELS } from '../domain/types';
import type { EducationLevel } from '../domain/eligibility';
import { importResumeFile } from '../lib/resume-import';

/** Local text review and heuristic report. It never writes to a repository. */
export function ResumeWorkspace({ onUseResume }: { onUseResume?: () => void } = {}) {
  const workspace = useResumeWorkspace();
  const { document, analysis, profile, reviewed, analysisVersion, setDocument, setProfile, setReviewed, analyzeDocument, clearResume } = workspace;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reading = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const focusReportRequested = useRef(false);
  const inputId = useId(), textId = useId();
  useEffect(() => () => { requestId.current++; reading.current?.abort(); }, []);
  useEffect(() => {
    if (!analysis || !focusReportRequested.current) return;
    focusReportRequested.current = false;
    reportHeading.current?.focus({ preventScroll: true });
    reportHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }, [analysis, analysisVersion]);
  const text = document?.text ?? draft;

  async function chooseFile(file: File) {
    const id = ++requestId.current;
    reading.current?.abort();
    const controller = new AbortController(); reading.current = controller;
    setBusy(true); setError('');
    try {
      const imported = await importResumeFile(file, { signal: controller.signal });
      if (id !== requestId.current) return;
      setDraft(''); setDocument({ ...imported, importedAt: new Date().toISOString() });
    } catch (cause) {
      if (id !== requestId.current || (cause instanceof DOMException && cause.name === 'AbortError')) return;
      setError(cause instanceof Error ? cause.message : 'This file could not be read. Try TXT, DOCX or a text-based PDF.');
    } finally { if (id === requestId.current) { setBusy(false); reading.current = null; } }
  }

  function remove() {
    requestId.current++; reading.current?.abort(); reading.current = null;
    clearResume(); setDraft(''); setError(''); setBusy(false);
  }

  function editText(value: string) {
    setError('');
    if (document) setDocument({ ...document, text: value });
    else setDraft(value);
  }

  function analyze() {
    setError('');
    if (text.trim().length < 40 || (text.match(/\S+/g)?.length ?? 0) < 5) { setError('Add at least 40 characters of resume text before analyzing.'); return; }
    if (text.length > MAX_RESUME_TEXT_LENGTH) { setError('Keep resume text within 100,000 characters.'); return; }
    const source: ResumeDocument = document || { fileName: 'Pasted resume text', fileType: 'txt', text: text.trim(), warnings: [], pageCount: null, importedAt: new Date().toISOString() };
    try { analyzeDocument(source); focusReportRequested.current = true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The text could not be analyzed. Review it and try again.'); }
  }

  return <section className="resume-workspace" aria-label="Resume workspace">
    <p className="resume-privacy">Processed in this tab. Nothing is uploaded.</p>
    <details className="resume-privacy-details"><summary>Privacy &amp; file support</summary><p>Resume text and your reviewed profile stay in this tab’s memory. Remove the resume, reload, or sign out to clear them. Demo and live workspaces stay separate.</p><p>Use TXT, DOCX or selectable-text PDF. Scans and password-protected files are unsupported.</p></details>
    <div className="resume-import-controls">
      <label className="resume-file-control" htmlFor={inputId}><Upload size={18} aria-hidden="true" /><span>Choose resume file</span></label>
      <input id={inputId} type="file" accept=".txt,.docx,.pdf" disabled={busy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void chooseFile(file); }} aria-describedby={`${inputId}-help`} />
      {(document || draft || busy) && <button type="button" className="button button-secondary" onClick={remove}><Trash2 size={16} aria-hidden="true" />Remove resume</button>}
    </div>
    <p id={`${inputId}-help`} className="hint">TXT, DOCX or PDF · 5 MiB · 20 PDF pages</p>
    {busy && <p className="resume-import-status" role="status">Reading the document locally…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {document && <div className="resume-file-summary"><FileText size={18} aria-hidden="true" /><span>{document.fileName} · {document.fileType.toUpperCase()}{document.pageCount !== null ? ` · ${document.pageCount} page${document.pageCount === 1 ? '' : 's'}` : ''}</span></div>}
    {!!document?.warnings.length && <ul className="resume-import-warnings">{document.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
    <div className="field resume-text-review">
      <label htmlFor={textId}>{document ? 'Review and edit extracted resume text' : 'Or paste your resume text'}</label>
      <textarea id={textId} rows={6} value={text} maxLength={MAX_RESUME_TEXT_LENGTH} disabled={busy} onChange={event => editText(event.target.value)} placeholder="Paste your resume, then select Analyze resume." aria-describedby={`${textId}-help`} />
      <small id={`${textId}-help`}>{text.length.toLocaleString('en-US')} / 100,000 characters. Editing clears the report; analyze again.</small>
    </div>
    <button type="button" className="button button-primary resume-analyze" disabled={busy || !text.trim()} onClick={analyze}>Analyze resume <FileText size={16} aria-hidden="true" /></button>
    <p className="resume-analysis-status" role="status" aria-live="polite">{analysis ? 'Resume report ready. Review extracted profile below.' : ''}</p>

    {analysis && profile && <>
      <section className="resume-report" aria-labelledby={`${textId}-report`}>
        <div className="resume-section-heading"><h3 id={`${textId}-report`} ref={reportHeading} tabIndex={-1}>Local resume report</h3><span>{analysis.wordCount.toLocaleString('en-US')} words · {analysis.skillEvidence.length} skill mentions</span></div>
        <p className="hint">Text checks, not an employer ATS test.</p>
        <details className="resume-parsing-details"><summary>Parsing report · {analysis.checks.filter(check => check.status !== 'pass').length} to review</summary>
        <p className="hint">Your original layout may parse differently elsewhere.</p>
        <ul className="resume-check-list">{analysis.checks.map(check => <li className={`resume-check resume-check-${check.status}`} key={check.id}>
          <div><strong>{check.label}</strong><span>{check.status === 'pass' ? 'Evidence found' : check.status === 'missing' ? 'Not detected' : 'Review'}</span></div>
          <p>{check.detail}</p>
          {!!check.evidence.length && <details><summary>Text evidence</summary><ul>{check.evidence.map((evidence, index) => <li key={`${index}:${evidence}`}>{evidence}</li>)}</ul></details>}
        </li>)}</ul></details>
      </section>
      <section className="resume-profile-review" aria-labelledby={`${textId}-profile`}>
        <h3 id={`${textId}-profile`}>Review your profile</h3>
        <p className="hint">Keep only skills you can support. Experience and completed education stay unknown until you confirm them.</p>
        <ResumeProfileEditor key={analysisVersion} profile={profile} setProfile={setProfile} />
        {!!analysis.educationEvidence.length && <details className="resume-detected-education"><summary>Education evidence</summary><ul>{analysis.educationEvidence.map((item, index) => <li key={`${index}:${item.evidence}`}><span>{item.status === 'in-progress' ? 'In progress' : item.status === 'completed' ? 'Completion wording found' : 'Completion unverified'}</span><p>{item.evidence}</p></li>)}</ul></details>}
        {!!analysis.skillEvidence.length && <details className="resume-detected-skills"><summary>Skill evidence</summary><ul>{analysis.skillEvidence.map(item => <li key={item.skill}><strong>{item.skill}</strong><ul>{item.evidence.map((evidence, index) => <li key={`${index}:${evidence}`}>{evidence}</li>)}</ul></li>)}</ul></details>}
        <label className="checkbox-label resume-confirm-profile"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />I reviewed this profile. Use it for matches in this tab.</label>
        <p className="resume-review-status" role="status">{reviewed ? <><Check size={16} aria-hidden="true" />Ready to compare</> : 'Confirm to compare. Editing requires review again.'}</p>
        {onUseResume && <button type="button" className="button button-primary" disabled={!reviewed || busy} onClick={onUseResume}>Use this resume <Check size={16} aria-hidden="true" /></button>}
      </section>
    </>}
  </section>;
}

function ResumeProfileEditor({ profile, setProfile }: { profile: ResumeProfile; setProfile: (profile: ResumeProfile) => void }) {
  const [skills, setSkills] = useState(profile.skills.join(', '));
  const [years, setYears] = useState(profile.yearsExperience?.toString() ?? '');
  const skillsId = useId(), yearsId = useId(), educationId = useId(), fieldId = useId();
  return <div className="resume-profile-fields">
    <div className="field"><label htmlFor={skillsId}>Skills to compare</label><textarea id={skillsId} rows={3} maxLength={4000} value={skills} onChange={event => { const value = event.target.value; setSkills(value); setProfile({ ...profile, skills: [...new Set(value.split(/[,;\n]/).map(skill => skill.trim()).filter(Boolean))].slice(0, 100) }); }} aria-describedby={`${skillsId}-help`} /><small id={`${skillsId}-help`}>Separate skills with commas. Remove inaccurate mentions.</small></div>
    <div className="resume-confirmed-fields">
      <div className="field"><label htmlFor={yearsId}>Professional experience (years)</label><input id={yearsId} aria-label="Confirmed professional experience (years)" type="number" min={0} max={60} step={0.5} value={years} onChange={event => { setYears(event.target.value); const value = event.target.value === '' ? null : Number(event.target.value); setProfile({ ...profile, yearsExperience: value !== null && Number.isFinite(value) && value >= 0 && value <= 60 ? value : null }); }} /><small>Leave blank if unknown; exclude coursework.</small></div>
      <div className="field"><label htmlFor={educationId}>Highest completed degree</label><select id={educationId} aria-label="Highest completed degree (confirm yourself)" value={profile.educationLevel ?? ''} onChange={event => setProfile({ ...profile, educationLevel: event.target.value ? event.target.value as EducationLevel : null })}><option value="">Unknown / not confirmed</option><option value="bachelors">Bachelor’s completed</option><option value="masters">Master’s completed</option><option value="doctorate">Doctorate completed</option></select><small>Completed degrees only.</small></div>
      <div className="field"><label htmlFor={fieldId}>Completed degree field</label><input id={fieldId} maxLength={200} value={profile.degreeField ?? ''} placeholder="Leave blank if unconfirmed" onChange={event => setProfile({ ...profile, degreeField: event.target.value.trim() ? event.target.value : null })} /></div>
    </div>
    <details className="resume-role-interests"><summary>Role interests · {profile.roleInterests.length} selected</summary><fieldset><legend>Role families to compare</legend>{ROLE_FAMILIES.map(role => <label className="checkbox-label" key={role}><input type="checkbox" checked={profile.roleInterests.includes(role)} onChange={event => setProfile({ ...profile, roleInterests: event.target.checked ? [...profile.roleInterests, role] : profile.roleInterests.filter(value => value !== role) })} />{ROLE_LABELS[role]}</label>)}</fieldset></details>
  </div>;
}
