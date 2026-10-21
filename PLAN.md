# Implementation checklist

- [x] Strict React/Vite stack and accessible three-screen interface.
- [x] Shared types, explainable relevance, historical analytics, tasks, and persistent isolated demo.
- [x] Supabase persistence, Google identity, migrations, owner authorization, and secure account deletion.
- [x] Three real adapters, verified employer registry, safe atomic ingestion, and scheduled workflow.
- [x] Manual additions, editing, import/export, preferences, privacy, coverage, and failure states.
- [x] Unit, browser, build, lint, and available database checks; observed reports and deployment handoff.

Cloudflare Pages remains the selected deployment target. External account creation and credentials are owner setup; they do not block local implementation.

Observed checks: 75 unit/component tests; 6 browser workflows against dev and built static assets; 93 supplementary PostgreSQL assertions; 26 verified employer feeds. Docker-dependent Supabase tests and actual cloud setup remain explicitly unexecuted. See docs/TEST_REPORT.md.
