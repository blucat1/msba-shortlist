import type { CompatibilityRequirement, ResumeCompatibility as Compatibility } from '../domain/resume-matching';

export function ResumeCompatibility({ result, full = false }: { result: Compatibility; full?: boolean }) {
  const score = <div className={`resume-score ${result.conflicts.length ? 'has-conflict' : ''}`}><strong>{result.score === null ? 'Score unavailable' : `${result.score}/100`}</strong><span>Resume compatibility</span></div>;
  const content = <>
    <p className="hint">Recorded overlap, not an employer ATS score or hiring probability. Missing terms do not prove missing skills.</p>
    <div className="resume-evidence-columns">
      <RequirementEvidence label="Matches" items={result.matched} empty="No recorded matches." />
      <RequirementEvidence label="Not recorded" items={result.missing} empty="No gaps in assessed criteria. Review unknowns below." />
    </div>
    <RequirementEvidence label="Unknowns" items={result.unverified} empty="No recorded unknowns in this comparison." />
    <details className="resume-score-method"><summary>How it’s scored</summary><p>Assessed weight: {result.scoredWeight}/{result.possibleWeight}. Earned points are divided by the assessed weight. Unknowns earn no credit and stay outside that denominator.</p>
      <dl>{result.breakdown.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{item.earned === null ? 'Unknown' : `${Math.round(item.earned * 10) / 10} / ${item.maximum}`}<p>{item.reason}</p></dd></div>)}</dl>
    </details>
    {!!result.recommendations.length && <details className="resume-score-method resume-next-actions"><summary>Review suggestions</summary><ul>{result.recommendations.map(item => <li key={item}>{item}</li>)}</ul></details>}
  </>;
  return <section className={`resume-compatibility ${full ? 'full' : ''}`} aria-label="Resume compatibility">
    {score}<p className="resume-score-coverage">{result.scoreLabel} · {result.coverage}% evidence coverage</p>
    {!!result.conflicts.length && <div className="resume-conflicts"><strong>Requirements to review</strong><ul>{result.conflicts.map(item => <li key={item.id}>{item.reason}</li>)}</ul>{result.scoreCap !== null && <p>Score capped at {result.scoreCap} for a required qualification conflict.</p>}</div>}
    {full ? content : <details><summary>Why this score?</summary><div className="resume-compatibility-details">{content}</div></details>}
  </section>;
}

function RequirementEvidence({ label, items, empty }: { label: string; items: CompatibilityRequirement[]; empty: string }) {
  return <details className="resume-score-method resume-evidence-group"><summary>{label} ({items.length})</summary>{items.length ? <ul>{items.map(item => <li key={item.id}><strong>{item.label}{item.strength === 'preferred' ? ' · preferred' : ''}</strong><p>{item.reason}</p>{!!item.evidence.length && <ul className="resume-requirement-evidence">{item.evidence.map((evidence, index) => <li key={`${index}:${evidence}`}>{evidence}</li>)}</ul>}</li>)}</ul> : <p>{empty}</p>}</details>;
}
