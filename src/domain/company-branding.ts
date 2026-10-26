export interface CompanyBranding {
  readonly employerId: string;
  readonly company: string;
  readonly logoPath: string;
}

// Only reviewed, locally hosted employer assets belong here. Provenance:
// docs/COMPANY_LOGOS.md. Publisher names and arbitrary job URLs are not resolved.
export const COMPANY_BRANDING: readonly CompanyBranding[] = [
  { employerId: "robinhood", company: "Robinhood", logoPath: "/logos/robinhood.ico" },
  { employerId: "ramp", company: "Ramp", logoPath: "/logos/ramp.ico" },
  { employerId: "figma", company: "Figma", logoPath: "/logos/figma.ico" },
  { employerId: "palantir", company: "Palantir", logoPath: "/logos/palantir.ico" },
  { employerId: "notion", company: "Notion", logoPath: "/logos/notion.png" },
  { employerId: "amplitude", company: "Amplitude", logoPath: "/logos/amplitude.ico" },
  { employerId: "reddit", company: "Reddit", logoPath: "/logos/reddit.webp" },
  { employerId: "webflow", company: "Webflow", logoPath: "/logos/webflow.ico" },
  { employerId: "benchling", company: "Benchling", logoPath: "/logos/benchling.ico" },
  { employerId: "vanta", company: "Vanta", logoPath: "/logos/vanta.png" },
  { employerId: "asana", company: "Asana", logoPath: "/logos/asana.ico" },
  { employerId: "mercury", company: "Mercury", logoPath: "/logos/mercury.ico" },
  { employerId: "mural", company: "Mural", logoPath: "/logos/mural.png" },
  { employerId: "flexport", company: "Flexport", logoPath: "/logos/flexport.ico" },
  { employerId: "thumbtack", company: "Thumbtack", logoPath: "/logos/thumbtack.ico" },
  { employerId: "ro", company: "Ro", logoPath: "/logos/ro.ico" },
  { employerId: "calendly", company: "Calendly", logoPath: "/logos/calendly.ico" },
  { employerId: "lattice", company: "Lattice", logoPath: "/logos/lattice.png" },
  { employerId: "linear", company: "Linear", logoPath: "/logos/linear.ico" },
  { employerId: "brex", company: "Brex", logoPath: "/logos/brex.ico" },
  { employerId: "ironclad", company: "Ironclad", logoPath: "/logos/ironclad.png" },
  { employerId: "betterup", company: "BetterUp", logoPath: "/logos/betterup.webp" },
  { employerId: "teachable", company: "Teachable", logoPath: "/logos/teachable.png" },
  { employerId: "wealthfront", company: "Wealthfront", logoPath: "/logos/wealthfront.ico" },
  { employerId: "upgrade", company: "Upgrade", logoPath: "/logos/upgrade.png" },
  { employerId: "veeva", company: "Veeva Systems", logoPath: "/logos/veeva.ico" },
  { employerId: "databricks", company: "Databricks", logoPath: "/logos/databricks.png" },
  { employerId: "roblox", company: "Roblox", logoPath: "/logos/roblox.ico" },
  { employerId: "global-lending-services", company: "Global Lending Services", logoPath: "/logos/global-lending-services.png" },
  { employerId: "recidiviz", company: "Recidiviz", logoPath: "/logos/recidiviz.png" },
  { employerId: "charles-river-associates", company: "Charles River Associates", logoPath: "/logos/charles-river-associates.webp" },
  { employerId: "the-brattle-group", company: "The Brattle Group", logoPath: "/logos/the-brattle-group.webp" },
  { employerId: "solace", company: "Solace", logoPath: "/logos/solace.png" },
  { employerId: "certik", company: "CertiK", logoPath: "/logos/certik.webp" },
  { employerId: "eastern-research-group", company: "ERG (Eastern Research Group)", logoPath: "/logos/eastern-research-group.ico" },
  { employerId: "duolingo", company: "Duolingo", logoPath: "/logos/duolingo.png" },
  { employerId: "precision-medicine-group", company: "Precision Medicine Group", logoPath: "/logos/precision-medicine-group.png" },
  { employerId: "lake-partners", company: "Lake Partners", logoPath: "/logos/lake-partners.png" },
  { employerId: "sofi", company: "SoFi", logoPath: "/logos/sofi.ico" },
  { employerId: "affirm", company: "Affirm", logoPath: "/logos/affirm.png" },
  { employerId: "coinbase", company: "Coinbase", logoPath: "/logos/coinbase.png" },
  { employerId: "cloudflare", company: "Cloudflare", logoPath: "/logos/cloudflare.png" },
  { employerId: "datadog", company: "Datadog", logoPath: "/logos/datadog.ico" },
  { employerId: "mongodb", company: "MongoDB", logoPath: "/logos/mongodb.ico" },
  { employerId: "elastic", company: "Elastic", logoPath: "/logos/elastic.png" },
  { employerId: "stripe", company: "Stripe", logoPath: "/logos/stripe.ico" },
  { employerId: "bill", company: "BILL", logoPath: "/logos/bill.png" },
  { employerId: "toast", company: "Toast", logoPath: "/logos/toast.ico" },
  { employerId: "plaid", company: "Plaid", logoPath: "/logos/plaid.png" },
  { employerId: "gusto", company: "Gusto", logoPath: "/logos/gusto.png" },
  { employerId: "openai", company: "OpenAI", logoPath: "/logos/openai.png" },
  { employerId: "anthropic", company: "Anthropic", logoPath: "/logos/anthropic.ico" },
  { employerId: "airbnb", company: "Airbnb", logoPath: "/logos/airbnb.ico" },
  { employerId: "samsara", company: "Samsara", logoPath: "/logos/samsara.ico" },
  { employerId: "verkada", company: "Verkada", logoPath: "/logos/verkada.ico" },
  { employerId: "scale-ai", company: "Scale AI", logoPath: "/logos/scale-ai.ico" },
  { employerId: "axon", company: "Axon", logoPath: "/logos/axon.png" },
  { employerId: "oscar-health", company: "Oscar Health", logoPath: "/logos/oscar-health.ico" },
  { employerId: "motive", company: "Motive", logoPath: "/logos/motive.ico" },
  { employerId: "instacart", company: "Instacart", logoPath: "/logos/instacart.ico" },
  { employerId: "discord", company: "Discord", logoPath: "/logos/discord.png" },
  { employerId: "pinterest", company: "Pinterest", logoPath: "/logos/pinterest.ico" },
  { employerId: "gitlab", company: "GitLab", logoPath: "/logos/gitlab.ico" },
  { employerId: "okta", company: "Okta", logoPath: "/logos/okta.ico" },
  { employerId: "fivetran", company: "Fivetran", logoPath: "/logos/fivetran.png" },
  { employerId: "intercom", company: "Intercom", logoPath: "/logos/intercom.png" },
  { employerId: "braze", company: "Braze", logoPath: "/logos/braze.ico" },
  { employerId: "zscaler", company: "Zscaler", logoPath: "/logos/zscaler.webp" },
  { employerId: "spotify", company: "Spotify", logoPath: "/logos/spotify.png" },
  { employerId: "cohere", company: "Cohere", logoPath: "/logos/cohere.ico" },
  { employerId: "glean", company: "Glean", logoPath: "/logos/glean.png" },
  { employerId: "runway", company: "Runway", logoPath: "/logos/runway.png" },
  { employerId: "anyscale", company: "Anyscale", logoPath: "/logos/anyscale.png" },
  { employerId: "perplexity", company: "Perplexity", logoPath: "/logos/perplexity.ico" },
];

function normalizeCompany(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const companyByName = new Map(COMPANY_BRANDING.map(brand => [normalizeCompany(brand.company), brand]));

export function companyBranding(company: string): CompanyBranding | null {
  return companyByName.get(normalizeCompany(company)) ?? null;
}

export function companyInitials(company: string): string {
  const words = company.match(/[\p{L}\p{N}]+/gu) || [];
  return words[0] && /^[A-Z0-9]{2,3}$/.test(words[0]) ? words[0] : words.map(word => word[0]).slice(0, 2).join('').toUpperCase();
}
