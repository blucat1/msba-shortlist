# Four-person handoff

MSBA Shortlist has a credential-free browser demo and separate Supabase production integration. Work on the public implementation without mixing fictional demo records into production. Configure the product name and owner contact in `src/config.ts`; complete the owner contact before a public launch.

| Review area | Start here | Review outcome |
| --- | --- | --- |
| Interface and accessibility | `src/app/`, `src/components/`, `src/features/`, `src/styles.css` | Test 390 px, 768 px, and 1440 px; keyboard navigation, dialog focus, clear labels, readable errors, and retained form input after failed saves. Walk the three primary routes and the deep-linked job panel. |
| Data and relevance | `src/domain/`, `src/ingestion/`, `data/employers.json`, `docs/SOURCE_AUDIT.md` | Review real employer identity and usage notes before enabling a source. Test conservative unknowns, role scope, salary periods/bands, required versus preferred skills, seniority, freshness, and the two-complete-check closure rule. |
| Auth, database, and security | `src/repositories/`, `src/lib/`, `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`, `docs/SECURITY.md` | Apply migrations and run the two-user/anonymous tests in an actual local/test Supabase environment. Review owner policies, child ownership, idempotent RPCs, OAuth redirects, account deletion, and browser-safe versus server-only keys. |
| QA, demo, and deployment | `tests/`, `.github/workflows/`, `scripts/`, `docs/DEPLOYMENT.md`, `docs/TEST_REPORT.md`, `docs/DEMO_SCRIPT.md` | Run the documented checks with the pinned Node runtime; rehearse the demo, confirm browser persistence/export/import, finish human account setup, and verify real deployment rather than inferring success from a build. |

## Shared data contracts

`src/domain/types.ts` defines camelCase application data. `src/repositories/types.ts` defines the async repository used by the UI in both modes. The Supabase adapter maps these data to database columns. Keep ranking, queue, analytics, and transfer logic shared; changing SQL must not introduce an unexplained alternative ranking algorithm.

`src/domain/fixtures.ts` generates deterministic fictional samples from an injectable reference date. `src/repositories/demo.ts` stores only private state plus that reference in the `msba-shortlist:demo:v1` browser-storage namespace. A failed or full browser store must produce a failed save, preserving the earlier state. Reset demo affects only this namespace.

Use `saveOpportunity` to create a record or edit ordinary fields. Use `changeStage` to change stages and append history atomically. An application-page click is its own event and cannot establish submission. Directly changing a historical record to Interviewing must leave the application date unknown unless the user supplies it. Task suggestions create no task until accepted.

Calendar dates remain `YYYY-MM-DD`; actual events and exact-time tasks use UTC timestamps. Queue and analytics logic interpret date-only values in the stored preference timezone. Do not parse a deadline as a midnight UTC event and then display it in local time.

JSON backups are version 1, at most 2 MB, 1,000 opportunities, 5,000 tasks, and 10,000 history events. Import validates the full backup, remaps IDs/ownership, appends new records, and skips existing duplicates with their related tasks/history. Imported preferences replace current preferences; existing company notes win conflicts. The optional `sourceMode` records demo/live provenance; live imports reject demo backups. An outside CSV supports `company,title,location,stage,priority,application_date,deadline,url,notes,role_family,next_action,next_action_date`; dates must be real `YYYY-MM-DD` values. CSV exports also carry `record_origin` to preserve demo provenance through a round trip. CSV formula starts are escaped on export. Never use import to change the public catalog.

## Analytics interpretation

Submission counts use known day-precision application dates in the selected period. Current pipeline counts include every tracked opportunity and are labeled current state. Interview and offer conversions require historical events in the selected application-date cohort; an assessment is not an interview. Rejected opportunities retain earlier actual interview/offer history. The optional 14-day filter narrows conversion cohorts and the role conversion table, while submission totals and weekly activity retain the selected period. Unknown/imprecise dates are shown as excluded and never fabricated.

Task completion uses completed tasks in the period divided by the union of tasks due in that period and tasks completed in that period. Date-only tasks become overdue the next calendar day; exact-time tasks become overdue when their actual timestamp passes. Terminal Rejected/Withdrawn opportunities leave the default action queue, while a closed public listing alone does not hide private interview or offer tasks.

## Before handing this to pilot users

Read `docs/DEPLOYMENT.md` for exact external account, key, OAuth, hosting, and scheduled import setup. Review `docs/TEST_REPORT.md` for executed results and unmet prerequisites. The local demo and passing unit tests cannot establish that deployed RLS, OAuth, source feeds, or account deletion work. Preserve public code/private database separation, use provider subdomains for the pilot, and monitor actual free-plan limits rather than assuming unlimited service.

Known scope limits include selected employer coverage, conservative text extraction, location-restricted remote roles, no application autofill/submission, no email/calendar integration, no offline cloud-write queue, and source-dependent freshness. JSON is the lossless tracker backup; CSV intentionally contains a simpler opportunity table. Read `docs/KNOWN_LIMITATIONS.md` for the current implementation-specific limits and owner launch requirements.
