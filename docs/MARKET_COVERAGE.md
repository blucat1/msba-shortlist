# Discovery coverage

MSBA Shortlist combines an imported catalog with wider external search. It does not claim to index every vacancy or verify an entire platform's results.

| Discovery option | Coverage | What is checked |
| --- | --- | --- |
| Employer feeds | The verified Greenhouse, Lever and Ashby boards in the registry | Complete public boards, supported roles, location/employment evidence, experience requirements and freshness |
| Jobicy remote market feed | Remote jobs across employers, without a company whitelist; free API discovery window of seven days | Complete cursor traversal, actual company names, source requirements, canonical Jobicy links and subsequent listing-status checks |
| Search the market | Editable searches on Google, Indeed and LinkedIn, including employers outside connected feeds | Safe search links only; results open on those services and are not imported, counted, or verified by MSBA Shortlist |
| Manual tracking | Any suitable role found elsewhere | Owner-entered link/details and private application history; no scraping or automatic submission |

Shortlist defaults to new grads plus early-career roles through three years, with new grads first and 25 groups per batch. New-grad evidence means explicit graduate/entry-level hiring or a stated 0–1-year requirement. A one-year minimum and 2–3-year experience stretches are labeled. Senior roles and unknown experience remain separate unless explicitly selected. External platform tags and search keywords do not establish that a role meets this policy. Full-time status, degree, timing, location and work authorization still need to match the employer's actual requirements.

## Jobicy source boundaries

