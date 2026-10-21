# Security boundaries

MSBA Shortlist is a small pilot implementation. It has no security certification. Live OAuth, REST authorization and Edge Function deployment still require the owner checks in `DEPLOYMENT.md` and `DATABASE.md`.

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

`npm run test:db:smoke` applies migrations and checks PostgreSQL RLS in WASM using minimal Auth/pgTAP substitutes. `npm run test:db` requires the actual Docker-based Supabase stack and real pgTAP. The smoke test is supplementary; it does not verify the API gateway, Auth schema, OAuth credentials, Edge runtime or a hosted deployment. Before public launch run both SQL suites on Supabase, test two independent Google users through direct REST/RPC requests, inspect account switching, and verify deployed account deletion. Record observed results in `TEST_REPORT.md`.

For a suspected key leak, rotate the exposed server key in Supabase, replace the GitHub secret, stop ingestion while investigating, inspect access/activity with the provider's available tools, and rebuild if any privileged key entered a frontend artifact. Do not paste keys or private records into issue trackers. The owner must configure a real contact before launch.
