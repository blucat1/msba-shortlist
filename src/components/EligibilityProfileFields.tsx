import { Field } from './ui';
import { COHORT } from '../domain/cohort';
import type { Preferences } from '../domain/types';
export function EligibilityProfileFields({ value, onChange }: { value: Preferences; onChange: (value: Preferences) => void }) {
  const update = <K extends keyof Preferences>(key: K, next: Preferences[K]) => onChange({ ...value, [key]: next });
  return <fieldset className="eligibility-profile full-width">
    <legend>Requirements to check</legend>
    <p className="hint">These optional details stay in your private preferences. Checks compare explicit posting evidence; an unknown requirement or a related degree still needs review.</p>
    <button type="button" className="button button-secondary small" onClick={() => onChange({ ...value, graduationDate: COHORT.graduationDate, graduationMonth: COHORT.graduationMonth, earliestStart: COHORT.earliestStart })}>Use May 15, 2027 cohort dates</button>
    <div className="form-grid">
      <Field label="Graduation date" hint="The cohort baseline is May 15, 2027. Clear it to keep only your chosen month."><input type="date" value={value.graduationDate ?? ''} onChange={event => onChange({ ...value, graduationDate: event.target.value || null, ...(event.target.value ? { graduationMonth: event.target.value.slice(0, 7) } : {}) })} /></Field>
      <Field label="Degree level by start date"><select value={value.educationLevel ?? ''} onChange={event => update('educationLevel', event.target.value as Preferences['educationLevel'] || null)}><option value="">Not provided</option><option value="bachelors">Bachelor’s</option><option value="masters">Master’s</option><option value="doctorate">Doctorate</option></select></Field>
      <Field label="Degree field" hint="Use the actual degree field. Related-field eligibility is checked separately."><input value={value.degreeField ?? ''} maxLength={200} onChange={event => update('degreeField', event.target.value || null)} placeholder="Business analytics" /></Field>
      <Field label="GPA" hint="Optional; different scales are never compared as equivalent."><input type="number" min="0" max={value.gpaScale ?? 100} step="0.01" value={value.gpa ?? ''} onChange={event => update('gpa', event.target.value ? Number(event.target.value) : null)} /></Field>
      <Field label="GPA scale"><input type="number" min="0.1" max="100" step="0.1" value={value.gpaScale ?? ''} onChange={event => update('gpaScale', event.target.value ? Number(event.target.value) : null)} placeholder="For example, 4.0" /></Field>
      <Field label="US work authorization" hint="Authorization does not establish citizenship or a promise of employer sponsorship."><select value={value.workAuthorization ?? 'unknown'} onChange={event => update('workAuthorization', event.target.value as Preferences['workAuthorization'])}><option value="unknown">Not provided / needs review</option><option value="authorized">Authorized to work in the US</option><option value="needs-sponsorship">Need employer sponsorship</option></select></Field>
      <Field label="Need sponsorship now or in the future?"><select value={value.requiresSponsorshipNowOrFuture == null ? '' : String(value.requiresSponsorshipNowOrFuture)} onChange={event => update('requiresSponsorshipNowOrFuture', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Not provided / needs review</option><option value="true">Yes</option><option value="false">No</option></select></Field>
    </div>
  </fieldset>;
}
