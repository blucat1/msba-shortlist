# MSBA Shortlist

Repository: https://github.com/blucat1/msba-shortlist

Hosted site: https://msba-shortlist.pages.dev · Isolated sample demo: https://msba-shortlist.pages.dev/demo

Find worthwhile US full-time analytics, product, strategy, and data opportunities, understand their fit, then keep the next step moving. Independent of Cal Poly; no university affiliation or endorsement. The working product name is configurable in `src/config.ts`.

## Run the demo

Use Node **24.22.0** (`.nvmrc`) and npm:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open the printed local URL, normally <http://localhost:5173/demo>. Without cloud configuration the default route opens the explicitly labeled demo. On this Mac, `./run-demo.command` also finds the checkout-local Node installation. It installs dependencies only if missing and starts Vite.

The demo includes 30 fictional jobs, 12 tracked opportunities, varied application histories, and several tasks. Dates are simulated relative to its first-run reference date. Changes persist in namespaced browser localStorage. The banner remains visible; no real vacancy is opened or application submitted. Settings → Data & account offers reset and exports. Clearing browser storage removes demo changes. Demo backups remain labeled and cannot merge into live accounts.

## What works

- **Opportunities:** explainable prioritization; role/keyword/location/experience/pay/work/timing/freshness filters; deep-linkable role details; one-click save and dismiss/restore; source provenance; compact Today priorities.
- **My Search:** manual add/edit/delete; seven stages; application dates and history; priorities; exact company grouping and private company notes; multiple dated/timed next steps; completion, editing, and snoozing; accepted review reminders.
- **Insights:** confirmed submissions by week, companies, current pipeline, historical interview/offer conversion cohorts, 14-day maturity view, primary-role results, tasks, denominators, and uncertainty.
- **Portability:** versioned JSON backup preview/merge with ownership remapping and duplicate handling; CSV import with row errors and task suggestions; formula-safe CSV export.
- **Live code:** Google identity through Supabase, public catalog browsing and owner-only tracker, transactional RPCs, RLS/composite foreign keys, authenticated deletion function, employer-feed adapters plus a cross-employer remote feed, explicit source/status reconciliation, retention, and trusted scheduled GitHub Actions.

Opening an application link **never** counts as Applied. The user must explicitly confirm a submission. Assessment events are not interviews. Unknown salaries, dates, country, employment, and eligibility remain unknown. Missing configuration or failed feeds never enable sample data in live mode.

## Wider discovery

Opportunities includes **Search the market**, with editable searches on Google, Indeed and LinkedIn for employers outside the imported catalog. Those services' results open externally and remain unverified; suitable outside roles can be added to My Search. The imported catalog also supports Jobicy's free cross-employer remote-job feed, with actual employer names, visible source credit and explicit listing-status checks. The catalog is broader than the original 29-employer pilot, while retaining the strict experience default. It does not claim every job in the market. See [discovery coverage](docs/MARKET_COVERAGE.md) for the source window, free API, attribution and remaining gaps, and the dated rollout evidence in [TEST_REPORT.md](docs/TEST_REPORT.md).

The registry includes 37 verified employer boards and the Jobicy remote market feed; ID.me’s university board and WisdomTree remain disabled pending, respectively, stronger official linkage and resolution of a source-use restriction. Current source/import counts and release checks are dated in [TEST_REPORT.md](docs/TEST_REPORT.md). Broad source or employer totals are never presented as graduate-job counts. Owner-only releases remain active; no teammates have been invited.

## Experience focus

Live discovery defaults to **New grad & 0–1 years**: explicit graduate/entry-level hiring or a supported 0–1-year required minimum. A one-year requirement is labeled honestly and remains an experience stretch for someone with zero years. Missing years never mean zero; Associate/APM, Junior and generic Early Career titles alone do not verify graduate eligibility. Conditional degree/experience paths remain **Experience unverified**.

Choose **Zero years confirmed** for an explicit zero/no-experience requirement; graduate titles alone do not establish zero. Six-month and one-year minima remain positive requirements.

Choose **Early career · 0–3 years** to include 2–3-year requirements, **Experienced · 4+ / senior** for experienced individual-contributor roles, or **Experience unverified** to review missing/conditional evidence. Senior, Staff, Principal and Lead titles override low or missing numeric requirements; people-leadership roles remain excluded. These discovery controls never remove saved roles, applications, notes, tasks or history from My Search.

Visible cohort defaults are **May 15, 2027 graduation** and availability from **May 16, 2027**. Edit them and optional degree, GPA, authorization and sponsorship facts in Preferences. Known requirements conflicts and passed verified deadlines are withheld by default; unknown requirements remain visible for review. Preference overlap describes hand-set preference sorting, not an eligibility decision or hiring prediction. Similar For-you listings can be expanded to retain every location/requisition and its own save action.

