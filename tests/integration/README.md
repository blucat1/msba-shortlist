# Local ingestion integration gate

Use the pinned Node runtime, npm dependencies and a running Docker-compatible engine. The CI Supabase job runs the complete gate automatically. To reproduce it later on a Mac, first confirm the local stack contains no data you need, then run:

```sh
node scripts/prepare-local-integration.mjs --local-disposable
npx supabase start
npm run test:db
npx playwright install --with-deps chromium
npm run test:integration
```

Regardless of a test failure, stop/discard that **local** stack and restore the product configuration:

```sh
npx supabase stop --no-backup
node scripts/prepare-local-integration.mjs --local-disposable --restore
```

The preparation changes only the local working copy: password provider enabled for admin-created disposable users, public signup disabled. It preserves the original in an ignored, permission-restricted backup and restores it after the test. **Never run `supabase config push` with the prepared test copy.** The committed product configuration and hosted Google-only Auth remain unchanged. CLI `auth.email.enable_signup` also controls whether the email provider is enabled; see the [Supabase CLI issue](https://github.com/supabase/cli/issues/7055).

This is a disposable **local** Supabase test. The script obtains credentials only from the local CLI's captured `status --output json`, requires the exact `http://127.0.0.1:54321` API plus local database host, and never prints keys or user tokens. It refuses a populated local catalog before writing. Do not run it against a hosted project; remote service variables are not accepted as its configuration.

The only mocked boundary is native HTTP for the four approved public feed protocols. Captured public record projections in `fixtures/public-feeds.json` pass through the **actual** `scripts/ingest.ts` entry point: registry loading, `fetchPublicJson` policy/JSON handling, all four adapters, normalization, payload creation and the real SQL finalizers. Local Supabase Auth/REST/RPC requests remain real network requests. Unexpected external requests fail; tests never poll Jobicy or another live feed.

The gate also exercises two disposable local password accounts, owner isolation, source-company grouping, save/stage/task persistence, validated live backup/export/import and duplicate handling. Moving-window status checks cover active/unknown/explicit closure and stable-identity reopening; incomplete pages preserve prior data, and the production cooldown skips without requests or health changes. An anonymous Chromium browser loads the same persisted market record through the real app and checks company, attribution link and mobile layout. Test accounts, private records and seeded public metadata are removed afterwards; the CI stack is then discarded.

The fixture manifest records public endpoint/posting URLs and capture-file times. Records contain only bounded selected metadata and 90-word plain-text description prefixes; response counts are recomputed for this projection. Cursor and status envelopes are deliberate synthetic protocol controls. These fixtures are **not** a complete live board, a requirements gold set, proof that a listing is still open or data for the cohort relevance benchmark. Jobicy's credit remains in normalized/persisted/saved data and the rendered interface.

For environments without Docker, `npm run test:integration -- --fixtures-only` executes just the real shared HTTP/adapters/normalization path and explicitly reports that Supabase, Auth, SQL and browser integration were **not executed**. This option does not satisfy the CI integration gate.

Local password sessions are not Google OAuth. Multi-person Google account switching, a second physical device, usefulness and time saved remain the human checks in [PILOT_PROTOCOL.md](../../docs/PILOT_PROTOCOL.md); the owner has deferred that pilot. Never report automated fixture checks as classmate participation.
