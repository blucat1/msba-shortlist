# Source expansion A — verified public employer boards

Verified 2026-10-26T22:55:30.355Z. Fifteen new employer identities; no registry merge, production import, deployment or production count claim is made by this research. Full public feeds were fetched by the existing schema-validating adapters on 2026-10-26, then replayed from temporary local snapshots through the unchanged normalizer with classifier **2026-10-26.1**. Operational registry fields remain null until an actual import.

## Measured coverage

“Included” meets the app's US/full-time/role-family scope. “Needs details” preserves uncertain source fields and is not a verified US/full-time match. Both contain all permitted individual-contributor experience levels; their sum is the supported catalog, not a graduate shortlist. New-grad columns use assessExperience tier new-grad; early-career columns include new-grad plus early-career tiers. Missing years and conditional degree paths do not count as zero years. The slash separates **included / needs details**.

| Employer | Raw/listed | Included | Needs details | New grad 0–1 | Early career 0–3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| SoFi | 59 | 0 | 6 | 0 / 0 | 0 / 1 |
| Affirm | 225 | 0 | 11 | 0 / 0 | 0 / 1 |
| Coinbase | 228 | 0 | 19 | 0 / 1 | 0 / 3 |
| Cloudflare | 460 | 0 | 21 | 0 / 0 | 0 / 1 |
| Datadog | 427 | 0 | 19 | 0 / 0 | 0 / 4 |
| MongoDB | 367 | 12 | 3 | 0 / 0 | 1 / 0 |
| Elastic | 401 | 0 | 15 | 0 / 0 | 0 / 1 |
| Stripe | 711 | 1 | 49 | 1 / 0 | 1 / 4 |
| BILL | 43 | 0 | 10 | 0 / 0 | 0 / 2 |
| Toast | 332 | 0 | 5 | 0 / 0 | 0 / 1 |
| Plaid | 130 | 26 | 0 | 0 / 0 | 3 / 0 |
| Gusto | 98 | 0 | 10 | 0 / 0 | 0 / 1 |
| OpenAI | 796 | 67 | 0 | 0 / 0 | 1 / 0 |
| Anthropic | 679 | 0 | 68 | 0 / 0 | 0 / 0 |
| Airbnb | 188 | 0 | 29 | 0 / 0 | 0 / 0 |
| **Total** | **5144** | **106** | **265** | **1 / 1** | **6 / 19** |

Supported catalog contribution: **371**; excluded rows: **4773**. All 5144 raw records passed full-snapshot adapter validation, before deterministic scope exclusion. Greenhouse frequently omits a structured employment type, which keeps otherwise relevant records in needs-details. A large public feed is therefore not the same as a large verified graduate shortlist. No classifier threshold, snapshot completeness, URL validation, closure behavior or security control was relaxed for these sources.

Cached snapshots were checked between 2026-10-26T22:49:16.467Z and 2026-10-26T22:54:13.283Z. Temporary research data is outside the repository under /tmp/source-a-feeds; no raw payload or personal information was added to source control.

## Identity evidence

