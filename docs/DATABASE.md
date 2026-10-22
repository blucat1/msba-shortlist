# Database and authentication handoff

The deployed live adapter uses Supabase Postgres/Auth through the browser publishable key. Demo localStorage never enters this database. The original three-migration backend passed real Supabase SQL, hosted REST/RPC and deletion acceptance. The fourth migration, **`202610220001_market_feed.sql`**, is now applied through the official CLI after real Supabase CI passed. Remote history confirms all four migrations; hosted market-RPC execution grants are limited to `postgres` and `service_role`. The first 30-source import failed 29/30: the shared HTTP allowlist blocked Jobicy before any network request, all 29 employer feeds succeeded, no Jobicy data was imported, and maintenance was skipped. Recovery is pending in [TEST_REPORT.md](TEST_REPORT.md). Google client/provider setup is complete, and the owner reports successful live Google sign-in plus a saved job surviving refresh. Two independent Google accounts, same-browser private-cache/account switching and second-device checks remain pending.

## Apply and verify

Install Docker Desktop, start it, and use Node 24. From the repository root:

```sh
npx supabase start
npm run test:db
npx supabase db lint --local
```

`supabase start` applies the ordered migrations to the local stack. To recreate a **disposable local development database** after editing migrations, run `npx supabase db reset --local`; this removes that local development data. The test files run in transactions and roll their fixtures back. No sample application data is seeded into production.

For a new hosted project, use the CLI account login, link the intended project, review migrations, and push them:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Use a separate test project/two real Google identities for the final browser/REST checks. The SQL files simulate two authenticated roles and an anonymous role, so they do not require live OAuth. Never point destructive manual tests at a pilot account containing valuable data. `src/lib/database.types.ts` is maintained with the migrations; after a schema change compare it against `npx supabase gen types typescript --local` and update the adapter.

Apply all four migrations in order: `202610210001_core.sql`, `202610210002_private_operations.sql`, `202610210003_ingestion.sql`, then `202610220001_market_feed.sql`. The fourth extends the source-provider constraint and adds `finalize_market_source_run`; it does not introduce exposed tables or relax private-data policies. Verify the linked project's remote migration history before enabling Jobicy imports. A successful dry-run is not proof that the migration has been applied.

## Tables and access

| Table | Purpose | Browser access |
| --- | --- | --- |
| `employers` | Stable employer identity or cross-employer publisher identity/URL | Public read only |
| `job_sources` | Approved employer-board/market-feed metadata and safe check aggregates | Public read only |
| `catalog_jobs` | Stable `(source_id, external_id)` identity, compact normalized JSON, dates/hash/availability | Public read only |
| `job_details` | Bounded plain description/evidence, fetched when details open | Public read only |
| `source_runs` | Complete/failed/quarantined run diagnostics and idempotency | No public grants or policies |
| `profiles` | Owner preferences including timezone and onboarding | Owner CRUD |
| `opportunities` | Private edits, preserved snapshot, company grouping, stage and application date | Owner read/delete; transactional save/stage RPC |
| `opportunity_events` | Append-only status/click/date history and provenance | Owner read; authorized RPC writes |
| `tasks` | Multiple tasks per opportunity with date-only/timestamp semantics | Owner CRUD |
| `company_notes` | One private note per stable company grouping key | Owner CRUD |
| `job_preferences` | Owner seen/dismissed state for public jobs | Owner CRUD |

Every table has RLS enabled. Public catalog tables have explicit read-only policies. Catalog/detail policies immediately hide records when their source is disabled or unverified; private preserved snapshots remain available. Private policies constrain `USING` and `WITH CHECK` to `auth.uid()`. `user_id` indexes and composite `(opportunity_id, user_id)` foreign keys enforce parent ownership in the database. Ownership update triggers provide a second guard. Deleting an opportunity cascades its tasks/events; deleting the Auth user cascades all private tables. Public catalog refreshes never write private tracker data.

`source_coverage` is an explicitly granted `security_invoker` view of public employer/source fields. It contains no email, user ID, private tracker fields, raw API bodies, or private diagnostics. Check timestamps and aggregate counts are real database values; source failure messages published by finalization are fixed safe text.

## Browser and server credentials

