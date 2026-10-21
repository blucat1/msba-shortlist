# Data dictionary

The maintained TypeScript domain is `src/domain/types.ts`; SQL columns/constraints are in `supabase/migrations`, with client types in `src/lib/database.types.ts`. Application fields use camelCase and SQL uses snake_case. An unknown value remains `null`/`unknown`; it is not replaced with zero or a positive claim.

| Entity/field | Meaning and limits |
| --- | --- |
| Employer `id` | Stable registry identity used for company grouping; company name alone is not a requisition identity. |
| Source `provider`, `board_id`, `region` | Greenhouse/Lever/Ashby official board identity; `(provider,board_id)` is unique. |
| Source `state`, `enabled`, `verified_at`, `evidence_url`, `usage_note` | Candidate/verified/disabled/failed registry status and factual verification/usage-review evidence. Verification does not imply unlimited republication rights. |
| Source `last_success_at`, `last_check_at` | Complete successful board verification versus most recent attempt. Failed/quarantined checks do not advance success. |
| Source `raw_count`, `snapshot_count`, `relevant_count` | Provider raw records, normalized listed records, and included/needs-details classifications from the last accepted complete snapshot. Raw can include unlisted Ashby records. |
| Catalog `(source_id,external_id)` | Stable provider/board posting key. Database UUID persists across edits/closure/reopening; different requisitions stay separate. |
| Catalog `summary` | Bounded JSON containing locations, work arrangement, employment evidence, role tags, confidence/reasons/classifier version, compact summary, required/preferred skills, experience, salary bands and timing evidence. Full description is stored separately. |
| Catalog `sourcePostedAt` | Original source-reported posting date only when actually available. Greenhouse updates and Ashby publication times do not become original posting dates. |
| Catalog `source_published_at`, `source_updated_at` | Source-reported publication/update timestamps; distinct from discovery/check timestamps. |
| Catalog `first_seen_at`, `last_seen_at` | First discovery in this product and latest accepted complete snapshot containing that stable record. First seen never resets on edits/reruns. |
| Catalog `availability`, `missing_since`, `missing_count` | Open/unconfirmed/closed and validated absence evidence. User stage is independent. |
| Job details `description`, `evidence` | Plain text up to 80,000 characters plus bounded evidence. Cached for included/needs-details jobs; fetched on demand. |
| Source run `id`, `status`, `complete`, counts, `warning` | Idempotent finalization outcome. Only trusted server credentials can read/write; public coverage uses safe aggregates instead. |
| Profile `preferences` | Expressed role interests/primary families, locations/work modes, optional salary, graduation/start/experience/skills, browser-default editable timezone and onboarding state. No MSBA-derived skill/authorization inference. |
| Opportunity `user_id`, `catalog_job_id` | Owner derived from Auth; optional public-job reference. Manual entries remain independent, and catalog deletion cannot erase the private snapshot. |
| Opportunity `company_key` | Stable `employer:` grouping when known; explicit normalized manual company key otherwise. User corrections do not merge unrelated company names automatically. |
| Opportunity `data` | Editable private location/work mode/posting link/salary text/deadline/primary-role fields, separate from public catalog and preserved snapshot. |
| Opportunity `stage`, `priority` | Saved/Applied/Assessment/Interviewing/Offer/Rejected/Withdrawn and High/Normal/Low. Assessment does not mean interview. |
| Opportunity `application_date`, `application_date_precision` | Date-only value and day/month/unknown precision. Null date requires unknown precision. Historical advanced stages do not invent an application date. |
| Opportunity `notes`, `snapshot` | Private notes up to 20,000 characters and preserved relevant job context. Full cached source description is omitted from new snapshots to bound storage. |
| Event `event_type`, stages, `occurred_at` | Creation, stage change, opened application, date correction or edit; actual UTC timestamp. Opening an application never changes application analytics. |
| Event `provenance`, `idempotency_key`, `request_hash` | User/import origin, owner-scoped retry identity, and internal date/action request hash. Imported user IDs are ignored. Request hash is internal and not needed in backups. |
| Task `opportunity_id`, `user_id` | Composite foreign key requires the same owner as the parent. Opportunity deletion cascades its tasks. |
| Task `due_date`, `due_at` | Mutually exclusive date-only deadline versus actual UTC timestamp; no implicit midnight timezone conversion. Either can be absent. |
| Task `status`, `done_at`, `snoozed_until`, `origin` | Open/done/snoozed, completion timestamp, date-only resume date and user/suggested origin. Suggestions require user acceptance. |
| Company note `(user_id,company_key)` | Private grouping note, never a public company research record. |
| Job preference `(user_id,job_id)` | Private dismissed/seen state for a real public catalog UUID. |
| Backup `version`, `exportedAt`, arrays | Version 1 JSON containing all private tracker entities/preferences. Imported IDs/ownership are remapped. CSV is opportunity-only and formula-safe. |

All actual timestamps are UTC ISO strings; date-only values retain `YYYY-MM-DD`. JSON compensation bands retain currency, period, base/total/unknown type, applicable location and exact source text. Hourly and annual amounts are not silently conflated. Multi-location arrays and education alternatives remain arrays. A user's primary role family controls analytics aggregation so multi-tag jobs are not counted repeatedly.
