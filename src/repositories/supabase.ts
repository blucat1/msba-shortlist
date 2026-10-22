import { mergeCohortPreferences } from '../domain/cohort';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { DEFAULT_PREFERENCES, type AppSnapshot, type Backup, type CompanyNote, type ImportResult, type Job, type JobPreference, type Opportunity, type Preferences, type Task } from '../domain/types';
import { backupSchema, opportunitySchema, preferencesSchema, taskSchema } from '../domain/transfer';
import { getSupabaseClient, GUEST_PREFERENCES_KEY, clearGuestPreferences } from '../lib/supabase';
import type { CatalogRow, Database, EventRow, Json, OpportunityRow, SourceRow, TaskRow } from '../lib/database.types';
import type { Repository } from './types';

const CATALOG_LIMIT = 5000;
const PAGE_SIZE = 500;
const object = z.record(z.string(), z.unknown());
const jobEnvelope = z.object({
  company: z.string(), locations: z.array(object), countryEvidence: z.array(z.string()),
  classification: z.object({ scope: z.enum(['included', 'needs-details', 'excluded']), confidence: z.enum(['high', 'medium', 'low']), reasons: z.array(object), version: z.string(), seniority: z.string() }),
  workArrangement: z.enum(['remote', 'hybrid', 'onsite', 'unknown']), employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'unknown']),
  roleFamilies: z.array(z.string()), primaryRoleFamily: z.string().nullable(), summary: z.string(),
  requiredSkills: z.array(z.string()), preferredSkills: z.array(z.string()), experience: object, salary: z.array(object), timing: object,
}).passthrough();
const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
const asObject = (value: Json): Record<string, unknown> => object.parse(value);
function ensure(error: { message: string } | null): void {
  if (error) throw new Error(`The cloud request failed. Your changes were not confirmed: ${error.message}`);
}
function opportunity(row: OpportunityRow): Opportunity {
  const extra = asObject(row.data);
  return {
    location: '', workArrangement: 'unknown', postingUrl: null, salaryText: '', deadline: null, primaryRoleFamily: null,
    ...extra,
    id: row.id, userId: row.user_id, catalogJobId: row.catalog_job_id, companyKey: row.company_key, company: row.company, title: row.title,
    stage: row.stage, priority: row.priority, applicationDate: row.application_date, applicationDatePrecision: row.application_date_precision,
    notes: row.notes, snapshot: row.snapshot && typeof row.snapshot === 'object' && 'id' in row.snapshot ? row.snapshot as unknown as Job : null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  } as Opportunity;
}
function task(row: TaskRow): Task {
  return { id: row.id, userId: row.user_id, opportunityId: row.opportunity_id, title: row.title, type: row.kind,
    dueDate: row.due_date, dueAt: row.due_at, status: row.status, snoozedUntil: row.snoozed_until, origin: row.origin,
    createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.done_at };
}
function event(row: EventRow) {
  return { id: row.id, userId: row.user_id, opportunityId: row.opportunity_id, type: row.event_type, oldStage: row.old_stage,
    newStage: row.new_stage, occurredAt: row.occurred_at, provenance: row.provenance, idempotencyKey: row.idempotency_key };
}
function job(row: CatalogRow, sources: Map<string, SourceRow>): Job {
  const summary = jobEnvelope.parse(row.summary);
  return {
    ...summary, id: row.id, sourceId: row.source_id, externalId: row.external_id, employerId: row.employer_id, title: row.title,
    postingUrl: row.posting_url, applicationUrl: row.application_url, availability: row.availability,
    contentHash: row.content_hash, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at,
    sourcePublishedAt: row.source_published_at, sourceUpdatedAt: row.source_updated_at,
    lastVerifiedAt: sources.get(row.source_id)?.provider === 'jobicy' ? row.last_seen_at : sources.get(row.source_id)?.last_success_at ?? null,
  } as unknown as Job;
}
interface Page<T> { data: T[] | null; error: { message: string } | null; }
async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await fetchPage(offset, offset + PAGE_SIZE - 1); ensure(result.error);
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < PAGE_SIZE) return rows;
    if (offset >= 100000) throw new Error('This account exceeds the supported client read size. Contact the operator for an export.');
  }
}

