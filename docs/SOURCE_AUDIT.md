# Source audit

Actual public-feed verification at **2026-10-21T10:10:42.922Z** using `npm run sources:verify`. **29/29** configured sources returned complete, schema-valid snapshots. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as employers publish and close roles.

Totals across successful sources:

- **4318 raw / 4318 publicly listed** postings across all roles and countries.
- **168 all-experience in scope / 197 all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **6 strict New grad & 0–1 years / 1 additional strict-tier listings needing details**: uses the same `assessExperience` function as the app. The second group has unknown US eligibility or employment type and is excluded from the strict default.

| Employer | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Robinhood | greenhouse/robinhood | passed | 156 | 156 | 0 | 14 | 0 | 0 | [Official careers evidence](https://careers.robinhood.com/) |
| Ramp | ashby/ramp | passed | 169 | 169 | 13 | 0 | 0 | 0 | [Official careers evidence](https://ramp.com/careers) |
| Duolingo | greenhouse/duolingo | passed | 62 | 62 | 0 | 9 | 0 | 0 | [Official careers evidence](https://careers.duolingo.com/) |
| Figma | greenhouse/figma | passed | 141 | 141 | 7 | 1 | 0 | 0 | [Official careers evidence](https://www.figma.com/careers/) |
| Palantir | lever/palantir | passed | 306 | 306 | 8 | 0 | 1 | 0 | [Official careers evidence](https://www.palantir.com/careers/) |
| Notion | ashby/notion | passed | 135 | 135 | 5 | 0 | 0 | 0 | [Official careers evidence](https://www.notion.com/careers) |
| Amplitude | ashby/amplitude | passed | 42 | 42 | 2 | 0 | 0 | 0 | [Official careers evidence](https://amplitude.com/careers) |
| Reddit | greenhouse/reddit | passed | 154 | 154 | 0 | 32 | 0 | 0 | [Official careers evidence](https://redditinc.com/careers) |
| Webflow | ashby/webflow | passed | 18 | 18 | 3 | 1 | 0 | 0 | [Official careers evidence](https://webflow.com/company/careers) |
| Benchling | ashby/benchling | passed | 53 | 53 | 10 | 0 | 0 | 0 | [Official careers evidence](https://www.benchling.com/careers) |
| Vanta | ashby/vanta | passed | 85 | 85 | 9 | 0 | 0 | 0 | [Official careers evidence](https://www.vanta.com/company/careers) |
| Asana | greenhouse/asana | passed | 104 | 104 | 0 | 3 | 0 | 0 | [Official careers evidence](https://asana.com/jobs/all) |
| Mercury | greenhouse/mercury | passed | 74 | 74 | 0 | 11 | 0 | 0 | [Official careers evidence](https://mercury.com/jobs) |
| Mural | ashby/mural | passed | 13 | 13 | 0 | 0 | 0 | 0 | [Official careers evidence](https://www.mural.co/careers) |
| Flexport | greenhouse/flexport | passed | 204 | 204 | 0 | 10 | 0 | 0 | [Official careers evidence](https://www.flexport.com/careers/) |
| Thumbtack | ashby/thumbtack | passed | 52 | 52 | 4 | 6 | 0 | 0 | [Official careers evidence](https://careers.thumbtack.com/) |
| Ro | lever/ro | passed | 52 | 52 | 1 | 0 | 0 | 0 | [Official careers evidence](https://ro.co/careers/) |
| Calendly | greenhouse/calendly | passed | 9 | 9 | 0 | 4 | 0 | 0 | [Official careers evidence](https://calendly.com/careers) |
| Lattice | greenhouse/lattice | passed | 9 | 9 | 0 | 1 | 0 | 0 | [Official careers evidence](https://lattice.com/careers) |
| Linear | ashby/Linear | passed | 29 | 29 | 2 | 0 | 0 | 0 | [Official careers evidence](https://linear.app/careers) |
| Brex | greenhouse/brex | passed | 263 | 263 | 0 | 29 | 0 | 0 | [Official careers evidence](https://www.brex.com/careers) |
| Ironclad | ashby/ironcladhq | passed | 33 | 33 | 4 | 0 | 0 | 0 | [Official careers evidence](https://ironcladapp.com/careers) |
| BetterUp | ashby/betterup | passed | 6 | 6 | 2 | 0 | 0 | 0 | [Official careers evidence](https://www.betterup.com/about-us/careers) |
| Teachable | greenhouse/teachablecareers | passed | 5 | 5 | 0 | 0 | 0 | 0 | [Official careers evidence](https://www.teachable.com/careers) |
| Wealthfront | lever/wealthfront | passed | 23 | 23 | 1 | 0 | 0 | 0 | [Official careers evidence](https://www.wealthfront.com/careers) |
| Upgrade | greenhouse/upgrade | passed | 26 | 26 | 0 | 6 | 0 | 0 | [Official careers evidence](https://www.upgrade.com/careers/) |
| Veeva Systems | lever/veeva | passed | 933 | 933 | 97 | 0 | 5 | 0 | [Official careers evidence](https://careers.veeva.com/job-search-results/) |
| Databricks | greenhouse/databricks | passed | 900 | 900 | 0 | 37 | 0 | 1 | [Official careers evidence](https://www.databricks.com/company/careers/open-positions) |
| Roblox | greenhouse/roblox | passed | 262 | 262 | 0 | 33 | 0 | 0 | [Official careers evidence](https://careers.roblox.com/jobs/8143976?gh_jid=8143976) |

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **2026-10-21.2**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict default requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict default. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
| Palantir | [Data Engineer - Talent Acquisition Operations](https://jobs.lever.co/palantir/1b690123-1766-4e75-a0ef-0f58afa864b4) | Strict default | 1 · experience requirement applies |
| Veeva Systems | [Associate Business Consultant - Life Sciences Consulting](https://jobs.lever.co/veeva/c1d438b2-42e0-4f35-bcdd-42ec61ffd5d5) | Strict default | Not stated; explicit graduate evidence |
| Veeva Systems | [Associate Business Consultant - Life Sciences Consulting](https://jobs.lever.co/veeva/e2f879c3-cfdd-4d1b-b866-7f0987576865) | Strict default | Not stated; explicit graduate evidence |
| Veeva Systems | [Marketing Analytics - Client Services Associate - July 2027 Start Date - ADP](https://jobs.lever.co/veeva/2d2cce21-bba9-42e7-b1b8-e5cf83ebe4c2) | Strict default | 0 |
| Veeva Systems | [Marketing Analytics - Data Analyst - July 2027 Start Date - ADP](https://jobs.lever.co/veeva/28c47d34-3ad6-4485-85a9-686b4239b9ea) | Strict default | 0 |
| Veeva Systems | [Strategy Associate - Veeva Link](https://jobs.lever.co/veeva/e91100ea-a47e-436c-be31-c26503d0fa29) | Strict default | 1 · experience requirement applies |
| Databricks | [Associate Product Manager, New Grad (2027 Start)](https://databricks.com/company/careers/open-positions/job?gh_jid=7586263002) | Needs details checked | Not stated; explicit graduate evidence |

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs and provider posting IDs cross-matched to that board), not guessed from employer names. See `data/employers.json` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Atomic server finalization quarantines a >60% board drop, and closure requires two complete successful snapshots at least twelve hours apart. Failed sources preserve prior catalog records.

No network or payload failures occurred in this verification run.
