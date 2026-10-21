import { writeFile, mkdir } from 'node:fs/promises';
import { assessExperience } from '../src/domain/experience';
import { fetchBoard } from '../src/ingestion/adapters';
import { CLASSIFIER_VERSION } from '../src/ingestion/classification';
import { fetchPublicJson, mapConcurrent } from '../src/ingestion/http';
import { normalizePosting } from '../src/ingestion/normalize';
import { loadRegistry } from '../src/ingestion/registry';

const args = process.argv.slice(2);
const selected = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
const sources = (await loadRegistry()).filter(s => s.enabled && s.state === 'verified' && (!selected || s.id === selected));
if (!sources.length) throw new Error('No enabled verified source matches request.');
const checkedAt = new Date().toISOString();

const results = await mapConcurrent(sources, 3, async source => {
  const identity = { sourceId: source.id, company: source.company, provider: source.provider, board: source.board, evidenceUrl: source.evidenceUrl, checkedAt };
  try {
    const snapshot = await fetchBoard(source, fetchPublicJson, checkedAt);
    const jobs = snapshot.postings.map(p => normalizePosting(p, source, checkedAt));
    const graduateJobs = jobs.map(job => ({ job, experience: assessExperience(job) }))
      .filter(({ job, experience }) => job.classification.scope !== 'excluded' && experience.tier === 'new-grad');
    const graduateListings = graduateJobs.map(({ job, experience }) => ({
      externalId: job.externalId, title: job.title, postingUrl: job.postingUrl,
      scope: job.classification.scope, requiredYears: experience.requiredYears,
      explicitGraduate: experience.explicitGraduate, experienceLabel: experience.label,
    }));
    const result = {
      ...identity, endpoint: snapshot.endpoint, status: 'passed', raw: snapshot.rawCount, listed: jobs.length,
      inScope: jobs.filter(j => j.classification.scope === 'included').length,
      needsDetails: jobs.filter(j => j.classification.scope === 'needs-details').length,
      strictNewGrad: graduateListings.filter(j => j.scope === 'included').length,
      strictNewGradNeedsDetails: graduateListings.filter(j => j.scope === 'needs-details').length,
      graduateListings, error: null,
    };
    console.log(`${source.id}: ${result.raw} raw; ${result.listed} listed; ${result.inScope} all-experience in scope; ${result.needsDetails} all-experience need details; ${result.strictNewGrad} strict new-grad/0–1; ${result.strictNewGradNeedsDetails} strict new-grad/0–1 need details`);
    return result;
  } catch (error) {
    const message = error instanceof Error && !('issues' in error) ? error.message : 'Payload shape validation failed';
    console.error(`${source.id}: FAILED ${message}`);
    return { ...identity, endpoint: null, status: 'failed', raw: null, listed: null, inScope: null, needsDetails: null, strictNewGrad: null, strictNewGradNeedsDetails: null, graduateListings: [], error: message };
  }
});

const success = results.filter(r => r.status === 'passed').length;
const totals = results.reduce((sum, r) => ({
  raw: sum.raw + (r.raw || 0), listed: sum.listed + (r.listed || 0),
  inScope: sum.inScope + (r.inScope || 0), needsDetails: sum.needsDetails + (r.needsDetails || 0),
  strictNewGrad: sum.strictNewGrad + (r.strictNewGrad || 0),
  strictNewGradNeedsDetails: sum.strictNewGradNeedsDetails + (r.strictNewGradNeedsDetails || 0),
}), { raw: 0, listed: 0, inScope: 0, needsDetails: 0, strictNewGrad: 0, strictNewGradNeedsDetails: 0 });
const table = results.map(r => `| ${r.company} | ${r.provider}/${r.board} | ${r.status} | ${r.raw ?? '—'} | ${r.listed ?? '—'} | ${r.inScope ?? '—'} | ${r.needsDetails ?? '—'} | ${r.strictNewGrad ?? '—'} | ${r.strictNewGradNeedsDetails ?? '—'} | [Official careers evidence](${r.evidenceUrl}) |`).join('\n');
const graduateRows = results.flatMap(r => r.graduateListings.map(j => `| ${r.company} | [${j.title.replaceAll('|', ' / ')}](${j.postingUrl}) | ${j.scope === 'included' ? 'Strict default' : 'Needs details checked'} | ${j.requiredYears === null ? 'Not stated; explicit graduate evidence' : `${j.requiredYears}${j.requiredYears === 1 ? ' · experience requirement applies' : ''}`} |`)).join('\n');

await mkdir('docs', { recursive: true });
const pathSuffix = selected ? `.${selected}` : '';
await writeFile(`docs/source-results${pathSuffix}.json`, JSON.stringify({ checkedAt, classifierVersion: CLASSIFIER_VERSION, totals, results }, null, 2) + '\n');
await writeFile(`docs/SOURCE_AUDIT${pathSuffix}.md`, `# Source audit

Actual public-feed verification at **${checkedAt}** using \`npm run sources:verify${selected ? ` -- --source ${selected}` : ''}\`. **${success}/${sources.length}** configured sources returned complete, schema-valid snapshots. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as employers publish and close roles.

Totals across successful sources:

- **${totals.raw} raw / ${totals.listed} publicly listed** postings across all roles and countries.
- **${totals.inScope} all-experience in scope / ${totals.needsDetails} all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **${totals.strictNewGrad} strict New grad & 0–1 years / ${totals.strictNewGradNeedsDetails} additional strict-tier listings needing details**: uses the same \`assessExperience\` function as the app. The second group has unknown US eligibility or employment type and is excluded from the strict default.

| Employer | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${table}

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **${CLASSIFIER_VERSION}**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict default requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict default. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
${graduateRows || '| — | No strict-tier listings found | — | — |'}

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs and provider posting IDs cross-matched to that board), not guessed from employer names. See \`data/employers.json\` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Atomic server finalization quarantines a >60% board drop, and closure requires two complete successful snapshots at least twelve hours apart. Failed sources preserve prior catalog records.

${results.filter(r => r.error).map(r => `- **${r.company}:** ${r.error}`).join('\n') || 'No network or payload failures occurred in this verification run.'}
`);
console.log(`Audit written: docs/SOURCE_AUDIT${pathSuffix}.md (${success}/${sources.length} passed). Strict new-grad/0–1: ${totals.strictNewGrad}; additional strict tier needing details: ${totals.strictNewGradNeedsDetails}.`);
if (success !== sources.length) process.exitCode = 1;