- Browser: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Visitors may save temporary validated preferences in sessionStorage, without creating a server account or cloud writes. Sign-out clears that temporary namespace. The client rejects `sb_secret_` keys and JWTs with privileged roles. Existing local/legacy `anon` JWTs remain supported. Optional `VITE_SITE_URL` determines the `/auth/callback` return URL; otherwise the current origin is used.
- GitHub ingestion/maintenance: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, server only, in the verified `production-ingestion` environment restricted to branch `main`. Repository-level copies were removed. Owner-only manual dispatch/reruns and separate mandatory CI protect the trusted workflow; see [COLLABORATION.md](COLLABORATION.md). A legacy service-role key is the documented transitional equivalent.
- Hosted Edge Function: Supabase injects `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` (a JSON dictionary; this function uses its `default` entry). A legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted if injected by the platform. Local explicitly supplied `SUPABASE_SECRET_KEY` is also supported. Do not attempt to create a hosted custom secret beginning with `SUPABASE_`; the prefix is reserved.
- Set `ALLOWED_ORIGINS` on the function to the exact frontend origin(s), comma-separated, with no path or trailing slash. No wildcard origins are used. Include localhost only in development/test configuration.

Public code and publishable keys do not make private records public; correct grants, RLS, JWT validation, and the composite constraints enforce that boundary. Keep server keys out of `VITE_` values, the frontend build, user requests, logs, and committed files.

## Auth and transactional changes

The browser uses Supabase Google OAuth with PKCE and only `openid email profile`. The Google-to-Supabase callback is the hosted project's `/auth/v1/callback`; the Supabase-to-frontend callback is the actual frontend `/auth/callback`. See the deployment guide for the distinct URL settings. No Gmail scopes are requested.

`save_opportunity(jsonb)` ignores submitted ownership, derives `auth.uid()`, validates the target owner, serializes owner saves, and writes the first creation event atomically. Existing stage changes go through `change_opportunity_stage(uuid,text,text,timestamptz,date)` with a retry key; the function locks the owned row and appends one event. Reusing a key for a different action fails. No direct stage/event write grants exist. `record_application_opened` records only the click event; it cannot change stage/date. Historical direct-to-Interviewing creation leaves an unknown application date unknown.

These narrow private RPCs require `SECURITY DEFINER` because direct stage/event writes are revoked. Each uses a fixed empty search path, qualified objects, an explicit non-null `auth.uid()` check, and owner predicates. Anonymous execution is revoked. Ingestion and maintenance functions use invoker security, are granted only to `service_role`, and additionally check the effective server role.

The frontend scopes Query keys by account and clears caches/drafts on account changes. The repository also rechecks the current account after private reads to reject a snapshot returned across a session switch. It never substitutes demo data after a live service failure.

## Imports

The browser validates backups with the shared Zod schema before invoking `import_tracker_backup`. The database independently caps sizes/counts, validates required values through constraints, remaps every imported opportunity ID, assigns the authenticated owner to opportunities/tasks/events/preferences/notes, and rejects sample snapshots/history. Normal save/import requests carry an expected-owner guard to reject a request that spans an account switch. It never trusts imported `userId` or an elevated-role claim.

Merge behavior: duplicates preserve existing opportunities and their related data. New opportunities receive new IDs; only their imported tasks/history are attached through the remapped parent. Duplicate comparisons use catalog identity, or the exact normalized company/title/location/posting URL/application date tuple for manual entries. Existing company notes/job preferences survive key conflicts; account preferences are replaced by the imported preferences. The entire operation is one transaction. Imported history is labeled `import` and cannot target another owner's opportunity. CSV import creates private manual opportunities and never modifies the shared catalog.

## Ingestion and retention

The registry has **29 employer boards plus one cross-employer remote publisher**, Jobicy; it is not the whole job market. For Jobicy rows, `employer_id` retains the publisher identity required by the source foreign key, while normalized `summary.company` names the actual hiring company. `summary.publisher` preserves visible Jobicy credit and its canonical listing URL, including saved private snapshots. The optional `employerGroupingKey` is `market-company:` plus SHA-256 of the NFKC-normalized, trimmed, lowercase company name with collapsed whitespace. Both catalog-save and matched-URL form paths use it; employer boards keep their existing employer-based key. Save/backup validation retains both publisher provenance and this grouping key, so different companies sharing the publisher do not share a company group. Publisher publication time is separate from an unknown employer-original posting date.

