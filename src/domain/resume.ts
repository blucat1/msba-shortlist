import { canonicalSkill } from './skills';
import type { EducationLevel } from './eligibility';
import type { RoleFamily } from './types';

export const MAX_RESUME_TEXT_LENGTH = 100_000;
/** Non-null experience/education values represent explicit user confirmation,
 * never a total derived from employment dates or a degree still in progress. */
export interface ResumeProfile {
  skills: string[];
  roleInterests: RoleFamily[];
  yearsExperience: number | null;
  educationLevel: EducationLevel | null;
  degreeField: string | null;
}
export interface ResumeCheck {
  id: string; label: string; status: 'pass' | 'review' | 'missing'; detail: string; evidence: string[];
}
export interface ResumeAnalysis {
  profile: ResumeProfile;
  skillEvidence: { skill: string; evidence: string[] }[];
  roleEvidence: { roleFamily: RoleFamily; evidence: string[] }[];
  educationEvidence: { level: EducationLevel | null; evidence: string; status: 'completed' | 'in-progress' | 'unclear' }[];
  checks: ResumeCheck[];
  wordCount: number;
  characterCount: number;
}

// Explicit terms only, aligned with the catalog's canonicalSkill aliases. A
// mention is reviewable evidence, not a proficiency or employment assertion.
const SKILLS: readonly [string, RegExp][] = [
  ['sql', /\b(?:SQL|Postgres(?:ql)?|MySQL)\b/i], ['python', /\bPython\b/i],
  ['r', /(?<![\p{L}\p{N}])R(?![\p{L}\p{N}&])/u], ['excel', /\bExcel\b/i],
  ['google sheets', /\bGoogle Sheets\b/i], ['tableau', /\bTableau\b/i], ['power bi', /\bPower\s?BI\b/i],
  ['dbt', /\bdbt\b/i], ['snowflake', /\bSnowflake\b/i], ['spark', /\b(?:Spark|PySpark)\b/i],
  ['airflow', /\bAirflow\b/i], ['aws', /\b(?:AWS|Amazon Web Services)\b/i],
  ['statistics', /\b(?:statistics|statistical analysis)\b/i], ['experimentation', /\b(?:A\/B test(?:ing|s)?|experimentation)\b/i],
  ['machine learning', /\bmachine learning\b/i], ['pytorch', /\bPyTorch\b/i], ['tensorflow', /\bTensorFlow\b/i],
  ['pandas', /\bpandas\b/i], ['numpy', /\bNumPy\b/i], ['scikit-learn', /\bscikit[ -]learn\b/i],
  ['sas', /\bSAS\b/], ['stata', /\bStata\b/i], ['matlab', /\bMATLAB\b/i],
  ['looker', /\bLooker\b/i], ['bigquery', /\bBigQuery\b/i], ['redshift', /\bRedshift\b/i],
  ['azure', /\bAzure\b/i], ['gcp', /\b(?:GCP|Google Cloud(?: Platform)?)\b/i],
  ['git', /\bGit\b/i], ['docker', /\bDocker\b/i], ['javascript', /\bJavaScript\b/i], ['typescript', /\bTypeScript\b/i],
  ['java', /\bJava\b/i], ['etl', /\bETL\b/i], ['jira', /\bJira\b/i], ['figma', /\bFigma\b/i],
  ['salesforce', /\bSalesforce\b/i], ['financial modeling', /\bfinancial model(?:ing|ling)\b/i],
];
export const SUPPORTED_RESUME_SKILLS = SKILLS.map(([skill]) => skill);
const ROLES: readonly [RoleFamily, RegExp][] = [
  ['business-analytics', /\b(?:data analyst|business analy(?:st|tics)|decision analyst)\b/i],
  ['data-science', /\b(?:data scien(?:ce|tist)|statistician|statistical analyst)\b/i],
  ['product-analytics', /\b(?:product|growth|experimentation) analy(?:st|tics)\b/i],
  ['product-management', /\b(?:product manage(?:ment|r)|associate product manager|APM)\b/i],
  ['strategy-operations', /\b(?:strategy (?:and|&) operations|business strategy|strategy analyst|business operations|analytics consultant)\b/i],
  ['business-intelligence', /\b(?:business intelligence|BI analyst|reporting analyst)\b/i],
  ['marketing-analytics', /\b(?:marketing|customer|commercial) analy(?:st|tics)\b/i],
  ['operations-analytics', /\b(?:operations|supply[ -]chain|logistics) analy(?:st|tics)\b/i],
  ['financial-analytics', /\b(?:financial|finance|credit|risk|pricing|revenue) analy(?:st|tics)\b/i],
  ['analytics-engineering', /\banalytics engineer(?:ing)?\b/i],
  ['data-engineering', /\bdata engineer(?:ing)?\b/i],
  ['machine-learning', /\b(?:machine learning|ML) (?:engineer|scientist)\b/i],
];
const LEVELS: readonly [EducationLevel, RegExp][] = [
  ['bachelors', /\b(?:bachelor(?:['’]s)?|B\.\s?[SA]\.?|B[SA](?=\s+(?:in\b|computer\b|data\b|business\b|finance\b|economics\b|mathematics\b|statistics\b|engineering\b)))\b/i],
  ['masters', /\b(?:master(?:['’]s)?|M\.\s?[SA]\.?|M[SA](?=\s+(?:in\b|computer\b|data\b|business\b|finance\b|economics\b|mathematics\b|statistics\b|engineering\b))|MBA|MSBA)\b/i],
  ['doctorate', /\b(?:Ph\.?D\.?|doctorate|doctoral)\b/i],
];
const excerpt = (line: string, index = 0) => line.slice(Math.max(0, index - 80), Math.max(0, index - 80) + 240).trim();
const heading = (line: string) => line.trim().replace(/^[-•*#\s]+/, '').replace(/[:\s]+$/, '');
function asserted(line: string, pattern: RegExp): boolean {
  const match = pattern.exec(line);
  if (!match) return false;
  const before = line.slice(0, match.index).split(/[.;!?]|\b(?:but|however)\b/i).at(-1) || '';
  const after = line.slice(match.index + match[0].length);
  return !/\b(?:no|without|lack(?:ing)?|unfamiliar with|not(?! (?:only|just)\b)|never used|plan(?:ning)? to learn|want to learn|will learn|intend to learn|interested in learning)\b[^;.!?]{0,70}$/i.test(before)
    && !/^\s*(?:[:(–—-]\s*)?(?:is |was )?(?:not (?:a skill|known|used|completed)|unfamiliar|none|planned|no experience)\b/i.test(after)
    && !/^[^;.!?]{0,100}\b(?:are|is)\s+not\s+skills?\b/i.test(after);
}

/** Plain text only. No network, document execution, proprietary ATS simulation,
 * contact-value storage, date-based experience sums or automatic qualification. */
export function analyzeResume(text: string): ResumeAnalysis {
  if (text.length > MAX_RESUME_TEXT_LENGTH) throw new Error(`Resume text exceeds ${MAX_RESUME_TEXT_LENGTH.toLocaleString('en-US')} characters.`);
  const normalized = text.normalize('NFKC').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  const evidenceFor = (pattern: RegExp) => [...new Set(lines.filter(line => asserted(line, pattern)).map(line => excerpt(line, pattern.exec(line)?.index ?? 0)))].slice(0, 3);
  const skillEvidence = SKILLS.map(([skill, pattern]) => ({ skill: canonicalSkill(skill), evidence: evidenceFor(pattern) })).filter(item => item.evidence.length);
  const roleEvidence = ROLES.map(([roleFamily, pattern]) => ({ roleFamily, evidence: evidenceFor(pattern) })).filter(item => item.evidence.length);
  let inEducation = false;
  const educationEvidence: ResumeAnalysis['educationEvidence'] = [];
  for (const line of lines) {
    if (/^(?:education|academic background|academic qualifications)$/i.test(heading(line))) { inEducation = true; continue; }
    if (/^(?:(?:professional |work |relevant )?experience|projects|skills|technical skills|certifications|summary)$/i.test(heading(line))) inEducation = false;
    if (!inEducation && !/\b(?:degree|bachelor|master|doctorate|doctoral|MSBA|MBA|Ph\.?D)\b/i.test(line)) continue;
    for (const [level, pattern] of LEVELS) if (asserted(line, pattern)) {
      const incomplete = /\b(?:(?:not|never)\s+(?:yet\s+)?(?:completed|earned|awarded|graduated)|incomplete|uncompleted)\b/i.test(line);
      const status = incomplete ? 'unclear' : /\b(?:expected|anticipated|candidate|pursuing|in progress|currently enrolled|student)\b/i.test(line) ? 'in-progress' : /\b(?:earned|awarded|completed|graduated)\b/i.test(line) ? 'completed' : 'unclear';
      const evidence = excerpt(line, pattern.exec(line)?.index ?? 0);
      if (!educationEvidence.some(item => item.level === level && item.evidence === evidence && item.status === status)) educationEvidence.push({ level, evidence, status });
      if (educationEvidence.length >= 12) break;
    }
    if (educationEvidence.length >= 12) break;
  }
  const wordCount = normalized.match(/\S+/g)?.length || 0;
  const section = (pattern: RegExp) => lines.filter(line => pattern.test(heading(line))).slice(0, 3).map(line => excerpt(line));
  const checks: ResumeCheck[] = [];
  const addSection = (id: string, label: string, pattern: RegExp) => {
    const evidence = section(pattern); checks.push({ id, label, status: evidence.length ? 'pass' : 'missing', detail: evidence.length ? 'A recognizable heading is present in the extracted text.' : 'A heading was not detected. Confirm the section survives text extraction; equivalent headings may be valid.', evidence });
  };
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(normalized);
  const phone = /(?:\+?1[ .-]?)?(?:\(\d{3}\)|\b\d{3})[ .-]\d{3}[ .-]\d{4}\b/.test(normalized);
  checks.push({ id: 'contact', label: 'Contact text', status: email ? 'pass' : 'missing', detail: email ? `An email pattern was detected${phone ? ', along with a phone pattern' : ''}. Check its accuracy in the source document.` : 'An email pattern was not detected. Confirm a recruiter can contact you.', evidence: [] });
  addSection('education', 'Education section', /^(?:education|academic background|academic qualifications)$/i);
  addSection('experience', 'Experience section', /^(?:(?:professional|work|relevant|research|internship) )?experience$/i);
  addSection('skills', 'Skills section', /^(?:(?:technical|core) )?(?:skills|competencies)$/i);
  addSection('projects', 'Projects section', /^(?:(?:academic|selected|relevant|technical) )?projects$/i);
  const bullets = lines.filter(line => /^[-•*–]\s+/.test(line));
  const measurable = bullets.filter(line => /\d[\d,.]*\s*(?:%|\b(?:hours?|minutes?|users?|records?|rows?|transactions?|customers?|models?|reports?|days?|weeks?)\b)|[$€£]\s*\d/i.test(line) && /\b(?:built|created|analy[sz]ed|improved|reduced|increased|developed|delivered|automated|led)\b/i.test(line));
  checks.push({ id: 'evidence', label: 'Specific achievement evidence', status: measurable.length ? 'pass' : 'review', detail: 'Where accurate, describe your action and measurable result. A text pattern does not verify the result or establish employment experience.', evidence: measurable.slice(0, 2).map(line => excerpt(line)) });
  const damaged = /\uFFFD|[\uE000-\uF8FF]/.test(normalized);
  const possibleColumns = text.split('\n').filter(line => /\t| {4,}/.test(line)).length >= 3;
  checks.push({ id: 'readability', label: 'Extracted text readability', status: damaged || possibleColumns || wordCount < 80 ? 'review' : 'pass', detail: damaged ? 'Replacement or private-use glyphs were detected. Repair garbled text before matching.' : possibleColumns ? 'Tabs or wide spacing may indicate columns. Read the extracted text in order; plain text cannot verify the original layout.' : wordCount < 80 ? 'Very little text was extracted. Check for missing or image-only content.' : 'Text is available for review. This does not verify the original document layout or an employer parser.', evidence: [] });
  return { profile: { skills: skillEvidence.map(item => item.skill), roleInterests: roleEvidence.map(item => item.roleFamily), yearsExperience: null, educationLevel: null, degreeField: null }, skillEvidence, roleEvidence, educationEvidence, checks, wordCount, characterCount: text.length };
}
