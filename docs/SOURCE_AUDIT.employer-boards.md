# Source audit

> **Targeted recovery:** the initial full-registry pass below completed **153/154** sources and preserved a Veeva body-stream timeout. After the bounded whole-response transport retry correction, a [complete Veeva-only check](SOURCE_AUDIT.lever-veeva.md) passed at **2026-10-26T23:45:01.911Z**. Together, **154 unique employer sources** have successful complete snapshots: **22,222 raw/listed**, **799 included**, **894 needing details**, **57 strict-tier included** and **22 strict-tier needing details**. Original failure evidence is retained below and in the JSON, with the separate follow-up recorded explicitly. This was employer-only verification; no Jobicy poll or production import occurred.

Actual public-feed verification at **2026-10-26T23:41:40.324Z** using `npm run sources:verify -- --employer-only`. **153/154** configured sources returned schema-valid employer boards or complete API discovery windows. This report is generated from real public requests, without fixtures. Source verification does not write or verify the production Supabase catalog. Counts change as publishers update listings; these sources do not represent the entire market.

Totals across successful sources:

- **52 strict new-grad May 15, 2027 cohort listings**, including **2 confirmed zero-year listings**, after known timing/eligibility/source-review conflicts are withheld. Other unspecified requirements remain unknown.

- **21312 raw / 21312 publicly listed** postings across all roles and countries.
- **703 all-experience in scope / 894 all-experience needing details**: broad MSBA role-family coverage, including experienced individual contributors. These are **not new-grad counts**.
- **52 strict New grad & 0–1 years / 22 additional strict-tier listings needing details**: uses the same `assessExperience` function as the app, before individual eligibility/source-review filtering. The per-listing table distinguishes the strict new-grad cohort view. The second group has unknown US eligibility or employment type and is excluded from the strict new-grad tier.