The [official public API and fair-use terms](https://jobicy.com/jobs-rss-feed) permit websites/apps/job boards with credit and canonical Jobicy listing links. The adapter uses only the unauthenticated free API, never a Bearer token or paid original-ATS-link mode. API access needs no owner account or payment method. The [OpenAPI contract](https://jobicy.com/api/openapi.json) defines cursor pagination and the listing-status endpoint.

The USA query also returns Anywhere listings. These keep country unknown, rather than treating remote as US eligibility. Each card and its details retain Jobicy credit and the supplied source link; an application may continue through Jobicy's own flow. Its publication date describes publication on Jobicy, not the employer's original posting date. Provider seniority tags can be inconsistent, so required years and graduate evidence come from the actual title and requirements text.

The source's database employer ID identifies the publisher. Private tracker company grouping instead uses a stable identity from the actual normalized hiring-company name, so different employers do not share notes or company counts. Validated saved snapshots and backups retain publisher attribution and that company identity.

This feed is remote-only, delayed by approximately three hours, and limited to its recent discovery window. A job aging out of seven days is not closed. The importer checks older known IDs in batches: active retains an open listing, unknown becomes unconfirmed and leaves recommendations, and only explicit closed closes it. These are Jobicy listing states, not independent live probes of every employer's application system. Existing private saved snapshots and history remain intact.

The twice-daily schedule is below the source's maximum hourly synchronization cadence. Development tests replay mock or captured public data rather than repeatedly polling the API. Do not run source verification and ingestion as repeated independent Jobicy polls within the same hour.

Production ingestion also checks persisted `job_sources.last_check_at` before making any Jobicy window or status request. A recorded attempt, including failure, less than 60 minutes old skips Jobicy without finalization or advancing source health; future/invalid timestamps also skip. Exactly 60 minutes elapsed permits the next attempt. This prevents a manual run shortly before the scheduled run from immediately polling again, while other employer feeds continue normally. GitHub's shared ingestion concurrency group serializes scheduled/manual production runs. Credential-free source verification and dry-runs cannot read this production guard, so operators must still coordinate those checks and any unrecorded failed attempt.

## What remains outside automatic coverage

The imported catalog cannot cover all onsite/hybrid employers, every ATS, closed recruiting networks, or login-restricted boards. External market search helps users reach those broader sources; it is not a substitute for an appropriately licensed cross-market data feed if centralized, exhaustive results become a requirement. No paid trial, scraping service, application autofill or additional account is enabled by this implementation.

Current counts are dated observations in [SOURCE_AUDIT.md](SOURCE_AUDIT.md) and [TEST_REPORT.md](TEST_REPORT.md), not a market-size estimate. Distinguish total source listings, supported roles, experience tiers and the number of employers in a rolling discovery window. Multiple locations/program requisitions can also share a title.

The completed cohort release at **07:43 UTC on October 22, 2026** finalized all **38 enabled sources**: 37 employer boards and Jobicy; two candidate boards remain disabled. The anonymous read found **459 retained supported records**, **15 default listings in 14 groups across 8 companies**, and **3 confirmed-zero requirements**. The source run processed 5,183 all-level rows; those are not graduate-job counts. Jobicy supplied 581 all-level window rows and 40 supported records across 29 companies, with **zero** default graduate matches after the CertiK employer-conflict review. Wider onsite/hybrid discovery still depends on verified additions, external search and manual tracking. See the [successful import](https://github.com/blucat1/msba-shortlist/actions/runs/39742281857), [supply/qualification review](SUPPLY_REVIEW.md) and [test report](TEST_REPORT.md) for the exact constraints and acceptance boundaries.

## Why catalog counts differ from recommendations

The connected catalog is a subset of the market. The importer reads every publicly listed role from a fixed set of verified Greenhouse, Lever and Ashby employer boards, plus the attributed Jobicy rolling remote feed. External Google/Indeed/LinkedIn searches are not imported or counted.

1. **Source rows** include unrelated occupations, international roles, internships and experienced jobs. Source totals may overlap.
2. **Supported catalog records** have analytics/product/strategy/BI/data/ML relevance. Explicit leadership, international-only and non-full-time roles are outside the ordinary catalog. Missing US or employment evidence stays in Needs details, separate from the default shortlist. Retained closed records/history can remain in this total.
3. **Recommendations** additionally require open availability, recent source verification, the selected experience range and no known profile/source/deadline conflicts. Saved and dismissed roles are hidden by default. Further location, role, salary or keyword choices can narrow results.
4. **Role groups** combine equivalent requisitions/locations for reading; their separate original records and application links remain available.

The October 26 pre-expansion anonymous check observed 5,379 source rows, 511 supported records and 18 strict new-grad listings in 17 groups. The combined new-grad/early-career range yielded 67 listings in 59 groups before personal search filters. Those are dated public-default diagnostics, not the signed-in owner's exact count. The verified expansion adds 36 employer boards (73 employer boards plus Jobicy in total). Final import and live counts are recorded in TEST_REPORT.md; proposed or raw feed totals are not substituted for actual hosted results.


## Further October 26 expansion and free operation

The next source review adds **81 verified boards across 80 employer identities**, bringing the configured registry to **154 employer boards plus Jobicy (155 enabled feeds)**. [Group C](SOURCE_EXPANSION_C.md), [group D](SOURCE_EXPANSION_D.md) and [group E](SOURCE_EXPANSION_E.md) record actual official identity evidence, complete-response counts and excluded candidates. This broadens finance, consulting, healthcare, consumer, education, transport and industrial coverage alongside technology; unsupported or restricted systems remain outside the automatic catalog. Employer metadata recovery now reads explicit Time Type and related commitment fields, preserving uncertainty and contradictory contract/intern/part-time evidence. Exact employer recruitment wording can establish graduate hiring without inventing numeric years or employment type. See [the evidence review](SOURCE_EVIDENCE_REVIEW.md).

The public Cloudflare site, Supabase Free project and public-repository standard GitHub runners retain the existing free setup. Imports remain twice daily; a separate hourly read-only availability check verifies public delivery/catalog/signup configuration without source polling or private access. Free-plan quotas, inactivity and GitHub scheduling limits still apply; this is not an unlimited-capacity or uninterrupted-uptime claim. See [deployment operations](DEPLOYMENT.md#10-operate-within-free-limits-and-recover-failures) and the dated final results in TEST_REPORT.md.
