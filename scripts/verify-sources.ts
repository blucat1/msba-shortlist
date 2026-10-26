import { writeFile, mkdir } from 'node:fs/promises';
import { rankJobs } from '../src/domain/ranking';
import { DEFAULT_PREFERENCES } from '../src/domain/types';
import { assessExperience } from '../src/domain/experience';
import { fetchBoard } from '../src/ingestion/adapters';
import { CLASSIFIER_VERSION } from '../src/ingestion/classification';
import { fetchPublicJson, mapConcurrent } from '../src/ingestion/http';
import { normalizePosting } from '../src/ingestion/normalize';
import { loadRegistry } from '../src/ingestion/registry';

const args = process.argv.slice(2);
const selected = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
const employerOnly = args.includes('--employer-only');
const sources = (await loadRegistry()).filter(s => s.enabled && s.state === 'verified' && (!selected || s.id === selected) && (!employerOnly || s.provider !== 'jobicy'));
if (!sources.length) throw new Error('No enabled verified source matches request.');
const checkedAt = new Date().toISOString();

const results = await mapConcurrent(sources, 3, async source => {
  const identity = { sourceId: source.id, company: source.company, provider: source.provider, board: source.board, sourceKind: source.provider === 'jobicy' ? 'rolling-market-feed' : 'employer-board', evidenceUrl: source.evidenceUrl, checkedAt };
  try {
    const snapshot = await fetchBoard(source, fetchPublicJson, checkedAt);
    const jobs = snapshot.postings.map(p => normalizePosting(p, source, checkedAt));
    const graduateJobs = jobs.map(job => ({ job, experience: assessExperience(job) }))
      .filter(({ job, experience }) => job.classification.scope !== 'excluded' && experience.tier === 'new-grad');
    const cohortIds = new Set(rankJobs(jobs, DEFAULT_PREFERENCES, { now: new Date(checkedAt), includeTracked: true }).map(row => row.job.id));
    const zeroIds = new Set(rankJobs(jobs, DEFAULT_PREFERENCES, { now: new Date(checkedAt), includeTracked: true, experienceView: 'zero-experience' }).map(row => row.job.id));
    const graduateListings = graduateJobs.map(({ job, experience }) => ({
      externalId: job.externalId, company: job.company, title: job.title, postingUrl: job.postingUrl,
      scope: job.classification.scope, cohortDefault: cohortIds.has(job.id), confirmedZero: zeroIds.has(job.id), sourceReview: job.sourceReview || null, timing: job.timing, eligibility: job.eligibility, requiredYears: experience.requiredYears,
      explicitGraduate: experience.explicitGraduate, experienceLabel: experience.label,
    }));
    const result = {
      ...identity, endpoint: snapshot.endpoint, status: 'passed', raw: snapshot.rawCount, listed: jobs.length,
      employersInWindow: new Set(jobs.map(job => job.company.trim().toLocaleLowerCase())).size,
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
    return { ...identity, endpoint: null, status: 'failed', raw: null, listed: null, employersInWindow: null, inScope: null, needsDetails: null, strictNewGrad: null, strictNewGradNeedsDetails: null, graduateListings: [], error: message };
  }
});

const success = results.filter(r => r.status === 'passed').length;
const totals = results.reduce((sum, r) => ({
  raw: sum.raw + (r.raw || 0), listed: sum.listed + (r.listed || 0),
  inScope: sum.inScope + (r.inScope || 0), needsDetails: sum.needsDetails + (r.needsDetails || 0),
  strictNewGrad: sum.strictNewGrad + (r.strictNewGrad || 0),
  strictNewGradNeedsDetails: sum.strictNewGradNeedsDetails + (r.strictNewGradNeedsDetails || 0),
}), { raw: 0, listed: 0, inScope: 0, needsDetails: 0, strictNewGrad: 0, strictNewGradNeedsDetails: 0 });
const table = results.map(r => `| ${r.company} | ${r.provider}/${r.board} | ${r.status} | ${r.raw ?? '—'} | ${r.listed ?? '—'} | ${r.inScope ?? '—'} | ${r.needsDetails ?? '—'} | ${r.strictNewGrad ?? '—'} | ${r.strictNewGradNeedsDetails ?? '—'} | [Official source evidence](${r.evidenceUrl}) |`).join('\n');
const cohortCount = results.flatMap(r => r.graduateListings).filter(row => row.cohortDefault).length;
const zeroCount = results.flatMap(r => r.graduateListings).filter(row => row.confirmedZero).length;
const graduateRows = results.flatMap(r => r.graduateListings.map(j => `| ${j.company.replaceAll('|', ' / ')} | [${j.title.replaceAll('|', ' / ')}](${j.postingUrl}) | ${j.scope === 'included' ? (j.cohortDefault ? 'Cohort default' : 'Withheld: eligibility/source conflict') : 'Needs details checked'} | ${j.requiredYears === null ? 'Not stated; explicit graduate evidence' : `${j.requiredYears}${j.requiredYears === 1 ? ' · experience requirement applies' : ''}`} |`)).join('\n');

await mkdir('docs', { recursive: true });
const pathSuffix = selected ? `.${selected}` : employerOnly ? '.employer-boards' : '';
await writeFile(`docs/source-results${pathSuffix}.json`, JSON.stringify({ checkedAt, classifierVersion: CLASSIFIER_VERSION, totals, results }, null, 2) + '\n');
await writeFile(`docs/SOURCE_AUDIT${pathSuffix}.md`, `# Source audit

Actual public-feed verification at **${checkedAt}** using \`npm run sources:verify${selected ? ` -- --source ${selected}` : ''}\`. **${success}/${sources.length}** configured sources returned schema-valid employer boards or complete API discovery windows. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as publishers update listings; these sources do not represent the entire market.

Totals across successful sources:

- **${cohortCount} strict new-grad May 15, 2027 cohort listings**, including **${zeroCount} confirmed zero-year listings**, after known timing/eligibility/source-review conflicts are withheld. Other unspecified requirements remain unknown.

- **${totals.raw} raw / ${totals.listed} publicly listed** postings across all roles and countries.
- **${totals.inScope} all-experience in scope / ${totals.needsDetails} all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **${totals.strictNewGrad} strict New grad & 0–1 years / ${totals.strictNewGradNeedsDetails} additional strict-tier listings needing details**: uses the same \`assessExperience\` function as the app, before individual eligibility/source-review filtering. The per-listing table distinguishes the strict new-grad cohort view. The second group has unknown US eligibility or employment type and is excluded from the strict new-grad tier.

| Employer/source | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${table}

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **${CLASSIFIER_VERSION}**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict new-grad tier requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict new-grad tier. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
${graduateRows || '| — | No strict-tier listings found | — | — |'}

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs and provider posting IDs cross-matched to that board), not guessed from employer names. See \`data/employers.json\` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

Jobicy is a cross-employer publisher, not one selected employer. Its free USA query covers a rolling seven-day remote-job window and may include Anywhere listings, which remain country-unverified. Publisher identity and job-board reuse/credit terms were checked against its official API and fair-use documentation; individual employers are not all independently vetted. The adapter retains each job's actual company name and canonical Jobicy listing URL. Missing from that window never proves closure: production checks older known IDs through its status API, closes only explicit closed statuses and withholds unknown statuses from recommendations. These are Jobicy listing states, not live employer ATS probes. Market search links on the site open external Google, Indeed and LinkedIn results without importing or counting them. Choose either live verification or live ingestion for a Jobicy synchronization, no more than hourly; replay captured public responses for additional development checks instead of polling again.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.
- [Jobicy public API/fair use](https://jobicy.com/jobs-rss-feed) and [OpenAPI contract](https://jobicy.com/api/openapi.json): unauthenticated free API only, visible Jobicy attribution and canonical listing links; full cursor traversal of its discovery window, plus exact status batches for older records. No paid Bearer API or original-ATS-link mode.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Employer-board finalization quarantines a >60% board drop, and board-absence closure requires two complete successful snapshots at least twelve hours apart. Jobicy instead uses the explicit status reconciliation described above. Failed sources preserve prior catalog records.

${results.filter(r => r.error).map(r => `- **${r.company}:** ${r.error}`).join('\n') || 'No network or payload failures occurred in this verification run.'}
`);
console.log(`Audit written: docs/SOURCE_AUDIT${pathSuffix}.md (${success}/${sources.length} passed). Strict new-grad/0–1: ${totals.strictNewGrad}; additional strict tier needing details: ${totals.strictNewGradNeedsDetails}.`);
if (success !== sources.length) process.exitCode = 1;
