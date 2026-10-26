# Additional industrial, consumer and healthcare employer boards — group E

Verified **2026-10-26T23:36:13.970Z** through official careers pages and complete documented public API responses. The final registry is [data/employers.json](../data/employers.json). This research does not itself establish production ingestion or final hosted counts.

Eight added boards provide **1,462 raw/listed rows**, **21 included** and **35 needing details**: **56 supported records across experience levels**. The new-grad tier contains six included Applied Intuition requisitions; cumulative early career contains ten included plus eight needing details. These precede individual degree, graduation, authorization, timing and preference checks. Graduate hiring does not establish zero required years or guarantee an MSBA applicant meets every qualification.

| Company | Provider | Board | Raw | Included | Needs details | New-grad supported | Early-career supported |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Applied Intuition | ashby | applied | 325 | 21 | 0 | 6 | 10 |
| Natera | greenhouse | natera | 225 | 0 | 7 | 0 | 1 |
| Freenome | greenhouse | freenome | 31 | 0 | 3 | 0 | 0 |
| Relativity Space | greenhouse | relativity | 397 | 0 | 4 | 0 | 0 |
| Fanatics Collectibles | greenhouse | fanaticscollectibles | 186 | 0 | 9 | 0 | 4 |
| Fanatics Commerce | greenhouse | fanaticscommerce | 203 | 0 | 8 | 0 | 2 |
| Fanatics Betting & Gaming | greenhouse | fanaticsfbg | 71 | 0 | 3 | 0 | 0 |
| Fanatics | greenhouse | fanaticsinc | 24 | 0 | 1 | 0 | 1 |

## Official identity evidence

- **Applied Intuition** — [Official careers page directly links current jobs.ashbyhq.com/applied posting IDs.](https://www.appliedintuition.com/careers)
- **Freenome** — [Official job-openings page embeds boards.greenhouse.io/embed/job_board/js?for=freenome.](https://www.freenome.com/job-openings/)
- **Natera** — [Official careers page has Join Us/View job openings links to job-boards.greenhouse.io/natera and names Greenhouse as its recruiting partner.](https://www.natera.com/company/careers/)
- **Fanatics Collectibles** — [Official Fanatics Join Our Team page directly links job-boards.greenhouse.io/fanaticscollectibles.](https://www.fanaticsinc.com/join-our-team)
- **Fanatics Betting & Gaming** — [Official Fanatics Join Our Team page directly links job-boards.greenhouse.io/fanaticsfbg.](https://www.fanaticsinc.com/join-our-team)
- **Fanatics Commerce** — [Official Fanatics Join Our Team page directly links job-boards.greenhouse.io/fanaticscommerce.](https://www.fanaticsinc.com/join-our-team)
- **Fanatics** — [Official Fanatics Join Our Team page directly links job-boards.greenhouse.io/fanaticsinc.](https://www.fanaticsinc.com/join-our-team)
- **Relativity Space** — [Official jobs page declares const BOARD=relativity, fetches boards-api.greenhouse.io/v1/boards/ plus BOARD, and links the same Greenhouse board.](https://www.relativityspace.com/jobs)

Fanatics' four boards represent its separately published business inventories, with each original provider/board/posting identity retained. Their logos use the official shared parent mark, documented in COMPANY_LOGOS.md. Raw rows or company totals can overlap; they are not distinct graduate-program counts.

## Candidates excluded from this pass

- At-Bay's official careers page identifies Greenhouse `atbayjobs`; its complete 31-row snapshot contained zero supported roles. It was not added to increase the source count.
- Warby Parker's current official All Jobs link leads to Oracle Cloud. Boston Dynamics and Novanta link to Workday; Rivian uses iCIMS; Nielsen's official careers page links to SmartRecruiters; Root Insurance links to Rippling. No legacy board was enabled for these employers.
- Chewy, Peloton, DraftKings, Rocket Lab, Lucid Motors, SpaceX, Coalition, Numerator, General Atlantic and NEXT Insurance did not establish a complete, currently approved provider-board identity in this bounded review. Some official pages returned access errors, TLS errors or client-only careers integrations. Those responses were not bypassed or declared successful, and guessed/stale feed totals were not used.

Only the existing Greenhouse/Ashby public read adapters were used for these additions. Every complete feed passed schema, count/identity uniqueness, safe posting URL and listed-record validation; no partial response was accepted. No Jobicy poll, private data access, paid API, account creation, authenticated ATS call, arbitrary job-page scraping or production write was performed by this research. The root release performs final full-registry checks and production acceptance. Raw response caches remain outside Git under /tmp/source-e-feeds.

Provider references: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api).
