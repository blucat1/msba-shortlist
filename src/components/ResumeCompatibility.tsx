import type { ResumeCompatibility as Compatibility } from '../domain/resume-matching';

export function ResumeCompatibility({ result, full = false }: { result: Compatibility; full?: boolean }) {
  const score = <div className={`resume-score ${result.conflicts.length ? 'has-conflict' : ''}`}><strong>{result.score === null ? 'Score unavailable' : `${result.score}/100`}</strong><span>Resume compatibility</span></div>;
  const content = <>
    <p><strong>{result.scoreLabel}</strong> · {result.coverage}% evidence coverage</p>
    <p className="hint">A local comparison of your reviewed profile with recorded posting requirements. Missing resume terms do not prove a missing skill. This is not an employer ATS result or hiring probability.</p>
    {!!result.conflicts.length && <div className="resume-conflicts"><strong>Known requirements to review</strong><ul>{result.conflicts.map(item => <li key={item.id}>{item.reason}</li>)}</ul>{result.scoreCap !== null && <p>The score is capped at {result.scoreCap} because a required qualification conflicts.</p>}</div>}
    <div className="resume-evidence-columns">
      <div><h4>Recorded matches</h4>{result.matched.length ? <ul>{result.matched.map(item => <li key={item.id}><strong>{item.label}</strong><span>{item.reason}</span></li>)}</ul> : <p>No verified comparison yet.</p>}</div>
      <div><h4>Not found in your profile</h4>{result.missing.length ? <ul>{result.missing.map(item => <li key={item.id}><strong>{item.label}{item.strength === 'preferred' ? ' · preferred' : ''}</strong><span>{item.reason}</span></li>)}</ul> : <p>No recorded gaps in the assessed criteria. Unknowns still need review.</p>}</div>
    </div>
    <details className="resume-score-method"><summary>Score breakdown and unknowns</summary><p>Points earned are divided by {result.scoredWeight} assessed weight points out of {result.possibleWeight}. Unknown dimensions earn no match credit and remain outside that denominator.</p>
      <dl>{result.breakdown.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{item.earned === null ? 'Unknown' : `${Math.round(item.earned * 10) / 10} / ${item.maximum}`}<p>{item.reason}</p></dd></div>)}</dl>
      <h4>Unverified requirements</h4><ul>{result.unverified.map(item => <li key={item.id}><strong>{item.label}</strong>: {item.reason}</li>)}</ul>
    </details>
    {!!result.recommendations.length && <div className="resume-next-actions"><h4>Review next</h4><ul>{result.recommendations.map(item => <li key={item}>{item}</li>)}</ul></div>}
  </>;
  return <section className={`resume-compatibility ${full ? 'full' : ''}`} aria-label="Resume compatibility">
    {score}{!full && <p className="resume-score-coverage">{result.scoreLabel} · {result.coverage}% evidence</p>}
    {full ? content : <details><summary>Why this score?</summary><div className="resume-compatibility-details">{content}</div></details>}
  </section>;
}