`finalize_source_run(p_source_id,p_run_key,p_jobs,p_complete,p_raw_count,p_warning,p_checked_at)` accepts one entire, validated, normalized **employer-board** snapshot. The secret-only CLI supplies all listed jobs, including excluded classification records, so relevance changes are not mistaken for source absence. Unlisted Ashby jobs never enter the snapshot. The compact summary excludes description; details are cached only for in-scope/needs-details jobs. The snapshot is capped at 10,000 jobs and 25 MB; an oversized source needs an operator-reviewed staged-import extension, not truncation. This function rejects a complete Jobicy window so it cannot apply board-absence closure to a rolling feed.

A source row lock serializes concurrent finalization. A replayed run key returns its existing outcome. Stable source keys retain the same UUID and original first-discovery timestamp. Failed/incomplete/out-of-order/malformed checks cannot close jobs. A drop below 40% of a previous complete raw or listed snapshot of at least 20 jobs quarantines the entire update. A nonempty validation warning also quarantines. Quarantine requires investigation; do not bypass it with fabricated counts. If an employer intentionally removes most jobs, inspect the authoritative board and reset its baseline only with a reviewed administrative SQL change.

For employer boards, first complete absence becomes `availability_unconfirmed`; closure requires another complete absence at least 12 hours later. Reappearance reopens the same catalog job. No path changes an individual's tracker stage. Source freshness is separate: stale after 36 hours and excluded from default recommendations after 72 hours without successful verification.

`finalize_market_source_run(p_source_id,p_run_key,p_jobs,p_statuses,p_complete,p_raw_count,p_warning,p_checked_at)` handles **only Jobicy**. The importer traverses the full seven-day discovery window, reads every older nonclosed ID using database pagination, and validates independent publisher statuses in batches of 100. SQL checks that statuses cover exactly the aged-out nonclosed set, without duplicates, current-window overlap or foreign IDs, before any catalog write. Both arrays are bounded to 10,000 records each and 25 MB combined. The function uses `SECURITY INVOKER`, an empty search path, service-only execution grants and an effective server-role check.

Window absence never closes a market listing. Explicit publisher `active` refreshes `last_seen_at` and clears uncertainty; `unknown` becomes `availability_unconfirmed` without advancing last seen and is withheld from recommendations; only explicit publisher `closed` closes the listing. These are Jobicy's statuses, not direct employer-ATS checks. A failed/partial/malformed/out-of-order run preserves the valid catalog and successful timestamps; row locks and run keys preserve ordering/idempotency. A large rolling-window count drop alone is not quarantine evidence when independent status coverage is complete. A later current-window reappearance retains the stable job ID and original discovery timestamp.

For rolling feeds, `raw_count`/`snapshot_count` describe the current window, while `relevant_count` describes all retained nonclosed relevant records; it can exceed the current window count. `supabase/tests/market-feed.test.sql` exercises this distinction and authorization, exact status coverage, unknown/active/closed semantics and atomic failure preservation. Use [TEST_REPORT.md](TEST_REPORT.md) for observed execution, rather than extending the old 93-test acceptance to this new migration.

The schedule remains twice daily at 06:23/18:23 UTC. Jobicy's permitted maximum is hourly, not the pilot's cadence: coordinate audits, dry-runs and manual imports so they do not repeat a Jobicy synchronization within one hour. No API key, account, paid ATS-link endpoint or authenticated scraping is used. Google/Indeed/LinkedIn market searches only open external links; their unverified results are not database imports.

The production importer uses persisted `job_sources.last_check_at` as a Jobicy cooldown, including recorded failures. Less than 60 minutes elapsed, a future value or an invalid value skips network/status/finalization without advancing source health. Exactly 60 minutes permits another attempt; other providers are unaffected. The workflow concurrency group serializes production invocations. Dry-runs/source audits and an attempt that could not record its failure still require operator coordination.

`npm run maintenance` calls `run_catalog_maintenance` using server credentials. Minimum retention is 90 days. It prunes old run logs and descriptions of unreferenced closed jobs after retention; it preserves private snapshots, history, opportunities, tasks, and compact catalog identities.

## Self-service account deletion

Deploy with the normal JWT gateway check enabled:

```sh
npx supabase secrets set ALLOWED_ORIGINS=https://YOUR_SITE.pages.dev
npx supabase functions deploy delete-account
```

