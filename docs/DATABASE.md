# Database and authentication handoff

The live adapter uses Supabase Postgres/Auth through the browser publishable key. Demo localStorage never enters this database. No database, OAuth provider, Edge Function, GitHub secret, or hosted site was configured in the implementation environment.

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

## Tables and access

| Table | Purpose | Browser access |
| --- | --- | --- |
| `employers` | Stable official employer identity and careers URL | Public read only |
| `job_sources` | Approved provider/board metadata and safe check aggregates | Public read only |
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
- GitHub ingestion/maintenance: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, server only. A legacy service-role key is the documented transitional equivalent.
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

`finalize_source_run(p_source_id,p_run_key,p_jobs,p_complete,p_raw_count,p_warning,p_checked_at)` accepts one entire, validated, normalized board snapshot. The secret-only CLI supplies all listed jobs, including excluded classification records, so relevance changes are not mistaken for source absence. Unlisted Ashby jobs never enter the snapshot. The compact summary excludes description; details are cached only for in-scope/needs-details jobs. The snapshot is capped at 10,000 jobs and 25 MB; an oversized source needs an operator-reviewed staged-import extension, not truncation.

A source row lock serializes concurrent finalization. A replayed run key returns its existing outcome. Stable source keys retain the same UUID and original first-discovery timestamp. Failed/incomplete/out-of-order/malformed checks cannot close jobs. A drop below 40% of a previous complete raw or listed snapshot of at least 20 jobs quarantines the entire update. A nonempty validation warning also quarantines. Quarantine requires investigation; do not bypass it with fabricated counts. If an employer intentionally removes most jobs, inspect the authoritative board and reset its baseline only with a reviewed administrative SQL change.

First complete absence becomes `availability_unconfirmed`. Closure requires another successful complete absence at least 12 hours after the first. Reappearance reopens the same catalog job. No path changes an individual's tracker stage. Source freshness is separate: stale after 36 hours and excluded from default recommendations after 72 hours without a complete successful verification.

`npm run maintenance` calls `run_catalog_maintenance` using server credentials. Minimum retention is 90 days. It prunes old run logs and descriptions of unreferenced closed jobs after retention; it preserves private snapshots, history, opportunities, tasks, and compact catalog identities.

## Self-service account deletion

Deploy with the normal JWT gateway check enabled:

```sh
npx supabase secrets set ALLOWED_ORIGINS=https://YOUR_SITE.pages.dev
npx supabase functions deploy delete-account
```

Only the frontend account holder types the explicit confirmation and invokes the function. The function independently calls Auth `getUser(accessToken)`, rejects invalid/expired tokens, accepts the confirmation body only, and derives the target ID exclusively from the verified Auth user. Any client-nominated target field is rejected. Server-side `auth.admin.deleteUser` deletes that account; foreign-key cascades delete its active private data. The function uses an origin allowlist, handles preflights, and returns no-store responses. It does not log tokens/private data or pre-delete private rows before Auth deletion succeeds.

No Storage objects are created by this product. Downloaded exports remain under the user's control. Provider backups may retain deleted data until their retention periods expire; do not promise immediate erasure from backups. Before launch verify two real users, expired tokens, forbidden origins, and a target-user injection against the deployed function.

## Observed validation and limits

On October 21, 2026 (America/Los_Angeles), the implementation environment had no Docker or `psql`. Supabase CLI 2.121.0 was installed and its version command verified. `npm run test:db` was attempted and correctly exited nonzero with **NOT EXECUTED**, identifying Docker as missing. Real Supabase migrations/pgTAP/API/OAuth/deployed deletion checks remain unexecuted.

`npm run test:db:smoke` runs a supplementary PGlite 0.5.10 PostgreSQL WASM harness. It applied all three migrations and ran 93 assertions from both SQL suites successfully using a minimal Auth fixture and replacement assertion functions. This validates SQL and RLS behavior in PostgreSQL, but does not validate the real Supabase Auth schema, pgTAP installation, API gateway, Edge runtime, or live credentials. Thirteen Vitest tests passed across the deletion handler, browser credential configuration, StrictMode callback retry behavior and temporary guest preferences. Refer to `TEST_REPORT.md` for the final full-suite result.

The adapter fetches catalog summaries in pages of 500 and explicitly exposes truncation after 5,000 eligible catalog summaries; it never implies the capped catalog has been completely ranked. Private reads/exports paginate rather than silently stopping at the API's row cap. Larger deployments need server filter/index work and measured database/egress capacity.

## Official references checked October 21, 2026

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database functions and privileges](https://supabase.com/docs/guides/database/functions)
- [Current API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Edge Function authentication](https://supabase.com/docs/guides/functions/auth) and [authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Edge environment variables and automatically injected keys](https://supabase.com/docs/guides/functions/secrets)
- [CORS](https://supabase.com/docs/guides/functions/cors)
- [Verified Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
- [Database testing](https://supabase.com/docs/guides/database/testing) and [CLI test database](https://supabase.com/docs/reference/cli/supabase-test-db)
