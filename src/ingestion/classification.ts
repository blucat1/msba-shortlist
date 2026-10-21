import type { EmploymentType, Evidence, Experience, Job, JobLocation, RoleFamily, SalaryBand, WorkArrangement } from '../domain/types';

export const CLASSIFIER_VERSION = '2026-10-21.1';
export const TAXONOMY: { family: RoleFamily; titles: RegExp; context?: RegExp }[] = [
  { family: 'product-management', titles: /\b(?:associate product manager|apm|product manager|technical product manager|product operations|product rotational)\b/i },
  { family: 'analytics-engineering', titles: /\banalytics engineer(?:ing)?\b/i },
  { family: 'data-engineering', titles: /\bdata engineer(?:ing)?\b|\b(?:software engineer|engineer),? (?:[-–] )?data (?:platform|infrastructure|pipelines)\b/i, context: /\b(?:data engineer(?:ing)?|pipelines|etl|elt|data platform|data infrastructure|warehouse|spark|airflow)\b/i },
  { family: 'machine-learning', titles: /\b(?:machine learning|ml|applied ai|applied machine learning) (?:engineer|scientist)|\b(?:software engineer|engineer),? (?:[-–] )?(?:machine learning|ml)\b|\bresearch engineer\b/i, context: /\b(?:machine learning|models|statistical|deep learning|pytorch|tensorflow)\b/i },
  { family: 'data-science', titles: /\b(?:data scien(?:tist|ce)|applied scien(?:tist|ce)|statistician|statistical analyst|decision scien(?:tist|ce))\b/i },
  { family: 'product-analytics', titles: /\b(?:product|growth|experimentation|decision) (?:data )?analy(?:st|tics)|\bexperimentation scien/i },
  { family: 'business-intelligence', titles: /\b(?:business intelligence|bi analyst|bi engineer|reporting analyst|reporting analytics)\b/i },
  { family: 'marketing-analytics', titles: /\b(?:marketing|customer|commercial|sales|consumer) (?:data )?analy(?:st|tics)|\bmarketing scien/i },
  { family: 'operations-analytics', titles: /\b(?:operations|logistics|supply chain|supply-chain|inventory) (?:data )?analy(?:st|tics)/i },
  { family: 'financial-analytics', titles: /\b(?:financial|finance|credit|risk|pricing|revenue|fraud) (?:data )?analy(?:st|tics)/i },
  { family: 'strategy-operations', titles: /\b(?:business operations|strategy (?:and|&) operations|strategic operations|business strategy|strategy analyst|strategy associate|analytics consultant|business consultant)\b/i },
  { family: 'business-analytics', titles: /\b(?:data analyst|business analyst|business analytics|decision analyst|analytics associate)\b/i },
];

