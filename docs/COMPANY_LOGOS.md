# Company logo assets

Reviewed **October 26, 2026**. These local images identify the actual hiring employer in job cards and related views. The current 74-asset set covers the 73 enabled employer boards in `data/employers.json` plus Precision Medicine Group, which appeared in the live catalog. The Jobicy publisher logo is deliberately excluded: publisher identity is not employer identity. Fictional demo employers and unknown companies retain an initials fallback.

Images were obtained from the companies’ public websites or the icon assets explicitly linked by those sites. The originals are served from this application’s own `/logos/` directory; a visitor does not contact a logo service or an employer domain to display them. No runtime URL guessing, arbitrary posting-URL fetch, paid logo service or generated imitation is used. File formats follow the actual image bytes, including WebP responses returned for some `.png` URLs. HTTP gzip transport encoding was decoded where necessary; image contents were not redrawn or recolored.

The initial 38 image files loaded successfully in a local Chromium image-grid check, and the grid was visually inspected. Precision Medicine Group’s generic `/favicon.ico` response redirected to a WordPress icon and was rejected; its explicitly linked branded favicon is used instead. Lake Partners’ header logo was selected from its official homepage stylesheet because it did not publish an icon link.

Logos and brand marks remain the property of their respective owners. Their use identifies listings and does not imply employer endorsement. Public retrieval is documented here; it is not a claim of a blanket trademark or redistribution license.

## Provenance

