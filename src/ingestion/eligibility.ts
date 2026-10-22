import type { JobTiming } from '../domain/types';
import type { DegreeRequirement, EducationLevel, JobEligibility, RequirementStrength } from '../domain/eligibility';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE = `(?:\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,\\s*|\\s+)\\d{4}\\b|\\b${MONTH}\\.?\\s+\\d{4}\\b)`;
const DEGREE = /\b(?:bachelor(?:['’]s)?|master(?:['’]s)?|ph\.?d\.?|doctorate|doctoral|b\.?s\.?|m\.?s\.?)\b/gi;
const FIELDS = ['business analytics', 'computer science', 'data science', 'information systems', 'information technology', 'operations research', 'business administration', 'software engineering', 'electrical engineering', 'industrial engineering', 'statistics', 'mathematics', 'engineering', 'finance', 'accounting', 'economics', 'marketing', 'management', 'business'];
const fieldPattern = new RegExp(`\\b(?:${FIELDS.join('|')})\\b`, 'gi');
interface ParsedDate { low: string; high: string; day: boolean; }
function isoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}
function parseDate(text: string): ParsedDate | null {
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) { const value = isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3])); return value ? { low: value, high: value, day: true } : null; }
  const written = text.match(new RegExp(`^(${MONTH})\\.?\\s+(?:(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*|\\s+))?(\\d{4})$`, 'i'));
  if (!written) return null;
  const month = MONTHS.findIndex(value => value.startsWith(written[1].toLowerCase().slice(0, 3))) + 1;
  const year = Number(written[3]);
  if (written[2]) { const value = isoDate(year, month, Number(written[2])); return value ? { low: value, high: value, day: true } : null; }
  const low = isoDate(year, month, 1), high = isoDate(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
  return low && high ? { low, high, day: false } : null;
}
function shiftDay(value: string, days: number): string { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function strength(line: string, context: RequirementStrength | null): RequirementStrength | null {
  if (/\b(?:preferred|ideally|ideal|nice to have|desirable|bonus|a plus|would be helpful)\b/i.test(line)) return 'preferred';
  if (/\b(?:required|must|mandatory)\b/i.test(line)) return 'required';
  if (context === 'preferred') return 'preferred';
  if (/\b(?:requirement|minimum|at least|need to|needs to)\b/i.test(line)) return 'required';
  return context;
}
function addTiming(timing: JobTiming, kind: 'graduation' | 'start', low: string | null, high: string | null): void {
  const lowKey = kind === 'graduation' ? 'graduationStart' : 'earliestStart';
  const highKey = kind === 'graduation' ? 'graduationEnd' : 'latestStart';
  if (low) timing[lowKey] = !timing[lowKey] || low > timing[lowKey]! ? low : timing[lowKey];
  if (high) timing[highKey] = !timing[highKey] || high < timing[highKey]! ? high : timing[highKey];
}
function dateWindow(line: string): { low: string | null; high: string | null; ambiguous: boolean } | null {
  const tokens = [...line.matchAll(new RegExp(DATE, 'gi'))];
  const values = tokens.map(token => parseDate(token[0]));
  if (!tokens.length || values.some(value => value === null)) return null;
  if (tokens.length > 2 || /\b(?:or|either)\b/i.test(line.slice(tokens[0].index!, tokens.at(-1)!.index))) return { low: null, high: null, ambiguous: true };
  if (tokens.length === 2) {
    const between = line.slice(tokens[0].index! + tokens[0][0].length, tokens[1].index).trim();
    if (!/^(?:and|to|through|until|[-–—])$/i.test(between)) return { low: null, high: null, ambiguous: true };
    return { low: values[0]!.low, high: values[1]!.high, ambiguous: false };
  }
  const value = values[0]!, before = line.slice(0, tokens[0].index).toLowerCase();
  const remainder = line.slice(0, tokens[0].index) + line.slice(tokens[0].index! + tokens[0][0].length);
  if (/\b(?:spring|summer|fall|autumn|winter)\s+(?:of\s+)?20\d{2}\b/i.test(remainder)) return { low: null, high: null, ambiguous: true };
  if (new RegExp(`${MONTH}\\.?\\s*(?:[-–—/]|to|through|and|or)\\s*$`, 'i').test(before)) return { low: null, high: null, ambiguous: true };
  if (/\b(?:on or after|not before|no earlier than|from)\s*$/.test(before)) return { low: value.low, high: null, ambiguous: false };
  if (/\bafter\s*$/.test(before)) return { low: shiftDay(value.high, 1), high: null, ambiguous: false };
  if (/\b(?:on or before|no later than|by|through)\s*$/.test(before)) return { low: null, high: value.high, ambiguous: false };
  if (/\bbefore\s*$/.test(before)) return { low: null, high: shiftDay(value.low, -1), ambiguous: false };
  return { low: value.low, high: value.high, ambiguous: false };
}

/** Bounded plain text only. Dates without a stated year and conditional promises stay unknown. */
export function extractEligibility(title: string, description: string): { eligibility: JobEligibility; timing: JobTiming } {
  const eligibility: JobEligibility = { degrees: [], gpa: [], workAuthorization: [], sponsorship: [] };
  const timing: JobTiming = { graduationStart: null, graduationEnd: null, earliestStart: null, latestStart: null, deadline: null, deadlineVerified: false, evidence: [] };
  const ambiguous = new Set<'graduation' | 'start'>();
  let context: RequirementStrength | null = null;
  const text = `${title}\n${description}`.slice(0, 120_000).replace(/\r/g, '').replace(/\b(?:and|while)\s+(?=(?:a\s+)?master['’]?s?\s+degree\b)/gi, '\n');
  const lines = text.split(/\n|;|(?<=[.!?])\s+(?=[A-Z])/).map(line => line.trim()).filter(Boolean);
  for (const raw of lines) {
    const line = raw.slice(0, 2000), evidence = line.slice(0, 1000);
    const heading = line.replace(/[:\s]+$/, '');
    if (/^(?:(?:preferred|desired) (?:qualifications|requirements|skills)|nice to have|bonus|what would be nice)$/i.test(heading)) { context = 'preferred'; continue; }
    if (/^(?:(?:(?:minimum|basic|required) )?(?:qualifications|requirements|skills)|what you (?:bring(?: to the table)?|need)|what we(?:['’]re| are) looking for|you (?:have|bring)|must have)$/i.test(heading)) { context = 'required'; continue; }
    if (/^(?:benefits|about (?:us|the (?:company|team))|what we offer|our (?:team|company)|responsibilities|what you.ll do)$/i.test(heading)) { context = null; continue; }
    if (/^(?:(?:minimum|basic|required) )?(?:qualifications|requirements|skills):\s*\S/i.test(line)) context = 'required';
    const kind = strength(line, context);
    const negated = /\b(?:no|not)\b[^.;\n]{0,45}\b(?:degree|gpa|graduation)\b[^.;\n]{0,25}\brequired\b|\b(?:degree|gpa|graduation|start date)\b[^.;\n]{0,55}\b(?:not required|optional)\b/i.test(line);
    const levels: EducationLevel[] = [...line.matchAll(DEGREE)].map(match => /^b/i.test(match[0]) ? 'bachelors' : /^m/i.test(match[0]) ? 'masters' : 'doctorate');
    if (levels.length && kind && !negated) {
      const fieldClause = line.match(/\b(?:degree|bachelor['’]?s?|master['’]?s?|doctorate|ph\.?d\.?)\s+(?:or higher\s+)?in\s+([^.;\n]+)/i)?.[1]?.split(/\b(?:experience|skills|proficiency)\b|\b(?:or|and\/or)\s+(?:an?\s+)?equivalent\b/i)[0] || '';
      const fields = [...new Set([...fieldClause.matchAll(fieldPattern)].map(match => match[0].toLowerCase()))];
      for (const candidate of fieldClause.split(/,|\s+(?:or|and)\s+|\s*\/\s*/i)) {
        const literal = candidate.replace(/^(?:a|an|another)\s+/i, '').split(/\b(?:required|preferred|with|is|are)\b/i)[0].trim().toLowerCase();
        if (/^[a-z][a-z &-]{1,79}$/.test(literal) && !/\b(?:related|similar|equivalent|quantitative|technical|relevant)\s+(?:field|discipline|degree)\b/i.test(literal) && !fields.includes(literal)) fields.push(literal);
      }
      const requirement: DegreeRequirement = { levels: [...new Set(levels)], fields, allowsRelatedFields: /\b(?:related|similar|equivalent|quantitative|technical|relevant)\s+(?:field|discipline|degree)/i.test(line), allowsEquivalentExperience: /\b(?:or|and\/or)\s+(?:an?\s+)?equivalent\s+(?:professional\s+|work\s+)?experience\b/i.test(line), evidence, strength: kind };
      if (/\b(?:or higher|or above|at least a?\s*bachelor)/i.test(line) && requirement.levels.includes('bachelors')) requirement.levels = ['bachelors', 'masters', 'doctorate'];
      if (/\b(?:or higher|or above)\b/i.test(line) && requirement.levels.includes('masters') && !requirement.levels.includes('doctorate')) requirement.levels.push('doctorate');
      eligibility.degrees.push(requirement);
    }
    if (!negated && kind && !/\b(?:average|our team|employees|students averaged)\b/i.test(line)) {
      const gpa = line.match(/\b(?:cumulative\s+)?gpa\s*(?:(?:of|is|must be|at least|minimum)\s*|:\s*)*(\d(?:\.\d+)?)\s*(?:\/\s*(\d(?:\.\d+)?)|(?:on|out of)\s+(?:a\s+)?(\d(?:\.\d+)?))?/i)
        || line.match(/\b(\d(?:\.\d+)?)\s*(?:\/\s*(\d(?:\.\d+)?))?\s+(?:cumulative\s+)?gpa\b/i);
      if (gpa) {
        const minimum = Number(gpa[1]), scale = gpa[2] || gpa[3] ? Number(gpa[2] || gpa[3]) : null;
        if (minimum >= 0 && minimum <= 20 && (scale === null || scale > 0 && minimum <= scale)) eligibility.gpa.push({ value: { minimum, scale }, evidence, strength: kind });
      }
    }
    const us = /\b(?:U\.?S\.?|United States)\b/i.test(line);
    const authorizationNegated = /\b(?:not required|do not need|don.t need|regardless of)\b|\bno\b[^.;\n]{0,30}\b(?:citizenship|authorization|authorisation)\b[^.;\n]{0,15}\brequirement\b|\b(?:do|does) not require\b/i.test(line);
    if (kind && us && /\b(?:citizen|citizenship)\b/i.test(line) && !authorizationNegated) {
      const value = /\b(?:permanent residents?|green card)\b/i.test(line) ? 'us-citizen-or-permanent-resident' : 'us-citizen';
      eligibility.workAuthorization.push({ value, evidence, strength: kind });
    } else if (kind && us && /\b(?:authorized|authorised|authorization|authorisation)\b/i.test(line) && /\bwork\b/i.test(line) && !authorizationNegated) {
      eligibility.workAuthorization.push({ value: 'us-authorization', evidence, strength: kind });
    }
    if (/\b(?:sponsorship|sponsor(?:ing)?\s+(?:work |employment )?visas?)\b/i.test(line) && !/\b(?:may|might|case.by.case|depending|cannot guarantee|not guaranteed|not unable|experience|platform|fundraising|conference)\b/i.test(line)) {
      if (/\b(?:cannot|can.t|unable to|do not|does not|will not|won.t)\s+(?:provide|offer|support|sponsor)\b[^.;\n]{0,40}(?:sponsorship|visas?)?|\bno\s+(?:(?:visa|employment|work)\s+)?sponsorship\b|\bsponsorship\b[^.;\n]{0,35}\b(?:not available|unavailable|not provided|not offered|cannot be provided)\b/i.test(line)) {
        eligibility.sponsorship.push({ value: 'unavailable', evidence, strength: kind === 'preferred' ? 'preferred' : 'required' });
      } else if (/\b(?:we|company|employer)\s+(?:will\s+|can\s+|does\s+)?(?:offer|provide|support|sponsor)\b|\b(?:visa\s+)?sponsorship\s+(?:is\s+)?available\b/i.test(line) && !/\b(?:without|not)\b/i.test(line)) {
        eligibility.sponsorship.push({ value: 'available', evidence, strength: kind === 'preferred' ? 'preferred' : 'required' });
      }
    }
    const datedGraduateTitle = raw === title.trim() && /\bgrads\b/i.test(line) && [...line.matchAll(new RegExp(DATE, 'gi'))].length === 2;
    const graduation = /\bgraduat(?:ion|ing|e|ed|es)\b/i.test(line) || datedGraduateTitle;
    const starts = /\b(?:start(?:ing)?\s+(?:date|work|in|on|by|between|from)|(?:program|role|position)\s+(?:starts|begins)|available to (?:start|begin))\b/i.test(line);
    const deadline = /\b(?:application\s+deadline|applications?\s+(?:close|due)|apply\s+(?:by|before)|submit\s+[^.;\n]{0,30}\bby|deadline)\b/i.test(line);
    if (graduation || starts || deadline) {
      const window = dateWindow(line);
      if (window || /\b(?:spring|summer|fall|autumn|winter|20\d{2})\b/i.test(line)) timing.evidence.push(`${kind === 'preferred' ? 'Preferred; not a required constraint: ' : ''}${evidence}`);
      if (kind === 'preferred' || negated || /\b(?:might|flexible|approximately|around|anticipated|tentative)\b|\bmay\s+(?:be|start|begin|graduate|vary|change)\b/i.test(line)) continue;
      if (!window) continue;
      if (deadline && !graduation && !starts) {
        const tokens = [...line.matchAll(new RegExp(DATE, 'gi'))];
        const date = tokens.length === 1 ? parseDate(tokens[0][0]) : null;
        if (date?.day && !window.ambiguous) { timing.deadline = /\bbefore\s+$/i.test(line.slice(0, tokens[0].index)) ? shiftDay(date.low, -1) : date.low; timing.deadlineVerified = true; }
      } else if (graduation && !starts && !deadline) {
        if (window.ambiguous) ambiguous.add('graduation');
        else if (datedGraduateTitle || kind === 'required' || /\b(?:graduation\s+(?:date|between|in|by)|graduat(?:ing|ed)\s+(?:between|in|by|after|before|from)|expected graduation)\b/i.test(line)) addTiming(timing, 'graduation', window.low, window.high);
      } else if (starts && !graduation && !deadline) {
        if (window.ambiguous) ambiguous.add('start'); else addTiming(timing, 'start', window.low, window.high);
      }
    }
  }
  for (const kind of ['graduation', 'start'] as const) {
    const low = kind === 'graduation' ? timing.graduationStart : timing.earliestStart;
    const high = kind === 'graduation' ? timing.graduationEnd : timing.latestStart;
    if (ambiguous.has(kind) || low && high && low > high) {
      if (kind === 'graduation') { timing.graduationStart = null; timing.graduationEnd = null; }
      else { timing.earliestStart = null; timing.latestStart = null; }
      timing.evidence.push(`Conflicting or alternative ${kind} dates need source review; no single window inferred.`);
    }
  }
  timing.evidence = [...new Set(timing.evidence)].slice(0, 100);
  return { eligibility, timing };
}
