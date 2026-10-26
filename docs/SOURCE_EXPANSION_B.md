# Additional verified employer sources — group B

Identity verification completed **2026-10-26T22:53:58.489Z**. Candidate registry: [`data/employers.json`](../data/employers.json). This is research and a verified registry proposal; it does not establish production ingestion or current hosted counts.

**21 additional employers** returned complete schema-valid public snapshots through the existing adapters, producing **4126 raw listed postings / 300 supported records** under classifier `2026-10-22.2`: **88 explicitly in-scope**, **212 needing country/employment details**, **2 strict new-grad/0–1 in-scope**, and **6 strict-tier records needing details**. These are not 300 graduate vacancies. Counts precede individual profile conflicts, saved/dismissed exclusions, freshness checks and requisition grouping.

Feed snapshots were checked at 2026-10-26T22:49:41.960Z (first 15 employers) and 2026-10-26T22:51:55.658Z (last six). The root release may reprocess with a newer classifier; this dated diagnostic is not substituted for its final source audit. Early-career 0–3 totals were not captured for the initial snapshot and are intentionally not inferred from titles or strict-tier counts.

| Employer | Provider / board | Raw | Included | Needs details | Strict new-grad | Strict tier needs details | Official identity evidence |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Samsara | greenhouse / `samsara` | 327 | 2 | 23 | 0 | 0 | [Official source](https://www.samsara.com/company/careers/roles) |
| Verkada | greenhouse / `verkada` | 331 | 21 | 0 | 1 | 0 | [Official source](https://www.verkada.com/careers/) |
| Scale AI | greenhouse / `scaleai` | 166 | 16 | 2 | 0 | 0 | [Official source](https://scale.com/careers) |
| Axon | greenhouse / `axon` | 474 | 0 | 36 | 0 | 0 | [Official source](https://www.axon.com/careers/all) |
| Oscar Health | greenhouse / `oscar` | 226 | 0 | 16 | 0 | 0 | [Official source](https://oscarhealth.com/careers) |
| Motive | greenhouse / `gomotive` | 163 | 0 | 9 | 0 | 1 | [Official source](https://gomotive.com/company/careers/) |
| Instacart | greenhouse / `instacart` | 100 | 0 | 8 | 0 | 0 | [Official source](https://www.instacart.careers/current-openings) |
| Discord | greenhouse / `discord` | 46 | 7 | 1 | 1 | 0 | [Official source](https://discord.com/careers) |
| Pinterest | greenhouse / `pinterest` | 160 | 0 | 39 | 0 | 4 | [Official source](https://www.pinterestcareers.com/jobs/) |
| GitLab | greenhouse / `gitlab` | 238 | 0 | 8 | 0 | 0 | [Official source](https://about.gitlab.com/jobs/all-jobs/) |
| Okta | greenhouse / `okta` | 389 | 0 | 14 | 0 | 0 | [Official source](https://www.okta.com/company/careers/job-listing/) |
| Fivetran | greenhouse / `fivetran` | 171 | 9 | 8 | 0 | 0 | [Official source](https://www.fivetran.com/careers) |
| Intercom | greenhouse / `intercom` | 100 | 0 | 1 | 0 | 0 | [Official source](https://fin.ai/careers) |
| Braze | greenhouse / `braze` | 346 | 0 | 23 | 0 | 1 | [Official source](https://www.braze.com/company/careers/how-we-hire) |
| Zscaler | greenhouse / `zscaler` | 353 | 5 | 2 | 0 | 0 | [Official source](https://www.zscaler.com/careers/search) |
| Spotify | lever / `spotify` | 89 | 0 | 6 | 0 | 0 | [Official source](https://lifeatspotify.com/start-your-journey) |
| Cohere | ashby / `cohere` | 116 | 9 | 1 | 0 | 0 | [Official source](https://cohere.com/careers) |
| Glean | greenhouse / `gleanwork` | 132 | 0 | 15 | 0 | 0 | [Official source](https://www.glean.com/careers) |
| Runway | ashby / `runway-ml` | 47 | 4 | 0 | 0 | 0 | [Official source](https://runway.com/careers) |
| Anyscale | ashby / `anyscale` | 21 | 2 | 0 | 0 | 0 | [Official source](https://www.anyscale.com/careers) |
| Perplexity | ashby / `perplexity` | 131 | 13 | 0 | 0 | 0 | [Official source](https://www.perplexity.ai/hub/careers) |

## Identity evidence

- **Samsara:** Official role links carry gh_board=samsara and gh_jid IDs; all 327 feed IDs were present on the official careers listing in this identity review.
- **Verkada:** Official View open positions section requests boards-api.greenhouse.io/v1/boards/verkada/jobs and links job-boards.greenhouse.io/verkada/jobs postings.
- **Scale AI:** Official careers page requests api.greenhouse.io/v1/boards/scaleai/jobs, offices and departments; feed posting IDs cross-matched rendered official careers content.
- **Axon:** Official careers listing links /careers/job/8001657003 titled Channel Partners Program Manager, matching Greenhouse axon posting 8001657003; 25 current feed IDs cross-matched the official listing.
- **Oscar Health:** Official hioscar.com careers redirects to oscarhealth.com/careers and links Greenhouse embed/job_app?for=oscar&token=8229714 and other exact oscar feed IDs.
- **Motive:** Official page configuration job_department_api_url is https://boards-api.greenhouse.io/v1/boards/gomotive/departments.
- **Instacart:** Official careers page requests boards-api.greenhouse.io/v1/boards/instacart/departments; 100 current feed posting IDs cross-matched the rendered official page.
- **Discord:** Official careers client requests api.greenhouse.io/v1/boards/discord/jobs; all 46 current discord feed IDs appeared in the rendered official page. Separate international boards are deliberately not added here.
- **Pinterest:** Official careers listing links https://www.pinterestcareers.com/jobs/8240355/staff-machine-learning-engineer/?gh_jid=8240355, matching exact title and ID in Greenhouse pinterest feed. Browser challenge was not bypassed; this exact public first-party page was readable through normal web retrieval.
- **GitLab:** Official careers page requests boards-api.greenhouse.io/v1/boards/gitlab/departments. Public feed uses job-boards.greenhouse.io/gitlab postings.
- **Okta:** Official careers listing links /company/careers/sales/sales-development-representative-toronto-7013721/ with title Sales Development Representative, Toronto, matching title and posting ID 7013721 in the Greenhouse okta feed.
- **Fivetran:** Official page requests boards-api.greenhouse.io/v1/boards/fivetran/departments and explicitly links my.greenhouse.io/users/sign_in?job_board=fivetran; 167 feed IDs cross-matched rendered page. dbt Labs careers now points to this careers inventory, so no separate stale dbt board is added.
- **Intercom:** Official intercom.com/careers redirects to fin.ai/careers; its rendered job data includes job-boards.greenhouse.io/intercom/jobs URLs and all 100 current intercom feed IDs. The source employer label remains Intercom, the board identity, rather than guessing individual legal entities.
- **Braze:** Official View Open Positions section requests api.greenhouse.io/v1/boards/braze/departments and links job-boards.greenhouse.io/braze/jobs postings such as 8052314.
- **Zscaler:** Official careers search requests its get-greenhouse-jobs endpoint and links job-boards.greenhouse.io/zscaler/jobs postings such as 5275347007 and 5270975007.
- **Spotify:** Official https://lifeatspotify.com/start-your-journey explicitly identifies https://jobs.lever.co/spotify as a legitimate Spotify full-time role URL. The complete public Lever spotify feed passed existing paginated validation.
- **Cohere:** Official careers page links directly to https://jobs.ashbyhq.com/cohere.
- **Glean:** Official careers page requests https://boards-api.greenhouse.io/v1/boards/gleanwork/jobs. A generic Lever opportunities request was not treated as an employer board identity.
- **Runway:** Official runwayml.com careers redirects to runway.com/careers and links exact jobs.ashbyhq.com/runway-ml posting URLs.
- **Anyscale:** Official careers page links directly to https://jobs.ashbyhq.com/anyscale and department-filtered URLs on that board.
- **Perplexity:** Official careers page links exact jobs.ashbyhq.com/perplexity posting URLs, including posting IDs cross-matched in the public feed.

## Boundaries and excluded candidates

- Used only the existing Greenhouse, Lever and Ashby public read endpoints. The full-response schemas, Greenhouse `meta.total`, Lever pagination/unique IDs and Ashby `isListed` checks were not weakened. No Jobicy request, private data access or production write was performed.
- This registry adds actual supported-role inventory across experience levels. Most new records still need employment/country details, and most verified requirements are experienced; the app must continue to preserve those labels and keep the graduate/early-career default honest.
- The official Anduril board identity was verified at `https://www.anduril.com/open-roles`, but its `content=true` full feed timed out under the existing request policy. It is not enabled on the strength of a partial response.
- Nutanix and SentinelOne guessed Greenhouse candidates returned 404 and are not included. Canva uses another visible career system/blocked page in this review; no unsupported adapter was introduced. Hugging Face uses Workable, so it is not included.
- Airtable and Dropbox candidate Greenhouse snapshots returned zero supported roles. They were not added simply to inflate employer totals. dbt Labs careers directed to the Fivetran inventory; no separate stale or duplicate board was added.
- Careers identity inspection read only fixed official pages, their public ATS links/network integration and exact posting-ID/title evidence. No job-description scraping from arbitrary user URLs, authenticated ATS API, CAPTCHA bypass, paid API or LLM service was used.
- Public endpoint access does not establish unrestricted republication rights. Candidate `usageReview` fields retain the pilot limitation, original source attribution and requirement to disable a source if unavailable permission is required. This is not a legal certification.

## Provider references

- [Greenhouse public Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever public Postings API](https://github.com/lever/postings-api)
- [Ashby public Job Posting API](https://developers.ashbyhq.com/docs/public-job-posting-api)
