# Source audit

Actual public-feed verification at **2026-10-21T07:53:39.620Z** using `npm run sources:verify`. 26/26 configured sources returned complete, schema-valid snapshots. This report is generated from real requests, without fixtures. Counts change as employers publish and close roles. Totals across successful sources: **2225 raw, 2225 publicly listed, 72 in scope and 128 needing details checked**.

| Employer | Provider/board | Result | Raw | Public listed | In scope | Needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Robinhood | greenhouse/robinhood | passed | 156 | 156 | 0 | 14 | [Official careers evidence](https://careers.robinhood.com/) |
| Ramp | ashby/ramp | passed | 169 | 169 | 14 | 0 | [Official careers evidence](https://ramp.com/careers) |
| Duolingo | greenhouse/duolingo | passed | 62 | 62 | 0 | 10 | [Official careers evidence](https://careers.duolingo.com/) |
| Figma | greenhouse/figma | passed | 141 | 141 | 7 | 1 | [Official careers evidence](https://www.figma.com/careers/) |
| Palantir | lever/palantir | passed | 306 | 306 | 8 | 0 | [Official careers evidence](https://www.palantir.com/careers/) |
| Notion | ashby/notion | passed | 135 | 135 | 5 | 0 | [Official careers evidence](https://www.notion.com/careers) |
| Amplitude | ashby/amplitude | passed | 42 | 42 | 2 | 0 | [Official careers evidence](https://amplitude.com/careers) |
| Reddit | greenhouse/reddit | passed | 155 | 155 | 0 | 32 | [Official careers evidence](https://redditinc.com/careers) |
| Webflow | ashby/webflow | passed | 18 | 18 | 3 | 1 | [Official careers evidence](https://webflow.com/company/careers) |
| Benchling | ashby/benchling | passed | 53 | 53 | 10 | 0 | [Official careers evidence](https://www.benchling.com/careers) |
| Vanta | ashby/vanta | passed | 85 | 85 | 9 | 0 | [Official careers evidence](https://www.vanta.com/company/careers) |
| Asana | greenhouse/asana | passed | 104 | 104 | 0 | 3 | [Official careers evidence](https://asana.com/jobs/all) |
| Mercury | greenhouse/mercury | passed | 74 | 74 | 0 | 11 | [Official careers evidence](https://mercury.com/jobs) |
| Mural | ashby/mural | passed | 13 | 13 | 0 | 0 | [Official careers evidence](https://www.mural.co/careers) |
| Flexport | greenhouse/flexport | passed | 205 | 205 | 0 | 10 | [Official careers evidence](https://www.flexport.com/careers/) |
| Thumbtack | ashby/thumbtack | passed | 52 | 52 | 4 | 6 | [Official careers evidence](https://careers.thumbtack.com/) |
| Ro | lever/ro | passed | 52 | 52 | 1 | 0 | [Official careers evidence](https://ro.co/careers/) |
| Calendly | greenhouse/calendly | passed | 9 | 9 | 0 | 4 | [Official careers evidence](https://calendly.com/careers) |
| Lattice | greenhouse/lattice | passed | 9 | 9 | 0 | 1 | [Official careers evidence](https://lattice.com/careers) |
| Linear | ashby/Linear | passed | 29 | 29 | 2 | 0 | [Official careers evidence](https://linear.app/careers) |
| Brex | greenhouse/brex | passed | 263 | 263 | 0 | 29 | [Official careers evidence](https://www.brex.com/careers) |
| Ironclad | ashby/ironcladhq | passed | 33 | 33 | 4 | 0 | [Official careers evidence](https://ironcladapp.com/careers) |
| BetterUp | ashby/betterup | passed | 6 | 6 | 2 | 0 | [Official careers evidence](https://www.betterup.com/about-us/careers) |
| Teachable | greenhouse/teachablecareers | passed | 5 | 5 | 0 | 0 | [Official careers evidence](https://www.teachable.com/careers) |
| Wealthfront | lever/wealthfront | passed | 23 | 23 | 1 | 0 | [Official careers evidence](https://www.wealthfront.com/careers) |
| Upgrade | greenhouse/upgrade | passed | 26 | 26 | 0 | 6 | [Official careers evidence](https://www.upgrade.com/careers/) |

In scope = supported role, explicit US location evidence and full-time evidence; includes senior IC roles for the optional larger-stretches view. Needs details = supported role but unknown country or employment type. Neither category guarantees individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version 2026-10-21.1. Greenhouse often omits employment type, so its otherwise relevant listings conservatively need details checked. A zero relevant count is a successful feed with no known suitable openings.

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs cross-matched to that board), not guessed from employer names. See `data/employers.json` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Atomic server finalization quarantines a >60% board drop, and closure requires two complete successful snapshots at least twelve hours apart. Failed sources preserve prior catalog records.

No network or payload failures occurred in this verification run.