export function plainText(value: string): string {
  const decode = (s: string) => s.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi, (e) => {
    const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
    if (named[e.toLowerCase()]) return named[e.toLowerCase()];
    const hex = e.startsWith('&#x'); const code = parseInt(e.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
  return decode(decode(value)).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim().slice(0, 32000);
}

export function safePostingUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}

const US_CITIES = /\b(?:San Francisco|New York|New York City|NYC|Seattle|Austin|Boston|Chicago|Los Angeles|Denver|Atlanta|Washington,? DC|Washington D\.C\.|San Diego|San Jose|Palo Alto|Menlo Park|Mountain View|Sunnyvale|Redwood City|Bellevue|Portland,? OR|Philadelphia|Dallas|Miami|Salt Lake City)\b/i;
const US_STATES = /(?:,|\bUS\s*-)\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
const FOREIGN = /\b(?:United Kingdom|London|Canada|Toronto|Vancouver|Montreal|Dublin|Ireland|India|Bengaluru|Bangalore|Germany|Berlin|France|Paris|Singapore|Australia|Sydney|Netherlands|Amsterdam|Japan|Tokyo|Israel|Tel Aviv|Brazil|Mexico|Poland|Warsaw|Spain|Barcelona)\b/i;

export function location(label: string, country?: string | null, region?: string | null, city?: string | null): JobLocation {
  let normalized = country?.toUpperCase() || null;
  if (normalized === 'USA' || normalized === 'UNITED STATES' || normalized === 'UNITED STATES OF AMERICA') normalized = 'US';
  if (!normalized && /\b(?:United States|USA|U\.S\.A\.|US Remote|Remote[ ,–-]+US|US[ ,–-]+Remote)\b/i.test(label)) normalized = 'US';
  if (!normalized && (US_CITIES.test(label) || US_STATES.test(label))) normalized = 'US';
  // Remote alone conveys no country eligibility. Explicit foreign locations never become US.
  if (!country && FOREIGN.test(label) && !/United States|USA/i.test(label)) normalized = null;
  return { label, country: normalized, region: region || null, city: city || null };
}

export function employment(value?: string | null, title = '', description = ''): { type: EmploymentType; evidence: string | null } {
  const text = [value || '', title].join(' ');
  if (/\bintern(?:ship)?\b/i.test(text)) return { type: 'internship', evidence: value || title };
  if (/\b(?:contract(?:or)?|temporary|freelance)\b/i.test(text)) return { type: 'contract', evidence: value || title };
  if (/part[ -]?time/i.test(text)) return { type: 'part-time', evidence: value || title };
  if (/full[ -]?time/i.test(text)) return { type: 'full-time', evidence: value || title };
  const explicit = description.match(/\b(?:this (?:is|position is|role is) (?:a )?|employment(?: type)?[: ]+)(full[ -]?time|part[ -]?time|contract|internship)\b/i);
  return explicit ? employment(explicit[1]) : { type: 'unknown', evidence: null };
}

export function workArrangement(value?: string | null, label = ''): WorkArrangement {
  const text = `${value || ''} ${label}`;
  return /hybrid/i.test(text) ? 'hybrid' : /remote/i.test(text) ? 'remote' : /on[ -]?site/i.test(text) ? 'onsite' : 'unknown';
}

export function extractExperience(text: string): Experience {
  const matches = [...text.matchAll(/(?:\b(?:at least|minimum of|minimum|requires?|with)\s+)?(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\+?\s+years?(?:\s+of)?\s+(?:(?:relevant|professional|industry|hands-on|related|prior|work|technical|commercial|practical)\s+){0,3}experience\b/gi)];
  const required: number[] = []; const maxima: number[] = []; const preferred: number[] = []; const snippets: string[] = []; const alternatives: string[] = [];
  for (const m of matches) {
    const start = Math.max(text.lastIndexOf('\n', m.index!), text.lastIndexOf('.', m.index!)) + 1;
    const endCandidates = [text.indexOf('\n', m.index! + m[0].length), text.indexOf('.', m.index! + m[0].length)].filter(n => n >= 0);
    const end = endCandidates.length ? Math.min(...endCandidates) : Math.min(text.length, m.index! + 180);
    const sentence = text.slice(start, end).trim().slice(0, 500); snippets.push(sentence);
    if (/\b(?:preferred|nice to have|bonus|ideally)\b/i.test(sentence)) { preferred.push(Number(m[1])); continue; }
    if (/\b(?:founded|company|business)\b.{0,40}\b(?:ago|operating|history)\b/i.test(sentence)) continue;
    if (/\b(?:or|alternatively)\b/i.test(sentence) && /\b(?:bachelor|master|phd|degree)/i.test(sentence)) alternatives.push(sentence);
    required.push(Number(m[1])); if (m[2]) maxima.push(Number(m[2]));
  }
  return { minYears: required.length ? (alternatives.length ? Math.min(...required) : Math.max(...required)) : null, maxYears: maxima.length ? Math.max(...maxima) : null, preferredYears: preferred.length ? Math.min(...preferred) : null, alternatives: [...new Set(alternatives)], evidence: snippets.length ? [...new Set(snippets)].join('; ') : null };
}

const SKILLS: [string, RegExp][] = [ ['SQL', /\b(?:SQL|PostgreSQL|Postgres|MySQL)\b/i], ['Python', /\bPython\b/i], ['R', /(?<![A-Za-z0-9])R(?![A-Za-z0-9&])/], ['Excel', /\b(?:Excel|Google Sheets)\b/i], ['Tableau', /\bTableau\b/i], ['Power BI', /\bPower\s?BI\b/i], ['dbt', /\bdbt\b/i], ['Snowflake', /\bSnowflake\b/i], ['Spark', /\b(?:Spark|PySpark)\b/i], ['Airflow', /\bAirflow\b/i], ['AWS', /\b(?:AWS|Amazon Web Services)\b/i], ['Statistics', /\b(?:statistics|statistical analysis)\b/i], ['Experimentation', /\b(?:A\/B test(?:ing)?|experimentation)\b/i], ['Machine learning', /\bmachine learning\b/i], ['PyTorch', /\bPyTorch\b/i], ['TensorFlow', /\bTensorFlow\b/i] ];

export function extractSkills(text: string): { required: string[]; preferred: string[] } {
  const required = new Set<string>(); const preferred = new Set<string>();
  let section: 'required' | 'preferred' | 'unknown' = 'unknown';
  for (const raw of text.split(/\n|(?<=[.!?])\s+/)) {
    const line = raw.trim();
    if (/^(?:preferred|nice to have|bonus|what would be nice)/i.test(line)) section = 'preferred';
    else if (/^(?:requirements|qualifications|required|what you bring|you have|what we're looking)/i.test(line)) section = 'required';
    else if (/^(?:benefits|about us|about the company|what we offer|responsibilities)/i.test(line)) section = 'unknown';
    const isPreferred = /\b(?:preferred|nice to have|bonus|ideally)\b/i.test(line) || section === 'preferred';
    const isRequired = /\b(?:required|must|proficien(?:cy|t)|experience (?:using|with|in)|knowledge of|expertise (?:with|in))\b/i.test(line) || section === 'required';
    for (const [skill, pattern] of SKILLS) if (pattern.test(line)) { if (isPreferred) preferred.add(skill); else if (isRequired) required.add(skill); }
  }
  return { required: [...required], preferred: [...preferred].filter(s => !required.has(s)) };
}

export function parseSalaryText(text: string): SalaryBand[] {
  const bands: SalaryBand[] = [];
  for (const match of text.matchAll(/(?:\b(USD|CAD|EUR|GBP)\s*)?([$€£])\s*(\d[\d,]*(?:\.\d+)?)([kK])?\s*(?:-|–|to)\s*(?:([$€£])\s*)?(\d[\d,]*(?:\.\d+)?)([kK])?\s*(?:USD|CAD|EUR|GBP)?/g)) {
    const start = Math.max(0, match.index! - 90); const surrounding = text.slice(start, match.index! + match[0].length + 120);
    if (/equity|bonus|stock/i.test(surrounding) && !/base|salary|pay range/i.test(surrounding)) continue;
    const min = Number(match[3].replaceAll(',', '')) * (match[4] ? 1000 : 1); const max = Number(match[6].replaceAll(',', '')) * (match[7] ? 1000 : 1);
    const period: SalaryBand['period'] = /\b(?:hour|hourly|hr)\b|\/hr/i.test(surrounding) ? 'hour' : /\bmonth(?:ly)?\b/i.test(surrounding) ? 'month' : /\b(?:annual(?:ly)?|year(?:ly)?|per annum)\b/i.test(surrounding) ? 'year' : 'unknown';
    // A bare dollar sign does not establish USD. Regional context may identify CAD.
    const currency = match[1] || (/\bCAD\b/.test(surrounding) ? 'CAD' : /\bUSD\b/.test(surrounding) ? 'USD' : match[2] === '€' ? 'EUR' : match[2] === '£' ? 'GBP' : 'unknown');
    bands.push({ min, max, currency, period, compensationType: /\bbase\b/i.test(surrounding) ? 'base' : /total compensation/i.test(surrounding) ? 'total' : 'unknown', location: null, sourceText: surrounding.trim() });
  }
  return bands.slice(0, 8);
}

export function classify(title: string, text: string, locations: JobLocation[], employmentType: EmploymentType, experience: Experience): Pick<Job, 'roleFamilies' | 'primaryRoleFamily' | 'classification'> {
  const reasons: Evidence[] = [];
  const negative = /\b(?:store manager|construction|clinical|laboratory analyst|sales representative|account executive|recruiter|customer support|executive assistant)\b/i.test(title);
  const leadership = /\b(?:chief|vice president|vp|director|head of|engineering manager|manager,? (?:data engineering|analytics engineering|machine learning|data science|business intelligence|analytics)|(?:data science|business intelligence|data engineering|analytics engineering|machine learning|analytics) manager|(?:data|analytics|machine learning) engineering manager|group product manager)\b/i.test(title);
  const roleFamilies = negative ? [] : TAXONOMY.filter(r => r.titles.test(title) && (!r.context || r.context.test(`${title} ${text}`))).map(r => r.family);
  if (roleFamilies.length) reasons.push({ code: 'role.title_taxonomy', text: title });
  else reasons.push({ code: 'role.no_supported_evidence', text: title });
  const us = locations.some(l => l.country === 'US');
  const internationalOnly = !us && locations.length > 0 && locations.every(l => (l.country && l.country !== 'US') || FOREIGN.test(l.label));
  if (us) reasons.push({ code: 'country.us_evidence', text: locations.filter(l => l.country === 'US').map(l => l.label).join('; ') });
  if (internationalOnly) reasons.push({ code: 'country.international_only', text: locations.map(l => l.label).join('; ') });
  if (!us && !internationalOnly) reasons.push({ code: 'country.unknown', text: 'Remote or missing country does not establish US eligibility.' });
  if (employmentType === 'unknown') reasons.push({ code: 'employment.unknown', text: 'Employment type not established by source.' });
  const explicitlyExcluded = ['part-time', 'contract', 'internship'].includes(employmentType);
  if (explicitlyExcluded) reasons.push({ code: 'employment.excluded', text: employmentType });
  const seniority: Job['classification']['seniority'] = leadership ? 'leadership' : /\b(?:principal|staff|senior|sr\.?|lead)\b/i.test(title) || (experience.minYears !== null && experience.minYears >= 6) ? 'senior' : /\b(?:associate|new grad|new graduate|entry.level|apm|junior|early career)\b/i.test(title) || (experience.minYears !== null && experience.minYears <= 3) ? 'early-career' : experience.minYears !== null ? 'mid-level' : 'unknown';
  if (leadership) reasons.push({ code: 'seniority.leadership', text: title });
  if (experience.alternatives.length) reasons.push({ code: 'experience.education_alternatives', text: experience.alternatives.join('; ') });
  const scope = !roleFamilies.length || internationalOnly || explicitlyExcluded || leadership ? 'excluded' : !us || employmentType === 'unknown' ? 'needs-details' : 'included';
  return { roleFamilies, primaryRoleFamily: roleFamilies[0] || null, classification: { scope, seniority, confidence: scope === 'included' ? 'high' : roleFamilies.length ? 'medium' : 'low', reasons, version: CLASSIFIER_VERSION } };
}
