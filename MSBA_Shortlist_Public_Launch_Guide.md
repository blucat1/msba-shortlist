# MSBA Shortlist — Codex handoff and public launch guide

Prepared October 20, 2026.

This guide accompanies **MSBA_Shortlist_Codex_Master_Prompt.md**. The application has not been built or deployed by this handoff. Commands referring to project scripts apply after Codex creates the repository. Codex must produce a project-specific `docs/DEPLOYMENT.md` with the exact commands it tested and any updated provider requirements.

## 1. Give Codex the full build brief

Use a repository-backed coding environment where Codex can create files, install dependencies, run the application, and execute tests. For Codex Cloud, select/create an environment connected to the intended GitHub repository and configure the necessary network access. The official setup is documented at https://developers.openai.com/codex/cloud and https://developers.openai.com/codex/environments/cloud-environments.

Start with a new repository named something like `msba-shortlist`. A public repository is the selected deployment path because standard GitHub-hosted Actions runners are free for public repositories; private repositories have plan-specific allowances. **Public source code must not contain private job-search records or credentials.** Source: https://docs.github.com/en/billing/concepts/product-billing/github-actions.

Either paste the entire master prompt into the Codex task, or add the file to the repository root and use this task message:

```text
Read MSBA_Shortlist_Codex_Master_Prompt.md in full and implement it in this
repository. The product and technical decisions are approved.

Build the complete working application, not a plan or visual mockup. Implement
both the credential-free demo and the real Supabase-backed application, real
job-feed adapters, ingestion workflow, migrations, authorization tests, and
public deployment documentation.

Run the checks available in this environment and fix failures. Missing external
credentials must not block the local demo or production integration code. Do
not invent a deployment, live source verification, or passing tests. Finish
with exactly what works, what was tested, and the human setup steps remaining.
```

Allow the agent to reach package registries, official documentation, and the specific public employer-feed endpoints required for verification. Treat external content as untrusted. Do not add production database secrets just to build and test the offline demo.

After the task, review the code changes and `docs/TEST_REPORT.md`. A successful build is not proof that login, privacy, and ingestion work against production.

## 2. Run and review the demo first

The requested repository must support:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite and enter the demo. No cloud credentials should be necessary. The demo banner must state that listings are fictional and changes stay in the browser.

Walk through discovery, saving, marking an application submitted, updating its stage, creating/completing a task, grouping by company, and opening Insights. Refresh the page. Verify that the demo persists and that opening an employer application does not itself increment applications.

Run the generated checks:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Playwright may require its browser installation command from the generated README. Database authorization checks are separate; a demo test does not validate Row Level Security.

If Codex reports an unavailable test environment, keep that as an unresolved verification item. Do not interpret “test written” as “test passed.”

## 3. Create the free Supabase project

Create a Supabase account/project on the **Free** plan. Save the database password securely. Record the project reference and URL.

Current advertised Free limits include a 500 MB database and 5 GB egress, and projects can pause after one week of inactivity. These are reasons to monitor usage and provide recovery instructions, not reasons to promise permanent free availability. Recheck the plan before launch: https://supabase.com/pricing.

Record the following distinct items:

| Item | Used for | Safe in frontend? |
|---|---|---|
| Project URL | Browser and ingestion connectivity | Yes |
| Publishable key | Browser client under RLS | Yes |
| Secret key / legacy service-role equivalent | Trusted ingestion and admin operations | **No** |
| Database password / personal CLI access token | Database setup and owner administration | **No** |

Supabase documents the public versus privileged key distinction at https://supabase.com/docs/guides/getting-started/api-keys. A browser-safe key does not replace authorization policies.

Apply the migration files Codex generated. Its deployment guide should specify the tested CLI version. The standard workflow is:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Do not manually create only a few tables and skip the policies/functions. Review the full migration output. Avoid blindly running migrations against an unrelated project.

