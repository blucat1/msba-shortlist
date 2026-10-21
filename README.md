# MSBA Shortlist

Repository: https://github.com/blucat1/msba-shortlist

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
- **Live code:** Google identity through Supabase, public catalog browsing and owner-only tracker, transactional RPCs, RLS/composite foreign keys, authenticated deletion function, three real feed adapters, complete-snapshot finalization, retention, and trusted scheduled GitHub Actions.

Opening an application link **never** counts as Applied. The user must explicitly confirm a submission. Assessment events are not interviews. Unknown salaries, dates, country, employment, and eligibility remain unknown. Missing configuration or failed feeds never enable sample data in live mode.

## Live setup

No cloud account or public deployment has been created for you. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to create Supabase, apply migrations, configure Google, deploy to Cloudflare Pages, deploy account deletion, add server-only Actions secrets, run ingestion, and complete two-account privacy checks. Frontend hosting uses `npm run build`, output `dist`, and a free `pages.dev` subdomain.

`.env.example` contains placeholders only. Browser keys use `VITE_`; the ingestion secret and Edge Function privileges stay on servers. Do not commit real env files or personal exports. `VITE_APP_MODE=production` selects live by default; `/demo/*` always remains isolated.

## Checks and operations

```sh
npm run typecheck
npm run lint
npm run test:unit
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

Docker was unavailable during implementation. That full-stack gate remains unexecuted. Observed results and verification limits are recorded in [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

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

- [Two-minute demo script](docs/DEMO_SCRIPT.md)
- [Four-person review handoff](docs/TEAM_HANDOFF.md)
- [Architecture](docs/ARCHITECTURE.md), [data dictionary](docs/DATA_DICTIONARY.md), [security](docs/SECURITY.md), and [database checks](docs/DATABASE.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md) and [actual source coverage](docs/SOURCE_AUDIT.md)

This is a bounded $0 pilot target, subject to provider limits and source-usage review. The owner must configure a real contact and verify live authentication, persistence, authorization, ingestion, and deletion before inviting users.
