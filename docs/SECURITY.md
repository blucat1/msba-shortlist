# Security boundaries

MSBA Shortlist is a small pilot implementation. It has no security certification. Real Supabase SQL tests and hosted REST/RPC/deletion checks have passed within the scope recorded below. Google OAuth, browser account switching and two-device acceptance remain owner checks in `DEPLOYMENT.md` and `DATABASE.md`.

## Private records

Supabase JWTs identify users. All private tables enforce owner RLS for reads and writes, and owner changes are blocked. Tasks/events have composite parent-and-owner foreign keys, so a caller cannot attach a child to another user's opportunity. Catalog refreshes cannot overwrite private edits. Account and opportunity deletion use database cascades. There is no public student directory, private-record sharing, aggregate leaderboard, third-party analytics, or session replay.

Direct opportunity/event writes are revoked. Narrow `SECURITY DEFINER` RPCs derive `auth.uid()`, use fixed empty search paths and qualified objects, validate the owned target, and atomically write stage/date history. Retry keys bind to an opportunity/action and the requested date. Service-only ingestion/retention RPCs use invoker security. All exposed tables have RLS; the public coverage view uses invoker security and contains safe source aggregates only. See the SQL suites for negative direct-write/RPC/FK tests.

The browser has only a publishable key (or a legacy/local `anon` equivalent). The client refuses privileged credentials. `SUPABASE_SECRET_KEY` belongs exclusively in trusted ingestion/maintenance environments. Supabase automatically injects the Edge Function's server key. Never place server credentials in `VITE_` variables, source control, browser bundles, screenshots, or logs. `.env.example` has placeholders only.

## Authentication and deletion

Google OAuth uses basic identity scopes only and PKCE. A single in-flight callback exchange handles repeated React effects safely. Supabase Auth validates the user session; browser cache keys include account identity, and account changes clear cached private results/drafts. The repository rejects private results if the account changes while the request is pending. New saves/imports include an expected-owner guard, and account deletion binds the invocation to the captured verified bearer token. Guest preferences stay in sessionStorage without a server account or cloud writes.

Account deletion accepts an explicit confirmation, independently verifies the bearer token with Auth, and uses only that verified user's ID. Unknown request fields, including a target user ID, are rejected. The function uses server-only admin credentials, an exact origin allowlist and no-store responses. Deletion-handler tests exercise invalid tokens, target injection, origin rejection, confirmation and server failures. Downloaded exports are outside the application's control; provider backup retention remains subject to provider policy.

## Untrusted content and imports

Job descriptions, titles, links, downloaded feed data and imported backups are untrusted data. Source adapters validate complete payloads with Zod, extract bounded plain text, reject unsafe URLs, and never execute embedded source instructions. React renders text; external links pass the shared URL helper and open with `noopener,noreferrer`. There is no HTML rendering or privileged arbitrary-URL fetch. Unsupported manual posting links are saved without scraping.

Backup imports have file/record limits, nested Zod validation, a review preview and a transactional database merge. Ownership/record IDs are remapped by the server. Imported history is visibly marked, duplicate opportunities preserve existing related data, and demo backups stay in demo mode. CSV exports prefix formula-like cells before quoting. No imported content can create catalog/source records or administrative roles.

## Ingestion and operational access

Only the trusted default-branch GitHub Actions workflow receives ingestion secrets; pull-request code does not. It uses read-only repository permissions and bounded public-feed fetches. The database locks one source during atomic finalization, preserves first-discovery timestamps, rejects duplicate/malformed snapshots, quarantines suspicious drops and requires two complete absences separated by 12 hours before closure. Ingestion has no need to read private records even though the service key is powerful; keep that key tightly restricted to the trusted server environment.

Diagnostics contain controlled source status codes/text and aggregates, never user notes, tokens or full raw HTML. The public schema exposes no source-run diagnostics. Retention only removes obsolete source-run logs and unreferenced closed-job details after at least 90 days. Private history is never purged to save quota.

## Remaining verification

