# Observed implementation checks

Recorded October 21, 2026, America/Los_Angeles, including successful GitHub CI and the hosted Supabase/Cloudflare follow-up below. Completed hosted API checks are distinguished from Google OAuth and real-user browser acceptance, which remain pending.

## Environment and reproducibility

- macOS arm64; Node **24.22.0**, npm **11.19.1**. Node was downloaded from nodejs.org and its archive checksum compared with the official SHA-256 manifest. The checkout-local runtime under ignored `.tools/` makes the supplied Mac launcher usable without changing the owner's shell configuration.
- `npm ci` completed successfully using the committed lockfile. Installed/tested: React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, Supabase JS 2.118.0, TanStack Query 5.104.5, Tailwind 4.3.3, Zod 4.6.7, Radix Dialog 1.3.1, Vitest 5.0.5, Playwright 1.64.1, PGlite 0.5.10. Supabase CLI **2.121.0** is pinned and its version command was executed.
- Initial Mac browser tests used the installed Google Chrome executable through Playwright. Follow-up Linux GitHub Actions installed Playwright Chromium and passed the six browser workflows; the original lack of a remote repository was resolved by creating and pushing `blucat1/msba-shortlist`.
- Docker and `psql` were not installed on the Mac. The follow-up GitHub runner had Docker and successfully started the disposable Supabase stack for real pgTAP tests. No hosted Google OAuth or production two-account/deletion acceptance was completed by those CI checks.

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
| `npm run test:db` on the initial Mac checkout | **NOT EXECUTED** at that stage; prerequisite check exited nonzero because Docker was absent |
| `npm run test:db` on the GitHub Supabase runner | **PASS: 2 files / 93 real pgTAP tests** after `supabase start`; [job evidence](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347/job/119118184024) |
| GitHub Actions application + Supabase jobs | **PASS** for commit `1df3e1590346616c40b65f75b7dadd8553e946d1`; [run evidence](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347) |
| `npm run sources:verify` | PASS: **26/26** official employer identities and schema-valid complete feeds |
| `npm run ingest -- --dry-run` | PASS: all **26** sources fetched/normalized; no database writes |
| `npm run setup:check` | PASS; accurately reports missing live configuration and owner contact |
| `npm run doctor` | PASS; Node, dependencies, registry and CLI available; Docker absent |
| `npm run maintenance -- --dry-run` | PASS; no database contacted; retention policy displayed |
| `zsh -n run-demo.command` | PASS; launcher syntax checked |
| Local preview HTTP | PASS; `/demo/opportunities` returned 200 |
| Hosted Cloudflare demo browser workflows | PASS: all **6** against `https://msba-shortlist.pages.dev` before the production configuration rollout |
| Hosted Supabase migrations | PASS: all **3** applied to new `xglakzqorbjvganpbilu`; local and remote migration versions match |
| Hosted Auth return configuration | PASS: production Site URL and exact `/auth/callback` redirect verified; Google provider is a separate pending step |
| Deployed Edge Function | PASS: `delete-account` ACTIVE v1, `verify_jwt=true`, exact production origin |
| Hosted Auth/REST/RPC/deletion acceptance | PASS: **23** checks, **0** skipped, **0** failed, **0** cleanup failures; two disposable password-authenticated users removed |
| First production import and retention | PASS: [run 39573049834](https://github.com/blucat1/msba-shortlist/actions/runs/39573049834), **26/26** real sources finalized; retention completed |
| Compensation crash repair checks | PASS: **79 unit tests in 9 files**, lint, typecheck, build and **6** browser workflows against the built demo bundle |
| Production hosted anonymous browser checks | PASS: **7 check groups**, including actual catalog/details, anonymous save guard, coverage/contact, responsive routes and demo isolation |

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

This WASM harness excludes the real Supabase Auth implementation, PostgREST/API gateway, real pgTAP extension, OAuth, Deno deployment runtime, CORS behavior in the deployed gateway, and hosted project configuration. The Mac `npm run test:db` attempt intentionally did not report a pass without Docker. The follow-up real Supabase result below now satisfies the local/test SQL gate; hosted browser/API/OAuth/deletion acceptance remains separate.

## Follow-up GitHub Actions acceptance — October 21, 2026

The public repository [blucat1/msba-shortlist](https://github.com/blucat1/msba-shortlist) was created and the implementation pushed to `main`. [Application checks run 39568999347](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347) tested commit `1df3e1590346616c40b65f75b7dadd8553e946d1` and completed successfully at **01:27:08 PDT** (**08:27:08 UTC**). Both jobs concluded `success`.

- The [application checks job](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347/job/119118183811) passed `npm ci`, lint, strict typecheck, **75 unit tests in 8 files**, **93 PostgreSQL WASM assertions**, the production build, and **6 Chromium browser tests**.
- The [supabase-authorization job](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347/job/119118184024) passed `npx --yes supabase start`, then `npm run test:db` against the real disposable Docker-based Supabase stack. The actual pgTAP result at **01:26:50 PDT** (**08:26:50 UTC**) was `Files=2, Tests=93` and `Result: PASS`; both `authorization.test.sql` and `ingestion.test.sql` were `ok`. Cleanup with `supabase stop --no-backup` also passed.

At that first CI stage, the actual Supabase migration/RLS/constraint/owner-RPC/ingestion/maintenance SQL suites **passed on the GitHub test runner** using test users and simulated database claims against Supabase's real Auth schema. Hosted provisioning and API/deletion checks were still unexecuted then; the subsequent section records their completion. Neither test stage establishes Google OAuth or two independent Google browser sessions.

Only sanitized test summaries and run metadata were used for this evidence. Disposable local-stack startup credentials are not copied into this report.

## Hosted provisioning and API acceptance — October 21, 2026

Created the separate **MSBA Shortlist** project `xglakzqorbjvganpbilu` in `us-west-1` after the owner confirmed the personal organization was **Free**. Existing projects were left untouched. All three migrations applied successfully and `migration list --linked` showed matching local/remote versions. Production Site URL is `https://msba-shortlist.pages.dev`; the exact frontend callback is `https://msba-shortlist.pages.dev/auth/callback`. The hosted `delete-account` function is ACTIVE version 1 with gateway JWT verification enabled and exact production-origin configuration.

The hosted acceptance harness first verified the intended project had no Auth users and empty application/catalog tables, then created two confirmed disposable `.invalid` accounts with random passwords. It used their actual Supabase Auth access tokens through the hosted REST/RPC/function gateway. **23 checks passed, 0 skipped, 0 failed, and 0 cleanup failures.** Both test users and their private records were removed; no fictional public catalog records were inserted.

Checks covered anonymous catalog/coverage reads and private/diagnostic/write denial; server-derived ownership; persisted private fields through a fresh authenticated client; task/preferences/company-note ownership; cross-user selects, direct updates/deletion, foreign-parent constraints and forged RPCs; direct-history and server-only operation denial; opening versus submitting an application; status idempotency and changed-retry rejection; account-switch caller guards; backup ownership/parent remapping, duplicate retry handling and demo-backup rejection. Deployed deletion checks covered approved-origin preflight, missing/forged tokens, forbidden origins, target-user injection, actual self-deletion and private cascades while preserving the other user. Cleanup verified both disposable users were absent.

This is real hosted API/Auth/deletion evidence, **not Google OAuth acceptance**. It does not establish actual Google consent/callback behavior, browser CORS enforcement, browser cache isolation after account switching, second-device behavior or real-user feedback.

The Git-integrated Cloudflare project has the correct build command/output and Node runtime. Before switching production configuration, all six browser workflows passed against its publicly hosted demo. Production build variables now contain only the browser-safe Supabase key, project URL, site URL, mode and approved contact; server secrets were sent directly to GitHub Actions Secrets. Preview remains demo mode. Google provider enablement remains pending.

The first real production [feed import and maintenance run 39573049834](https://github.com/blucat1/msba-shortlist/actions/runs/39573049834) completed successfully at **01:56:42 PDT / 08:56:42 UTC**. All **26/26** employer sources finalized with success; maintenance deleted zero obsolete source-run records and zero unreferenced details, as expected for a fresh database. The committed schedule remains twice daily at 06:23 and 18:23 UTC. A manually dispatched successful workflow proves its production path, not that a future scheduled trigger has already occurred.

Anonymous reads from the actual hosted database verified **2,225 catalog records**, **72 explicitly in-scope** and **128 relevant records needing details checked**; all **26 sources** had `last_run_status=success`. Their verification timestamps spanned **08:56:32.523–08:56:37.385 UTC**. These figures match this production import, rather than substituting the earlier dry-run audit. Default recommendations still apply the product's eligibility uncertainty, freshness and stretch controls.

## Production frontend browser acceptance

The first connected production frontend exposed a real-data bug: a salary band with currency `unknown` caused `Intl.NumberFormat` to throw `Invalid currency code : unknown`, leaving the React root blank. Shared compensation formatting now uses neutral numbers with explicit currency/pay-period uncertainty, preserves hourly cents and source wording, and uses a neutral pay icon. Four added regressions include rendering a live-mode card and opening its fetched details with unknown currency. After the repair, **79 unit tests / 9 files**, lint, strict typecheck and build passed; all **6 browser workflows** also passed against the rebuilt demo bundle on port 4173.

Commit [`8f11c4c`](https://github.com/blucat1/msba-shortlist/commit/8f11c4cfb5053b64782e9c501c034f7d0f1aec92) triggered the Git-integrated Cloudflare production build automatically. Deployment `af2c9759-c9f8-4786-82a9-af2849d001d7` completed successfully at **02:06:53 PDT / 09:06:53 UTC**, with production app mode and the correct build/output. The repaired site at `https://msba-shortlist.pages.dev` passed seven actual anonymous Playwright check groups:

1. Root opens `/opportunities`, shows real catalog cards and has no sample banner.
2. A real role detail opens and loads from the hosted project.
3. Anonymous saving requests Google sign-in rather than storing private records.
4. Coverage shows all 26 sources and Privacy shows the approved public contact.
5. All three live routes load directly at widths 390, 768 and 1440 without document overflow.
6. `/demo/opportunities` remains a separate labeled sample workspace.
7. No browser runtime errors occur; an anonymous real-catalog screenshot was captured and visually inspected.

The same real-catalog smoke passed locally before deployment. These checks do not establish Google consent/callback, authenticated browser saves or browser account switching. The source-change [CI run 39574373758](https://github.com/blucat1/msba-shortlist/actions/runs/39574373758) also **passed both jobs**, completing at **02:08:38 PDT / 09:08:38 UTC**. Its application job passed installation, lint, typecheck, unit tests, WASM SQL assertions, build and six Chromium workflows; its separate Supabase job passed the real Docker-backed SQL suites and cleanup.

## Failures found and repaired

Browser checks initially found filter state being overwritten by rapid URL changes, checkbox timing, and labels that included hint text or textarea content. Explicit label associations and stable filter updates repaired these; all final workflows passed. Independent review also repaired manual company keys, notes initialization, save retries, application idempotency keys, sample salary ranges, source-disable visibility, snapshot health ordering, StrictMode OAuth exchange retries, and demo backup provenance. Tests assert the relevant behaviors rather than counting those earlier failures as passes.

## Human acceptance still required

The public repository, hosted Free project/migrations, exact frontend callbacks, function, server Actions secrets, approved contact and first production import are completed. Real hosted REST/RPC authorization, persistence and disposable deletion passed separately from the successful CI SQL gate. The remaining acceptance is Google client/provider setup and consent audience, actual Google callback, two independent Google browser accounts and same-browser sign-out/account switching, and second-device persistence. Re-run SQL authorization for later schema changes. Source usage terms and service limits still need operator review before inviting users.

No participants, feedback or Google OAuth approval are invented. Public URLs and hosted API results above are observed, with their boundaries stated. Record real teammate observations in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).
