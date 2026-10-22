# Source audit

Actual public-feed verification at **2026-10-22T07:24:38.264Z** using `npm run sources:verify`. **36/36** configured sources returned schema-valid employer boards or complete API discovery windows. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as publishers update listings; these sources do not represent the entire market.

Totals across successful sources:

- **14 actual May 15, 2027 cohort-default listings**, including **2 confirmed zero-year listings**, after known timing/eligibility/source-review conflicts are withheld. Other unspecified requirements remain unknown.

- **4563 raw / 4563 publicly listed** postings across all roles and countries.
- **188 all-experience in scope / 224 all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **14 strict New grad & 0–1 years / 5 additional strict-tier listings needing details**: uses the same `assessExperience` function as the app, before individual eligibility/source-review filtering. The per-listing table distinguishes the actual cohort default. The second group has unknown US eligibility or employment type and is excluded from the strict default.

| Employer/source | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Robinhood | greenhouse/robinhood | passed | 153 | 153 | 0 | 14 | 0 | 0 | [Official source evidence](https://careers.robinhood.com/) |
| Ramp | ashby/ramp | passed | 170 | 170 | 14 | 0 | 0 | 0 | [Official source evidence](https://ramp.com/careers) |
| Duolingo | greenhouse/duolingo | passed | 61 | 61 | 0 | 9 | 0 | 0 | [Official source evidence](https://careers.duolingo.com/) |
| Figma | greenhouse/figma | passed | 139 | 139 | 7 | 1 | 0 | 0 | [Official source evidence](https://www.figma.com/careers/) |
| Palantir | lever/palantir | passed | 304 | 304 | 8 | 0 | 1 | 0 | [Official source evidence](https://www.palantir.com/careers/) |
| Notion | ashby/notion | passed | 137 | 137 | 5 | 0 | 0 | 0 | [Official source evidence](https://www.notion.com/careers) |
| Amplitude | ashby/amplitude | passed | 41 | 41 | 2 | 0 | 0 | 0 | [Official source evidence](https://amplitude.com/careers) |
| Reddit | greenhouse/reddit | passed | 156 | 156 | 0 | 34 | 0 | 0 | [Official source evidence](https://redditinc.com/careers) |
| Webflow | ashby/webflow | passed | 17 | 17 | 3 | 1 | 0 | 0 | [Official source evidence](https://webflow.com/company/careers) |
| Benchling | ashby/benchling | passed | 53 | 53 | 10 | 0 | 0 | 0 | [Official source evidence](https://www.benchling.com/careers) |
| Vanta | ashby/vanta | passed | 84 | 84 | 8 | 0 | 0 | 0 | [Official source evidence](https://www.vanta.com/company/careers) |
| Asana | greenhouse/asana | passed | 105 | 105 | 0 | 3 | 0 | 0 | [Official source evidence](https://asana.com/jobs/all) |
| Mercury | greenhouse/mercury | passed | 73 | 73 | 0 | 11 | 0 | 0 | [Official source evidence](https://mercury.com/jobs) |
| Mural | ashby/mural | passed | 14 | 14 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.mural.co/careers) |
| Flexport | greenhouse/flexport | passed | 196 | 196 | 0 | 11 | 0 | 1 | [Official source evidence](https://www.flexport.com/careers/) |
| Thumbtack | ashby/thumbtack | passed | 53 | 53 | 4 | 6 | 0 | 0 | [Official source evidence](https://careers.thumbtack.com/) |
| Ro | lever/ro | passed | 50 | 50 | 1 | 0 | 0 | 0 | [Official source evidence](https://ro.co/careers/) |
| Calendly | greenhouse/calendly | passed | 9 | 9 | 0 | 4 | 0 | 0 | [Official source evidence](https://calendly.com/careers) |
| Lattice | greenhouse/lattice | passed | 8 | 8 | 0 | 1 | 0 | 0 | [Official source evidence](https://lattice.com/careers) |
| Linear | ashby/Linear | passed | 34 | 34 | 2 | 0 | 0 | 0 | [Official source evidence](https://linear.app/careers) |
| Brex | greenhouse/brex | passed | 265 | 265 | 0 | 35 | 0 | 0 | [Official source evidence](https://www.brex.com/careers) |
| Ironclad | ashby/ironcladhq | passed | 33 | 33 | 4 | 0 | 0 | 0 | [Official source evidence](https://ironcladapp.com/careers) |
| BetterUp | ashby/betterup | passed | 6 | 6 | 2 | 0 | 0 | 0 | [Official source evidence](https://www.betterup.com/about-us/careers) |
| Teachable | greenhouse/teachablecareers | passed | 5 | 5 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.teachable.com/careers) |
| Wealthfront | lever/wealthfront | passed | 23 | 23 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.wealthfront.com/careers) |
| Upgrade | greenhouse/upgrade | passed | 26 | 26 | 0 | 6 | 0 | 0 | [Official source evidence](https://www.upgrade.com/careers/) |
| Veeva Systems | lever/veeva | passed | 919 | 919 | 98 | 0 | 5 | 0 | [Official source evidence](https://careers.veeva.com/job-search-results/) |
| Databricks | greenhouse/databricks | passed | 897 | 897 | 0 | 37 | 0 | 1 | [Official source evidence](https://www.databricks.com/company/careers/open-positions) |
| Roblox | greenhouse/roblox | passed | 267 | 267 | 1 | 32 | 0 | 0 | [Official source evidence](https://careers.roblox.com/jobs/8143976?gh_jid=8143976) |
| Global Lending Services | lever/glsllc | passed | 49 | 49 | 6 | 0 | 3 | 0 | [Official source evidence](https://glsauto.com/careers) |
| Lake Partners | lever/lake-partners-account | passed | 1 | 1 | 1 | 0 | 1 | 0 | [Official source evidence](https://www.lakepartners.com/careers/) |
| Recidiviz | greenhouse/recidiviz | passed | 7 | 7 | 4 | 0 | 1 | 0 | [Official source evidence](https://www.recidiviz.org/careers) |
| Charles River Associates | greenhouse/charlesriverassociates | passed | 90 | 90 | 0 | 6 | 0 | 3 | [Official source evidence](https://www.crai.com/cra-careers/jobs/) |
| The Brattle Group | greenhouse/thebrattlegroup | passed | 59 | 59 | 0 | 12 | 0 | 0 | [Official source evidence](https://www.brattle.com/careers/current-openings/) |
| Solace | ashby/solace | passed | 28 | 28 | 4 | 0 | 2 | 0 | [Official source evidence](https://www.solace.health/careers) |
| CertiK | lever/certik | passed | 31 | 31 | 2 | 0 | 1 | 0 | [Official source evidence](https://www.certik.com/company/careers) |

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **2026-10-22.1**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict default requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict default. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
| Palantir | [Data Engineer - Talent Acquisition Operations](https://jobs.lever.co/palantir/1b690123-1766-4e75-a0ef-0f58afa864b4) | Cohort default | 1 · experience requirement applies |
| Flexport | [Treasury & Payment Analyst](https://job-boards.greenhouse.io/flexport/jobs/8231696) | Needs details checked | 1 · experience requirement applies |
| Veeva Systems | [Associate Business Consultant - Life Sciences Consulting](https://jobs.lever.co/veeva/c1d438b2-42e0-4f35-bcdd-42ec61ffd5d5) | Cohort default | Not stated; explicit graduate evidence |
| Veeva Systems | [Associate Business Consultant - Life Sciences Consulting](https://jobs.lever.co/veeva/e2f879c3-cfdd-4d1b-b866-7f0987576865) | Cohort default | Not stated; explicit graduate evidence |
| Veeva Systems | [Marketing Analytics - Client Services Associate - July 2027 Start Date - ADP](https://jobs.lever.co/veeva/2d2cce21-bba9-42e7-b1b8-e5cf83ebe4c2) | Cohort default | 0 |
| Veeva Systems | [Marketing Analytics - Data Analyst - July 2027 Start Date - ADP](https://jobs.lever.co/veeva/28c47d34-3ad6-4485-85a9-686b4239b9ea) | Cohort default | 0 |
| Veeva Systems | [Strategy Associate - Veeva Link](https://jobs.lever.co/veeva/e91100ea-a47e-436c-be31-c26503d0fa29) | Cohort default | 1 · experience requirement applies |
| Databricks | [Associate Product Manager, New Grad (2027 Start)](https://databricks.com/company/careers/open-positions/job?gh_jid=7586263002) | Needs details checked | Not stated; explicit graduate evidence |
| Global Lending Services | [Business Analyst - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/f9b3c57e-7e60-4f99-bd2e-6ffd92ee66b5) | Cohort default | Not stated; explicit graduate evidence |
| Global Lending Services | [Data Scientist - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/d81bfc16-2ba1-41ca-ab21-7d8cffac9e07) | Cohort default | Not stated; explicit graduate evidence |
| Global Lending Services | [Financial Analyst - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/c0e144a9-2b3e-49c1-bf6e-1e5cb084428a) | Cohort default | Not stated; explicit graduate evidence |
| Lake Partners | [Entry Level Strategy Analyst](https://jobs.lever.co/lake-partners-account/b3d26b77-e601-4a83-b344-a7f1abb051fc) | Cohort default | Not stated; explicit graduate evidence |
| Recidiviz | [Data Analyst (Entry-Level)](https://job-boards.greenhouse.io/recidiviz/jobs/4717510006) | Cohort default | 0.5 |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Accounting/Business/Finance Consulting Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/8054054) | Needs details checked | Not stated; explicit graduate evidence |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Economics Consulting Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/7894191) | Needs details checked | Not stated; explicit graduate evidence |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Management Advisory Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/8053996) | Needs details checked | Not stated; explicit graduate evidence |
| Solace | [Associate Data Scientist (College Grad 2027)](https://jobs.ashbyhq.com/solace/77ca492c-4142-4931-beeb-e85d9d0ac443) | Cohort default | Not stated; explicit graduate evidence |
| Solace | [Associate Product Manager (College Grad 2027)](https://jobs.ashbyhq.com/solace/ee8ee239-ad20-4c1e-868d-3357799589ea) | Cohort default | Not stated; explicit graduate evidence |
| CertiK | [Financial Analyst](https://jobs.lever.co/certik/7d25f5e8-2fed-412c-b182-6568a491483e) | Cohort default | 1 · experience requirement applies |

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
