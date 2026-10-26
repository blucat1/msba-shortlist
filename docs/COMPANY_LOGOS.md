# Company logo assets

Reviewed **October 26, 2026**. These local images identify the actual hiring employer in job cards and related views. They cover the 37 enabled employer boards in `data/employers.json` plus Precision Medicine Group, which appeared in the live catalog. The Jobicy publisher logo is deliberately excluded: publisher identity is not employer identity. Fictional demo employers and unknown companies retain an initials fallback.

Images were obtained from the companies’ public websites or the icon assets explicitly linked by those sites. The originals are served from this application’s own `/logos/` directory; a visitor does not contact a logo service or an employer domain to display them. No runtime URL guessing, arbitrary posting-URL fetch, paid logo service or generated imitation is used. File formats follow the actual image bytes, including WebP responses returned for some `.png` URLs. HTTP gzip transport encoding was decoded where necessary; image contents were not redrawn or recolored.

All 38 image files loaded successfully in a local Chromium image-grid check, and the grid was visually inspected. Precision Medicine Group’s generic `/favicon.ico` response redirected to a WordPress icon and was rejected; its explicitly linked branded favicon is used instead. Lake Partners’ header logo was selected from its official homepage stylesheet because it did not publish an icon link.

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