Only the frontend account holder types the explicit confirmation and invokes the function. The function independently calls Auth `getUser(accessToken)`, rejects invalid/expired tokens, accepts the confirmation body only, and derives the target ID exclusively from the verified Auth user. Any client-nominated target field is rejected. Server-side `auth.admin.deleteUser` deletes that account; foreign-key cascades delete its active private data. The function uses an origin allowlist, handles preflights, and returns no-store responses. It does not log tokens/private data or pre-delete private rows before Auth deletion succeeds.

No Storage objects are created by this product. Downloaded exports remain under the user's control. Provider backups may retain deleted data until their retention periods expire; do not promise immediate erasure from backups. Hosted tests below have verified disposable-user self-deletion, missing/forged tokens, forbidden origins and target-user injection. The owner reports Google sign-in and save/refresh success; multi-account browser behavior, Google-session deletion and naturally expired-token handling still need acceptance.

## Observed validation and limits

### Market release — October 21 PDT / October 22 UTC, 2026

[PR1 CI `39730753547`](https://github.com/blucat1/msba-shortlist/actions/runs/39730753547) passed **209 unit tests, eight browser workflows and 183 real Supabase SQL assertions**; [main CI `39731101711`](https://github.com/blucat1/msba-shortlist/actions/runs/39731101711) also passed. The official hosted `db push` then applied `202610220001_market_feed.sql`; remote history verified all four versions, and the market RPC's execution grants were checked as `postgres`/`service_role` only. The final grouping/provenance/cooldown follow-up passed [PR2 CI `39731943541`](https://github.com/blucat1/msba-shortlist/actions/runs/39731943541): **214 unit tests, eight browser workflows and 183 real Supabase SQL assertions**. These are real disposable Supabase SQL results, separate from supplementary WASM checks.

Owner merge `39ea488bd730895bea16bc85625d6990b7c601f1` deployed through Cloudflare `16fca96d-5f08-4e97-a9c4-155a095f258c` at **23:10:54.186 PDT / 06:10:54.186 UTC**. The first full 30-source production import, [run `39732493274`](https://github.com/blucat1/msba-shortlist/actions/runs/39732493274), **failed with 29/30 sources successful**. The 29 existing employer feeds succeeded, but the shared HTTP allowed-host list omitted Jobicy and rejected it before any network access. No Jobicy data was imported and maintenance was skipped. The allowlist/integration-test correction and a successful retry remain pending; see [TEST_REPORT.md](TEST_REPORT.md). Passing CI and frontend deployment did not establish this production integration.

### Earlier backend acceptance

During the initial October 21, 2026 Mac build, Docker and `psql` were absent. Supabase CLI 2.121.0 was installed and its version command verified. That local `npm run test:db` attempt correctly exited nonzero with **NOT EXECUTED**, identifying Docker as missing. This remains an accurate record of the Mac attempt; the later CI result below supersedes the unexecuted SQL acceptance status.

`npm run test:db:smoke` runs a supplementary PGlite 0.5.10 PostgreSQL WASM harness. That earlier run applied the original three migrations and ran 93 assertions from both SQL suites successfully using a minimal Auth fixture and replacement assertion functions. This validates SQL and RLS behavior in PostgreSQL, but does not validate the real Supabase Auth schema, pgTAP installation, API gateway, Edge runtime, or live credentials. Thirteen Vitest tests passed across the deletion handler, browser credential configuration, StrictMode callback retry behavior and temporary guest preferences. Refer to `TEST_REPORT.md` for the final full-suite result.

### Follow-up real Supabase verification — October 21, 2026

[GitHub Actions run 39568999347](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347) completed successfully at **01:27:08 PDT** (**08:27:08 UTC**) for commit `1df3e1590346616c40b65f75b7dadd8553e946d1`. Its [supabase-authorization job](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347/job/119118184024) successfully ran `npx --yes supabase start`, applied the repository migrations to the disposable Docker-based Supabase stack, and executed `npm run test:db` with the real pgTAP extension. Both `authorization.test.sql` and `ingestion.test.sql` passed: **2 files, 93 tests, Result: PASS**, recorded at **01:26:50 PDT** (**08:26:50 UTC**). The job stopped the stack afterward with `supabase stop --no-backup`.

The real local/test Supabase SQL gate is now **passed** on the GitHub runner, in addition to the supplementary WASM checks. This verifies the migration/constraint/RLS/RPC/ingestion/retention behavior covered by those SQL suites against Supabase's actual database/Auth schema. The suites simulate two authenticated database roles and an anonymous role; they do not complete Google OAuth or exercise a deployed browser-to-PostgREST or Edge Function flow. At that earlier CI follow-up, hosted migrations and deployed deletion had not been exercised. The later hosted acceptance below supersedes that status; the owner-reported Google sign-in/save/refresh result is recorded separately, while multi-account browser and second-device checks remain pending. See [TEST_REPORT.md](TEST_REPORT.md) for the acceptance boundary.

### Current hosted backend — October 21, 2026

The owner approved a new **Free** project in the personal organization: **MSBA Shortlist**, reference `xglakzqorbjvganpbilu`, region `us-west-1`. It was created fresh and linked; the original three repository migrations were applied and the remote migration list verified during this earlier acceptance. The fourth market migration was subsequently applied after passing real Supabase CI; its release evidence is recorded in the market-release section above. Modern publishable/server keys are used. Supabase Auth's Site URL is `https://msba-shortlist.pages.dev`, with the exact `https://msba-shortlist.pages.dev/auth/callback` redirect configured. The owner completed Google client/provider setup; the active healthy project's current Auth configuration verifies `google_enabled=true`, `email_enabled=false` and `disable_signup=false`. The automated outbound sign-in check reached Google without entering credentials. Separately, the owner reports successful live Google sign-in and a saved job remaining after refresh, providing owner-reported callback/session and save/refresh acceptance.

The hosted `delete-account` function is **ACTIVE, version 1**, with `verify_jwt=true` and `ALLOWED_ORIGINS` set to the exact frontend origin. The ignored hosted acceptance harness ran with two confirmed disposable `.invalid` email/password users and real Supabase JWT sessions: **23 passed, 0 skipped, 0 failed, 0 cleanup failures; 2 disposable users cleaned**. It exercised persistent REST/RPC saves, cross-user read/write/parent restrictions, caller-derived ownership, imports, status retries, deployed CORS responses, missing/forged tokens, target-user injection, and real self-deletion with private cascades. No public test catalog fixtures were inserted.

GitHub server secrets are configured. The [first production import](https://github.com/blucat1/msba-shortlist/actions/runs/39573049834) completed successfully at **01:56:42 PDT / 08:56:42 UTC** on October 21: all 26 sources succeeded, anonymous reads verified **2,225 catalog records / 72 in-scope / 128 needing details checked**, and maintenance deleted zero records. These are classification counts, not a claim that all catalog records appear in default recommendations.

The production frontend at [msba-shortlist.pages.dev](https://msba-shortlist.pages.dev) deployed automatically from `8f11c4c` at **02:06:53 PDT / 09:06:53 UTC**, deployment `af2c9759-c9f8-4786-82a9-af2849d001d7`. At that earlier deployment, production public configuration/contact were set and previews used demo mode. Automatic previews were subsequently disabled; `/demo` remains isolated. Seven anonymous hosted browser smoke groups passed, including live source details, sign-in guards, coverage/contact and direct route refreshes at 390/768/1440 px without overflow or runtime errors. Those automated anonymous results are separate from the owner-reported Google sign-in/save/refresh success. Independent Google accounts, same-browser private-cache switching, second-device persistence, wider audience availability and a Google-session browser deletion/CORS flow remain open. See [TEST_REPORT.md](TEST_REPORT.md) and [DEPLOYMENT.md](DEPLOYMENT.md) for those remaining owner checks.

The adapter fetches catalog summaries in pages of 500 and explicitly exposes truncation after 5,000 eligible catalog summaries; it never implies the capped catalog has been completely ranked. Private reads/exports paginate rather than silently stopping at the API's row cap. Larger deployments need server filter/index work and measured database/egress capacity.

Free hosting and owner-only release access do not create a universal spending cap or prevent public visitor usage. Cloudflare account billing could not be fully verified because its API returned 403. Preserve the owner-controlled free configuration and inspect actual quotas; do not upgrade or weaken RLS to work around a limit.

## Official references checked October 21, 2026

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database functions and privileges](https://supabase.com/docs/guides/database/functions)
- [Current API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Edge Function authentication](https://supabase.com/docs/guides/functions/auth) and [authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Edge environment variables and automatically injected keys](https://supabase.com/docs/guides/functions/secrets)
- [CORS](https://supabase.com/docs/guides/functions/cors)
- [Verified Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Database testing](https://supabase.com/docs/guides/database/testing) and [CLI test database](https://supabase.com/docs/reference/cli/supabase-test-db)
