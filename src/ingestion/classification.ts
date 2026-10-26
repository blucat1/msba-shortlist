import type { EmploymentType, Evidence, Experience, Job, JobLocation, RoleFamily, SalaryBand, WorkArrangement } from '../domain/types';
import { explicitGraduateTitle, isLeadershipTitle } from '../domain/experience';

export const CLASSIFIER_VERSION = '2026-10-26.1';
const QUANTITATIVE_CONSULTING = /\b(?:econometric|economic|statistical|quantitative|financial|data) (?:analysis|research|model(?:ing|s)?)|\b(?:Python|Stata|SAS|R programming|regression|econometrics|data analytics|statistical programs)\b/i;
export const TAXONOMY: { family: RoleFamily; titles: RegExp; context?: RegExp }[] = [
  { family: 'product-management', titles: /\b(?:associate product manager|apm|product manager|technical product manager|product operations|product rotational)\b/i },
  { family: 'data-engineering', titles: /\bimplementation engineer\b/i, context: /\b(?:data pipelines?|data ingest|ETL|data engineer(?:ing)?)\b/i },
  { family: 'analytics-engineering', titles: /\banalytics engineer(?:ing)?\b/i },
  { family: 'data-engineering', titles: /\bdata engineer(?:ing)?\b|\b(?:software engineer|engineer),? (?:[-–] )?data (?:platform|infrastructure|pipelines)\b/i, context: /\b(?:data engineer(?:ing)?|pipelines|etl|elt|data platform|data infrastructure|warehouse|spark|airflow)\b/i },
  { family: 'machine-learning', titles: /\b(?:machine learning|ml|applied ai|applied machine learning) (?:engineer|scientist)|\b(?:software engineer|engineer),? (?:[-–] )?(?:machine learning|ml)\b|\bresearch engineer\b/i, context: /\b(?:machine learning|models|statistical|deep learning|pytorch|tensorflow)\b/i },
  { family: 'data-science', titles: /\b(?:data scien(?:tist|ce)|applied scien(?:tist|ce)|statistician|statistical analyst|decision scien(?:tist|ce))\b/i },
  { family: 'product-analytics', titles: /\b(?:product|growth|experimentation|decision) (?:data )?analy(?:st|tics)|\bexperimentation scien/i },
  { family: 'business-intelligence', titles: /\banalyst,? reporting\b/i },
  { family: 'business-intelligence', titles: /\b(?:business intelligence|bi analyst|bi engineer|reporting analyst|reporting analytics)\b/i },
  { family: 'marketing-analytics', titles: /\b(?:marketing|customer|commercial|sales|consumer) (?:data )?analy(?:st|tics)|\bmarketing scien/i },
  { family: 'operations-analytics', titles: /\b(?:operations|logistics|supply chain|supply-chain|inventory) (?:data )?analy(?:st|tics)/i },
  { family: 'financial-analytics', titles: /\b(?:treasury|capital markets|credit portfolio|CMBS|RMBS)\b[^\n]{0,45}\banalyst\b|\b(?:project finance|funds ratings)\b[^\n]{0,45}\banalyst\b|\bfraud risk management[^\n]{0,45}\banalyst\b/i },
  { family: 'financial-analytics', titles: /\b(?:senior )?associate,? (?:market fundamentals|risk and structuring analytics|energy management)\b/i, context: /\b(?:power trading|quantitative|modeling|analysis|analytical)\b/i },
  { family: 'operations-analytics', titles: /\boperations (?:sr\.?|senior) analyst\b/i },
  { family: 'financial-analytics', titles: /\banalyst,? market optimization (?:and|&) trading\b/i },
  { family: 'financial-analytics', titles: /\beconomic consulting senior associate\b|\bsenior associate \(finance practice\)/i, context: /\b(?:economic|economics|finance|accounting|quantitative|analysis)\b/i },
  { family: 'financial-analytics', titles: /\b(?:(?:economics? consulting|(?:accounting\/)?business\/finance consulting|energy) (?:analyst|associate)|research analyst)\b/i, context: QUANTITATIVE_CONSULTING },
  { family: 'strategy-operations', titles: /\bmanagement advisory (?:analyst|associate)\b/i, context: QUANTITATIVE_CONSULTING },
  { family: 'financial-analytics', titles: /\b(?:financial|finance|credit|risk|pricing|revenue|fraud) (?:data )?analy(?:st|tics)/i },
  { family: 'strategy-operations', titles: /\b(?:business operations|strategy (?:and|&) operations|strategic operations|business strategy|strategy analyst|strategy associate|analytics consultant|business consultant)\b/i },
  { family: 'business-analytics', titles: /\bbusiness systems analyst\b/i, context: /\b(?:requirements|analysis|analytics|SQL|Python)\b/i },
  { family: 'business-analytics', titles: /\bAI solutions analyst\b/i, context: /\b(?:Python|SQL|machine learning|data analytics|analysis|AI)\b/i },
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
const FOREIGN = /\b(?:United Kingdom|London|Canada|Toronto|Vancouver|Montreal|Dublin|Ireland|India|Bengaluru|Bangalore|Germany|Berlin|France|Paris|Singapore|Australia|Sydney|Netherlands|Amsterdam|Japan|Tokyo|Israel|Tel Aviv|Brazil|Mexico|Poland|Warsaw|Spain|Barcelona|Serbia|China|Beijing|Shanghai)\b/i;

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
  const roleType = description.match(/\b(full[ -]?time|part[ -]?time|contract|internship)[,\s]+(?:[a-z]+\s+){0,2}(?:position|role|opportunity)\b/i);
  if (roleType) return { type: employment(roleType[1]).type, evidence: roleType[0] };
  const explicit = description.match(/\b(?:this (?:is|position is|role is) (?:a )?|(?:employment|role)(?: type)?[: ]+)(full[ -]?time|part[ -]?time|contract|internship)\b/i);
  return explicit ? employment(explicit[1]) : { type: 'unknown', evidence: null };
}