- **SoFi** — [official evidence](https://www.sofi.com/careers/). Official careers page contains all 59 IDs from the verified sofi Greenhouse snapshot, including Crypto Core Operations Analyst 8012077003; returned posting URLs use the official sofi.com careers domain.
- **Affirm** — [official evidence](https://www.affirm.com/careers). Official careers page loads sections-Jobs-895ebc840a0b26051eaf.js. That script sets baseUrl to https://boards-api.greenhouse.io/v1/boards, boardToken to affirm and links https://boards.greenhouse.io/affirm. Official script inspected 2026-10-26.
- **Coinbase** — [official evidence](https://www.coinbase.com/careers/positions/7980600). Official Business Operations, Senior Associate page 7980600 matches the complete coinbase feed; its Apply now link resolves to https://job-boards.greenhouse.io/embed/job_app?for=coinbase&token=7980600.
- **Cloudflare** — [official evidence](https://www.cloudflare.com/careers/jobs/). Official careers page mounts CareersJobsListing from /_astro/index.CggotlYc.js. That script explicitly requests https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs and validates boards.greenhouse.io posting URLs.
- **Datadog** — [official evidence](https://careers.datadoghq.com/detail/8247250/). Official GTM Strategy & Operations Senior Associate page has ID 8247250, exactly matching the datadog Greenhouse API title, ID and returned official-domain URL.
- **MongoDB** — [official evidence](https://www.mongodb.com/careers/jobs/8141572). Official Operations Business Analyst page has ID 8141572, matching the mongodb Greenhouse feed title and ID. Feed official URL /careers/job/?gh_jid=8141572 redirects to this canonical role page.
- **Elastic** — [official evidence](https://jobs.elastic.co/jobs/human-resources/united-states/analytics-engineer-hr-analytics/8244449). Official Analytics Engineer, HR Analytics page has identifier 8244449 and matching title, with embedded application URL https://jobs.elastic.co/jobs?gh_jid=8244449&gh_jid=8244449, exactly matching the elastic feed.
- **Stripe** — [official evidence](https://stripe.com/careers/search). Official career-search HTML exposes greenhouseId fields and 662 IDs matching the complete stripe API snapshot, including Comms Strategy & Operations Associate 8241857. Return URLs preserve Stripe official career links.
- **BILL** — [official evidence](https://www.bill.com/jobs). Official open-jobs page embeds https://job-boards.greenhouse.io/embed/job_board?for=billcom, directly verifying the billcom board token for BILL.
- **Toast** — [official evidence](https://careers.toasttab.com/jobs/associate-product-manager-data-governance-remote-united-states). Official role route requested with gh_jid=8305972 redirects to this Associate Product Manager, Data Governance page; exact title and identifier match the toast Greenhouse snapshot. Employer states 2+ years; do not label it a zero-experience role.
- **Plaid** — [official evidence](https://plaid.com/careers/openings/data/san-francisco-hq/senior-analytics-engineer/). Official Senior Analytics Engineer page links https://jobs.ashbyhq.com/plaid/98c030bd-a72d-4045-87aa-b8ff7d0d43fb/application. Official careers index contains all 130 IDs in the plaid Ashby snapshot. Prior Lever endpoint is retired and is not enabled.
- **Gusto** — [official evidence](https://gusto.com/about/careers/join-the-team). Official careers page See opportunities route lists 98 openings with direct job-boards.greenhouse.io/gusto/jobs links, including Data Scientist, Risk 7656216 matching the complete feed.
- **OpenAI** — [official evidence](https://openai.com/careers/search/). Official careers search lists 796 roles with jobs.ashbyhq.com/openai application links, including Analytics Engineer, GTM bc0d4a9f-235f-4a4b-a854-c6cb0322ccaa/application, matching the complete openai snapshot.
- **Anthropic** — [official evidence](https://www.anthropic.com/careers/jobs). Official jobs list directly links job-boards.greenhouse.io/anthropic/jobs postings, including 4980436008. Exact current feed IDs and official links establish the anthropic board; the guessed Ashby endpoint was rejected and is not enabled.
- **Airbnb** — [official evidence](https://careers.airbnb.com/positions/). Official positions index contains current exact Greenhouse snapshot IDs; official Machine Learning Engineer, Assistance Engineering page /positions/7716341 matches title and ID. Its structured location China is excluded by classifier 2026-10-26.1; employer identity does not establish US or graduate eligibility.

## Provider usage review

Reviewed [Greenhouse Job Board GET documentation](https://docs.greenhouse.io/job-board.html) and [Ashby public Job Postings API documentation](https://developers.ashbyhq.com/docs/public-job-posting-api). The existing adapter uses documented public read endpoints, bounded timeouts/size/concurrency and full-schema validation. Source-specific official careers links or exact posting IDs establish employer-to-board identity. The review establishes public technical access; it does not assert standalone employer redistribution permission. Discovery preserves attribution and original application links, and sources must be disabled if employer/provider terms restrict this use or permission becomes required. No authenticated or application submission API was called.

## Candidates not enabled

- DoorDash: doordashusa Greenhouse feed returned a complete 448-row snapshot, but the current official careers search uses a different Gem identifier scheme. Without an official current link or exact ID cross-match, the 50 preliminary supported rows do not count toward this expansion.
- Block: official careers JavaScript identifies board block, but the unchanged adapter rejected the whole snapshot for an unsafe posting URL. No partial snapshot or source enabled.
- Lyft and Chime: feeds exist, but current official pages did not expose sufficient direct board linkage in the bounded review. Their preliminary counts are excluded.
- HubSpot: guessed legacy hubspotjobs feed returned 66 raw rows and zero supported roles; identity remains unverified, so excluded.
- Wayfair, Rippling, DigitalOcean and Grammarly: attempted legacy/guessed endpoints returned HTTP 404; not enabled. Grammarly's official site now redirects to Superhuman, requiring a separate identity review.
- Plaid Lever and Anthropic Ashby returned HTTP 404. Their verified current Ashby and Greenhouse boards respectively replace those failed candidates.

## Verification

- Parsed every candidate with sourceSchema and checked duplicate IDs/provider-board keys against the existing registry.
- Fifteen existing adapter fetches completed with their full schema and snapshot checks; every saved posting was normalized again with classifier 2026-10-26.1.
- The explicit foreign-location correction excludes Airbnb posting 7716341 because its structured location label is China. No international row was promoted merely to meet a target.
- No Jobicy request, paid service, authentication, production write, commit or deployment performed. Parent task owns final integration and application checks.
