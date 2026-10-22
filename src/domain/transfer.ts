import { z } from 'zod';
import { isDateOnly, safeUrl } from './dates';
import { companyKey, createTask, manualOpportunity, newId } from './records';
import { DEFAULT_PREFERENCES, ROLE_FAMILIES, STAGES, type Backup, type ImportPreview, type ImportResult, type Opportunity, type Task } from './types';
import type { PrivateState } from '../repositories/types';

export const MAX_IMPORT_BYTES = 2_000_000;
const text = z.string().max(40_000);
const id = z.string().min(1).max(200);
const date = z.string().refine(isDateOnly, 'Expected a real YYYY-MM-DD date');
const timestamp = z.string().datetime({ offset: true });
const url = z.string().max(2048).refine(value => safeUrl(value) !== null, 'Only http/https links without credentials are accepted').nullable();
const role = z.enum(ROLE_FAMILIES);
const work = z.enum(['remote', 'hybrid', 'onsite', 'unknown']);
const strings = z.array(z.string().max(1000)).max(200);
const educationLevel = z.enum(['bachelors', 'masters', 'doctorate']);
const strength = z.enum(['required', 'preferred']);
const fact = <T extends z.ZodType>(value: T) => z.object({ value, evidence: z.string().min(1).max(1000), strength });
const eligibilitySchema = z.object({
  degrees: z.array(z.object({ levels: z.array(educationLevel).max(3), fields: strings, allowsRelatedFields: z.boolean(), allowsEquivalentExperience: z.boolean(), evidence: z.string().min(1).max(1000), strength })).max(30),
  gpa: z.array(fact(z.object({ minimum: z.number().nonnegative().max(100), scale: z.number().positive().max(100).nullable() }))).max(20),
  workAuthorization: z.array(fact(z.enum(['us-authorization', 'us-citizen', 'us-citizen-or-permanent-resident']))).max(20),
  sponsorship: z.array(fact(z.enum(['available', 'unavailable']))).max(20),
});
const jobSchema = z.object({
  id, sourceId: id, externalId: id, employerId: id, company: z.string().min(1).max(300), title: z.string().min(1).max(500), postingUrl: url, applicationUrl: url,
  publisher: z.object({ name: z.string().min(1).max(200), url: z.string().max(2048).refine(value => safeUrl(value) !== null, 'Only safe publisher URLs are accepted'), kind: z.literal('aggregator') }).optional(),
  employerGroupingKey: z.string().regex(/^market-company:[a-f0-9]{64}$/).optional(),
  eligibility: eligibilitySchema.optional(),
  sourceReview: z.object({ status: z.literal('employer-conflict'), reason: z.string().min(1).max(1000), evidenceUrl: z.string().max(2048).refine(value => safeUrl(value) !== null, 'Use a safe evidence URL'), checkedAt: timestamp }).optional(),
  locations: z.array(z.object({ label: z.string().max(500), country: z.string().max(100).nullable(), region: z.string().max(200).nullable(), city: z.string().max(200).nullable() })).max(100),
  countryEvidence: strings, workArrangement: work, employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'unknown']), employmentEvidence: text.nullable(),
  roleFamilies: z.array(role).max(12), primaryRoleFamily: role.nullable(), classification: z.object({ confidence: z.enum(['high', 'medium', 'low']), reasons: z.array(z.object({ code: id, text })).max(100), version: id, scope: z.enum(['included', 'needs-details', 'excluded']), seniority: z.enum(['early-career', 'mid-level', 'senior', 'leadership', 'unknown']) }),
  summary: text, description: text.optional(), requiredSkills: strings, preferredSkills: strings,
  experience: z.object({ minYears: z.number().min(0).max(100).nullable(), maxYears: z.number().min(0).max(100).nullable(), preferredYears: z.number().min(0).max(100).nullable(), alternatives: strings, evidence: text.nullable() }).refine(e => e.minYears === null || e.maxYears === null || e.minYears <= e.maxYears, 'Experience minimum must not exceed maximum'),
  salary: z.array(z.object({ min: z.number().nonnegative().nullable(), max: z.number().nonnegative().nullable(), currency: z.string().max(10), period: z.enum(['year', 'hour', 'month', 'unknown']), compensationType: z.enum(['base', 'total', 'unknown']), location: text.nullable(), sourceText: text }).refine(s => s.min === null || s.max === null || s.min <= s.max, 'Salary minimum must not exceed maximum')).max(50),
  timing: z.object({ graduationStart: date.nullable(), graduationEnd: date.nullable(), earliestStart: date.nullable(), latestStart: date.nullable(), deadline: date.nullable(), deadlineVerified: z.boolean(), evidence: strings }).refine(t => !t.graduationStart || !t.graduationEnd || t.graduationStart <= t.graduationEnd, 'Graduation window start must not exceed end').refine(t => !t.earliestStart || !t.latestStart || t.earliestStart <= t.latestStart, 'Earliest start must not exceed latest start'),
  availability: z.enum(['open', 'availability_unconfirmed', 'closed']), sourcePostedAt: timestamp.nullable(), sourceUpdatedAt: timestamp.nullable(), sourcePublishedAt: timestamp.nullable(), firstSeenAt: timestamp, lastSeenAt: timestamp, lastVerifiedAt: timestamp.nullable(), contentHash: id, isDemo: z.boolean().optional(),
});
export const preferencesSchema = z.object({
  roleFamilies: z.array(role).max(12), primaryRoleFamilies: z.array(role).max(3), locations: z.array(z.string().max(200)).max(50), workArrangements: z.array(z.enum(['remote', 'hybrid', 'onsite'])).max(3),
  desiredSalary: z.number().nonnegative().max(10_000_000).nullable(), salaryCurrency: z.string().length(3), graduationMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(), earliestStart: date.nullable(),
  graduationDate: date.nullable().optional(), educationLevel: educationLevel.nullable().optional(), degreeField: z.string().trim().max(200).nullable().optional(),
  gpa: z.number().nonnegative().max(100).nullable().optional(), gpaScale: z.number().positive().max(100).nullable().optional(),
  workAuthorization: z.enum(['authorized', 'needs-sponsorship', 'unknown']).nullable().optional(), requiresSponsorshipNowOrFuture: z.boolean().nullable().optional(),
  yearsExperience: z.number().min(0).max(100).nullable(), skills: z.array(z.string().min(1).max(100)).max(200), timezone: z.string().refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Unknown timezone'), onboardingComplete: z.boolean(),
}).refine(value => value.gpa == null || value.gpaScale == null || value.gpa <= value.gpaScale, 'GPA cannot exceed its scale');
export const opportunitySchema = z.object({
  id, userId: id, catalogJobId: id.nullable(), companyKey: id, company: z.string().trim().min(1).max(300), title: z.string().trim().min(1).max(500),
  location: z.string().max(1000), workArrangement: work, postingUrl: url, salaryText: z.string().max(2000), deadline: date.nullable(), stage: z.enum(STAGES), priority: z.enum(['High', 'Normal', 'Low']),
  applicationDate: date.nullable(), applicationDatePrecision: z.enum(['day', 'month', 'unknown']), notes: text, primaryRoleFamily: role.nullable(), snapshot: jobSchema.nullable(), createdAt: timestamp, updatedAt: timestamp,
});
export const eventSchema = z.object({ id, userId: id, opportunityId: id, type: z.enum(['created', 'stage_changed', 'application_opened', 'application_date_corrected', 'edited']), oldStage: z.enum(STAGES).nullable(), newStage: z.enum(STAGES).nullable(), occurredAt: timestamp, provenance: z.enum(['user', 'import', 'demo']), idempotencyKey: id });
export const taskSchema = z.object({ id, userId: id, opportunityId: id, title: z.string().trim().min(1).max(500), type: z.enum(['general', 'interview', 'offer', 'review', 'application']), dueDate: date.nullable(), dueAt: timestamp.nullable(), status: z.enum(['open', 'done', 'snoozed']), snoozedUntil: date.nullable(), origin: z.enum(['user', 'suggested']), createdAt: timestamp, updatedAt: timestamp, completedAt: timestamp.nullable() });
export const companyNoteSchema = z.object({ companyKey: id, userId: id, note: text, updatedAt: timestamp });
export const jobPreferenceSchema = z.object({ jobId: id, userId: id, dismissed: z.boolean(), seenAt: timestamp.nullable() });
export const backupSchema = z.object({ version: z.literal(1), sourceMode: z.enum(['demo', 'live']).optional(), exportedAt: timestamp, preferences: preferencesSchema, opportunities: z.array(opportunitySchema).max(1000), events: z.array(eventSchema).max(10_000), tasks: z.array(taskSchema).max(5000), companyNotes: z.array(companyNoteSchema).max(1000), jobPreferences: z.array(jobPreferenceSchema).max(5000) }).superRefine((backup, ctx) => {
  const ids = new Set(backup.opportunities.map(o => o.id));
  if (ids.size !== backup.opportunities.length) ctx.addIssue({ code: 'custom', message: 'Opportunity IDs must be unique' });
  for (const item of [...backup.tasks, ...backup.events]) if (!ids.has(item.opportunityId)) ctx.addIssue({ code: 'custom', message: 'A task or history record has no matching opportunity' });
  if (new Set(backup.tasks.map(t => t.id)).size !== backup.tasks.length || new Set(backup.events.map(e => e.id)).size !== backup.events.length) ctx.addIssue({ code: 'custom', message: 'Task and history IDs must be unique' });
});
export function parseBackup(input: string): Backup {
  if (new TextEncoder().encode(input).byteLength > MAX_IMPORT_BYTES) throw new Error('Backup exceeds the 2 MB import limit.');
  let value: unknown;
  try { value = JSON.parse(input); } catch { throw new Error('This file is not valid JSON.'); }
  const result = backupSchema.safeParse(value);
  if (!result.success) throw new Error(`Invalid backup: ${result.error.issues.slice(0, 3).map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return result.data;
}
export function opportunityDuplicate(a: Opportunity, b: Opportunity): boolean {
  return a.id === b.id || !!a.catalogJobId && a.catalogJobId === b.catalogJobId ||
    !a.catalogJobId && !b.catalogJobId && companyKey(a.company) === companyKey(b.company) && a.title.trim().toLowerCase() === b.title.trim().toLowerCase() && a.location.trim().toLowerCase() === b.location.trim().toLowerCase() && a.postingUrl === b.postingUrl && a.applicationDate === b.applicationDate;
}
export function previewBackup(input: string, existing: Opportunity[] = []): ImportPreview {
  const backup = parseBackup(input), seen = [...existing]; let duplicateCount = 0;
  for (const o of backup.opportunities) { if (seen.some(other => opportunityDuplicate(o, other))) duplicateCount++; else seen.push(o); }
  return { backup, opportunityCount: backup.opportunities.length, taskCount: backup.tasks.length, duplicateCount, warnings: [
    'Merge adds new opportunities and their tasks/history. Existing duplicates and their related data stay unchanged. Imported ownership and record IDs are reassigned.',
    'Preferences are replaced by the backup preferences. Existing company notes are kept when keys conflict.',
    ...(backup.sourceMode === 'demo' || backup.opportunities.some(o => o.snapshot?.isDemo) ? ['This backup includes fictional demo records. Keep demo records in demo mode.'] : []),
  ] };
}
export function mergeBackup(state: PrivateState, input: Backup, userId: string, idFactory: () => string = newId): { state: PrivateState; result: ImportResult } {
  const backup = parseBackup(JSON.stringify(input));
  const merged: PrivateState = structuredClone(state), mapping = new Map<string, string>(); let skipped = 0;
  for (const source of backup.opportunities) {
    if (merged.opportunities.some(o => opportunityDuplicate(o, source))) { skipped++; continue; }
    const id = idFactory(); mapping.set(source.id, id); merged.opportunities.push({ ...source, id, userId });
  }
  for (const source of backup.tasks) { const opportunityId = mapping.get(source.opportunityId); if (opportunityId) merged.tasks.push({ ...source, id: idFactory(), opportunityId, userId }); }
  for (const source of backup.events) { const opportunityId = mapping.get(source.opportunityId); if (opportunityId) merged.events.push({ ...source, id: idFactory(), opportunityId, userId, provenance: 'import', idempotencyKey: idFactory() }); }
  for (const source of backup.companyNotes) if (!merged.companyNotes.some(n => n.companyKey === source.companyKey)) merged.companyNotes.push({ ...source, userId });
  for (const source of backup.jobPreferences) if (!merged.jobPreferences.some(p => p.jobId === source.jobId)) merged.jobPreferences.push({ ...source, userId });
  merged.preferences = backup.preferences;
  return { state: merged, result: { imported: mapping.size, skipped } };
}
const csvCell = (value: string) => {
  // eslint-disable-next-line no-control-regex -- spreadsheet formula injection includes control prefixes
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
};
export function opportunitiesCsv(opportunities: Opportunity[]): string {
  const headers = ['company', 'title', 'location', 'stage', 'priority', 'application_date', 'deadline', 'url', 'notes', 'role_family', 'record_origin'];
  return [headers, ...opportunities.map(o => [o.company, o.title, o.location, o.stage, o.priority, o.applicationDate ?? '', o.deadline ?? '', o.postingUrl ?? '', o.notes, o.primaryRoleFamily ?? '', o.userId === 'demo-user' || o.snapshot?.isDemo ? 'demo' : 'live'])].map(row => row.map(csvCell).join(',')).join('\r\n');
}
function readCsv(input: string): string[][] {
  const rows: string[][] = [], row: string[] = []; let field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { if (quoted && input[i + 1] === '"') { field += '"'; i++; } else if (!quoted && field.length) throw new Error('Unexpected quote in CSV field.'); else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) { if (c === '\r' && input[i + 1] === '\n') i++; row.push(field); if (row.some(f => f.trim())) rows.push([...row]); row.length = 0; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(field); if (row.some(f => f.trim())) rows.push(row);
  return rows;
}
export interface CsvPreview { opportunities: Opportunity[]; tasks: Task[]; errors: { row: number; message: string }[]; warnings: string[]; containsDemoData: boolean; }
export function parseCsv(input: string, userId = 'import-preview', now = new Date()): CsvPreview {
  const result: CsvPreview = { opportunities: [], tasks: [], errors: [], warnings: [], containsDemoData: false };
  if (new TextEncoder().encode(input).byteLength > MAX_IMPORT_BYTES) { result.errors.push({ row: 0, message: 'CSV exceeds the 2 MB limit.' }); return result; }
  let rows: string[][]; try { rows = readCsv(input.replace(/^\uFEFF/, '')); } catch (error) { result.errors.push({ row: 0, message: (error as Error).message }); return result; }
  const headers = rows.shift()?.map(h => h.trim().toLowerCase().replaceAll(' ', '_')) ?? [];
  if (!headers.includes('company') || !headers.includes('title')) { result.errors.push({ row: 1, message: 'CSV requires company and title column headers.' }); return result; }
  if (rows.length > 1000) { result.errors.push({ row: 0, message: 'CSV exceeds the 1,000-opportunity limit.' }); return result; }
  if (new Set(headers).size !== headers.length) { result.errors.push({ row: 1, message: 'CSV column headers must be unique.' }); return result; }
  rows.forEach((cells, index) => {
    const line = index + 2, values = Object.fromEntries(headers.map((h, i) => [h, cells[i]?.trim() ?? '']));
    try {
      if (cells.length > headers.length) throw new Error('More fields than headers. Quote fields that contain commas.');
      if (!values.company || !values.title) throw new Error('Company and title are required.');
      for (const key of ['application_date', 'deadline', 'next_action_date']) if (values[key] && !isDateOnly(values[key])) throw new Error(`${key} must be a real YYYY-MM-DD date.`);
      const stage = values.stage ? STAGES.find(s => s.toLowerCase() === values.stage.toLowerCase()) : 'Saved';
      if (!stage) throw new Error(`Unknown stage: ${values.stage}.`);
      const priority = values.priority ? (['High', 'Normal', 'Low'] as const).find(p => p.toLowerCase() === values.priority.toLowerCase()) : 'Normal';
      if (!priority) throw new Error('Priority must be High, Normal, or Low.');
      const postingUrl = values.url || values.posting_url || null;
      if (postingUrl && !safeUrl(postingUrl)) throw new Error('URL must use http or https and contain no credentials.');
      const family = values.role_family ? ROLE_FAMILIES.find(f => f === values.role_family) : null;
      if (values.role_family && !family) throw new Error('Unrecognized role_family.');
      const opportunity = opportunitySchema.parse(manualOpportunity({ company: values.company, title: values.title, location: values.location ?? '', stage, priority, postingUrl, notes: values.notes ?? '', deadline: values.deadline || null, applicationDate: values.application_date || null, applicationDatePrecision: values.application_date ? 'day' : 'unknown', primaryRoleFamily: family ?? null }, userId, now));
      if (result.opportunities.some(o => opportunityDuplicate(o, opportunity))) result.warnings.push(`Row ${line}: possible duplicate; review before importing.`);
      result.opportunities.push(opportunity);
      if (values.record_origin === 'demo') result.containsDemoData = true;
      if (values.next_action) { const task = createTask(opportunity.id, userId, values.next_action, now); task.dueDate = values.next_action_date || null; result.tasks.push(taskSchema.parse(task)); }
    } catch (error) { result.errors.push({ row: line, message: error instanceof z.ZodError ? error.issues.map(i => i.message).join('; ') : (error as Error).message }); }
  });
  if (result.containsDemoData) result.warnings.push('This CSV includes demo records. Keep demo records in demo mode.');
  return result;
}
export function csvBackup(preview: CsvPreview, now = new Date()): Backup {
  return { version: 1, ...(preview.containsDemoData ? { sourceMode: 'demo' as const } : {}), exportedAt: now.toISOString(), preferences: structuredClone(DEFAULT_PREFERENCES), opportunities: preview.opportunities, events: preview.opportunities.map(o => ({ id: newId(), userId: o.userId, opportunityId: o.id, type: 'created', oldStage: null, newStage: o.stage, occurredAt: now.toISOString(), provenance: 'import', idempotencyKey: newId() })), tasks: preview.tasks, companyNotes: [], jobPreferences: [] };
}
