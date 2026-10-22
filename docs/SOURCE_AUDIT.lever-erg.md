# Source audit

Actual public-feed verification at **2026-10-22T07:29:14.683Z** using `npm run sources:verify -- --source lever-erg`. **1/1** configured sources returned schema-valid employer boards or complete API discovery windows. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as publishers update listings; these sources do not represent the entire market.

Totals across successful sources:

- **1 actual May 15, 2027 cohort-default listings**, including **1 confirmed zero-year listings**, after known timing/eligibility/source-review conflicts are withheld. Other unspecified requirements remain unknown.

- **38 raw / 38 publicly listed** postings across all roles and countries.
- **1 all-experience in scope / 1 all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **1 strict New grad & 0–1 years / 1 additional strict-tier listings needing details**: uses the same `assessExperience` function as the app, before individual eligibility/source-review filtering. The per-listing table distinguishes the actual cohort default. The second group has unknown US eligibility or employment type and is excluded from the strict default.

| Employer/source | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ERG (Eastern Research Group) | lever/erg | passed | 38 | 38 | 1 | 1 | 1 | 1 | [Official source evidence](https://www.erg.com/jobs) |

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **2026-10-22.1**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict default requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict default. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
| ERG (Eastern Research Group) | [Business Analyst](https://jobs.lever.co/erg/9a3377d5-a4bc-431c-80ee-0a538a0dc13e) | Needs details checked | 1 · experience requirement applies |
| ERG (Eastern Research Group) | [Entry-Level Occupational Safety and Health Data Analyst](https://jobs.lever.co/erg/26fdd838-c4ba-4538-825c-c16b36d18fe1) | Cohort default | 0 |

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs and provider posting IDs cross-matched to that board), not guessed from employer names. See `data/employers.json` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

Jobicy is a cross-employer publisher, not one selected employer. Its free USA query covers a rolling seven-day remote-job window and may include Anywhere listings, which remain country-unverified. Publisher identity and job-board reuse/credit terms were checked against its official API and fair-use documentation; individual employers are not all independently vetted. The adapter retains each job's actual company name and canonical Jobicy listing URL. Missing from that window never proves closure: production checks older known IDs through its status API, closes only explicit closed statuses and withholds unknown statuses from recommendations. These are Jobicy listing states, not live employer ATS probes. Market search links on the site open external Google, Indeed and LinkedIn results without importing or counting them. Choose either live verification or live ingestion for a Jobicy synchronization, no more than hourly; replay captured public responses for additional development checks instead of polling again.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.
- [Jobicy public API/fair use](https://jobicy.com/jobs-rss-feed) and [OpenAPI contract](https://jobicy.com/api/openapi.json): unauthenticated free API only, visible Jobicy attribution and canonical listing links; full cursor traversal of its discovery window, plus exact status batches for older records. No paid Bearer API or original-ATS-link mode.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Employer-board finalization quarantines a >60% board drop, and board-absence closure requires two complete successful snapshots at least twelve hours apart. Jobicy instead uses the explicit status reconciliation described above. Failed sources preserve prior catalog records.

No network or payload failures occurred in this verification run.