The [source review](docs/SUPPLY_REVIEW.md) and `npm run quality:check` measure bad recommendations and missed matches against bounded real source excerpts. This is assistant review, not independent human or market-wide efficacy validation. [Classmate testing is prepared and explicitly deferred](docs/PILOT_RESULTS.md) at the owner’s request.

## Live setup

The public GitHub repository, Git-integrated Cloudflare Pages site, and a separate Free Supabase project are connected. All four hosted migrations, exact callback configuration, account deletion, server-only Actions secrets and the first production import are complete.

Google sign-in is enabled with basic identity permissions. The owner confirmed that signing in, saving a job and refreshing My Search worked; server counts corroborated a Google account and saved opportunity. Hosted backend authorization/deletion passed 23 checks with two disposable users, both removed afterward. Two independent Google accounts, same-browser account switching, second-device persistence and wider audience availability still need pilot acceptance.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/TEST_REPORT.md](docs/TEST_REPORT.md) for setup and evidence. Frontend hosting builds with `npm run build`, serves `dist`, and uses the free `pages.dev` subdomain.

`.env.example` contains placeholders only. Browser keys use `VITE_`; the ingestion secret and Edge Function privileges stay on servers. Do not commit real env files or personal exports. `VITE_APP_MODE=production` selects live by default; `/demo/*` always remains isolated.

## Checks and operations

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run quality:check
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:db:smoke
```

`test:db:smoke` runs real PostgreSQL WASM with minimal emulated Supabase identity helpers; it does **not** certify the hosted Supabase/REST stack. For the full local SQL suite, install/start Docker and the official Supabase CLI, then:

```sh
npx supabase start
npm run test:db
```

The new four-provider ingestion → real Supabase → repository → browser gate runs with `npm run test:integration` after starting the disposable test stack; see [its local Auth setup and boundaries](tests/integration/README.md). `--fixtures-only` checks transport and explicitly does not certify database/browser integration.

Docker was unavailable on the initial Mac checkout. The real Supabase SQL gate subsequently passed in GitHub Actions: two suites and 93 pgTAP tests. Hosted REST/RPC/deletion checks also passed separately; the owner-reported Google sign-in/save/refresh result is separate from automated backend and outbound-redirect checks. Wider account-switch and second-device acceptance remain pending. Observed results and verification limits are recorded in [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

```sh
npm run setup:check
npm run doctor
npm run sources:verify
npm run ingest -- --dry-run
npm run ingest -- --dry-run --source greenhouse-robinhood
npm run maintenance -- --dry-run
```

Source verification really contacts public employer feeds and updates [docs/SOURCE_AUDIT.md](docs/SOURCE_AUDIT.md). Routine tests mock feeds. Production import and maintenance require process environment `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. They never load demo fixtures or fetch arbitrary manual URLs.

## Backup formats

JSON v1 includes preferences, opportunities, events, tasks, company notes, and job preferences. Imports validate dates, links, limits, and parent references; remap record IDs and ownership; skip duplicate opportunities without overwriting their children; and restore backup preferences. A duplicate backup cannot multiply applications. Only import your own data. Input is limited to 2 MB and 1,000 opportunities.

CSV requires `company,title`. Optional columns: `location,stage,priority,application_date,deadline,url,notes,role_family,next_action,next_action_date,record_origin`. Dates use real `YYYY-MM-DD` values; role family uses a key from `src/domain/types.ts`; stages are Saved, Applied, Assessment, Interviewing, Offer, Rejected, Withdrawn. Imported current stage is recorded without inventing a prior submission date. The review preview lists per-row errors; only valid rows can be imported. CSV is useful for spreadsheets; JSON is the complete backup. Exports prefix formula-like cells with an apostrophe. `record_origin=demo` preserves sample-data separation.

## Team and operator references

- [Teammate contribution quickstart](CONTRIBUTING.md)
- [Owner controls and collaboration runbook](docs/COLLABORATION.md)
- [Two-minute demo script](docs/DEMO_SCRIPT.md)
- [Four-person review handoff](docs/TEAM_HANDOFF.md)
- [Architecture](docs/ARCHITECTURE.md), [data dictionary](docs/DATA_DICTIONARY.md), [security](docs/SECURITY.md), and [database checks](docs/DATABASE.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md) and [actual source coverage](docs/SOURCE_AUDIT.md)

This is a bounded $0 pilot target, subject to provider limits and source-usage review. The owner approved a public contact. Complete the remaining two-account, browser-switching, second-device and audience-availability checks before inviting a wider pilot.
