# Deploy MSBA Shortlist

The public repository is [blucat1/msba-shortlist](https://github.com/blucat1/msba-shortlist), with Git-integrated hosting at [msba-shortlist.pages.dev](https://msba-shortlist.pages.dev). A separate Free Supabase project, the original three hosted migrations, production Auth return URLs, deployed account deletion, secured GitHub ingestion secrets, and production imports have been configured. The market-discovery release adds a fourth migration, `202610220001_market_feed.sql`; apply and verify it before enabling its new Jobicy finalization RPC. Check [TEST_REPORT.md](TEST_REPORT.md) for the current release's hosted migration/import evidence. Production frontend variables and the owner-approved contact are set; automatic preview builds are disabled. The owner completed Google client/provider setup; the hosted Auth configuration verifies Google enabled, email/password disabled and new-account signup allowed. The owner reports successful live Google sign-in and a saved job surviving refresh; this is owner-reported callback/session and save/refresh acceptance. Wider two-account, same-browser private-cache and second-device checks remain pending. The runbook below documents the setup for the operator; completed steps do not need repeating. `/demo` always uses clearly labeled fictional browser-local data.

### Current connected resources — October 21, 2026

| Resource | Observed setup |
| --- | --- |
| GitHub | Public `blucat1/msba-shortlist`, default branch `main`; application and actual Supabase SQL CI passed |
| Cloudflare Pages | GitHub integration; `npm run build`; `dist`; Node 24.22.0; production on `main`; automatic preview branches verified as `none` |
| Supabase | `MSBA Shortlist`, reference `xglakzqorbjvganpbilu`, `us-west-1`; organization confirmed Free by owner; existing projects left untouched |
| Hosted database | Original three migrations applied and remote history verified; market release requires fourth migration `202610220001` and its separate recorded acceptance |
| Auth return addresses | Site URL `https://msba-shortlist.pages.dev`; exact redirect `https://msba-shortlist.pages.dev/auth/callback` |
| Google client/provider | Owner setup completed; provider enabled. Live sign-in reached `accounts.google.com` with identity-only scopes and the exact `https://xglakzqorbjvganpbilu.supabase.co/auth/v1/callback` return URL; no credentials entered during that automated check. Owner subsequently reported successful sign-in and save/refresh |
| Account deletion | Hosted `delete-account` ACTIVE version 1, `verify_jwt=true`; exact production `ALLOWED_ORIGINS` set; disposable self-deletion/cascades verified |
| Refresh automation | Server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set in GitHub Actions; [corrected 29-source production import and maintenance succeeded](https://github.com/blucat1/msba-shortlist/actions/runs/39583462319) at 10:18:42 UTC |
| Hosted authorization acceptance | 23 passed, 0 skipped, 0 failed, 0 cleanup failures; two disposable password-authenticated users removed; does not establish Google OAuth |
| Live frontend acceptance | Experience correction and payload optimization deployed as `229a9a1`, Cloudflare `3dcc8f79-48ab-4d3f-bb4e-7c08f1561936`, completed 10:17:21 UTC; eight anonymous browser groups passed after the full refresh, including strict experience views and all three routes at mobile/tablet/desktop widths |
| Owner controls | Verified October 21 at 22:42 PDT / October 22 at 05:42 UTC: owner-only final merge, separate mandatory CI, `production-ingestion` environment restricted to branch `main`, no repository-level secret copies, no teammates invited; [control evidence](COLLABORATION.md) |

Discovery defaults to **New grad & 0–1 years**; 2–3-year, experienced/senior and unverified requirements have separate views. The earlier production audit at **10:19:17 UTC on October 21** verified 29 successful employer sources and 365 supported records across all experience levels, with **6 strict-default listings**. That is a historical snapshot, not the current count. Broad source counts never mean new-grad counts. The market release retains those **29 employer boards** and adds **one cross-employer remote publisher, Jobicy**. It does not import the entire labor market. Its separate Google/Indeed/LinkedIn search links open unverified external results without fetching them into the catalog; users can track a suitable outside role manually. Existing My Search records remain independent of discovery filters. See [TEST_REPORT.md](TEST_REPORT.md) for dated release and import results.

The database password was generated and entered privately during project creation, then used through process environment for linking and migrations. It was never committed or printed. Use the Supabase dashboard's database-password reset if the operator later needs a new database connection password; application keys and Google credentials are separate.

Reference pages and free-plan limits were checked October 21, 2026. Recheck them when deploying. The tested runtime is Node **24.22.0**, pinned in `.nvmrc`; `package-lock.json` records installed versions. Supabase CLI 2.121.0 is pinned. Docker was unavailable on the Mac, but the real Docker-based Supabase SQL suites subsequently passed in GitHub Actions, and the hosted provisioning/migrations/function/API checks above were actually executed. See [TEST_REPORT.md](TEST_REPORT.md) for observed checks and boundaries.

## 1. Prepare the code and public repository

1. Install Node 24 using your usual Node version manager. From this repository, run:

   ```sh
   nvm install
   nvm use
   npm ci
   npm run setup:check
   npm run lint
   npm run typecheck
   npm run test:unit
   npm run build
   npx playwright install chromium
   npm run test:e2e
   ```

2. Run `npm run dev` and open the printed URL followed by `/demo`. The banner must say **Demo — sample jobs; changes stay in this browser.** Nothing in this step needs a cloud account.
3. In GitHub, create a **public** repository owned by the class team or designated operator. A provider subdomain will be used; do not buy a domain or enable billing. Connect the local repository using the instructions GitHub shows for that particular repository. Keep an existing remote if one is already configured. Push this project and its committed lockfile to the intended default branch, normally `main`.
4. Before committing, inspect `git status --short`. `.gitignore` excludes real env files, local tools, private exports, logs and secret files. Keep `.env.example` as placeholders. Never commit database dumps, access tokens, Google client secrets or a Supabase secret key. Rotate any key accidentally exposed, even if the file is subsequently removed.
5. Enable Actions for the repository. Preserve the applied owner-review/update ruleset and separate mandatory-CI ruleset described in [COLLABORATION.md](COLLABORATION.md). Only the owner merges to `main`; selected teammates can receive Write access later, but none were invited during setup. The ingestion workflow has read-only repository permissions and runs only on trusted `main`, with owner-only manual dispatch/reruns. Do not replace it with `pull_request_target` or expose production secrets to branch code. Editing `.github/governance/` templates does not apply GitHub settings; owner dashboard/API changes and read-back verification are separate.

Public source code is not public user data. Supabase stores private records under database authorization; neither the records nor privileged credentials belong in Git. Standard GitHub-hosted runners for public repositories are currently free. A future switch to a private repository changes allowances and requires a budget review. [GitHub billing reference](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## 2. Create a free Supabase project and record keys

1. In Supabase, create/select an organization and a **Free** project. Choose an appropriate US region and a strong database password. Store the password in the team's password manager, not the repository.
2. Wait for provisioning. In the project's Connect/API settings, copy its URL, project reference, **publishable** key and server-only **secret** key to their appropriate destinations below.

| Destination | Variables | Visibility |
| --- | --- | --- |
| Vite / Cloudflare build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_MODE=production`, `VITE_SITE_URL`, `VITE_OWNER_CONTACT` | Public: compiled into browser assets |
| GitHub environment `production-ingestion`, restricted to branch `main` | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Server only; never repository-level secrets when writers have branch access |
| Hosted Edge Function | Supabase supplies its URL and secret-key environment; set `ALLOWED_ORIGINS` | Server environment |

Prefer current `sb_publishable_…` and `sb_secret_…` keys. The documented legacy equivalents are an `anon` key for the browser and `service_role` key for the server. The browser code rejects privileged keys. Never prefix a privileged key with `VITE_`; a public key's safety depends on the RLS policies you apply next. [Supabase key guide](https://supabase.com/docs/guides/getting-started/api-keys).

For teammate development, use the credential-free demo or a disposable local/test Supabase backend. If browser configuration is needed, copy `.env.example` to `.env.local`, use that test backend's browser values, and restart Vite. Do not connect a teammate checkout to the shared production project. Production ingestion reads environment variables from its trusted process/GitHub environment; it does not automatically load a root env file. Production credentials and account configuration remain owner-operated.

## 3. Apply migrations and validate authorization

Install Docker Desktop or another supported running Docker-compatible runtime for the local test stack. The [official Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) is pinned as development dependency 2.121.0; `npm ci` installs it. `npx supabase --version` was verified. The existing `supabase/config.toml` is already initialized; do not overwrite it with a new scaffold.

First validate against a disposable local database:

```sh
npx supabase start
npx supabase db reset
npm run test:db
```

`db reset` above destroys the **local test database**. Never run a destructive reset against the pilot database. The SQL tests create two users, exercise private-record and child-record ownership, check anonymous catalog read/write boundaries, forge direct RPC calls, and exercise atomic ingestion and retention. They roll back their fixtures. Fix a failed gate before inviting users. Docker being unavailable is **not executed**, never a passing authorization check.

Now link the new hosted project and apply the committed migrations:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Use your actual project reference. Confirm the target before accepting migration prompts. Apply all **four** files in `supabase/migrations/` in order: core, private operations, employer-board ingestion, then **`202610220001_market_feed.sql`**. The fourth migration permits the Jobicy provider and adds the service-only `finalize_market_source_run` RPC; it leaves private-table policies unchanged and prevents rolling sources from using absence-based board finalization. Verify the remote migration list before running the new importer. Do not bypass policies to make a browser write succeed. [Migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).

In the hosted SQL Editor, verify the public tables have RLS enabled:

```sql
select tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
order by tablename;
```

Compare the live schema to migrations and run the two-browser checks in step 9. The SQL Editor is privileged, so a successful SQL Editor query alone cannot establish user isolation.

## 4. Configure Google identity-only OAuth

The hosted project is configured for Google-only authentication: `[auth] enable_signup=true` keeps new Google accounts possible, while `[auth.email] enable_signup=false` disables the unused email/password provider. Production config was previewed and pushed with only that declared provider change; Google settings were omitted to preserve dashboard-entered credentials. The owner subsequently completed Google client/provider setup, and the current hosted Auth check verifies `google_enabled=true`, `email_enabled=false` and `disable_signup=false`. This configuration check does not establish a completed Google callback/session. Keep these controls distinct. Supabase CLI 2.121.0 maps the email-specific setting to `external_email_enabled`.

At **02:31 PDT / 09:31 UTC**, an anonymous browser clicked the live Google sign-in button and reached `accounts.google.com`, with the Google Web client, exact project callback and identity-only scopes present and no visible client/redirect error. No credentials were entered during that automated check. The owner subsequently reported successful live Google sign-in and a saved job remaining after refresh. This supplies owner-reported callback/session and save/refresh acceptance; it is not an automated completed-login result.

At **02:34 PDT / 09:34 UTC**, independent server aggregate checks found one Google account with a recorded sign-in, one saved opportunity and one profile. No private notes/job contents were requested, and no user IDs, email addresses or tokens were logged. This corroborates the owner report without independently observing the browser actions; see [TEST_REPORT.md](TEST_REPORT.md).

For a new environment or credential replacement, use the following Google Cloud / Google Auth Platform steps; the owner's existing client/provider setup does not need repeating:

1. Create/select a project; configure branding and a real monitored owner contact. Choose an **External** audience so personal Google accounts can participate. During Testing, add each tester explicitly; publish the consent configuration when ready for the wider pilot and follow Google's requirements.
2. Request only `openid`, `email` and `profile`. Do not enable Gmail access or add mail scopes. No SMTP service is needed for this Google-only sign-in flow.
3. Create an OAuth client of type **Web application**. Set authorized JavaScript origins to the actual Pages origin, such as `https://YOUR_PROJECT.pages.dev`; add the exact local origin only while testing locally.
4. Set the authorized redirect URI to **`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`**. Copy this from Supabase Authentication → Sign In / Providers → Google. It is the **Google → Supabase** return address.
5. Enter the Google client ID and client secret into that Supabase Google-provider configuration and enable the provider. The client secret stays there; it is not a Vite variable.

These settings follow [Supabase's Google instructions](https://supabase.com/docs/guides/auth/social-login/auth-google). The app uses PKCE and basic identity scopes. It accepts a personal account and does not require a Cal Poly address or imply university sponsorship.

## 5. Deploy the static frontend to Cloudflare Pages

In Cloudflare's dashboard, create a **Pages** project by importing the public GitHub repository. Use its intended default branch for production. Choose the React/Vite preset or enter:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `24.22.0` (`NODE_VERSION` if an explicit override is needed) |

For the production build, set these public values:

```dotenv
VITE_APP_MODE=production
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_SITE_URL=https://YOUR_ACTUAL_PROJECT.pages.dev
VITE_OWNER_CONTACT=YOUR_MONITORED_CONTACT
```

Replace every placeholder. Use the Pages hostname actually allocated to your project; this document makes no availability claim for a particular name. If you needed a first build to obtain the hostname, update `VITE_SITE_URL` and rebuild. Keep automatic preview branches set to **none**, as verified for this project. Local demo and disposable test projects provide teammate previews without consuming the owner's Pages build allowance.

Deploy and check direct refreshes of `/opportunities`, `/my-search`, `/insights`, `/auth/callback`, and `/demo/opportunities`. `public/_redirects` and the static routing configuration support SPA deep links; `public/_headers` supplies browser security headers. Frontend env changes require a new build. A missing/invalid Supabase configuration must show a configuration error with the isolated demo link. Do not interpret that as a working live service. [Cloudflare React guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/).

## 6. Set Supabase Site URL and frontend return addresses

In Supabase Authentication → URL Configuration:

- Set **Site URL** to `https://YOUR_ACTUAL_PROJECT.pages.dev`.
- Add **`https://YOUR_ACTUAL_PROJECT.pages.dev/auth/callback`** as an allowed Redirect URL. This is the **Supabase → frontend** return address used by `VITE_SITE_URL`.
- During local testing, add `http://127.0.0.1:5173/auth/callback` or `http://localhost:5173/auth/callback` to match the precise origin used by your browser and `VITE_SITE_URL`. These names are different origins. Remove development entries you no longer need.

Keep production allowlists exact; do not allow every `pages.dev` preview or arbitrary domain. A Google `redirect_uri_mismatch` usually concerns step 4; a wrong frontend destination usually concerns this step or the build's `VITE_SITE_URL`. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 7. Deploy and check account deletion

The `delete-account` function validates the caller's session with Supabase Auth, accepts only the explicit confirmation, derives the user ID from that session, and deletes the Auth user so private records cascade. It never accepts a target user ID. Keep `verify_jwt=true` in the committed function configuration.

Configure the exact production origin and deploy:

```sh
npx supabase secrets set ALLOWED_ORIGINS=https://YOUR_ACTUAL_PROJECT.pages.dev
npx supabase functions deploy delete-account
```

`ALLOWED_ORIGINS` is plural and accepts comma-separated exact origins if an additional test origin is necessary. Supabase injects `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`; the function reads its `default` secret, with a legacy server-key fallback. Do **not** try to create custom secrets named `SUPABASE_*`: that prefix is reserved. [Function secrets](https://supabase.com/docs/guides/functions/secrets), [deployment](https://supabase.com/docs/guides/functions/deploy), [authentication](https://supabase.com/docs/guides/functions/auth).

Use a disposable authenticated account to confirm deletion from Settings after first exporting its data. An anonymous/expired-token request must fail; a request containing another user's ID must fail. Confirm the test account disappears from Auth and its private rows are removed while another account and the public catalog remain intact. A 401 must be diagnosed as a session/project configuration problem; do not disable token checks as a shortcut. Explain that provider backups, if present, may retain data until their retention period expires; this app cannot promise deletion from every provider backup immediately.

## 8. Verify sources, run the first import, enable schedules

Review each registry source's usage note, current terms and identity before a public pilot. There are 29 employer boards plus the Jobicy cross-employer remote feed. Jobicy is a publisher, not the employer: preserve each posting's company name, visible **Source: Jobicy** credit and canonical Jobicy listing/application links. Use only its free unauthenticated API; no paid original-ATS endpoint, API key or Bearer token is configured. Its free discovery window covers seven days and can lag publication by about three hours. Review the [public contract](https://jobicy.com/api/openapi.json), [fair-use terms](https://jobicy.com/jobs-rss-feed), and [SOURCE_AUDIT.md](SOURCE_AUDIT.md). Disable a source if permission or access conditions change; public API access is not unrestricted republication permission.

Without secrets, an audit can run as follows. **Do not repeat a Jobicy audit, dry-run, or production synchronization within the same hour.** The provider permits at most hourly synchronization; the pilot remains twice daily. Coordinate manual checks with the scheduled run instead of running all-source commands back to back.

```sh
npm run sources:verify
npm run ingest -- --dry-run --source ashby-ramp
```

The first command writes timestamped `docs/SOURCE_AUDIT.md` and `docs/source-results.json`. A failed check exits nonzero and records a real failure. To inspect just Jobicy, use `npm run ingest -- --dry-run --source jobicy-usa` **instead of** another Jobicy-containing audit during that hour. A dry-run validates the current discovery window without querying the production backlog or writing it. Zero relevant openings is a valid result, not a reason to add demo jobs.

The existing **`production-ingestion`** environment is verified: only branch `main`, no tag policies, both **`SUPABASE_URL`** and **`SUPABASE_SECRET_KEY`** stored there, and the repository-level secret list empty. Preserve that arrangement; a new environment must reproduce it before any teammate gets Write access. The committed ingestion job references the environment and checks the original/triggering actors so only the owner can dispatch or rerun production work. No per-run environment reviewer interrupts the authorized schedule. See [COLLABORATION.md](COLLABORATION.md). Do not add credentials to Cloudflare's frontend build or any `VITE_` name. Then:

1. Apply and verify the fourth migration, then let the owner merge the reviewed importer/workflow onto protected `main` after both required CI checks pass.
2. Respect the last Jobicy request time. Once at least one hour has passed, the owner can open Actions → **Public employer feed import** → **Run workflow**, select `main`, and run it.
3. Inspect safe aggregate counts and ensure each source finalized successfully. Check the live Coverage panel, public catalog and actual last-verified times. Production writes have not been tested merely because a dry-run passed.
4. Leave scheduled runs enabled. `.github/workflows/ingest.yml` uses `23 6,18 * * *`, meaning 06:23 and 18:23 **UTC** daily; Los Angeles local times change with daylight saving time. The workflow also runs 90-day retention maintenance after a successful import.

The CLI uses three-source concurrency, timeouts/retries and schema validation. Employer boards use complete snapshots: suspicious mass drops quarantine, first absence is unconfirmed, and closure requires another complete absence at least 12 hours later. **Jobicy uses a different path:** traverse its entire rolling window, independently check every older nonclosed ID in status batches, and call `finalize_market_source_run` atomically. Window absence never closes a job. Only the publisher's explicit `closed` status closes it; `unknown` becomes availability-unconfirmed and is withheld from recommendations, while explicit `active` refreshes verification. These are publisher statuses, not independent employer-ATS checks. Partial/malformed/missing status coverage preserves prior catalog data. Private application stages never change because a catalog listing closes.

For release acceptance, verify source credit in cards, details and saved snapshots; distinct publisher versus employer dates; no country inference from “Anywhere”; conservative experience tiers; and external market searches opening fixed provider hosts without adding results/counts to the catalog. Test manual tracking of an outside job through the existing My Search flow.

## 9. Perform the pilot acceptance check with two users

Use two separate browser profiles with two distinct Google accounts, plus an incognito anonymous session:

1. Anonymous: browse catalog and descriptions; confirm saving asks for sign-in. Verify no private opportunities, tasks, notes or emails are exposed.
2. User A: sign in, save a job, open its application page, return and choose **Not yet**. Applied counts must stay unchanged. Explicitly confirm an application, edit it, change stages, create/complete/snooze a task, group separate roles at one company, and refresh to check persistence.
3. User B: sign in separately. User A's tracker, notes, preferences and tasks must be absent. Test forged opportunity IDs through direct REST/RPC against a disposable project and confirm database rejection. Repeat the committed SQL authorization tests; do not rely on hiding UI controls.
4. Sign A out and sign B into the same browser. Confirm no A-specific state flashes or survives in caches/drafts. Refresh and inspect all three routes.
5. Export/import JSON in the same account, review duplicates and CSV row errors, and confirm ownership always belongs to the signed-in user. Verify manual jobs remain private and their URLs are saved as links rather than fetched by a privileged scraper.
6. At widths 390, 768 and 1440 pixels, inspect navigation, forms and details. Use Tab, Shift+Tab, Enter and Escape. Check empty, offline, stale-source and failed-save states; retain entered data on failure.
7. Export then delete one disposable account as in step 7; verify the other remains unaffected. Record actual observations in `TEST_REPORT.md` and the feedback section of `DEMO_SCRIPT.md`.

The pilot is not production-verified until these real account/database/callback checks pass. Record missing setup or failed checks honestly.

## 10. Operate within free limits and recover failures

Limits checked October 21, 2026:

| Service | Current free allowance / operational condition | Source |
| --- | --- | --- |
| Supabase | 500 MB database, 5 GB egress plus 5 GB cached egress, 50,000 MAU; free projects pause after one week inactive; at most two active free projects | [Pricing](https://supabase.com/pricing) |
| Cloudflare Pages | 500 builds/month, one concurrent free build, 20-minute build timeout | [Limits](https://developers.cloudflare.com/pages/platform/limits/) |
| GitHub Actions | Standard hosted runners are free for public repositories; private repositories use plan allowances | [Billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| GitHub schedule | Can be delayed/dropped; public-repository schedules disable after 60 days without repository activity | [Schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) |

These are dated allowances, not capacity or uptime guarantees. Review dashboards and failure notifications at least weekly during the pilot. No automatic upgrade, usage billing, heartbeat commits or artificial activity is implemented.

Owner-only releases and disabled branch previews do not cap public visitor usage or create a universal spending ceiling. Cloudflare's billing API returned 403, so unrelated account-wide paid subscriptions were not verified. A budget alert is not necessarily a hard cap. Keep account administration with the owner and check actual provider usage and current spending controls before expanding the pilot.

- **Stale schedule:** inspect the last Actions run and errors. Re-enable a disabled workflow through Actions, use **Run workflow** manually, and check actual Coverage timestamps. Never manufacture commits to bypass inactivity rules. Jobs become stale at 36 hours; after 72 hours without verification they leave default recommendations but remain available in the labeled stale view and private trackers.
- **Paused/quota-limited Supabase:** an owner must restore the project or resolve the quota in its dashboard, then run an import manually. Keep the clearly labeled `/demo` available. The live UI must not substitute sample data for an unavailable service.
- **Feed failure/quarantine:** check the original source and audit; respect Retry-After and Jobicy's at-most-hourly synchronization. Investigate board migration or mass drop before accepting a new employer-board baseline. For a Jobicy error, preserve the older catalog/statuses and repair cursor or independent-status validation; never treat aged-out window absence as closure. Do not clear quarantine by deleting catalog records. Disable a source and review its registry entry if access or terms change.
- **Retention:** `npm run maintenance -- --dry-run` describes the policy; with server credentials, `npm run maintenance` invokes the protected SQL task. It removes obsolete source-run logs and unreferenced closed-job details after at least 90 days. It preserves private opportunities, snapshots, notes, tasks and history.
- **Backups:** users can export versioned JSON and CSV in Settings. Store private exports outside public code and shared class slides. Operators should follow Supabase's current backup guidance, keep any manual database dumps encrypted and access-limited, and test restoration in a disposable project. Do not assume a paid-plan backup facility is included for free.
- **Rollback:** use Cloudflare Pages' Deployments rollback to a known-good frontend. For database problems, stop scheduled ingestion, export/protect user data and apply a reviewed forward-fix migration; do not reset or drop a populated cloud database. Re-test both users before resuming.
- **New employer:** start disabled/candidate, visit its official careers page, record a direct ATS link or exact posting URL cross-match, verify the public payload with the adapter, review usage terms, then set the verified timestamp/evidence and enable it. Re-run the source audit and unit checks. A provider/board/region migration requires a new source ID and disabling the old entry; the importer refuses to repoint an existing source identity. Disabled entries are synchronized even when there are no enabled feeds, so public database policies immediately hide their catalog/detail records. Unsupported ATS sites can remain external/manual opportunities.

Owner actions still required: verify audience/test-user or publishing availability for the wider pilot; test two independent Google browser accounts, same-browser private-cache/account switching and second-device persistence; review source usage terms and provider quotas. The market release additionally requires recorded acceptance of the fourth migration, Jobicy finalization and attribution before it is called deployed. Google client/provider setup and the earlier repository/Free project/three-migration backend/return URL/function/contact/production-import setup are complete. Owner controls and secret separation are verified, with no teammate invitations sent. Hosted API authorization and disposable deletion passed; they are not a substitute for remaining Google browser checks or the new release's verification.