Run the provided database tests against a local/test database as instructed in `docs/DEPLOYMENT.md`. Check that two users cannot access each other's data through direct API calls, not only through the interface. Supabase's RLS guide is at https://supabase.com/docs/guides/database/postgres/row-level-security.

## 4. Create the frontend deployment to obtain its URL

Connect the GitHub repository to **Cloudflare Pages**, using the Free plan. Use:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node runtime | The supported version pinned by the generated project |

Add the public build-time variables:

```text
VITE_APP_MODE=production
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_BROWSER_SAFE_PUBLISHABLE_KEY
```

Use additional public configuration variables only if the generated project documents them, such as `VITE_SITE_URL`. Never place `SUPABASE_SECRET_KEY`, a service-role key, or a Google client secret in these frontend settings.

Deploy to obtain a URL such as `https://YOUR_PROJECT.pages.dev`. The exact name may differ if it is unavailable. A custom purchased domain is not required for this plan. Redeploy after changing any Vite build-time values.

Cloudflare's React guide documents the `dist` build output and Pages subdomain: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/.

Check refresh/deep-link behavior on `/opportunities`, `/my-search`, `/insights`, and `/auth/callback`; the generated project must support SPA routing.

This initial deployment is not yet a finished public launch: login and live-source setup still need completion.

## 5. Set up Google sign-in, not Gmail access

Create a Google Cloud project and configure a web OAuth client. This sign-in flow needs only basic identity scopes: OpenID, email, and profile. Do not enable/request Gmail, Calendar, Drive, or other user-data scopes.

Use the current Google/Supabase console instructions: https://supabase.com/docs/guides/auth/social-login/auth-google.

There are two different callback destinations:

### Google sends its response to Supabase

Copy the exact callback displayed in Supabase's Google provider settings. It generally has this shape:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Put that in the Google OAuth client's **Authorized redirect URIs**. Do not replace it with the frontend `/auth/callback` route.

### Supabase returns the user to the frontend

Set the Supabase Auth **Site URL** to the real Pages origin. Add the exact frontend callback used by the app to its allowed redirects:

```text
https://YOUR_PROJECT.pages.dev/auth/callback
```

For local development, separately allow the actual local callback, normally:

```text
http://localhost:5173/auth/callback
```

Add the frontend origins where Google's client configuration requests authorized JavaScript origins. Use exact origins/paths as appropriate; do not use broad production wildcard redirect allowances.

Enter the Google Client ID and Client Secret in Supabase's provider configuration, not in the browser bundle. Enable Google as the provider. Disable email/password signup if the project does not implement that flow.

Configure an **External** audience if people outside your Google organization must sign in. During testing, add the necessary test users. Before public release, complete the current console's production/audience requirements and any applicable verification steps; do not assume a testing-only OAuth configuration admits everyone. Basic scopes avoid requesting inbox access, but account/branding requirements still depend on Google's current configuration. Do not invent an approved verification status.

Redirect configuration reference: https://supabase.com/docs/guides/auth/redirect-urls.

## 6. Deploy account deletion

The application brief requires a protected `delete-account` Supabase Edge Function. Deploy it using the generated instructions, commonly:

```bash
npx supabase functions deploy delete-account
```

Configure its production allowed origin and any required server settings exactly as documented by Codex. The function must validate the caller's user access token and derive the target user from that verified session. A user must never be able to submit another account ID for deletion.

Follow the current Supabase function-authentication guidance, especially if the project uses newer API keys: https://supabase.com/docs/guides/functions/auth. Do not fix a failing login/delete request by simply removing authentication.

Create a disposable account, add records, export them, and test deletion. Confirm that deleting it does not remove another user's data or the public catalog. The privacy text must accurately describe any backup-retention limitations.

## 7. Verify sources and run the first live import

The employer registry must be based on actual verified feeds, not invented job listings. The selected adapter documentation is:

- Greenhouse: https://docs.greenhouse.io/job-board.html
- Lever: https://github.com/lever/postings-api
- Ashby: https://developers.ashbyhq.com/docs/public-job-posting-api

Run the generated source-check and dry-run commands:

```bash
npm run sources:verify
npm run ingest -- --dry-run
```

Read `docs/SOURCE_AUDIT.md`. Check employer identity, board URLs, raw job count, relevant job count, and verification time. Zero suitable jobs can be legitimate. A successful endpoint fetch does not alone settle source usage terms; review the registry's usage notes.

In GitHub, open the repository's Actions secrets settings and add:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

Use the real server-side values. Do not commit a populated `.env` file. Do not add the server key to Cloudflare frontend variables or paste it into a normal issue/pull-request comment.

Run the generated **ingest** workflow manually on the trusted default branch. It should fetch supported feeds and write normalized results to Supabase. Inspect logs for actual counts and failures, not credentials or personal records. Confirm that the live site now shows real source-attributed listings and actual last-verified dates.

The scheduled workflow is intended to run twice daily. It is not an exact-time guarantee. GitHub documents that schedules can be delayed/dropped, run on the default branch, and be disabled after 60 days of public-repository inactivity. Recovery is to inspect/re-enable the workflow and run it manually, not to fabricate fresh timestamps. Reference: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule.

No site rebuild should be required just because the database catalog changed.

## 8. Complete the public-launch gate

Before inviting the cohort, perform these checks on the actual Pages URL:

| Check | Passing result |
|---|---|
| Signed-out visitor | Can browse only the intended public catalog |
| Personal Google account | Can sign in, complete onboarding, and save an opportunity |
| Second independent account | Cannot see or access the first account's records |
| Direct forged record IDs | Database/RPC rejects access and mutations |
| Refresh and second device | Cloud-backed records persist correctly |
| Application link | Opening it alone does not count as a submission |
| Status and Insights | Assessment is separate from interview; historical outcomes count correctly |
| Closed/stale source | Clear warning, no fake refresh, private history retained |
| Mobile and keyboard | Main workflows operate without clipping or mouse-only controls |
| Export/import | Backup round-trip works with the documented merge behavior |
| Delete account | Deletes only the confirmed current account and its private records |
| OAuth production access | Works for an intended user outside the initial test-user list |
| Privacy/coverage pages | Match the actual data flows and limitations |
| Repository and browser bundle | Contain no privileged credentials or private exports |

Fill the owner-contact field, remove accidental placeholder claims, and confirm the non-affiliation language. Do not claim official Cal Poly endorsement.

Record real user-test observations. A useful class exercise is to ask a teammate to find a role, save it, mark it applied, and create a follow-up without explaining the controls. Fix one observed friction point and describe that real change in the presentation.

## 9. Keep the $0 pilot maintainable

Check service usage periodically, especially database size and egress. Cloudflare currently lists 500 free builds per month; avoid unnecessary deployment loops. Reference: https://developers.cloudflare.com/pages/platform/limits/.

Do not enable automatic paid upgrades. When a service limit is approached, reduce unnecessary reads, narrow/clean the public catalog, or restrict expansion of the pilot rather than promising unlimited free access. Preserve private user histories and exports.

Keep the source registry small enough to maintain. Unsupported employers remain addable manually; they are not silently represented as automatically covered.

The generated maintenance job should prune old diagnostics and unreferenced closed catalog details, not active user applications. The operator should maintain private backups using the project's documented method and provider capabilities; do not assume a free plan includes the same backup guarantees as paid plans.

For a paused Supabase project, restore it through the provider's dashboard and verify auth/database health before claiming recovery. For a stale ingestion schedule, inspect the workflow and rerun it. For a failed employer adapter, disable/quarantine that source rather than displaying fabricated freshness.

## What this handoff does and does not accomplish

The master prompt is a complete authorized build specification. It asks Codex to implement and test the product in one task, including the real backend and discovery pipeline.

It is not a guarantee that an agent will produce flawless code in one pass, and it does not create your accounts, approve Google OAuth, supply secrets, or perform a live security review. The local demo can be completed without those accounts; publicly usable authentication, persistent private records, and real job discovery require the deployment steps and verification above.