export function createSupabaseRepository(supabase: SupabaseClient<Database> = getSupabaseClient()): Repository {
  async function userId(required = true): Promise<string | null> {
    const session = await supabase.auth.getSession(); ensure(session.error);
    if (!session.data.session) {
      if (required) throw new Error('Sign in with Google to save personal records.');
      return null;
    }
    const result = await supabase.auth.getUser(); ensure(result.error);
    if (!result.data.user && required) throw new Error('Your session has expired. Please sign in again.');
    return result.data.user?.id ?? null;
  }
  async function getSnapshot(): Promise<AppSnapshot> {
    const uid = await userId(false);
    const initialPreferences = { ...DEFAULT_PREFERENCES, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    if (!uid) {
      try {
        const stored = sessionStorage.getItem(GUEST_PREFERENCES_KEY);
        if (stored) Object.assign(initialPreferences, preferencesSchema.parse(mergeCohortPreferences(initialPreferences, JSON.parse(stored))));
      } catch { clearGuestPreferences(); }
    }
    const [sourceResult, employerResult] = await Promise.all([
      supabase.from('job_sources').select('*').order('id'), supabase.from('employers').select('*').order('id'),
    ]);
    ensure(sourceResult.error); ensure(employerResult.error);
    const sourceMap = new Map((sourceResult.data ?? []).map(source => [source.id, source]));
    const employers = new Map((employerResult.data ?? []).map(employer => [employer.id, employer]));
    const sources = (sourceResult.data ?? []).map(source => ({
      id: source.id, employerId: source.employer_id, company: employers.get(source.employer_id)?.name ?? source.employer_id,
      careersUrl: employers.get(source.employer_id)?.careers_url ?? '', provider: source.provider, board: source.board_id,
      state: source.state, enabled: source.enabled, verifiedAt: source.verified_at, evidenceUrl: source.evidence_url,
      usageReview: source.usage_note, lastSuccessfulCheck: source.last_success_at, lastAttemptAt: source.last_check_at,
      rawCount: source.raw_count, relevantCount: source.relevant_count,
      error: source.last_run_status === 'failed' ? 'Last source check failed; previous results retained.' : source.last_run_status === 'quarantined' ? 'Source reconciliation is quarantined for operator review.' : null,
      ...(source.region ? { region: source.region } : {}),
    }));
    const catalog: CatalogRow[] = []; let total = 0;
    // Fetch the entire supported result set before client ranking; expose the
    // explicit 5,000-record cap instead of silently ranking one arbitrary page.
    for (let offset = 0; offset < CATALOG_LIMIT; offset += PAGE_SIZE) {
      const result = await supabase.from('catalog_jobs').select('*', { count: 'exact' })
        .neq('summary->classification->>scope', 'excluded').order('first_seen_at', { ascending: false }).order('id')
        .range(offset, offset + PAGE_SIZE - 1);
      ensure(result.error); total = result.count ?? total; catalog.push(...(result.data ?? []));
      if (!result.data || result.data.length < PAGE_SIZE) break;
    }
    const base: AppSnapshot = { jobs: catalog.map(row => job(row, sourceMap)), sources,
      preferences: initialPreferences, opportunities: [], events: [], tasks: [], companyNotes: [], jobPreferences: [],
      userId: uid, catalogTruncated: total > catalog.length, catalogTotal: total };
    if (!uid) return base;
    const [profiles, opportunities, events, tasks, companyNotes, jobPreferences] = await Promise.all([
      supabase.from('profiles').select('preferences').eq('user_id', uid).maybeSingle(),
      allRows((from, to) => supabase.from('opportunities').select('*').eq('user_id', uid).order('id').range(from, to)),
      allRows((from, to) => supabase.from('opportunity_events').select('*').eq('user_id', uid).order('id').range(from, to)),
      allRows((from, to) => supabase.from('tasks').select('*').eq('user_id', uid).order('id').range(from, to)),
      allRows((from, to) => supabase.from('company_notes').select('*').eq('user_id', uid).order('company_key').range(from, to)),
      allRows((from, to) => supabase.from('job_preferences').select('*').eq('user_id', uid).order('job_id').range(from, to)),
    ]);
    ensure(profiles.error);
    // A session switch during pending requests must never return the former
    // account's private state, even when the provider also clears query caches.
    if ((await userId(false)) !== uid) throw new Error('Account changed while loading. Please reload.');
    return { ...base,
      preferences: preferencesSchema.parse(mergeCohortPreferences(initialPreferences, profiles.data ? asObject(profiles.data.preferences) as Partial<Preferences> : {})),
      opportunities: opportunities.map(opportunity), events: events.map(event), tasks: tasks.map(task),
      companyNotes: companyNotes.map(note => ({ companyKey: note.company_key, userId: note.user_id, note: note.note, updatedAt: note.updated_at })),
      jobPreferences: jobPreferences.map(preference => ({ jobId: preference.job_id, userId: preference.user_id, dismissed: preference.dismissed, seenAt: preference.seen_at })),
    };
  }
  return {
    mode: 'live', getSnapshot,
    async getExpandedCatalog() {
      // Only requested by the explicit wider-scope switch. Fetch compact public
      // records with a recognized role family, not every unrelated source row.
      const sourceResult = await supabase.from('job_sources').select('*').order('id');
      ensure(sourceResult.error);
      const sources = new Map((sourceResult.data ?? []).map(source => [source.id, source]));
      const rows: CatalogRow[] = []; let total = 0;
      const limit = 1500;
      for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
        const page = await supabase.from('catalog_jobs').select('*', { count: 'exact' })
          .eq('summary->classification->>scope', 'excluded')
          .not('summary->>primaryRoleFamily', 'is', null)
          .neq('availability', 'closed')
          .order('first_seen_at', { ascending: false }).order('id')
          .range(offset, offset + PAGE_SIZE - 1);
        ensure(page.error); total = page.count ?? total; rows.push(...(page.data ?? []));
        if (!page.data || page.data.length < PAGE_SIZE) break;
      }
      return { jobs: rows.map(row => job(row, sources)), total, truncated: total > rows.length };
    },
    async getJobDetails(id) {
      const [catalog, details, sourceResult] = await Promise.all([
        supabase.from('catalog_jobs').select('*').eq('id', id).maybeSingle(),
        supabase.from('job_details').select('description').eq('job_id', id).maybeSingle(),
        supabase.from('job_sources').select('*'),
      ]);
      ensure(catalog.error); ensure(details.error); ensure(sourceResult.error);
      if (!catalog.data) return null;
      return { ...job(catalog.data, new Map((sourceResult.data ?? []).map(source => [source.id, source]))), description: details.data?.description ?? 'Detailed source text is no longer cached. Use the employer posting for authoritative details.' };
    },
    async saveOpportunity(value) {
      const uid = await userId();
      value = opportunitySchema.parse(value);
      if (value.snapshot?.isDemo) throw new Error('Keep fictional demo records in demo mode.');
      const snapshot = value.snapshot ? { ...value.snapshot, description: undefined } : null;
      const result = await supabase.rpc('save_opportunity', { p_opportunity: toJson({ ...value, snapshot, expectedUserId: uid }) });
      ensure(result.error); if (!result.data) throw new Error('Save returned no opportunity.'); return opportunity(result.data);
    },
    async changeStage(id, stage, options) {
      await userId();
      const result = await supabase.rpc('change_opportunity_stage', { p_opportunity_id: id, p_stage: stage,
        p_idempotency_key: options.idempotencyKey, ...(options.occurredAt ? { p_occurred_at: options.occurredAt } : {}),
        ...(options.applicationDate !== undefined ? { p_application_date: options.applicationDate } : {}) });
      ensure(result.error); if (!result.data) throw new Error('Status update returned no opportunity.'); return opportunity(result.data);
    },
    async recordApplicationOpened(id, idempotencyKey) {
      await userId(); const result = await supabase.rpc('record_application_opened', { p_opportunity_id: id, p_idempotency_key: idempotencyKey }); ensure(result.error);
    },
    async deleteOpportunity(id) { const uid = await userId(); const result = await supabase.from('opportunities').delete().eq('id', id).eq('user_id', uid!); ensure(result.error); },
    async saveTask(value) {
      const uid = await userId(); value = taskSchema.parse(value);
      const result = await supabase.from('tasks').upsert({ id: value.id, user_id: uid!, opportunity_id: value.opportunityId,
        title: value.title, kind: value.type, due_date: value.dueDate, due_at: value.dueAt, status: value.status,
        done_at: value.completedAt, snoozed_until: value.snoozedUntil, origin: value.origin }).select('*').single();
      ensure(result.error); if (!result.data) throw new Error('Save returned no task.'); return task(result.data);
    },
    async deleteTask(id) { const uid = await userId(); const result = await supabase.from('tasks').delete().eq('id', id).eq('user_id', uid!); ensure(result.error); },
    async savePreferences(value) {
      const preferences = preferencesSchema.parse(value); const uid = await userId(false);
      if (!uid) {
        try { sessionStorage.setItem(GUEST_PREFERENCES_KEY, JSON.stringify(preferences)); }
        catch { throw new Error('This browser could not save temporary preferences. Check storage permissions and retry.'); }
        return;
      }
      const result = await supabase.from('profiles').upsert({ user_id: uid!, preferences: toJson(preferences) }); ensure(result.error); },
    async saveCompanyNote(value: CompanyNote) { const uid = await userId(); const result = await supabase.from('company_notes').upsert({ user_id: uid!, company_key: value.companyKey, note: value.note }); ensure(result.error); },
    async setJobPreference(value: JobPreference) { const uid = await userId(); const result = await supabase.from('job_preferences').upsert({ user_id: uid!, job_id: value.jobId, dismissed: value.dismissed, seen_at: value.seenAt }); ensure(result.error); },
    async exportBackup() {
      const uid = await userId(); const state = await getSnapshot();
      if (state.userId !== uid) throw new Error('Account changed while exporting. Please retry.');
      return { version: 1, sourceMode: 'live', exportedAt: new Date().toISOString(), preferences: state.preferences, opportunities: state.opportunities,
        events: state.events, tasks: state.tasks, companyNotes: state.companyNotes, jobPreferences: state.jobPreferences };
    },
    async importBackup(value: Backup): Promise<ImportResult> {
      const uid = await userId();
      value = backupSchema.parse(value);
      if (value.sourceMode === 'demo' || value.opportunities.some(item => item.snapshot?.isDemo) || value.events.some(item => item.provenance === 'demo')) throw new Error('Keep fictional demo backups in demo mode.');
      const result = await supabase.rpc('import_tracker_backup', { p_backup: toJson({ ...value, expectedUserId: uid }) }); ensure(result.error);
      return z.object({ imported: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }).parse(result.data);
    },
  };
}
