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