| Employer | Local asset | Original public source | Bytes |
| --- | --- | --- | ---: |
| Amplitude | [`/logos/amplitude.ico`](../public/logos/amplitude.ico) | [https://amplitude.com/favicon.ico](https://amplitude.com/favicon.ico) | 15,406 |
| Asana | [`/logos/asana.ico`](../public/logos/asana.ico) | [https://asana.com/favicon.ico](https://asana.com/favicon.ico) | 15,086 |
| Benchling | [`/logos/benchling.ico`](../public/logos/benchling.ico) | [https://www.benchling.com/favicon.ico](https://www.benchling.com/favicon.ico) | 4,286 |
| BetterUp | [`/logos/betterup.webp`](../public/logos/betterup.webp) | [https://www.betterup.com/favicon.ico](https://www.betterup.com/favicon.ico) → [resolved asset](https://9253440.fs1.hubspotusercontent-na1.net/hubfs/9253440/bu-favicon.png) | 332 |
| Brex | [`/logos/brex.ico`](../public/logos/brex.ico) | [https://www.brex.com/favicon.ico](https://www.brex.com/favicon.ico) | 15,406 |
| Calendly | [`/logos/calendly.ico`](../public/logos/calendly.ico) | [https://calendly.com/favicon.ico](https://calendly.com/favicon.ico) | 15,086 |
| CertiK | [`/logos/certik.webp`](../public/logos/certik.webp) | [https://www.certik.com/favicon-v2.png](https://www.certik.com/favicon-v2.png) | 10,438 |
| Charles River Associates | [`/logos/charles-river-associates.webp`](../public/logos/charles-river-associates.webp) | [https://www.crai.com/images/favicon.jpg?v=2.0.0](https://www.crai.com/images/favicon.jpg?v=2.0.0) | 3,754 |
| Databricks | [`/logos/databricks.png`](../public/logos/databricks.png) | [https://www.databricks.com/en-website-assets/icons/icon-48x48.png?v=c9b9916c3b27dc51866c46b79a6e9b88](https://www.databricks.com/en-website-assets/icons/icon-48x48.png?v=c9b9916c3b27dc51866c46b79a6e9b88) | 2,940 |
| Duolingo | [`/logos/duolingo.png`](../public/logos/duolingo.png) | [https://d35aaqx5ub95lt.cloudfront.net/images/duolingo-touch-icon2.png](https://d35aaqx5ub95lt.cloudfront.net/images/duolingo-touch-icon2.png) | 11,130 |
| ERG (Eastern Research Group) | [`/logos/eastern-research-group.ico`](../public/logos/eastern-research-group.ico) | [https://www.erg.com/themes/custom/erg/favicon.ico](https://www.erg.com/themes/custom/erg/favicon.ico) | 5,430 |
| Figma | [`/logos/figma.ico`](../public/logos/figma.ico) | [https://www.figma.com/favicon.ico](https://www.figma.com/favicon.ico) | 16,958 |
| Flexport | [`/logos/flexport.ico`](../public/logos/flexport.ico) | [https://www.flexport.com/favicon.ico](https://www.flexport.com/favicon.ico) | 651 |
| Global Lending Services | [`/logos/global-lending-services.png`](../public/logos/global-lending-services.png) | [https://glsauto.com/favicon.png](https://glsauto.com/favicon.png) | 23,852 |
| Ironclad | [`/logos/ironclad.png`](../public/logos/ironclad.png) | [https://ironcladapp.com/favicon.ico](https://ironcladapp.com/favicon.ico) → [resolved asset](https://ironcladapp.com/wp-content/uploads/2025/04/fiavicon.png) | 386 |
| Lake Partners | [`/logos/lake-partners.png`](../public/logos/lake-partners.png) | [https://www.lakepartners.com/images/sites/lak/LP-logo2x.png](https://www.lakepartners.com/images/sites/lak/LP-logo2x.png) | 10,928 |
| Lattice | [`/logos/lattice.png`](../public/logos/lattice.png) | [https://cdn.prod.website-files.com/64ad6f1aef87635bd23449f1/66cc32ff351ef8f537c817c9_lattice-webclip-256.png](https://cdn.prod.website-files.com/64ad6f1aef87635bd23449f1/66cc32ff351ef8f537c817c9_lattice-webclip-256.png) | 57,123 |
| Linear | [`/logos/linear.ico`](../public/logos/linear.ico) | [https://linear.app/favicon.ico](https://linear.app/favicon.ico) | 15,086 |
| Mercury | [`/logos/mercury.ico`](../public/logos/mercury.ico) | [https://mercury.com/favicon.ico](https://mercury.com/favicon.ico) | 15,086 |
| Mural | [`/logos/mural.png`](../public/logos/mural.png) | [https://cdn.prod.website-files.com/62e11362da2667ac3d0e6ed5/638f8a64c53eead78bc582a7_Favicon_256x.png](https://cdn.prod.website-files.com/62e11362da2667ac3d0e6ed5/638f8a64c53eead78bc582a7_Favicon_256x.png) | 3,116 |
| Notion | [`/logos/notion.png`](../public/logos/notion.png) | [https://www.notion.com/front-static/logo-ios.png](https://www.notion.com/front-static/logo-ios.png) | 8,078 |
| Palantir | [`/logos/palantir.ico`](../public/logos/palantir.ico) | [https://www.palantir.com/favicon.ico](https://www.palantir.com/favicon.ico) | 6,518 |
| Precision Medicine Group | [`/logos/precision-medicine-group.png`](../public/logos/precision-medicine-group.png) | [https://www.precisionmedicinegrp.com/wp-content/uploads/2024/07/PMG-Favicon.png](https://www.precisionmedicinegrp.com/wp-content/uploads/2024/07/PMG-Favicon.png) | 145 |
| Ramp | [`/logos/ramp.ico`](../public/logos/ramp.ico) | [https://ramp.com/favicon.ico](https://ramp.com/favicon.ico) | 15,406 |
| Recidiviz | [`/logos/recidiviz.png`](../public/logos/recidiviz.png) | [https://cdn.prod.website-files.com/5d30f830779cc8372354a337/632cba19d2f6b82944f57f69_webclip.png](https://cdn.prod.website-files.com/5d30f830779cc8372354a337/632cba19d2f6b82944f57f69_webclip.png) | 1,940 |
| Reddit | [`/logos/reddit.webp`](../public/logos/reddit.webp) | [https://redditinc.com/favicon.ico](https://redditinc.com/favicon.ico) → [resolved asset](https://40687240.fs1.hubspotusercontent-na1.net/hubfs/40687240/Reddit_Favicon_FullColor_48x48.png) | 1,212 |
| Ro | [`/logos/ro.ico`](../public/logos/ro.ico) | [https://ro.co/favicon.ico](https://ro.co/favicon.ico) | 7,406 |
| Robinhood | [`/logos/robinhood.ico`](../public/logos/robinhood.ico) | [https://robinhood.com/favicon.ico](https://robinhood.com/favicon.ico) | 15,086 |
| Roblox | [`/logos/roblox.ico`](../public/logos/roblox.ico) | [https://www.roblox.com/favicon.ico](https://www.roblox.com/favicon.ico) | 16,958 |
| Solace | [`/logos/solace.png`](../public/logos/solace.png) | [https://cdn.prod.website-files.com/632a21d0ec93a082b11988a0/632a602a33f1a9804bf7a104_Webclip.png](https://cdn.prod.website-files.com/632a21d0ec93a082b11988a0/632a602a33f1a9804bf7a104_Webclip.png) | 4,846 |
| Teachable | [`/logos/teachable.png`](../public/logos/teachable.png) | [https://cdn.prod.website-files.com/687904fb2b26c434698c47e9/68f25a572e5e73f1b13d70cf_Webclip.png](https://cdn.prod.website-files.com/687904fb2b26c434698c47e9/68f25a572e5e73f1b13d70cf_Webclip.png) | 1,675 |
| The Brattle Group | [`/logos/the-brattle-group.webp`](../public/logos/the-brattle-group.webp) | [https://www.brattle.com/wp-content/uploads/2021/05/favicon.png](https://www.brattle.com/wp-content/uploads/2021/05/favicon.png) | 3,332 |
| Thumbtack | [`/logos/thumbtack.ico`](../public/logos/thumbtack.ico) | [https://www.thumbtack.com/favicon.ico](https://www.thumbtack.com/favicon.ico) → [resolved asset](https://cdn.thumbtackstatic.com/fe-assets-web/_assets/images/release/components/global-head/logomark/black/transparent/fav.d9da1dd4b154406aa350a1e034634fd87bc6ac3d.ico) | 15,086 |
| Upgrade | [`/logos/upgrade.png`](../public/logos/upgrade.png) | [https://www.upgrade.com/icons/upgrade.com/icon-180x180.png](https://www.upgrade.com/icons/upgrade.com/icon-180x180.png) | 850 |
| Vanta | [`/logos/vanta.png`](../public/logos/vanta.png) | [https://cdn.prod.website-files.com/64009032676f24f376f002fc/6a8611e0bb23845c59b54179_ilma-favicon.png](https://cdn.prod.website-files.com/64009032676f24f376f002fc/6a8611e0bb23845c59b54179_ilma-favicon.png) | 26,648 |
| Veeva Systems | [`/logos/veeva.ico`](../public/logos/veeva.ico) | [https://www.veeva.com/favicon.ico](https://www.veeva.com/favicon.ico) | 15,086 |
| Wealthfront | [`/logos/wealthfront.ico`](../public/logos/wealthfront.ico) | [https://www.wealthfront.com/favicon.ico](https://www.wealthfront.com/favicon.ico) | 3,638 |
| Webflow | [`/logos/webflow.ico`](../public/logos/webflow.ico) | [https://webflow.com/favicon.ico](https://webflow.com/favicon.ico) | 4,286 |

The UI lookup should use the fixed employer/name mapping rather than infer a domain from a company name or a job URL. Update this provenance record whenever an asset is refreshed, and retain the initials fallback if the image cannot load.

## Catalog expansion — October 26, 2026

The following 36 verified employers were added with the source expansion. Their icons remain locally served. For three sites with unavailable favicons, the employer-owned GitHub organization avatar was used only after its public organization website matched the verified corporate domain; these are downloaded assets, not runtime third-party requests.

| Employer | Local asset | Original public source | Bytes |
| --- | --- | --- | ---: |
| SoFi | [`/logos/sofi.ico`](../public/logos/sofi.ico) | [https://www.sofi.com/favicon.ico](https://www.sofi.com/favicon.ico) | 85886 |
| Affirm | [`/logos/affirm.png`](../public/logos/affirm.png) | [https://www.affirm.com/favicon.ico](https://www.affirm.com/favicon.ico) | 2808 |
| Coinbase | [`/logos/coinbase.png`](../public/logos/coinbase.png) | [https://www.coinbase.com/favicon.ico](https://www.coinbase.com/favicon.ico) | 870 |
| Cloudflare | [`/logos/cloudflare.png`](../public/logos/cloudflare.png) | [https://www.cloudflare.com/favicon.ico](https://www.cloudflare.com/favicon.ico) | 908 |
| Datadog | [`/logos/datadog.ico`](../public/logos/datadog.ico) | [https://careers.datadoghq.com/favicon.ico](https://careers.datadoghq.com/favicon.ico) | 40436 |
| MongoDB | [`/logos/mongodb.ico`](../public/logos/mongodb.ico) | [https://www.mongodb.com/favicon.ico](https://www.mongodb.com/favicon.ico) | 32988 |
| Elastic | [`/logos/elastic.png`](../public/logos/elastic.png) | [https://avatars.githubusercontent.com/u/6764390?v=4&s=128](https://avatars.githubusercontent.com/u/6764390?v=4&s=128) | 9005 |
| Stripe | [`/logos/stripe.ico`](../public/logos/stripe.ico) | [https://stripe.com/favicon.ico](https://stripe.com/favicon.ico) | 15086 |
| BILL | [`/logos/bill.png`](../public/logos/bill.png) | [https://cdn.prod.website-files.com/63e3da3df35cd62f54751985/63efaae11991984d7d4d021a_Logo-Mark-Color%201.png](https://cdn.prod.website-files.com/63e3da3df35cd62f54751985/63efaae11991984d7d4d021a_Logo-Mark-Color%201.png) | 3308 |
| Toast | [`/logos/toast.ico`](../public/logos/toast.ico) | [https://careers.toasttab.com/favicon.ico](https://careers.toasttab.com/favicon.ico) | 22254 |
| Plaid | [`/logos/plaid.png`](../public/logos/plaid.png) | [https://plaid.com/assets/img/favicons/apple-touch-icon.png](https://plaid.com/assets/img/favicons/apple-touch-icon.png) | 15186 |
| Gusto | [`/logos/gusto.png`](../public/logos/gusto.png) | [https://avatars.githubusercontent.com/u/3697270?v=4&s=128](https://avatars.githubusercontent.com/u/3697270?v=4&s=128) | 2531 |
| OpenAI | [`/logos/openai.png`](../public/logos/openai.png) | [https://avatars.githubusercontent.com/u/14957082?v=4&s=128](https://avatars.githubusercontent.com/u/14957082?v=4&s=128) | 3547 |
| Anthropic | [`/logos/anthropic.ico`](../public/logos/anthropic.ico) | [https://www.anthropic.com/favicon.ico](https://www.anthropic.com/favicon.ico) | 15086 |
| Airbnb | [`/logos/airbnb.ico`](../public/logos/airbnb.ico) | [https://careers.airbnb.com/favicon.ico](https://careers.airbnb.com/favicon.ico) | 198 |
| Samsara | [`/logos/samsara.ico`](../public/logos/samsara.ico) | [https://www.samsara.com/favicon.ico](https://www.samsara.com/favicon.ico) | 15086 |
| Verkada | [`/logos/verkada.ico`](../public/logos/verkada.ico) | [https://www.verkada.com/favicon.ico](https://www.verkada.com/favicon.ico) | 15086 |
| Scale AI | [`/logos/scale-ai.ico`](../public/logos/scale-ai.ico) | [https://scale.com/favicon.ico](https://scale.com/favicon.ico) | 846 |
| Axon | [`/logos/axon.png`](../public/logos/axon.png) | [https://www.axon.com/favicon/apple-touch-icon.png](https://www.axon.com/favicon/apple-touch-icon.png) | 3160 |
| Oscar Health | [`/logos/oscar-health.ico`](../public/logos/oscar-health.ico) | [https://oscarhealth.com/favicon.ico](https://oscarhealth.com/favicon.ico) | 2734 |
| Motive | [`/logos/motive.ico`](../public/logos/motive.ico) | [https://gomotive.com/favicon.ico](https://gomotive.com/favicon.ico) | 15086 |
| Instacart | [`/logos/instacart.ico`](../public/logos/instacart.ico) | [https://www.instacart.careers/favicon.ico](https://www.instacart.careers/favicon.ico) | 15086 |
| Discord | [`/logos/discord.png`](../public/logos/discord.png) | [https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/62fddf0fde45a8baedcc7ee5_847541504914fd33810e70a0ea73177e%20(2)-1.png](https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/62fddf0fde45a8baedcc7ee5_847541504914fd33810e70a0ea73177e%20(2)-1.png) | 557 |
| Pinterest | [`/logos/pinterest.ico`](../public/logos/pinterest.ico) | [https://www.pinterestcareers.com/favicon.ico](https://www.pinterestcareers.com/favicon.ico) | 15086 |
| GitLab | [`/logos/gitlab.ico`](../public/logos/gitlab.ico) | [https://about.gitlab.com/favicon.ico](https://about.gitlab.com/favicon.ico) | 15086 |
| Okta | [`/logos/okta.ico`](../public/logos/okta.ico) | [https://www.okta.com/favicon.ico](https://www.okta.com/favicon.ico) | 15406 |
| Fivetran | [`/logos/fivetran.png`](../public/logos/fivetran.png) | [https://cdn.prod.website-files.com/6130fa1501794ed4d11867ba/6a10657efae8d58934eddd4b_Webclip%20%5BLight%5D.png](https://cdn.prod.website-files.com/6130fa1501794ed4d11867ba/6a10657efae8d58934eddd4b_Webclip%20%5BLight%5D.png) | 10363 |
| Intercom | [`/logos/intercom.png`](../public/logos/intercom.png) | [https://fin.ai/favicons/favicon-black-96x96.png](https://fin.ai/favicons/favicon-black-96x96.png) | 2980 |
| Braze | [`/logos/braze.ico`](../public/logos/braze.ico) | [https://www.braze.com/favicon.ico](https://www.braze.com/favicon.ico) | 15406 |
| Zscaler | [`/logos/zscaler.webp`](../public/logos/zscaler.webp) | [https://www.zscaler.com/favicons/apple-touch-icon.png](https://www.zscaler.com/favicons/apple-touch-icon.png) | 1476 |
| Spotify | [`/logos/spotify.png`](../public/logos/spotify.png) | [https://www.lifeatspotify.com/icons/icon-48x48.png](https://www.lifeatspotify.com/icons/icon-48x48.png) | 2388 |
| Cohere | [`/logos/cohere.ico`](../public/logos/cohere.ico) | [https://cohere.com/favicon.ico](https://cohere.com/favicon.ico) | 15406 |
| Glean | [`/logos/glean.png`](../public/logos/glean.png) | [https://cdn.prod.website-files.com/6127a84dfe068e153ef20572/67189bfac8da27b3a70ddd93_256%20x%20256%20Glean%20Favicon.png](https://cdn.prod.website-files.com/6127a84dfe068e153ef20572/67189bfac8da27b3a70ddd93_256%20x%20256%20Glean%20Favicon.png) | 7375 |
| Runway | [`/logos/runway.png`](../public/logos/runway.png) | [https://runway.com/icon.png?icon.35ps9bmugbe1e.png](https://runway.com/icon.png?icon.35ps9bmugbe1e.png) | 4846 |
| Anyscale | [`/logos/anyscale.png`](../public/logos/anyscale.png) | [https://www.anyscale.com/static/favicon-new.ico](https://www.anyscale.com/static/favicon-new.ico) | 1244 |
| Perplexity | [`/logos/perplexity.ico`](../public/logos/perplexity.ico) | [https://www.perplexity.ai/favicon.ico](https://www.perplexity.ai/favicon.ico) | 15086 |
