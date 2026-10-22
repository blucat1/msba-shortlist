import { Field } from '../components/ui';
import { EXPERIENCE_VIEWS } from '../domain/experience';
import { ROLE_FAMILIES, ROLE_LABELS, type JobSource } from '../domain/types';

const selections = (value: string | null) => value?.split(',').map(item => item.trim()).filter(Boolean) ?? [];
export function DiscoveryFilterFields({ value, onChange, sources, companies }: {
  value: string; onChange: (value: string) => void; sources: JobSource[]; companies: string[];
}) {
  const params = new URLSearchParams(value);
  const set = (key: string, next: string) => { const updated = new URLSearchParams(value); if (next || key === 'availability') updated.set(key, next); else updated.delete(key); onChange(updated.toString()); };
  const selectedValues = (key: string) => key === 'availability' && !params.has(key) ? ['open'] : selections(params.get(key));
  const toggle = (key: string, item: string, checked: boolean) => { const selected = new Set(selectedValues(key)); if (checked) selected.add(item); else selected.delete(item); set(key, [...selected].join(',')); };
  const check = (key: string, label: string) => <label className="checkbox-label" key={key}><input type="checkbox" checked={params.get(key) === '1'} onChange={event => set(key, event.target.checked ? '1' : ['details', 'show-saved'].includes(key) ? '0' : '')} />{label}</label>;
  const choices = (key: string, entries: readonly (readonly [string, string])[]) => <div className="filter-options">{entries.map(([item, label]) => <label className="checkbox-label" key={item}><input type="checkbox" checked={selectedValues(key).includes(item)} onChange={event => toggle(key, item, event.target.checked)} />{label}</label>)}</div>;
  function preset(broad: boolean) {
    const updated = new URLSearchParams(value); updated.set('career', broad ? 'all' : 'new-grad');
    for (const key of ['excluded', 'conflicts', 'stale', 'availability']) updated.delete(key);
    if (broad) updated.set('details', '1'); else updated.delete('details');
    onChange(updated.toString());
  }
  return <div className="discovery-filter-fields">
    <div className="filter-presets"><button className="button button-secondary" onClick={() => preset(false)}>Strict new-grad</button><button className="button button-secondary" onClick={() => preset(true)}>Broader catalog</button></div>
    <p className="hint">Choose several options within a group to match any of them. Different groups apply together.</p>
    <div className="filter-form">
      <Field label="Experience focus"><select value={params.get('career') || 'new-grad'} onChange={event => set('career', event.target.value)}>{EXPERIENCE_VIEWS.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}</select></Field>
      <Field label="Role family"><select value={selections(params.get('role'))[0] || ''} onChange={event => set('role', event.target.value)}><option value="">All roles</option>{ROLE_FAMILIES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></Field>
      <Field label="Location contains" hint="Separate alternatives with commas, e.g. Seattle, Boston."><input value={params.get('location') || ''} onChange={event => set('location', event.target.value)} placeholder="City, state, or country" /></Field>
      <Field label="Keyword matching"><select value={params.get('words') || 'all'} onChange={event => set('words', event.target.value)}><option value="all">All search words</option><option value="any">Any search word</option></select></Field>
    </div>
    <details className="filter-section"><summary>More role and work options</summary>
      <fieldset><legend>Role families · choose several</legend>{choices('role', ROLE_FAMILIES.map(role => [role, ROLE_LABELS[role]] as const))}</fieldset>
      <fieldset><legend>Work arrangements</legend>{choices('work', [['remote', 'Remote (verify restrictions)'], ['hybrid', 'Hybrid'], ['onsite', 'Onsite'], ['unknown', 'Not stated']])}</fieldset>
      <fieldset><legend>Employment types</legend>{choices('employment', [['full-time', 'Full-time'], ['part-time', 'Part-time'], ['contract', 'Contract'], ['internship', 'Internship'], ['unknown', 'Not stated']])}</fieldset>
      <p className="hint">Other employment types may require the wider-scope option below. Coverage depends on connected feeds.</p>
    </details>
    <details className="filter-section"><summary>Experience, pay and deadlines</summary><div className="filter-form">
      <Field label="Maximum required years of experience"><input type="number" min="0" max="50" step="0.5" value={params.get('experience') || ''} onChange={event => set('experience', event.target.value)} /></Field>
      <Field label="Minimum published annual base (USD)"><input type="number" min="0" max="10000000" step="1000" value={params.get('pay') || ''} onChange={event => set('pay', event.target.value)} /></Field>
      <Field label="Verified deadline on or before"><input type="date" value={params.get('deadline') || ''} onChange={event => set('deadline', event.target.value)} /></Field>
    </div>{check('unknown-experience', 'Keep unknown required experience when a maximum is set')}{check('unknown-pay', 'Keep missing or non-comparable salary when a minimum is set')}
      <p className="hint">Pay uses the published annual USD base minimum. Hourly pay and other currencies are not converted.</p>
    </details>
    <details className="filter-section"><summary>Dates and sources</summary><div className="filter-form">
      <Field label="Date evidence"><select value={params.get('date-basis') || 'found'} onChange={event => set('date-basis', event.target.value)}><option value="found">First found here</option><option value="posted">Original posting date</option><option value="published">Source publication date</option></select></Field>
      <Field label="From date"><input type="date" value={params.get('from') || ''} onChange={event => set('from', event.target.value)} /></Field>
      <Field label="Through date"><input type="date" value={params.get('through') || ''} onChange={event => set('through', event.target.value)} /></Field>
      <Field label="Found or posted within"><select value={params.get('age') || ''} onChange={event => set('age', event.target.value)}><option value="">Any time</option><option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="90">90 days</option></select></Field>
      <Field label="Employer names" hint="Separate employer names with commas; matching ignores case."><input value={params.get('companies') || ''} onChange={event => set('companies', event.target.value)} placeholder="Any employer" list="discovery-companies" /></Field>
      <datalist id="discovery-companies">{companies.map(company => <option key={company} value={company} />)}</datalist>
    </div>{check('unknown-date', 'Keep postings with missing selected date evidence')}
      <p className="hint">Original, publication and discovery dates are distinct. A missing original date stays unknown.</p>
      <fieldset><legend>Posting platforms</legend>{choices('providers', [['greenhouse', 'Greenhouse'], ['lever', 'Lever'], ['ashby', 'Ashby'], ['jobicy', 'Jobicy']])}</fieldset>
      <Field label="Source feed"><select value={selections(params.get('sources'))[0] || ''} onChange={event => set('sources', event.target.value)}><option value="">All connected feeds</option>{sources.map(source => <option value={source.id} key={source.id}>{source.company} · {source.provider}</option>)}</select></Field>
    </details>
    <details className="filter-section" open><summary>Coverage and exceptions</summary>
      {check('show-saved', 'Show saved & dismissed roles')}
      {check('details', 'Include “Needs details checked”')}
      {check('stale', 'Include results unverified for 72+ hours')}
      {check('conflicts', 'Include known requirements conflicts')}
      {check('excluded', 'Include roles outside the graduate catalog')}
      <p className="hint">The wider scope loads additional relevant postings, which can include internships, contract work, international or leadership roles. Their scope warnings remain visible. It does not add new feed coverage.</p>
      <fieldset><legend>Listing availability</legend>{choices('availability', [['open', 'Open'], ['availability_unconfirmed', 'Availability unconfirmed'], ['closed', 'Closed · historical records']])}</fieldset>
    </details>
  </div>;
}
