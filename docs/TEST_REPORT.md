# Observed implementation checks

Recorded October 21, 2026, America/Los_Angeles. These are checks actually run on this checkout, not a claim that the live public service has launched.

## Environment and reproducibility

- macOS arm64; Node **24.22.0**, npm **11.19.1**. Node was downloaded from nodejs.org and its archive checksum compared with the official SHA-256 manifest. The checkout-local runtime under ignored `.tools/` makes the supplied Mac launcher usable without changing the owner's shell configuration.
- `npm ci` completed successfully using the committed lockfile. Installed/tested: React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, Supabase JS 2.118.0, TanStack Query 5.104.5, Tailwind 4.3.3, Zod 4.6.7, Radix Dialog 1.3.1, Vitest 5.0.5, Playwright 1.64.1, PGlite 0.5.10. Supabase CLI **2.121.0** is pinned and its version command was executed.
- Browser tests used the installed Google Chrome executable through Playwright. The authored Linux CI uses Playwright Chromium; hosted CI has not been run because no remote repository was supplied.
- Docker and `psql` were not installed. No production Supabase, Google OAuth, or Cloudflare credentials were supplied.

## Results

| Check actually run | Result |
| --- | --- |
| `npm ci` | PASS; lockfile installation, no reported dependency vulnerabilities |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS; strict TypeScript |
| `npm run test:unit` | PASS: **75 tests in 8 files** |
| `npm run build` | PASS; static `dist`; lazy Insights; vendor chunks below the warning threshold |
| `npm run test:e2e` against Vite dev | PASS: **6 workflow tests** |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e` against `npm run preview -- --port 4173` | PASS: same **6 workflow tests against the built production bundle** |
| `npm run test:db:smoke` | PASS: **3 migrations and 93 PostgreSQL WASM assertions** |
| `npm run test:db` | **NOT EXECUTED**; prerequisite check exited nonzero because Docker is absent |
| `npm run sources:verify` | PASS: **26/26** official employer identities and schema-valid complete feeds |
| `npm run ingest -- --dry-run` | PASS: all **26** sources fetched/normalized; no database writes |
| `npm run setup:check` | PASS; accurately reports missing live configuration and owner contact |
| `npm run doctor` | PASS; Node, dependencies, registry and CLI available; Docker absent |
| `npm run maintenance -- --dry-run` | PASS; no database contacted; retention policy displayed |
| `zsh -n run-demo.command` | PASS; launcher syntax checked |
| Local preview HTTP | PASS; `/demo/opportunities` returned 200 |

Source payloads are time-specific and can change. The final source audit at **2026-10-21T07:53:39.620Z** observed **2,225 raw/listed jobs, 72 explicitly US/full-time in-scope jobs, and 128 relevant jobs needing details checked**. Counts include senior individual-contributor stretches, which are optional in default presentation. The all-source ingestion dry-run completed before the final taxonomy expansion; its older relevance counts are not substituted for the final audit counts. See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for per-source results and evidence.

## Behavior exercised

Unit/adapter tests cover required versus preferred skills, short skill boundaries/aliases, experience/education alternatives and company age, country/employment uncertainty, title relevance/seniority, compensation currency/period/bands, multi-location and source-date preservation, unsafe links/content, retries/full-board validation, deduplication, mass-drop and two-snapshot closure rules, deterministic relevance, exact/date-only tasks and snoozing, historical cohorts and maturity, CSV formula safety, JSON ownership/parent remapping, demo provenance, quota/corruption failures, callback concurrency, temporary guest preferences, and deletion caller/origin checks.

React Testing Library regression tests check exact accessible field names and hint associations, textarea/select labeling, label focus, and a failed manual save retaining company/title/notes for a successful retry without duplication.

The six browser workflows exercise:

1. Demo labeling, save, refresh persistence, dismiss/restore, search/reset, and deep-linked role details reopened after refresh.
2. Application page interaction and confirmation surviving refresh; “Not yet” leaves analytics unchanged; explicit confirmation creates one application event; an accepted review reminder is created only after acceptance.
3. Manual role creation, exact company grouping, direct historical Interviewing with unknown application date, audit history, editing, and task creation/snooze/completion/persistence.
4. Three-step preferences changing ordering/reasons; real JSON download/import round-trip skipping 12 duplicates; CSV preview showing an invalid date's row error and preserving valid rows.
5. All three routes at **390, 768 and 1440 px** with no document overflow; keyboard skip-link focus; honest empty filters and unconfigured live mode with a separate demo link.
6. Corrupt demo localStorage showing an error and a working reset recovery path.

Desktop screenshots for all three screens and a mobile discovery screenshot were captured and visually inspected in [screenshots/](screenshots/). These are fictional demo data, not live listings or user research. Representative primary/secondary text contrast pairs were calculated, and lower-contrast labels, preference text, notices, and charts were darkened. This was a targeted contrast check, not a full accessibility audit. Their inspection is not accessibility certification or a substitute for testing with assistive technology.

## Database check boundary

The 93 assertions execute real PostgreSQL via PGlite, applying all three migrations with a minimal Auth schema and replacement assertion functions. They test actual RLS/grants, two owners and anonymous access, forged parent IDs, ownership transfer, private RPCs, idempotency and date corrections, identity remapping, demo rejection, account-switch guards, deletion cascades, source disabling, complete/failed/out-of-order/quarantined snapshots, 12-hour absence closure, and maintenance preservation.

This harness excludes the real Supabase Auth implementation, PostgREST/API gateway, real pgTAP extension, OAuth, Deno deployment runtime, CORS behavior in the deployed gateway, and hosted project configuration. `npm run test:db` intentionally does not report a pass when these prerequisites are absent. Written CI and SQL suites still need to run on the real local/test Supabase stack.

## Failures found and repaired

Browser checks initially found filter state being overwritten by rapid URL changes, checkbox timing, and labels that included hint text or textarea content. Explicit label associations and stable filter updates repaired these; all final workflows passed. Independent review also repaired manual company keys, notes initialization, save retries, application idempotency keys, sample salary ranges, source-disable visibility, snapshot health ordering, StrictMode OAuth exchange retries, and demo backup provenance. Tests assert the relevant behaviors rather than counting those earlier failures as passes.

## Human acceptance still required

No remote project, repository, Google client, public deployment, live import, account-deletion deployment or scheduled workflow was created. The owner must follow [DEPLOYMENT.md](DEPLOYMENT.md), run the real Supabase SQL suite with Docker, apply hosted migrations, configure Google callbacks/audience, deploy Pages and deletion, configure Actions secrets, run the first import, and test two independent live accounts through actual REST/RPC requests, sign-out/account switching, persistence on a second device, and disposable-account deletion. Source usage terms, owner contact and service limits need owner review before public launch.

No test participants, feedback, OAuth approval, public URL, production persistence or hosted security results are invented. Record real teammate observations in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).