| Employer/source | Provider/board | Result | Raw | Public listed | All-experience in scope | All-experience needs details | Strict new-grad / 0–1 | Strict tier needs details | Identity evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Robinhood | greenhouse/robinhood | passed | 155 | 155 | 0 | 14 | 0 | 0 | [Official source evidence](https://careers.robinhood.com/) |
| Ramp | ashby/ramp | passed | 173 | 173 | 12 | 0 | 0 | 0 | [Official source evidence](https://ramp.com/careers) |
| Duolingo | greenhouse/duolingo | passed | 60 | 60 | 0 | 8 | 0 | 0 | [Official source evidence](https://careers.duolingo.com/) |
| Figma | greenhouse/figma | passed | 140 | 140 | 7 | 1 | 0 | 0 | [Official source evidence](https://www.figma.com/careers/) |
| Palantir | lever/palantir | passed | 307 | 307 | 8 | 0 | 1 | 0 | [Official source evidence](https://www.palantir.com/careers/) |
| Notion | ashby/notion | passed | 140 | 140 | 5 | 0 | 0 | 0 | [Official source evidence](https://www.notion.com/careers) |
| Amplitude | ashby/amplitude | passed | 39 | 39 | 2 | 0 | 0 | 0 | [Official source evidence](https://amplitude.com/careers) |
| Reddit | greenhouse/reddit | passed | 161 | 161 | 33 | 3 | 0 | 0 | [Official source evidence](https://redditinc.com/careers) |
| Webflow | ashby/webflow | passed | 17 | 17 | 5 | 0 | 0 | 0 | [Official source evidence](https://webflow.com/company/careers) |
| Benchling | ashby/benchling | passed | 58 | 58 | 9 | 0 | 0 | 0 | [Official source evidence](https://www.benchling.com/careers) |
| Vanta | ashby/vanta | passed | 84 | 84 | 6 | 0 | 0 | 0 | [Official source evidence](https://www.vanta.com/company/careers) |
| Asana | greenhouse/asana | passed | 111 | 111 | 0 | 3 | 0 | 0 | [Official source evidence](https://asana.com/jobs/all) |
| Mercury | greenhouse/mercury | passed | 77 | 77 | 0 | 10 | 0 | 0 | [Official source evidence](https://mercury.com/jobs) |
| Mural | ashby/mural | passed | 13 | 13 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.mural.co/careers) |
| Flexport | greenhouse/flexport | passed | 188 | 188 | 0 | 5 | 0 | 0 | [Official source evidence](https://www.flexport.com/careers/) |
| Thumbtack | ashby/thumbtack | passed | 49 | 49 | 3 | 5 | 0 | 0 | [Official source evidence](https://careers.thumbtack.com/) |
| Ro | lever/ro | passed | 50 | 50 | 1 | 0 | 0 | 0 | [Official source evidence](https://ro.co/careers/) |
| Calendly | greenhouse/calendly | passed | 9 | 9 | 0 | 4 | 0 | 0 | [Official source evidence](https://calendly.com/careers) |
| Lattice | greenhouse/lattice | passed | 9 | 9 | 0 | 2 | 0 | 0 | [Official source evidence](https://lattice.com/careers) |
| Linear | ashby/Linear | passed | 33 | 33 | 2 | 0 | 0 | 0 | [Official source evidence](https://linear.app/careers) |
| Brex | greenhouse/brex | passed | 266 | 266 | 0 | 34 | 0 | 0 | [Official source evidence](https://www.brex.com/careers) |
| Ironclad | ashby/ironcladhq | passed | 28 | 28 | 4 | 0 | 0 | 0 | [Official source evidence](https://ironcladapp.com/careers) |
| BetterUp | ashby/betterup | passed | 8 | 8 | 5 | 0 | 0 | 0 | [Official source evidence](https://www.betterup.com/about-us/careers) |
| Teachable | greenhouse/teachablecareers | passed | 4 | 4 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.teachable.com/careers) |
| Wealthfront | lever/wealthfront | passed | 22 | 22 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.wealthfront.com/careers) |
| Upgrade | greenhouse/upgrade | passed | 26 | 26 | 0 | 6 | 0 | 0 | [Official source evidence](https://www.upgrade.com/careers/) |
| Veeva Systems | lever/veeva | failed | — | — | — | — | — | — | [Official source evidence](https://careers.veeva.com/job-search-results/) |
| Databricks | greenhouse/databricks | passed | 899 | 899 | 0 | 37 | 0 | 1 | [Official source evidence](https://www.databricks.com/company/careers/open-positions) |
| Roblox | greenhouse/roblox | passed | 266 | 266 | 27 | 0 | 0 | 0 | [Official source evidence](https://careers.roblox.com/jobs/8143976?gh_jid=8143976) |
| Global Lending Services | lever/glsllc | passed | 50 | 50 | 6 | 0 | 3 | 0 | [Official source evidence](https://glsauto.com/careers) |
| Lake Partners | lever/lake-partners-account | passed | 1 | 1 | 1 | 0 | 1 | 0 | [Official source evidence](https://www.lakepartners.com/careers/) |
| Recidiviz | greenhouse/recidiviz | passed | 7 | 7 | 5 | 0 | 1 | 0 | [Official source evidence](https://www.recidiviz.org/careers) |
| Charles River Associates | greenhouse/charlesriverassociates | passed | 91 | 91 | 0 | 6 | 0 | 3 | [Official source evidence](https://www.crai.com/cra-careers/jobs/) |
| The Brattle Group | greenhouse/thebrattlegroup | passed | 58 | 58 | 0 | 11 | 0 | 0 | [Official source evidence](https://www.brattle.com/careers/current-openings/) |
| Solace | ashby/solace | passed | 23 | 23 | 4 | 0 | 2 | 0 | [Official source evidence](https://www.solace.health/careers) |
| CertiK | lever/certik | passed | 31 | 31 | 2 | 0 | 1 | 0 | [Official source evidence](https://www.certik.com/company/careers) |
| ERG (Eastern Research Group) | lever/erg | passed | 40 | 40 | 1 | 1 | 1 | 1 | [Official source evidence](https://www.erg.com/jobs) |
| SoFi | greenhouse/sofi | passed | 59 | 59 | 3 | 3 | 0 | 0 | [Official source evidence](https://www.sofi.com/careers/) |
| Affirm | greenhouse/affirm | passed | 223 | 223 | 0 | 11 | 0 | 0 | [Official source evidence](https://www.affirm.com/careers) |
| Coinbase | greenhouse/coinbase | passed | 228 | 228 | 0 | 19 | 0 | 1 | [Official source evidence](https://www.coinbase.com/careers/positions/7980600) |
| Cloudflare | greenhouse/cloudflare | passed | 460 | 460 | 0 | 21 | 0 | 0 | [Official source evidence](https://www.cloudflare.com/careers/jobs/) |
| Datadog | greenhouse/datadog | passed | 427 | 427 | 17 | 2 | 0 | 0 | [Official source evidence](https://careers.datadoghq.com/detail/8247250/) |
| MongoDB | greenhouse/mongodb | passed | 367 | 367 | 12 | 3 | 0 | 0 | [Official source evidence](https://www.mongodb.com/careers/jobs/8141572) |
| Elastic | greenhouse/elastic | passed | 401 | 401 | 0 | 15 | 0 | 0 | [Official source evidence](https://jobs.elastic.co/jobs/human-resources/united-states/analytics-engineer-hr-analytics/8244449) |
| Stripe | greenhouse/stripe | passed | 712 | 712 | 1 | 49 | 1 | 0 | [Official source evidence](https://stripe.com/careers/search) |
| BILL | greenhouse/billcom | passed | 43 | 43 | 0 | 10 | 0 | 0 | [Official source evidence](https://www.bill.com/jobs) |
| Toast | greenhouse/toast | passed | 333 | 333 | 0 | 5 | 0 | 0 | [Official source evidence](https://careers.toasttab.com/jobs/associate-product-manager-data-governance-remote-united-states) |
| Plaid | ashby/plaid | passed | 130 | 130 | 26 | 0 | 0 | 0 | [Official source evidence](https://plaid.com/careers/openings/data/san-francisco-hq/senior-analytics-engineer/) |
| Gusto | greenhouse/gusto | passed | 97 | 97 | 0 | 10 | 0 | 0 | [Official source evidence](https://gusto.com/about/careers/join-the-team) |
| OpenAI | ashby/openai | passed | 795 | 795 | 67 | 0 | 0 | 0 | [Official source evidence](https://openai.com/careers/search/) |
| Anthropic | greenhouse/anthropic | passed | 679 | 679 | 0 | 68 | 0 | 0 | [Official source evidence](https://www.anthropic.com/careers/jobs) |
| Airbnb | greenhouse/airbnb | passed | 189 | 189 | 0 | 30 | 0 | 0 | [Official source evidence](https://careers.airbnb.com/positions/) |
| Samsara | greenhouse/samsara | passed | 326 | 326 | 2 | 23 | 0 | 0 | [Official source evidence](https://www.samsara.com/company/careers/roles) |
| Verkada | greenhouse/verkada | passed | 331 | 331 | 21 | 0 | 1 | 0 | [Official source evidence](https://www.verkada.com/careers/) |
| Scale AI | greenhouse/scaleai | passed | 166 | 166 | 16 | 2 | 0 | 0 | [Official source evidence](https://scale.com/careers) |
| Axon | greenhouse/axon | passed | 472 | 472 | 0 | 36 | 0 | 0 | [Official source evidence](https://www.axon.com/careers/all) |
| Oscar Health | greenhouse/oscar | passed | 226 | 226 | 0 | 16 | 0 | 0 | [Official source evidence](https://oscarhealth.com/careers) |
| Motive | greenhouse/gomotive | passed | 163 | 163 | 0 | 9 | 0 | 1 | [Official source evidence](https://gomotive.com/company/careers/) |
| Instacart | greenhouse/instacart | passed | 100 | 100 | 8 | 0 | 0 | 0 | [Official source evidence](https://www.instacart.careers/current-openings) |
| Discord | greenhouse/discord | passed | 46 | 46 | 7 | 1 | 1 | 0 | [Official source evidence](https://discord.com/careers) |
| Pinterest | greenhouse/pinterest | passed | 160 | 160 | 0 | 39 | 0 | 4 | [Official source evidence](https://www.pinterestcareers.com/jobs/) |
| GitLab | greenhouse/gitlab | passed | 238 | 238 | 0 | 8 | 0 | 0 | [Official source evidence](https://about.gitlab.com/jobs/all-jobs/) |
| Okta | greenhouse/okta | passed | 389 | 389 | 0 | 14 | 0 | 0 | [Official source evidence](https://www.okta.com/company/careers/job-listing/) |
| Fivetran | greenhouse/fivetran | passed | 171 | 171 | 9 | 8 | 0 | 0 | [Official source evidence](https://www.fivetran.com/careers) |
| Intercom | greenhouse/intercom | passed | 99 | 99 | 0 | 1 | 0 | 0 | [Official source evidence](https://fin.ai/careers) |
| Braze | greenhouse/braze | passed | 346 | 346 | 0 | 23 | 0 | 1 | [Official source evidence](https://www.braze.com/company/careers/how-we-hire) |
| Zscaler | greenhouse/zscaler | passed | 353 | 353 | 5 | 2 | 0 | 0 | [Official source evidence](https://www.zscaler.com/careers/search) |
| Spotify | lever/spotify | passed | 89 | 89 | 0 | 6 | 0 | 0 | [Official source evidence](https://lifeatspotify.com/start-your-journey) |
| Cohere | ashby/cohere | passed | 116 | 116 | 9 | 1 | 0 | 0 | [Official source evidence](https://cohere.com/careers) |
| Glean | greenhouse/gleanwork | passed | 132 | 132 | 0 | 15 | 0 | 0 | [Official source evidence](https://www.glean.com/careers) |
| Runway | ashby/runway-ml | passed | 47 | 47 | 4 | 0 | 0 | 0 | [Official source evidence](https://runway.com/careers) |
| Anyscale | ashby/anyscale | passed | 20 | 20 | 2 | 0 | 0 | 0 | [Official source evidence](https://www.anyscale.com/careers) |
| Perplexity | ashby/perplexity | passed | 131 | 131 | 13 | 0 | 0 | 0 | [Official source evidence](https://www.perplexity.ai/hub/careers) |
| AQR | greenhouse/aqr | passed | 55 | 55 | 0 | 5 | 0 | 1 | [Official source evidence](https://careers.aqr.com/) |
| Schonfeld | greenhouse/schonfeld | passed | 66 | 66 | 0 | 6 | 0 | 1 | [Official source evidence](https://www.schonfeld.com/careers/) |
| Hinge Health | ashby/hinge-health | passed | 77 | 77 | 4 | 0 | 0 | 0 | [Official source evidence](https://www.hingehealth.com/about/careers/) |
| Garner Health | greenhouse/garnerhealth | passed | 75 | 75 | 0 | 17 | 0 | 0 | [Official source evidence](https://garnerhealth.com/careers) |
| Old Mission | ashby/old-mission-capital | passed | 39 | 39 | 2 | 0 | 1 | 0 | [Official source evidence](https://www.oldmissioncapital.com/careers/) |
| Upstart | greenhouse/upstart | passed | 86 | 86 | 0 | 13 | 0 | 1 | [Official source evidence](https://careers.upstart.com/jobs/principal-security-product-manager) |
| Marqeta | ashby/marqeta-inc | passed | 40 | 40 | 3 | 0 | 0 | 0 | [Official source evidence](https://www.marqeta.com/careers/6fd7b9c0-5cd5-4270-aa71-dcf1d9e10faa) |
| Clear Street | greenhouse/clearstreet | passed | 44 | 44 | 0 | 4 | 0 | 0 | [Official source evidence](https://www.clearstreet.io/careers) |
| Point72 | greenhouse/point72 | passed | 210 | 210 | 13 | 2 | 1 | 0 | [Official source evidence](https://careers.point72.com/) |
| Jane Street | greenhouse/janestreet | passed | 220 | 220 | 4 | 2 | 0 | 0 | [Official source evidence](https://www.janestreet.com/join-jane-street/open-roles/) |
| Jump Trading | greenhouse/jumptrading | passed | 94 | 94 | 5 | 2 | 0 | 0 | [Official source evidence](https://www.jumptrading.com/hr/job?gh_jid=8052343) |
| IMC | greenhouse/imc | passed | 169 | 169 | 0 | 5 | 0 | 0 | [Official source evidence](https://www.imc.com/us/search-careers) |
| Clover Health | greenhouse/cloverhealth | passed | 58 | 58 | 0 | 2 | 0 | 0 | [Official source evidence](https://www.cloverhealth.com/about-us/current-openings) |
| Nuro | greenhouse/nuro | passed | 97 | 97 | 9 | 0 | 2 | 0 | [Official source evidence](https://www.nuro.ai/careers) |
| Zipline | greenhouse/flyzipline | passed | 348 | 348 | 1 | 7 | 0 | 1 | [Official source evidence](https://www.zipline.com/open-roles/7818180003) |
| West Monroe | greenhouse/westmonroe4 | passed | 112 | 112 | 6 | 2 | 1 | 0 | [Official source evidence](https://www.westmonroe.com/careers/job-search) |
| West Monroe | greenhouse/westmonroe5 | passed | 96 | 96 | 11 | 0 | 11 | 0 | [Official source evidence](https://www.westmonroe.com/careers/job-search-students) |
| Rocket Money | greenhouse/truebill | passed | 18 | 18 | 0 | 6 | 0 | 0 | [Official source evidence](https://www.rocketmoney.com/careers) |
| Parafin | ashby/parafin | passed | 4 | 4 | 3 | 0 | 1 | 0 | [Official source evidence](https://www.parafin.com/careers) |
| Jerry | ashby/Jerry.ai | passed | 37 | 37 | 7 | 0 | 2 | 0 | [Official source evidence](https://jerry.ai/careers/) |
| Abridge | ashby/Abridge | passed | 40 | 40 | 2 | 0 | 0 | 0 | [Official source evidence](https://www.abridge.com/careers) |
| Harry's | greenhouse/harrys | passed | 14 | 14 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.harrys.com/en/pages/careers) |
| EarnIn | greenhouse/earnin | passed | 24 | 24 | 4 | 0 | 0 | 0 | [Official source evidence](https://www.earnin.com/careers) |
| Kin Insurance | ashby/kin | passed | 21 | 21 | 6 | 0 | 1 | 0 | [Official source evidence](https://www.kin.com/careers/) |
| Spring Health | ashby/deaa6ad2-d184-436b-b69e-17f761da1d94 | passed | 90 | 90 | 12 | 0 | 0 | 0 | [Official source evidence](https://www.springhealth.com/open-roles) |
| Optiver | greenhouse/optiverus | passed | 162 | 162 | 0 | 1 | 0 | 1 | [Official source evidence](https://www.optiver.com/join-us/jobs/technology/chicago/network-engineer/apply) |
| NerdWallet | ashby/nerdwallet | passed | 21 | 21 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.nerdwallet.com/careers/jobs) |
| Betterment | greenhouse/betterment | passed | 26 | 26 | 0 | 2 | 0 | 0 | [Official source evidence](https://www.betterment.com/careers/current-openings) |
| Navan | greenhouse/tripactions | passed | 222 | 222 | 0 | 6 | 0 | 0 | [Official source evidence](https://navan.com/careers/openings) |
| Capco | greenhouse/capco | passed | 713 | 713 | 0 | 46 | 0 | 0 | [Official source evidence](https://www.capco.com/en/Careers/Job%20Search/Office%20Detail?gh_jid=5697864) |
| Addepar | greenhouse/addepar1 | passed | 111 | 111 | 0 | 9 | 0 | 1 | [Official source evidence](https://addepar.com/careers) |
| Steadily | ashby/Steadily | passed | 34 | 34 | 7 | 0 | 0 | 0 | [Official source evidence](https://www.steadily.com/careers) |
| Hippo | greenhouse/hippo70 | passed | 21 | 21 | 4 | 0 | 0 | 0 | [Official source evidence](https://www.hippo.com/careers) |
| Enova | greenhouse/enova | passed | 37 | 37 | 0 | 2 | 0 | 0 | [Official source evidence](https://www.enova.com/careers/) |
| Included Health | lever/includedhealth | passed | 48 | 48 | 1 | 0 | 0 | 0 | [Official source evidence](https://includedhealth.com/security/) |
| Cedar | greenhouse/careportalinc | passed | 12 | 12 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.cedar.com/careers/open-roles) |
| Sidecar Health | greenhouse/sidecarhealth | passed | 7 | 7 | 0 | 3 | 0 | 0 | [Official source evidence](https://sidecarhealth.com/careers/) |
| Wellthy | greenhouse/wellthy | passed | 8 | 8 | 0 | 1 | 0 | 0 | [Official source evidence](https://wellthy.com/careers) |
| Veho | ashby/veho-tech-inc | passed | 55 | 55 | 1 | 0 | 0 | 0 | [Official source evidence](https://www.shipveho.com/careers) |
| Vercel | greenhouse/vercel | passed | 93 | 93 | 0 | 9 | 0 | 0 | [Official source evidence](https://vercel.com/careers) |
| Supabase | ashby/supabase | passed | 64 | 64 | 1 | 4 | 0 | 0 | [Official source evidence](https://supabase.com/careers) |
| Render | ashby/render | passed | 36 | 36 | 2 | 0 | 0 | 0 | [Official source evidence](https://render.com/careers) |
| Grafana Labs | greenhouse/grafanalabs | passed | 134 | 134 | 0 | 2 | 0 | 0 | [Official source evidence](https://grafana.com/careers/) |
| Temporal | ashby/temporal | passed | 72 | 72 | 8 | 0 | 0 | 0 | [Official source evidence](https://temporal.io/careers) |
| Tailscale | greenhouse/tailscale | passed | 59 | 59 | 2 | 0 | 0 | 0 | [Official source evidence](https://tailscale.com/careers) |
| Fastly | greenhouse/fastly | passed | 52 | 52 | 0 | 6 | 0 | 0 | [Official source evidence](https://www.fastly.com/about/careers/current-openings) |
| Lyft | greenhouse/lyft | passed | 179 | 179 | 0 | 26 | 0 | 2 | [Official source evidence](https://www.lyft.com/careers) |
| Twitch | greenhouse/twitch | passed | 59 | 59 | 0 | 12 | 0 | 0 | [Official source evidence](https://careers.twitch.com/en/careers/) |
| Waymo | greenhouse/waymo | passed | 369 | 369 | 52 | 2 | 1 | 0 | [Official source evidence](https://careers.withwaymo.com/jobs/data-scientist-san-francisco-california-united-states-mountain-view?gh_jid=7455592) |
| Woven by Toyota | lever/woven-by-toyota | passed | 143 | 143 | 0 | 2 | 0 | 0 | [Official source evidence](https://woven.toyota/en/careers/) |
| Zoox | lever/zoox | passed | 232 | 232 | 26 | 0 | 0 | 0 | [Official source evidence](https://zoox.com/careers) |
| IXL Learning | greenhouse/ixllearning | passed | 118 | 118 | 9 | 0 | 3 | 0 | [Official source evidence](https://www.ixl.com/company/careers) |
| Handshake | ashby/handshake | passed | 82 | 82 | 5 | 0 | 0 | 0 | [Official source evidence](https://joinhandshake.com/careers/) |
| Outreach | lever/outreach | passed | 22 | 22 | 2 | 0 | 0 | 0 | [Official source evidence](https://www.outreach.io/company/careers) |
| Salesloft | greenhouse/salesloft | passed | 35 | 35 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.salesloft.com/company/careers) |
| Smartsheet | greenhouse/smartsheet | passed | 87 | 87 | 1 | 5 | 0 | 0 | [Official source evidence](https://www.smartsheet.com/careers-list) |
| Mixpanel | greenhouse/mixpanel | passed | 46 | 46 | 0 | 4 | 0 | 0 | [Official source evidence](https://mixpanel.com/jobs/) |
| Domino Data Lab | greenhouse/dominodatalab | passed | 23 | 23 | 0 | 1 | 0 | 0 | [Official source evidence](https://domino.ai/careers) |
| SentiLink | ashby/sentilink | passed | 39 | 39 | 5 | 0 | 0 | 0 | [Official source evidence](https://www.sentilink.com/careers) |
| DataLab USA | lever/datalabusa | passed | 16 | 16 | 4 | 0 | 1 | 0 | [Official source evidence](https://datalabusa.com/) |
| WebFX | ashby/webfx | passed | 36 | 36 | 3 | 0 | 0 | 0 | [Official source evidence](https://www.webfx.com/careers/jobs/8a29234f-1b15-4f4f-ac20-a38b650fc72c/) |
| Lightcast | lever/economicmodeling | passed | 24 | 24 | 4 | 0 | 1 | 0 | [Official source evidence](https://lightcast.io/careers) |
| True Anomaly | greenhouse/trueanomalyinc | passed | 207 | 207 | 0 | 11 | 0 | 2 | [Official source evidence](https://www.trueanomaly.space/careers) |
| GoFundMe | greenhouse/gofundme | passed | 21 | 21 | 1 | 2 | 0 | 0 | [Official source evidence](https://www.gofundme.com/c/careers) |
| StubHub | greenhouse/stubhubinc | passed | 33 | 33 | 0 | 4 | 0 | 0 | [Official source evidence](https://www.stubhub.com/careers) |
| Similarweb | greenhouse/similarweb | passed | 72 | 72 | 0 | 5 | 0 | 0 | [Official source evidence](https://www.similarweb.com/corp/careers/) |
| AppsFlyer | greenhouse/appsflyer | passed | 51 | 51 | 0 | 4 | 0 | 0 | [Official source evidence](https://careers.appsflyer.com/) |
| Moloco | greenhouse/moloco | passed | 43 | 43 | 0 | 7 | 0 | 0 | [Official source evidence](https://www.moloco.com/company/careers) |
| The Trade Desk | greenhouse/thetradedesk | passed | 110 | 110 | 9 | 0 | 1 | 0 | [Official source evidence](https://careers.thetradedesk.com/jobs) |
| Viant | greenhouse/vianttechnology | passed | 25 | 25 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.viantinc.com/company/careers/) |
| DoorDash | greenhouse/doordashusa | passed | 448 | 448 | 50 | 0 | 6 | 0 | [Official source evidence](https://careersatdoordash.com/jobs/associate-dasher-tasks-strategy-operations/8197734/) |
| ClickHouse | ashby/clickhouse | passed | 203 | 203 | 9 | 5 | 0 | 0 | [Official source evidence](https://clickhouse.com/company/careers) |
| Ibotta | ashby/ibotta | passed | 50 | 50 | 11 | 0 | 0 | 0 | [Official source evidence](https://ibotta.com/careers) |
| Applied Intuition | ashby/applied | passed | 325 | 325 | 21 | 0 | 6 | 0 | [Official source evidence](https://www.appliedintuition.com/careers) |
| Freenome | greenhouse/freenome | passed | 31 | 31 | 0 | 3 | 0 | 0 | [Official source evidence](https://www.freenome.com/job-openings/) |
| Natera | greenhouse/natera | passed | 224 | 224 | 0 | 7 | 0 | 0 | [Official source evidence](https://www.natera.com/company/careers/) |
| Fanatics Collectibles | greenhouse/fanaticscollectibles | passed | 186 | 186 | 0 | 9 | 0 | 0 | [Official source evidence](https://www.fanaticsinc.com/join-our-team) |
| Fanatics Betting & Gaming | greenhouse/fanaticsfbg | passed | 71 | 71 | 0 | 3 | 0 | 0 | [Official source evidence](https://www.fanaticsinc.com/join-our-team) |
| Fanatics Commerce | greenhouse/fanaticscommerce | passed | 203 | 203 | 0 | 8 | 0 | 0 | [Official source evidence](https://www.fanaticsinc.com/join-our-team) |
| Fanatics | greenhouse/fanaticsinc | passed | 24 | 24 | 0 | 1 | 0 | 0 | [Official source evidence](https://www.fanaticsinc.com/join-our-team) |
| Relativity Space | greenhouse/relativity | passed | 397 | 397 | 0 | 4 | 0 | 0 | [Official source evidence](https://www.relativityspace.com/jobs) |

## What the counts mean

All-experience in scope means a supported role with explicit US location and full-time evidence; it includes roles shown only in the separate Experienced or Experience unverified views. All-experience needs details means a supported role with unknown country or employment type. Neither category establishes graduate suitability or individual eligibility. Unlisted Ashby jobs are excluded. Leadership, international-only, internship, contract and unrelated roles are excluded by classifier version **2026-10-26.2**. Greenhouse often omits employment type, so otherwise relevant listings conservatively need details checked. A zero graduate count is an honest result, not a feed failure.

The strict new-grad tier requires explicit graduate/entry-level evidence or a parsed requirement of zero or one year. A one-year requirement remains visible and labeled; it is not a claim that someone with zero years meets it. Missing requirements, conditional education paths, experienced titles, 2–3 year requirements and 4+ year requirements do not count toward this strict new-grad tier. An employer explicitly saying a role is not new-grad overrides a positive title signal. Graduate wording does not waive skills, work authorization, degree, location, timing or other employer requirements. The employer posting remains authoritative.

## Strict-tier listings found in this run

These are rule-qualified listings from freshly checked public feeds, not a claim of production ingestion, a hiring prediction, or a guarantee of suitability.

| Employer | Original posting | Group | Required years |
| --- | --- | --- | --- |
| Palantir | [Data Engineer - Talent Acquisition Operations](https://jobs.lever.co/palantir/1b690123-1766-4e75-a0ef-0f58afa864b4) | Cohort default | 1 · experience requirement applies |
| Databricks | [Associate Product Manager, New Grad (2027 Start)](https://databricks.com/company/careers/open-positions/job?gh_jid=7586263002) | Needs details checked | Not stated; explicit graduate evidence |
| Global Lending Services | [Business Analyst - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/f9b3c57e-7e60-4f99-bd2e-6ffd92ee66b5) | Cohort default | Not stated; explicit graduate evidence |
| Global Lending Services | [Data Scientist - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/d81bfc16-2ba1-41ca-ab21-7d8cffac9e07) | Cohort default | Not stated; explicit graduate evidence |
| Global Lending Services | [Financial Analyst - December 2026 - May 2027 Grads](https://jobs.lever.co/glsllc/c0e144a9-2b3e-49c1-bf6e-1e5cb084428a) | Cohort default | Not stated; explicit graduate evidence |
| Lake Partners | [Entry Level Strategy Analyst](https://jobs.lever.co/lake-partners-account/b3d26b77-e601-4a83-b344-a7f1abb051fc) | Cohort default | Not stated; explicit graduate evidence |
| Recidiviz | [Data Analyst (Entry-Level)](https://job-boards.greenhouse.io/recidiviz/jobs/4717510006) | Cohort default | 0.5 |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Accounting/Business/Finance Consulting Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/8054054) | Needs details checked | Not stated; explicit graduate evidence |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Economics Consulting Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/7894191) | Needs details checked | Not stated; explicit graduate evidence |
| Charles River Associates | [(2027 Bachelor's/Master's graduates) Management Advisory Analyst/Associate](https://job-boards.greenhouse.io/charlesriverassociates/jobs/8053996) | Needs details checked | Not stated; explicit graduate evidence |
| Solace | [Associate Data Scientist (College Grad 2027)](https://jobs.ashbyhq.com/solace/77ca492c-4142-4931-beeb-e85d9d0ac443) | Cohort default | Not stated; explicit graduate evidence |
| Solace | [Associate Product Manager (College Grad 2027)](https://jobs.ashbyhq.com/solace/ee8ee239-ad20-4c1e-868d-3357799589ea) | Cohort default | Not stated; explicit graduate evidence |
| CertiK | [Financial Analyst](https://jobs.lever.co/certik/afd3ad02-a1e1-42a1-a2f8-b6c1d0353049) | Cohort default | 1 · experience requirement applies |
| ERG (Eastern Research Group) | [Business Analyst](https://jobs.lever.co/erg/9a3377d5-a4bc-431c-80ee-0a538a0dc13e) | Needs details checked | 1 · experience requirement applies |
| ERG (Eastern Research Group) | [Entry-Level Occupational Safety and Health Data Analyst](https://jobs.lever.co/erg/26fdd838-c4ba-4538-825c-c16b36d18fe1) | Cohort default | 0 |
| Coinbase | [Credit Risk Analyst](https://www.coinbase.com/careers/positions/8131356?gh_jid=8131356) | Needs details checked | 1 · experience requirement applies |
| Stripe | [Product Manager: New Grad Accelerator](https://stripe.com/jobs/search?gh_jid=7737124) | Cohort default | Not stated; explicit graduate evidence |
| Verkada | [Software Engineer - Data Platform](https://job-boards.greenhouse.io/verkada/jobs/4129304007) | Cohort default | 1 · experience requirement applies |
| Motive | [Business Strategy & Operations Specialist](https://job-boards.greenhouse.io/gomotive/jobs/8776678002) | Needs details checked | 0 |
| Discord | [Strategic Finance Analyst](https://job-boards.greenhouse.io/discord/jobs/8575166002) | Cohort default | 1 · experience requirement applies |
| Pinterest | [Master's University Grad Data Scientist (USA)](https://www.pinterestcareers.com/jobs/?gh_jid=8140389) | Needs details checked | Not stated; explicit graduate evidence |
| Pinterest | [Master's University Grad Machine Learning Engineer 2027 (USA)](https://www.pinterestcareers.com/jobs/?gh_jid=8140219) | Needs details checked | Not stated; explicit graduate evidence |
| Pinterest | [PhD University Grad Machine Learning Engineer (USA)](https://www.pinterestcareers.com/jobs/?gh_jid=8140363) | Needs details checked | Not stated; explicit graduate evidence |
| Pinterest | [University Grad Machine Learning Engineer 2027 (Zurich)](https://www.pinterestcareers.com/jobs/?gh_jid=8267930) | Needs details checked | Not stated; explicit graduate evidence |
| Braze | [Treasury Analyst](https://job-boards.greenhouse.io/braze/jobs/8237197) | Needs details checked | 1 · experience requirement applies |
| AQR | [Trading Operations Analyst/Associate](https://careers.aqr.com/jobs?gh_jid=8105044&gh_jid=8105044) | Needs details checked | 1 · experience requirement applies |
| Schonfeld | [Systematic Portfolio Strategy and Risk Analyst (NYC or Miami)](https://job-boards.greenhouse.io/schonfeld/jobs/7402926) | Needs details checked | 1 · experience requirement applies |
| Old Mission | [Fundamental Research Analyst (Asian Market Hours)](https://jobs.ashbyhq.com/old-mission-capital/611bdbd1-6512-4c58-a65e-382b9dc32773) | Cohort default | 1 · experience requirement applies |
| Upstart | [Applied Scientist](https://careers.upstart.com/jobs?gh_jid=7293116) | Needs details checked | 0 |
| Point72 | [Data Engineer](https://boards.greenhouse.io/point72/jobs/7829230002?gh_jid=7829230002) | Cohort default | 1 · experience requirement applies |
| Nuro | [Software Engineer, ML Inference Platform](https://nuro.ai/careersitem?gh_jid=8122537) | Cohort default | 1 · experience requirement applies |
| Nuro | [Software Engineer, ML Infrastructure Platform](https://nuro.ai/careersitem?gh_jid=8122483) | Cohort default | 1 · experience requirement applies |
| Zipline | [Business Operations Manager, Supply Chain](https://www.zipline.com/open-roles/7818180003?gh_jid=7818180003) | Needs details checked | 1 · experience requirement applies |
| West Monroe | [Data Engineer](https://westmonroe.com/careers/job-details-experienced-professionals?gh_jid=5625114004) | Cohort default | 1 · experience requirement applies |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167515004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167513004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167522004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167376004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167503004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Data & Analytics Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6167508004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Platforms & Business Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6172680004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Platforms & Business Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6172682004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Platforms & Business Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6172683004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Platforms & Business Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6172684004) | Cohort default | Not stated; explicit graduate evidence |
| West Monroe | [2027 Platforms & Business Consultant](https://westmonroe.com/careers/job-details-students?gh_jid=6172596004) | Cohort default | Not stated; explicit graduate evidence |
| Parafin | [Data Analytics Engineer](https://jobs.ashbyhq.com/parafin/b6fbdb8d-aa25-4216-a0bb-9af06607bd96) | Cohort default | 1 · experience requirement applies |
| Jerry | [Associate, Business Operations & Analytics](https://jobs.ashbyhq.com/Jerry.ai/283cd5ff-a8ac-4b16-9088-bad48e5fe472) | Cohort default | 1 · experience requirement applies |
| Jerry | [Associate Data Scientist](https://jobs.ashbyhq.com/Jerry.ai/271b73bc-2b1a-4be6-b3dc-d72d806b8e35) | Cohort default | 1 · experience requirement applies |
| Kin Insurance | [Pricing & Risk Analyst](https://jobs.ashbyhq.com/kin/99967c4f-e3cc-42b3-90d0-0f4499140c22) | Cohort default | 0 |
| Optiver | [Risk Analyst](https://www.optiver.com/join-us/jobs/8637635002/?gh_jid=8637635002) | Needs details checked | 1 · experience requirement applies |
| Addepar | [Product Manager - Early Career, AI Platform](https://job-boards.greenhouse.io/addepar1/jobs/8910404002) | Needs details checked | 0 |
| Lyft | [Data Scientist, Algorithms - Dynamic Pricing](https://app.careerpuck.com/job-board/lyft/job/8856443002?gh_jid=8856443002) | Needs details checked | 1 · experience requirement applies |
| Lyft | [Data Scientist, Algorithms - Pricing - Rider Engagement](https://app.careerpuck.com/job-board/lyft/job/8908005002?gh_jid=8908005002) | Needs details checked | 1 · experience requirement applies |
| Waymo | [Machine Learning Engineer, Perception, LLM/VLM (PhD, New Grad)](https://careers.withwaymo.com/jobs?gh_jid=7488508) | Cohort default | Not stated; explicit graduate evidence |
| IXL Learning | [Associate Product Manager, New Grad](https://www.ixl.com/company/jobs?gh_jid=8862211002) | Cohort default | Not stated; explicit graduate evidence |
| IXL Learning | [Associate Product Manager, Rosetta Stone](https://www.ixl.com/company/jobs?gh_jid=8450013002) | Cohort default | 1 · experience requirement applies |
| IXL Learning | [IXL Associate Product Manager](https://www.ixl.com/company/jobs?gh_jid=8447267002) | Cohort default | 1 · experience requirement applies |
| DataLab USA | [Programmer Analyst - (entry-level data analyst/data scientist) Marketing Analytics](https://jobs.lever.co/datalabusa/4bc04d86-bef3-40c8-a410-b0d0c41a683d) | Cohort default | Not stated; explicit graduate evidence |
| Lightcast | [Associate Product Manager (Data) - 1072 (Moscow, ID)](https://jobs.lever.co/economicmodeling/621be872-fa3b-4b20-ac6c-0f4c37c8dc5c) | Cohort default | 1 · experience requirement applies |
| True Anomaly | [Data Engineer I](https://job-boards.greenhouse.io/trueanomalyinc/jobs/5223279007) | Needs details checked | 0 |
| True Anomaly | [Software Engineer I, Data Science (New Grad)](https://job-boards.greenhouse.io/trueanomalyinc/jobs/5221560007) | Needs details checked | Not stated; explicit graduate evidence |
| The Trade Desk | [Product Manager II](https://job-boards.greenhouse.io/thetradedesk/jobs/5204413007) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, Dasher Tasks, Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8197734) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, DashMart - Supply Chain Profitability Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8273901) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, Marketplace - Occasions Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8188452) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, New Verticals - Flex Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8076068) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, New Verticals - Fulfillment Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8310956) | Cohort default | 1 · experience requirement applies |
| DoorDash | [Associate, New Verticals - Grocery Revenue Strategy & Operations](https://job-boards.greenhouse.io/doordashusa/jobs/8240696) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - Robotic Hardware, Simulation and Data](https://jobs.ashbyhq.com/applied/4cb44794-7b3b-46fc-9408-104a6d0f379e) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - Robot Learning](https://jobs.ashbyhq.com/applied/e725018e-2577-4ff6-8dbd-69206272d9af) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - AI/RL Infrastructure](https://jobs.ashbyhq.com/applied/091ed808-95c9-420b-8061-0ff2eb9342bc) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - Reinforcement Learning, Self-Driving](https://jobs.ashbyhq.com/applied/36a49d01-e60f-4c01-8c8c-5a7f79347f51) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - 3D Vision and Generation, Self-Driving](https://jobs.ashbyhq.com/applied/8da87c90-49ff-4b75-97c5-337882f63a00) | Cohort default | 1 · experience requirement applies |
| Applied Intuition | [Research Engineer - New Grad (2027)](https://jobs.ashbyhq.com/applied/45fc41cd-8280-4010-ba1f-def6114b3e39) | Cohort default | 1 · experience requirement applies |

Registry identity evidence was established from employers' official careers pages linking the recorded ATS board (or exact job URLs and provider posting IDs cross-matched to that board), not guessed from employer names. See `data/employers.json` for dated evidence notes and source-usage review. A healthy response alone does not verify employer identity or grant republication permission. Candidates with blocked/unsupported careers pages were replaced, not marked verified.

Jobicy is a cross-employer publisher, not one selected employer. Its free USA query covers a rolling seven-day remote-job window and may include Anywhere listings, which remain country-unverified. Publisher identity and job-board reuse/credit terms were checked against its official API and fair-use documentation; individual employers are not all independently vetted. The adapter retains each job's actual company name and canonical Jobicy listing URL. Missing from that window never proves closure: production checks older known IDs through its status API, closes only explicit closed statuses and withholds unknown statuses from recommendations. These are Jobicy listing states, not live employer ATS probes. Market search links on the site open external Google, Indeed and LinkedIn results without importing or counting them. Choose either live verification or live ingestion for a Jobicy synchronization, no more than hourly; replay captured public responses for additional development checks instead of polling again.

## Adapter documentation reviewed

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html): public GET, one entire list with content=true; enforce meta.total. updated_at is an edit timestamp, never original posting date. No individual detail fetches.
- [Lever public Postings API](https://github.com/lever/postings-api): skip/limit pagination, global and EU hosts, categories.allLocations, country and optional salaryRange. A terminal short page and unique IDs are required; repeated/truncated pages fail the snapshot.
- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api): includeCompensation=true, separate locations and salary tiers, isListed=false excluded. publishedAt means last publication, never original posting date.
- [Jobicy public API/fair use](https://jobicy.com/jobs-rss-feed) and [OpenAPI contract](https://jobicy.com/api/openapi.json): unauthenticated free API only, visible Jobicy attribution and canonical listing links; full cursor traversal of its discovery window, plus exact status batches for older records. No paid Bearer API or original-ATS-link mode.

## Limits and usage review

Public API availability is not a legal review or proof of unrestricted republication rights. This pilot attributes employers, keeps bounded plain text and source links, never submits applications, and retains no raw payload archive. Registry notes record the public career-page/API context; the owner must review employer terms before a public launch and disable a source if permission is required. No source is presented as legally vetted. Current source checks do not imply a deployed or populated Supabase catalog.

Requests use three-source concurrency, 20-second timeouts, at most three attempts, a 24MB response cap and bounded Retry-After. Long retry instructions defer the source. Failed/malformed/partial feeds never reconcile absence. Employer-board finalization quarantines a >60% board drop, and board-absence closure requires two complete successful snapshots at least twelve hours apart. Jobicy instead uses the explicit status reconciliation described above. Failed sources preserve prior catalog records.

- **Veeva Systems:** The operation was aborted due to timeout