export function workArrangement(value?: string | null, label = ''): WorkArrangement {
  const text = `${value || ''} ${label}`;
  return /hybrid/i.test(text) ? 'hybrid' : /remote/i.test(text) ? 'remote' : /on[ -]?site/i.test(text) ? 'onsite' : 'unknown';
}

export function extractExperience(text: string): Experience {
  const numberWords: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
  const number = String.raw`(?:\d{1,2}(?:\.\d)?|${Object.keys(numberWords).join('|')})`;
  const quantity = new RegExp(String.raw`\b(${number})(?:\s*\(\s*${number}\s*\))?(?:\s*(?:[-–—]|to)\s*(${number}))?(\+|\s+or\s+(?:more|less|fewer))?\s*\)?\s*(years?|yrs?\.?|yoe|months?|mos?\.?)\b`, 'gi');
  const degree = /\b(?:bachelor(?:['’]s)?|master(?:['’]s)?|ph\.?d\.?|doctorate|doctoral|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?)\b/gi;
  const parseNumber = (value: string) => numberWords[value.toLowerCase()] ?? Number(value);
  type Constraint = { min: number | null; max: number | null };
  const required: Constraint[] = []; const preferred: number[] = [];
  const snippets = new Set<string>(); const alternatives = new Set<string>();
  let section: 'required' | 'preferred' | 'unknown' = 'unknown';
  const lines = text.replace(/\r\n?/g, '\n').split(/\n+/).map(line => line.trim()).filter(Boolean);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex];
    // Preserve education/experience paths split into separate OR bullets.
    if (degree.test(line)) {
      while (lineIndex + 1 < lines.length && /^(?:[-•*]\s*)?(?:or\b|alternatively\b)/i.test(lines[lineIndex + 1])) {
        line += ` ${lines[++lineIndex]}`;
        if (/^(?:[-•*]\s*)?(?:or|alternatively)\s*[:;]?$/i.test(lines[lineIndex]) && lineIndex + 1 < lines.length) line += ` ${lines[++lineIndex]}`;
      }
    }
    degree.lastIndex = 0;
    const heading = line.replace(/^[-•*#\s]+/, '');
    if (/^(?:preferred(?:\s+(?:qualifications?|requirements?|skills?|experience))?|nice[ -]to[ -]haves?|bonus(?: points)?|desired(?:\s+(?:qualifications?|skills?|experience))?|even better if|extra credit|what would be nice|you['’]ll stand out)\b/i.test(heading)) section = 'preferred';
    else if (/^(?:(?:minimum|basic|required)\s+(?:qualifications?|requirements?|skills?|experience)|requirements?|qualifications?|experience\s*:|what you bring|what you have|what we['’]re looking for|who you are|about you|your background|skills and qualifications)\b/i.test(heading)) section = 'required';
    else if (/^(?:benefits|about us|about the company|our company|what we offer|compensation|salary|pay range|responsibilities|what you['’]ll do|what you will do|life at|equal (?:employment|opportunity))\b/i.test(heading)) section = 'unknown';
    // Do not split Ph.D./M.S. degree paths at abbreviation punctuation.
    const protectedLine = line.replace(/\byrs?\./gi, value => value.replaceAll('.', '\uE000')).replace(/\b(?:ph\.?d\.?|b\.s\.?|m\.s\.?|b\.a\.?|m\.a\.?)\b\.?/gi, value => value.replaceAll('.', '\uE000'));
    const statements = protectedLine.split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])|;\s*(?!or\b|alternatively\b)/i).map(value => value.replaceAll('\uE000', '.'));
    for (const statement of statements) {
      const matches = [...statement.matchAll(quantity)];
      const degrees = [...statement.matchAll(degree)];
      degree.lastIndex = 0;
      // A degree-conditioned OR is not an unconditional low experience floor.
      // Keep those paths for review without assuming a bachelor's/master's/PhD.
      let alternativeStart: number | null = null;
      for (const separator of statement.matchAll(/\b(?:or|alternatively)\b/gi)) {
        const separatorIndex = separator.index!;
        const before = degrees.filter(item => item.index! < separatorIndex);
        if (!before.length) continue;
        const firstDegree = before[0].index!;
        const branchStart = statement.lastIndexOf(',', firstDegree) + 1;
        const hasPriorYears = matches.some(item => item.index! >= branchStart && item.index! < separatorIndex)
          || /\bexperience\b/i.test(statement.slice(firstDegree, separatorIndex));
        const degreeAfter = degrees.some(item => item.index! > separatorIndex);
        const equivalentAfter = /^\s+(?:an?\s+)?equivalent\s+(?:(?:practical|professional|work|industry)\s+)?experience\b/i.test(statement.slice(separatorIndex + separator[0].length));
        const yearsAfter = new RegExp(String.raw`^\s+${number}[^.!?;]{0,45}\b(?:years?|yrs?|yoe)\b`, 'i').test(statement.slice(separatorIndex + separator[0].length));
        if (hasPriorYears && (degreeAfter || equivalentAfter) || !hasPriorYears && yearsAfter) {
          const preceding = matches.filter(item => item.index! >= branchStart && item.index! < firstDegree);
          alternativeStart = preceding.length ? preceding[0].index! : firstDegree;
          alternatives.add(statement.slice(alternativeStart).trim().slice(0, 800));
          break;
        }
      }
      const add = (index: number, end: number, constraint: Constraint) => {
        const prefix = statement.slice(Math.max(statement.lastIndexOf(',', index), statement.lastIndexOf(';', index)) + 1, index);
        const nextComma = statement.indexOf(',', end);
        const nextQuantity = matches.find(item => item.index! > index)?.index ?? statement.length;
        const tail = statement.slice(end, Math.min(nextComma < 0 ? statement.length : nextComma, nextQuantity));
        // A terminal preference can govern a whole list of example industries.
        // Keep separate comma clauses ("5 years required, SQL preferred") local.
        const listParts = statement.slice(end, nextQuantity).split(',');
        const terminalPreference = /\s+(?:(?:is|are)\s+)?(?:(?:strongly|highly)\s+)?(?:preferred|desired|desirable|a plus|nice[ -]to[ -]have)\s*[.!?]?\s*$/i;
        const lastPart = listParts.at(-1) || '';
        const listPreference = listParts.length > 1 && terminalPreference.test(lastPart)
          && /^\s*(?:and|or)\b/i.test(lastPart)
          && /\b(?:such as|for example|including|in|as|with)\b/i.test(listParts[0])
          && (listParts.length > 2 || /\b(?:such as|for example|including)\b/i.test(listParts[0]))
          && listParts.slice(1).every(part => !/\b(?:is|are|must|requires?|required|preferred|but|however|although|whereas)\b/i.test(part.replace(terminalPreference, '')));
        const narrative = /\b(?:(?:our|the|a)\s+(?:company|business|team|founders?|customers?|employees?)\b[^.!?;]{0,80}\b(?:has|have|brings?|combined|over|with)|we(?:['’]ve| have)?\s+(?:spent|served|operated|built|been)|founded|established|average tenure|vesting|sabbatical|anniversary|warranty)\b/i.test(prefix)
          || /^\s*(?:with|for)\b/i.test(prefix) && /\b(?:combined|collective)\s+experience\b/i.test(tail) && /\b(?:our|the)\s+(?:team|company|business)\b/i.test(statement.slice(end));
        if (narrative) return;
        const preferredCue = /\b(?:preferred|desired|nice[ -]to[ -]have|bonus|ideally|preferably)\b/i.test(prefix)
          || /\b(?:preferred|desired|desirable|a plus|nice[ -]to[ -]have|would be (?:helpful|ideal))\b/i.test(tail) || listPreference;
        const explicitlyRequired = /\b(?:must|we require|you (?:need|have) to)\b/i.test(prefix) || /\b(?:is |are )?required\b/i.test(tail) && !/\bnot\s+required\b/i.test(tail);
        const notRequired = /\b(?:not\s+(?:strictly\s+)?(?:required|necessary)|not a (?:requirement|prerequisite)|(?:is|are) optional)\b/i.test(tail);
        if (notRequired && !preferredCue) return;
        const isPreferred = !explicitlyRequired && (preferredCue || section === 'preferred');
        snippets.add(statement.trim().slice(0, 800));
        if (alternativeStart !== null && index >= alternativeStart) return;
        if (isPreferred) { if (constraint.min !== null) preferred.push(constraint.min); }
        else required.push(constraint);
      };
      for (let index = 0; index < matches.length; index++) {
        const match = matches[index], start = match.index!, end = start + match[0].length;
        // A graduate OR experienced-candidate path does not require the latter
        // branch's years from every applicant. Preserve that original evidence.
        const beforeQuantity = statement.slice(0, start);
        if (/\b(?:new|recent)\s+(?:(?:college|university)\s+)?grad(?:uate)?s?\s+or\s+(?:(?:an?\s+)?(?:candidates?|applicants?|individuals?|professionals?)\s+)?(?:(?:with|having)\s+)?$/i.test(beforeQuantity)) { snippets.add(statement.trim().slice(0, 800)); continue; }
        const following = statement.slice(end, matches[index + 1]?.index ?? statement.length).replace(/^\s*\.\s*/, /^yrs?/i.test(match[4]) ? ' ' : '.');
        const prefix = statement.slice(Math.max(statement.lastIndexOf(',', start), statement.lastIndexOf(';', start)) + 1, start);
        // Domain modifiers may be long ("years of product management experience")
        // and genuine requirements often use an activity instead of "experience".
        const experienceLanguage = /^\s*(?:['’]\s*)?(?:of\s+)?[^.!?;]{0,160}\b(?:experience|professional work)\b/i.test(following)
          || /^\s*(?:['’]\s*)?(?:of\s+)?(?:in|as|working|work\b|building|developing|designing|leading|managing|analyzing|supporting|delivering|performing|applying|using|focused|at the intersection|with)\b/i.test(following)
          || /\byoe\b/i.test(match[4])
          || /\bexperience(?:\s+required)?\s*[:(]?\s*$/i.test(prefix);
        if (!experienceLanguage || /\d+\s*\/\s*$/.test(prefix)) continue;
        const between = prefix.match(new RegExp(String.raw`\bbetween\s+(${number})\s+and\s*$`, 'i'));
        const unitScale = /^(?:months?|mos?)/i.test(match[4]) ? 1 / 12 : 1;
        const low = Number((parseNumber(between?.[1] ?? match[1]) * unitScale).toFixed(4));
        const highRaw = between ? parseNumber(match[1]) : match[2] ? parseNumber(match[2]) : null;
        const high = highRaw === null ? null : Number((highRaw * unitScale).toFixed(4));
        if (!Number.isFinite(low) || high !== null && (!Number.isFinite(high) || high < low)) continue;
        const upperOnly = /^\s+(?:or\s+(?:less|fewer)|max(?:imum)?)\b/i.test(following) || /\b(?:less than|fewer than|under|at most|up to|no more than|maximum(?: of)?)\s*$/i.test(prefix) || /or\s+(?:less|fewer)/i.test(match[3] || '');
        add(start, end, upperOnly ? { min: null, max: high ?? low } : { min: low, max: match[3] ? null : high });
      }
      // Only explicit absence of a general experience requirement establishes 0.
      // A title such as "new graduate" never manufactures a numeric requirement.
      const zero = /\b(?:no\s+(?:(?:prior|previous|professional|relevant|work)\s+){0,3}experience\s+(?:(?:is|will be)\s+)?(?:required|necessary|needed)|(?:(?:prior|previous|professional|relevant|work)\s+){0,3}experience\s+(?:is\s+)?not\s+(?:required|necessary|needed))\b/gi;
      for (const match of statement.matchAll(zero)) {
        if (matches.some(item => item.index! < match.index! && item.index! + item[0].length >= match.index! - 40)) continue;
        const end = match.index! + match[0].length;
        const following = statement.slice(end);
        // Product/tool familiarity is not the absence of a work-experience floor.
        if (/^\s+(?:in|with|on|using|of|for|about)\b/i.test(following) && !/^\s+for\s+(?:(?:this|the|our)\s+)?(?:role|position|program(?:me)?)\b/i.test(following)) continue;
        add(match.index!, end, { min: 0, max: null });
      }
    }
  }
  const floors = required.flatMap(item => item.min === null ? [] : [item.min]);
  const minYears = floors.length ? Math.max(...floors) : null;
  const ceilings = required.flatMap(item => item.max !== null && (minYears === null || item.max >= minYears) ? [item.max] : []);
  return { minYears, maxYears: ceilings.length ? Math.max(...ceilings) : null,
    preferredYears: preferred.length ? Math.max(...preferred) : null,
    alternatives: [...alternatives].slice(0, 8), evidence: snippets.size ? [...snippets].join('; ').slice(0, 4000) : null };
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
  const leadership = isLeadershipTitle(title);
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
  // Explicit qualitative requirements cannot become verified graduate fits just
  // because the source omitted a number. Preserve the wording for review.
  let qualitativeSection: 'required' | 'preferred' | 'unknown' = 'unknown';
  let advancedEvidence: string | null = null;
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim(), heading = line.replace(/^[-•*#\s]+/, '');
    if (/^(?:preferred(?:\s+(?:qualifications?|requirements?|skills?|experience))?|nice[ -]to[ -]haves?|bonus|desired|even better if|extra credit)\b/i.test(heading)) qualitativeSection = 'preferred';
    else if (/^(?:(?:minimum|basic|required)\s+(?:qualifications?|requirements?|skills?|experience)|requirements?|qualifications?|what you bring|what you have|what we['’]re looking for|who you are|about you|your background)\b/i.test(heading)) qualitativeSection = 'required';
    else if (/^(?:benefits|about us|about the company|our company|what we offer|compensation|salary|responsibilities|what you['’]ll do|what you will do|life at|equal opportunity)\b/i.test(heading)) qualitativeSection = 'unknown';
    for (const statement of line.split(/(?<=[.!?])\s+/)) {
      const qualitative = /\b(?:(?:several|many|multiple)\s+years?(?:['’])?\s+(?:of\s+)?(?:[A-Za-z][A-Za-z'-]*\s+){0,6}experience|(?:extensive|significant|substantial)\s+(?:[A-Za-z][A-Za-z'-]*\s+){0,6}experience)\b/gi;
      for (const match of statement.matchAll(qualitative)) {
        const start = match.index!, end = start + match[0].length;
        const prefix = statement.slice(0, start), after = statement.slice(end);
        const comma = after.indexOf(',');
        const clause = statement.slice(statement.lastIndexOf(',', start) + 1, comma < 0 ? statement.length : end + comma);
        const optional = /\b(?:preferred|preferably|desired|desirable|nice[ -]to[ -]have|bonus|ideally|optional|not (?:required|necessary)|would be (?:helpful|ideal|nice))\b/i.test(clause);
        const required = /\b(?:must|we require|you (?:need|have|bring|possess)|required|necessary|a requirement|a prerequisite)\b/i.test(statement);
        const narrative = /\b(?:(?:our|the|a)\s+(?:company|business|team|founders?|customers?|employees?)\b[^.!?;]{0,80}\b(?:has|have|brings?|combined|over|with)|we(?:['’]ve| have)?\s+(?:spent|served|operated|built|been)|founded|established|combined|collective)\b/i.test(prefix)
          || /^\s*(?:with|for)\b/i.test(prefix) && /\b(?:our|the)\s+(?:team|company|business)\b/i.test(after);
        if (optional || narrative || qualitativeSection === 'preferred' && !required || qualitativeSection !== 'required' && !required) continue;
        advancedEvidence = statement.trim().slice(0, 800); break;
      }
      if (advancedEvidence) break;
    }
    if (advancedEvidence) break;
  }
  if (advancedEvidence) reasons.push({ code: 'experience.advanced_unspecified', text: advancedEvidence });
  const notGraduate = text.match(/[^.\n]*\b(?:not|isn't|isn’t)\s+(?:an?\s+)?(?:new[ -]grad(?:uate)?|entry[ -]level)\s+(?:role|position|program)[^.\n]*/i)
    || text.match(/[^.\n]*\b(?:this|the|our)\s+(?:role|position|program(?:me)?)\b[^.\n]{0,100}\b(?:not|isn't|isn’t)\s+(?:open to|intended for|suitable for|for)\s+(?:(?:new|recent)\s+)?(?:(?:college|university)\s+)?grad(?:uate)?s?\b[^.\n]*/i)
    || text.match(/[^.\n]*\b(?:new|recent)\s+(?:(?:college|university)\s+)?grad(?:uate)?s?\s+(?:(?:are|will be)\s+)?not\s+(?:eligible|accepted|considered|qualified)\b[^.\n]*/i);
  if (notGraduate) reasons.push({ code: 'experience.not_new_grad', text: notGraduate[0].trim() });
  const noExperience = text.match(/\b(?:no|zero)\s+(?:(?:prior|previous|professional|work|industry|relevant|full[ -]time)\s+){0,4}experience\s+(?:(?:is|will be)\s+)?(?:required|necessary|needed)\b/i);
  if (noExperience && experience.minYears === 0) reasons.push({ code: 'experience.no_experience_required', text: noExperience[0] });
  const graduateWelcome = text.match(/[^.\n]*\b(?:new|recent)\s+(?:(?:college|university)\s+)?grad(?:uate)?s?\s+(?:are\s+)?(?:welcome|encouraged|eligible|invited)\b[^.\n]*/i);
  const graduateTarget = text.match(/\b(?:this|the|our)\s+(?:role|position|program(?:me)?)\b[^.\n]{0,100}\b(?:new|recent)\s+(?:(?:college|university)\s+)?grad(?:uate)?s?\b/i);
  const graduateIdeal = text.match(/[^.\n]*\b(?:ideal|suitable|intended|designed)\s+for\s+(?:a\s+)?(?:new|recent)\s+(?:(?:college|university)\s+)?grad(?:uate)?s?\b[^.\n]*/i);
  const graduateHiring = text.match(/[^.\n]*\b(?:we(?:['’]re| are)?|(?:our|the)\s+(?:company|team)(?:\s+is)?)\s+(?:actively\s+)?(?:hiring|accepting|recruiting)\s+(?:applications?\s+from\s+)?(?:(?:new|recent)\s+)?(?:(?:college|university)\s+)?grad(?:uate)?s?\b[^.\n]*/i);
  if (!notGraduate && (explicitGraduateTitle(title) || graduateWelcome || graduateTarget || graduateIdeal || graduateHiring)) reasons.push({ code: 'experience.entry_level_explicit', text: explicitGraduateTitle(title) ? title : (graduateWelcome?.[0] || graduateTarget?.[0] || graduateIdeal?.[0] || graduateHiring![0]).trim() });
  const scope = !roleFamilies.length || internationalOnly || explicitlyExcluded || leadership ? 'excluded' : !us || employmentType === 'unknown' ? 'needs-details' : 'included';
  return { roleFamilies, primaryRoleFamily: roleFamilies[0] || null, classification: { scope, seniority, confidence: scope === 'included' ? 'high' : roleFamilies.length ? 'medium' : 'low', reasons, version: CLASSIFIER_VERSION } };
}
