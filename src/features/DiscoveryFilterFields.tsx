import { Field } from '../components/ui';
import { EXPERIENCE_VIEWS } from '../domain/experience';
import { ROLE_FAMILIES, ROLE_LABELS, type JobSource } from '../domain/types';

const selections = (value: string | null) => value?.split(',').map(item => item.trim()).filter(Boolean) ?? [];
const workOptions = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'Onsite'], ['unknown', 'Not stated']] as const;
const employmentOptions = [['full-time', 'Full-time'], ['part-time', 'Part-time'], ['contract', 'Contract'], ['internship', 'Internship'], ['unknown', 'Not stated']] as const;
const roleOptions = ROLE_FAMILIES.map(role => [role, ROLE_LABELS[role]] as const);

export function DiscoveryFilterFields({ value, onChange, sources, companies }: {
  value: string; onChange: (value: string) => void; sources: JobSource[]; companies: string[];
}) {
  const params = new URLSearchParams(value);
  const set = (key: string, next: string) => { const updated = new URLSearchParams(value); if (next || key === 'availability') updated.set(key, next); else updated.delete(key); onChange(updated.toString()); };
  const selectedValues = (key: string) => key === 'availability' && !params.has(key) ? ['open'] : selections(params.get(key));
  const toggle = (key: string, item: string, checked: boolean) => { const selected = new Set(selectedValues(key)); if (checked) selected.add(item); else selected.delete(item); set(key, [...selected].join(',')); };
  const check = (key: string, label: string) => <label className="checkbox-label" key={key}><input type="checkbox" checked={params.get(key) === '1'} onChange={event => set(key, event.target.checked ? '1' : ['details', 'show-saved'].includes(key) ? '0' : '')} />{label}</label>;
  const choices = (key: string, entries: readonly (readonly [string, string])[]) => <div className="filter-options">{entries.map(([item, label]) => <label className="checkbox-label" key={item}><input type="checkbox" checked={selectedValues(key).includes(item)} onChange={event => toggle(key, item, event.target.checked)} />{label}</label>)}</div>;
  const select = (key: string, label: string, entries: readonly (readonly [string, string])[], any: string, hint?: string) => {
    const selected = selections(params.get(key));
    const selectionHint = selected.length > 1 && ['role', 'work', 'employment'].includes(key) ? 'Edit under More filters → Multiple choices.' : '';
    return <Field label={label} hint={[selectionHint, hint].filter(Boolean).join(' ') || undefined}><select value={selected.join(',')} onChange={event => set(key, event.target.value)}>
      <option value="">{any}</option>
      {selected.length > 1 && <option value={selected.join(',')}>{selected.length} selected</option>}
      {entries.map(([item, text]) => <option value={item} key={item}>{text}</option>)}
    </select></Field>;
  };
  const countSet = (keys: readonly string[]) => keys.filter(key => params.has(key)).length;
  const summary = (label: string, keys: readonly string[]) => <summary>{label}{countSet(keys) > 0 && ` · ${countSet(keys)} set`}</summary>;
  const multipleGroups = ['role', 'work', 'employment'].filter(key => selections(params.get(key)).length > 1).length;
  const advancedCount = countSet(['words', 'experience', 'pay', 'deadline', 'unknown-experience', 'unknown-pay', 'date-basis', 'from', 'through', 'age', 'companies', 'unknown-date', 'providers', 'sources', 'show-saved', 'details', 'stale', 'conflicts', 'excluded', 'availability']) + multipleGroups;
  function preset(broad: boolean) {
    const updated = new URLSearchParams(value); updated.set('career', broad ? 'all' : 'new-grad');
    for (const key of ['excluded', 'conflicts', 'stale', 'availability']) updated.delete(key);
    if (broad) updated.set('details', '1'); else updated.delete('details');
    onChange(updated.toString());
  }
  return <div className="discovery-filter-fields">
    <div className="filter-presets"><button type="button" className="button button-secondary" onClick={() => preset(false)}>New-grad</button><button type="button" className="button button-secondary" onClick={() => preset(true)}>All experience levels</button></div>
    <div className="filter-form">
      <Field label="Experience focus"><select value={params.get('career') || 'new-grad'} onChange={event => set('career', event.target.value)}>{EXPERIENCE_VIEWS.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}</select></Field>
      {select('role', 'Role family', roleOptions, 'All roles')}
      <Field label="Location" hint="Use commas for alternatives."><input value={params.get('location') || ''} onChange={event => set('location', event.target.value)} placeholder="City, state, or country" /></Field>
      {select('work', 'Work arrangement', workOptions, 'Any arrangement', 'Check remote location restrictions.')}
      {select('employment', 'Employment type', employmentOptions, 'Any type', selections(params.get('employment')).some(type => !['full-time', 'unknown'].includes(type)) ? 'Other types may need wider scope in Listing options.' : undefined)}
    </div>
    <details className="filter-section filter-advanced"><summary>More filters{advancedCount > 0 && ` · ${advancedCount} set`}</summary>
      <details className="filter-section"><summary>Multiple choices{multipleGroups > 0 && ` · ${multipleGroups} ${multipleGroups === 1 ? 'group' : 'groups'} set`}</summary>
        <p className="hint">Match any selection within a group. Groups apply together.</p>
        <fieldset><legend>Role families</legend>{choices('role', roleOptions)}</fieldset>
        <fieldset><legend>Work arrangements</legend>{choices('work', workOptions)}</fieldset>
        <fieldset><legend>Employment types</legend>{choices('employment', employmentOptions)}</fieldset>
        <p className="hint">Other employment types may need “Outside the graduate catalog” below.</p>
      </details>
      <details className="filter-section">{summary('Pay and experience', ['experience', 'pay', 'unknown-experience', 'unknown-pay'])}<div className="filter-form">
        <Field label="Max required experience (years)"><input type="number" min="0" max="50" step="0.5" value={params.get('experience') || ''} onChange={event => set('experience', event.target.value)} /></Field>
        <Field label="Minimum annual base (USD)"><input type="number" min="0" max="10000000" step="1000" value={params.get('pay') || ''} onChange={event => set('pay', event.target.value)} /></Field>
      </div>{check('unknown-experience', 'Include unknown required experience')}{check('unknown-pay', 'Include missing or non-comparable pay')}
        <p className="hint">Annual USD base only; hourly pay and other currencies are not converted.</p>
      </details>
      <details className="filter-section">{summary('Dates and sources', ['date-basis', 'from', 'through', 'age', 'deadline', 'companies', 'unknown-date', 'providers', 'sources'])}<div className="filter-form">
        <Field label="Date to use"><select value={params.get('date-basis') || 'found'} onChange={event => set('date-basis', event.target.value)}><option value="found">First found here</option><option value="posted">Original posting date</option><option value="published">Source publication date</option></select></Field>
        <Field label="From"><input type="date" value={params.get('from') || ''} onChange={event => set('from', event.target.value)} /></Field>
        <Field label="Through"><input type="date" value={params.get('through') || ''} onChange={event => set('through', event.target.value)} /></Field>
        <Field label="Within"><select value={params.get('age') || ''} onChange={event => set('age', event.target.value)}><option value="">Any time</option><option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></Field>
        <Field label="Verified deadline by"><input type="date" value={params.get('deadline') || ''} onChange={event => set('deadline', event.target.value)} /></Field>
        <Field label="Employers" hint="Separate names with commas."><input value={params.get('companies') || ''} onChange={event => set('companies', event.target.value)} placeholder="Any employer" list="discovery-companies" /></Field>
        <datalist id="discovery-companies">{companies.map(company => <option key={company} value={company} />)}</datalist>
      </div>{check('unknown-date', 'Include missing date evidence')}
        <p className="hint">Posting, publication and discovery dates are separate. Missing dates stay unknown.</p>
        <fieldset><legend>Posting platforms</legend>{choices('providers', [['greenhouse', 'Greenhouse'], ['lever', 'Lever'], ['ashby', 'Ashby'], ['jobicy', 'Jobicy']])}</fieldset>
        {select('sources', 'Source feed', sources.map(source => [source.id, `${source.company} · ${source.provider}`] as const), 'All connected feeds')}
      </details>
      <details className="filter-section">{summary('Listing options', ['show-saved', 'details', 'stale', 'conflicts', 'excluded', 'availability'])}
        {check('show-saved', 'Show saved & dismissed roles')}
        {check('details', 'Include “Needs details checked”')}
        {check('stale', 'Include results unverified for 72+ hours')}
        {check('conflicts', 'Include known requirements conflicts')}
        {check('excluded', 'Include roles outside the graduate catalog')}
        <p className="hint">Wider scope can include internships, contract, international and leadership roles. Warnings remain; feed coverage stays the same.</p>
        <fieldset><legend>Listing availability</legend>{choices('availability', [['open', 'Open'], ['availability_unconfirmed', 'Availability unconfirmed'], ['closed', 'Closed · historical records']])}</fieldset>
      </details>
      <details className="filter-section">{summary('Search words', ['words'])}
        <Field label="Keyword matching"><select value={params.get('words') || 'all'} onChange={event => set('words', event.target.value)}><option value="all">All search words</option><option value="any">Any search word</option></select></Field>
      </details>
    </details>
  </div>;
}