`npm run test:db:smoke` applies migrations and checks PostgreSQL RLS in WASM using minimal Auth/pgTAP substitutes. `npm run test:db` requires the actual Docker-based Supabase stack and real pgTAP. The smoke test is supplementary; it does not verify the API gateway, Auth schema, OAuth credentials, Edge runtime or a hosted deployment. The real Docker-based Supabase SQL gate passed on the GitHub runner, and hosted REST/RPC/deletion checks subsequently passed with two disposable password users, as recorded below. Before public launch, complete Google OAuth with two independent Google accounts, inspect browser account switching and verify persistence across devices. Record observed results in `TEST_REPORT.md`.

### Follow-up evidence — October 21, 2026

The [supabase-authorization CI job](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347/job/119118184024) passed both SQL suites on a disposable Docker-based Supabase stack with the real pgTAP extension: **2 files and 93 tests**, `Result: PASS`, at **01:26:50 PDT** (**08:26:50 UTC**). The [full run](https://github.com/blucat1/msba-shortlist/actions/runs/39568999347) succeeded for commit `1df3e1590346616c40b65f75b7dadd8553e946d1`. This advances the SQL migration/RLS/constraint/private-RPC/ingestion/retention acceptance gate beyond the earlier Mac-only WASM checks; the original Mac Docker absence remains documented in [TEST_REPORT.md](TEST_REPORT.md).

The SQL suites impersonate database roles with test JWT claims. They do not by themselves prove hosted configuration or deployed function behavior; the later hosted acceptance below supplies separate evidence using real Auth sessions. Neither test layer establishes Google OAuth/browser acceptance or security certification.

### Hosted acceptance — October 21, 2026

The freshly created, owner-approved Free project `xglakzqorbjvganpbilu` in `us-west-1` has all three migrations applied and its migration list verified. Modern publishable/server keys are used. Auth's Site URL and allowed callback are the exact `https://msba-shortlist.pages.dev` and `https://msba-shortlist.pages.dev/auth/callback`. The hosted `delete-account` function is **ACTIVE v1**, `verify_jwt=true`, with `ALLOWED_ORIGINS` set to the exact frontend origin.

After the disposable password-user checks and cleanup, email/password authentication was disabled with the email-specific signup setting, preserving top-level signup for the Google provider. Production Google settings were not overwritten. The public Auth settings check reported `external.email=false` and `disable_signup=false`; Google provider enablement remains pending owner setup.

The ignored acceptance harness passed **23 checks, with 0 skips, 0 failures and 0 cleanup failures**, using two confirmed disposable password users and real Supabase JWTs. It verified hosted REST/RPC persistence, owner isolation and forged parents/targets, import ownership remapping, status idempotence, deployed CORS responses, missing/forged tokens, target-user injection rejection, and real self-deletion/cascades. Both disposable users were cleaned; credentials, tokens, private notes and user IDs were not copied into the report. Current source CI [run 39574373758](https://github.com/blucat1/msba-shortlist/actions/runs/39574373758) passed both application and Supabase authorization jobs for `8f11c4c` at **02:08:38 PDT / 09:08:38 UTC**.

These were real hosted password-session checks, not Google OAuth or browser sign-out/cache switching. The [first production import](https://github.com/blucat1/msba-shortlist/actions/runs/39573049834) subsequently succeeded for all 26 sources using configured GitHub server-only secrets. Anonymous reads verified 2,225 catalog records, 72 in-scope and 128 needing details checked; maintenance deleted zero records. The live frontend deployed automatically from `8f11c4c` at **02:06:53 PDT / 09:06:53 UTC**, with production public configuration/contact and demo-only previews. Seven hosted anonymous browser smoke groups passed, covering real details, sign-in guards, coverage/contact, route refreshes at 390/768/1440 px, demo isolation and zero runtime errors. Google consent/provider setup, two independent Google sessions, browser private-cache switching, two-device persistence and browser deletion/CORS acceptance remain pending. See [TEST_REPORT.md](TEST_REPORT.md).

For a suspected key leak, rotate the exposed server key in Supabase, replace the GitHub secret, stop ingestion while investigating, inspect access/activity with the provider's available tools, and rebuild if any privileged key entered a frontend artifact. Do not paste keys or private records into issue trackers. The configured public owner contact is `nwr0110@gmail.com`.
