import { Check, FileText, Layers3, SlidersHorizontal } from 'lucide-react';
import { Field } from '../components/ui';
import { EXPERIENCE_VIEWS } from '../domain/experience';
import { ROLE_FAMILIES, ROLE_LABELS } from '../domain/types';
import type { MatchingMode } from './discovery-options';

const matchingChoices = [
  { value: 'filters', label: 'Your preferences', detail: 'Roles, location and experience', icon: SlidersHorizontal },
  { value: 'resume', label: 'Your resume', detail: 'Skills and qualifications', icon: FileText },
  { value: 'combined', label: 'Both', detail: 'Preferences + resume', icon: Layers3 },
] as const;
const workChoices = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'Onsite'], ['unknown', 'Not stated']] as const;
const selections = (value: string | null) => value?.split(',').map(item => item.trim()).filter(Boolean) ?? [];

/** Edits only the parent's recommendation draft. Applying or discarding it is
 * handled by the owning dialog; resume content never enters these parameters. */
export function RecommendationControls({ value, onChange, resumeReady, onReviewResume }: {
  value: string;
  onChange: (value: string) => void;
  resumeReady: boolean;
  onReviewResume: () => void;
}) {
  const params = new URLSearchParams(value);
  const mode: MatchingMode = matchingChoices.find(choice => choice.value === params.get('match'))?.value ?? 'filters';
  const set = (key: string, next: string) => {
    const updated = new URLSearchParams(value);
    if (next || ['role', 'location', 'work'].includes(key)) updated.set(key, next); else updated.delete(key);
    onChange(updated.toString());
  };
  const toggle = (key: string, item: string, checked: boolean) => {
    const selected = new Set(selections(params.get(key)));
    if (checked) selected.add(item); else selected.delete(item);
    set(key, [...selected].join(','));
  };
  const roles = selections(params.get('role'));
  const works = selections(params.get('work'));
  const roleChoice = (role: typeof ROLE_FAMILIES[number]) => <label key={role} className={`rec-interest-choice ${roles.includes(role) ? 'active' : ''}`}>
    <input type="checkbox" checked={roles.includes(role)} onChange={event => toggle('role', role, event.target.checked)} />
    <span>{ROLE_LABELS[role]}</span>
  </label>;
  const optionalKeys = ['q', 'experience', 'unknown-experience', 'pay', 'unknown-pay', 'details'];
  const optionalCount = optionalKeys.filter(key => params.has(key) && params.get(key) !== '0').length;
  const extraRoles = ROLE_FAMILIES.slice(6);
  const extraRoleCount = extraRoles.filter(role => roles.includes(role)).length;

  return <div className="rec-controls">
    <fieldset className="rec-matching-method">
      <legend>Match using</legend>
      <div className="rec-mode-options">
        {matchingChoices.map(choice => <button type="button" key={choice.value} aria-pressed={mode === choice.value}
          className={`rec-mode-choice ${mode === choice.value ? 'active' : ''}`}
          onClick={() => set('match', choice.value === 'filters' ? '' : choice.value)}>
          <choice.icon size={22} aria-hidden="true" />
          <span><span className="rec-mode-label">{choice.label}</span><span className="rec-mode-detail">{choice.detail}</span></span>
          {mode === choice.value && <Check size={20} className="rec-mode-check" aria-hidden="true" />}
        </button>)}
      </div>
    </fieldset>

    {mode !== 'filters' && <div className={`rec-resume-status ${resumeReady ? 'is-ready' : ''}`}>
      <span>{resumeReady ? 'Resume ready' : 'Add and review your resume to start.'}</span>
      <button type="button" className="button button-secondary" onClick={onReviewResume}>
        <FileText size={19} aria-hidden="true" />{resumeReady ? 'Review resume' : 'Add resume'}
      </button>
    </div>}

    {mode === 'resume' ? <p className="rec-preferences-paused">Preferences paused. Comparing open roles across all experience levels.</p> : <div className="rec-preferences">
      <div className="rec-control-grid">
        <Field label="Experience"><select value={params.get('career') || 'new-grad'} onChange={event => set('career', event.target.value)}>
          {EXPERIENCE_VIEWS.map(view => <option value={view.value} key={view.value}>{view.label}</option>)}
        </select></Field>
        <Field label="Location"><input value={params.get('location') || ''} onChange={event => set('location', event.target.value)} placeholder="Any location" maxLength={500} /></Field>
      </div>

      <fieldset className="rec-role-interests">
        <legend>Roles</legend>
        <button type="button" className={`rec-any-choice ${!roles.length ? 'active' : ''}`} aria-pressed={!roles.length} onClick={() => set('role', '')}>All roles</button>
        <div className="rec-interest-options">{ROLE_FAMILIES.slice(0, 6).map(roleChoice)}</div>
        <details className="rec-more-roles">
          <summary>More roles{extraRoleCount > 0 ? ` · ${extraRoleCount} selected` : ''}</summary>
          <div className="rec-interest-options">{extraRoles.map(roleChoice)}</div>
        </details>
      </fieldset>

      <fieldset className="rec-work-arrangements">
        <legend>Work arrangement</legend>
        <div className="rec-work-options">
          <button type="button" className={`rec-any-choice ${!works.length ? 'active' : ''}`} aria-pressed={!works.length} onClick={() => set('work', '')}>Any</button>
          {workChoices.map(([work, label]) => <label key={work} className={`rec-interest-choice ${works.includes(work) ? 'active' : ''}`}>
            <input type="checkbox" checked={works.includes(work)} onChange={event => toggle('work', work, event.target.checked)} /><span>{label}</span>
          </label>)}
        </div>
      </fieldset>

      <details className="rec-more-options">
        <summary>More options{optionalCount > 0 ? ` · ${optionalCount} set` : ''}</summary>
        <div className="rec-control-grid">
          <Field label="Keywords"><input value={params.get('q') || ''} onChange={event => set('q', event.target.value)} placeholder="Optional" maxLength={500} /></Field>
          <Field label="Minimum annual base (USD)"><input type="number" min="0" max="10000000" step="1000" value={params.get('pay') || ''} onChange={event => set('pay', event.target.value)} placeholder="Any pay" /></Field>
          <Field label="Maximum required years"><input type="number" min="0" max="80" step="0.5" value={params.get('experience') || ''} onChange={event => set('experience', event.target.value)} placeholder="No extra limit" /></Field>
        </div>
        {params.get('pay') && <label className="checkbox-label"><input type="checkbox" checked={params.get('unknown-pay') === '1'} onChange={event => set('unknown-pay', event.target.checked ? '1' : '')} />Include missing or non-comparable pay</label>}
        {params.get('experience') && <label className="checkbox-label"><input type="checkbox" checked={params.get('unknown-experience') === '1'} onChange={event => set('unknown-experience', event.target.checked ? '1' : '')} />Include unknown required years</label>}
        <label className="checkbox-label"><input type="checkbox" checked={params.get('details') === '1'} onChange={event => set('details', event.target.checked ? '1' : '')} />Include roles needing details checked</label>
      </details>
    </div>}
  </div>;
}
