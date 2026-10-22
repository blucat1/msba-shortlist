# Contributing to MSBA Shortlist

Teammates can improve the code through branches and pull requests. `blucat1` keeps the production accounts, billing, and final approval. Teammate access has not been granted as part of this setup; the owner can invite selected teammates with **Write** access later. The [owner guide](docs/COLLABORATION.md) describes the intended protections and where to verify them.

## Start locally

Clone the public repository and use Node **24.22.0** from `.nvmrc` and the committed npm lockfile:

```sh
git clone https://github.com/blucat1/msba-shortlist.git
cd msba-shortlist
nvm install
nvm use
npm ci
npm run dev
```

Open <http://localhost:5173/demo>. No credentials or `.env` file are needed. The demo is fictional, stored in your browser, and isolated from the live database. Keep the demo banner visible and use invented data in screenshots and test fixtures.

For database work, start Docker and run `npx supabase start`, then `npm run test:db`. Use the disposable local Supabase stack, migrations, and authorization tests; see [DATABASE.md](docs/DATABASE.md). Do not link your checkout to the production project or ask for its server key. Any local browser configuration must point to your own local/test backend, never the shared production database. Keep real configuration and exports out of Git.

## Make a change

Once the owner has granted Write access, push a feature branch directly to this repository:

```sh
git switch main
git pull --ff-only
git switch -c teammate/improve-job-filters
# Edit the code and run the checks below.
git add src/features/Opportunities.tsx
git commit -m "Improve job filter labels"
git push -u origin teammate/improve-job-filters
```

Stage the files you actually changed. In GitHub, open a pull request with base **main**, describe the resulting behavior, and include the checks you ran and anything not tested. Request review from `blucat1`; respond to feedback on the same branch. Public forks are also available for contributions without repository Write access.

Production changes go through owner review and merge. Branch pushes and pull requests do not publish the production site. Automatic Cloudflare preview builds are intended to be disabled; check the owner guide's verification status before relying on that setting. A merge to `main` can automatically deploy the frontend. Database migrations and account configuration remain owner-operated.

## Check your work

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:db:smoke
npm run build
npx playwright install chromium
npm run test:e2e
```

Run `npm run test:db` on the local Supabase stack for database, authorization, or RPC changes. Report missing Docker or other blocked checks honestly. Record observed results in [TEST_REPORT.md](docs/TEST_REPORT.md).

Read [AGENTS.md](AGENTS.md) before editing. Preserve the three primary routes, demo/live separation, unknown job requirements, private snapshots/history, RLS, and server/browser secret separation. Changes to dependencies, workflows, source coverage, migrations, or infrastructure need the same owner review as UI changes. Keep paid services and production operations out of development branches.
