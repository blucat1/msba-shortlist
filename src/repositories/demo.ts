import { createDemoSnapshot } from '../domain/fixtures';
import { dateOnlyInTimezone } from '../domain/dates';
import { newId } from '../domain/records';
import { backupSchema, companyNoteSchema, jobPreferenceSchema, mergeBackup, opportunitySchema, parseBackup, preferencesSchema, taskSchema } from '../domain/transfer';
import type { AppSnapshot, Backup, CompanyNote, ImportResult, JobPreference, Opportunity, Preferences, Stage, Task } from '../domain/types';
import type { PrivateState, Repository, StageChangeOptions } from './types';

export const DEMO_STORAGE_KEY = 'msba-shortlist:demo:v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }
export interface DemoRepositoryOptions { storage?: StorageLike | null; referenceDate?: Date; now?: () => Date; }
function privateState(snapshot: AppSnapshot): PrivateState {
  return { preferences: snapshot.preferences, opportunities: snapshot.opportunities, events: snapshot.events, tasks: snapshot.tasks, companyNotes: snapshot.companyNotes, jobPreferences: snapshot.jobPreferences };
}
export function backupFromState(state: PrivateState, now = new Date()): Backup { return { version: 1, sourceMode: 'demo', exportedAt: now.toISOString(), ...structuredClone(state) }; }
export function createDemoRepository(options: DemoRepositoryOptions = {}): Repository {
  const now = options.now ?? (() => new Date());
  let storage: StorageLike | null = null, storageUnavailable = false;
  try { storage = options.storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : options.storage; } catch { storageUnavailable = true; }
  let reference = options.referenceDate ?? now();
  let state: PrivateState | null = null;
  function write(next: PrivateState): void {
    if (storageUnavailable) throw new Error('Browser storage is unavailable. Enable local storage to use the persistent demo.');
    if (storage) {
      try { storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 1, referenceDate: reference.toISOString(), backup: backupFromState(next, now()) })); }
      catch { throw new Error('Browser storage could not save this change. Storage may be full or unavailable. Export a backup before clearing browser data.'); }
    }
    state = structuredClone(next);
  }
  function load(): PrivateState {
    if (storageUnavailable) throw new Error('Browser storage is unavailable. Enable local storage to use the persistent demo.');
    if (state) return structuredClone(state);
    if (storage) {
      let raw: string | null;
      try { raw = storage.getItem(DEMO_STORAGE_KEY); } catch { throw new Error('Browser storage is unavailable. Enable local storage to use the persistent demo.'); }
      if (raw) {
        try {
          const envelope: unknown = JSON.parse(raw);
          if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || envelope.version !== 1 || !('referenceDate' in envelope) || typeof envelope.referenceDate !== 'string' || !('backup' in envelope)) throw new Error('Invalid storage envelope');
          const savedReference = new Date(envelope.referenceDate);
          if (Number.isNaN(savedReference.getTime())) throw new Error('Invalid reference date');
          const backup = parseBackup(JSON.stringify(envelope.backup)); reference = savedReference;
          state = { preferences: backup.preferences, opportunities: backup.opportunities, events: backup.events, tasks: backup.tasks, companyNotes: backup.companyNotes, jobPreferences: backup.jobPreferences };
          return structuredClone(state);
        } catch { throw new Error('Saved demo data could not be read. Export or copy browser data if needed, then use Reset demo to restore the sample.'); }
      }
    }
    write(privateState(createDemoSnapshot(reference))); return structuredClone(state!);
  }
  function ownedOpportunity(next: PrivateState, id: string): Opportunity {
    const opportunity = next.opportunities.find(o => o.id === id);
    if (!opportunity) throw new Error('Opportunity no longer exists. Refresh and try again.');
    return opportunity;
  }
  return {
    mode: 'demo',
    async getSnapshot() { const next = load(); return structuredClone({ ...createDemoSnapshot(reference), ...next }); },
    async getJobDetails(id) { load(); return structuredClone(createDemoSnapshot(reference).jobs.find(j => j.id === id) ?? null); },
    async saveOpportunity(input) {
      const opportunity = opportunitySchema.parse({ ...input, userId: 'demo-user', updatedAt: now().toISOString() });
      const next = load(), existing = next.opportunities.find(o => o.id === opportunity.id);
      if (existing && existing.stage !== opportunity.stage) throw new Error('Use the stage action to change status and preserve history.');
      const catalogDuplicate = opportunity.catalogJobId ? next.opportunities.find(o => o.catalogJobId === opportunity.catalogJobId && o.id !== opportunity.id) : null;
      if (catalogDuplicate) return catalogDuplicate;
      if (existing) {
        next.opportunities = next.opportunities.map(o => o.id === opportunity.id ? opportunity : o);
        if (existing.applicationDate !== opportunity.applicationDate || existing.applicationDatePrecision !== opportunity.applicationDatePrecision) next.events.push({ id: newId(), userId: 'demo-user', opportunityId: opportunity.id, type: 'application_date_corrected', oldStage: existing.stage, newStage: opportunity.stage, occurredAt: now().toISOString(), provenance: 'user', idempotencyKey: newId() });
      }
      else {
        next.opportunities.push(opportunity);
        next.events.push({ id: newId(), userId: 'demo-user', opportunityId: opportunity.id, type: 'created', oldStage: null, newStage: opportunity.stage, occurredAt: now().toISOString(), provenance: 'user', idempotencyKey: newId() });
      }
      write(next); return structuredClone(opportunity);
    },
    async changeStage(id: string, stage: Stage, options: StageChangeOptions) {
      const next = load(), opportunity = ownedOpportunity(next, id);
      const replay = next.events.find(e => e.idempotencyKey === options.idempotencyKey);
      if (replay) {
        if (replay.opportunityId !== id || replay.newStage !== stage || !['stage_changed', 'application_date_corrected'].includes(replay.type)) throw new Error('This retry key was already used for a different action.');
        return structuredClone(opportunity);
      }
      const oldStage = opportunity.stage, oldDate = opportunity.applicationDate;
      const occurredAt = options.occurredAt ?? now().toISOString();
      const applicationDate = options.applicationDate !== undefined ? options.applicationDate : stage === 'Applied' && !opportunity.applicationDate ? dateOnlyInTimezone(new Date(occurredAt), next.preferences.timezone) : opportunity.applicationDate;
      if (oldStage === stage && oldDate === applicationDate) return structuredClone(opportunity);
      const updated = opportunitySchema.parse({ ...opportunity, stage, applicationDate, applicationDatePrecision: applicationDate ? 'day' : 'unknown', updatedAt: now().toISOString() });
      next.opportunities = next.opportunities.map(o => o.id === id ? updated : o);
      const event = { id: newId(), userId: 'demo-user', opportunityId: id, type: oldStage === stage ? 'application_date_corrected' as const : 'stage_changed' as const, oldStage, newStage: stage, occurredAt, provenance: 'user' as const, idempotencyKey: options.idempotencyKey };
      // Parse all event timestamps and keys before committing.
      backupSchema.parse(backupFromState({ ...next, events: [...next.events, event] }, now()));
      next.events.push(event); write(next); return structuredClone(updated);
    },
    async recordApplicationOpened(id, idempotencyKey) {
      const next = load(); ownedOpportunity(next, id);
      const replay = next.events.find(e => e.idempotencyKey === idempotencyKey);
      if (replay) { if (replay.opportunityId !== id || replay.type !== 'application_opened') throw new Error('This retry key was already used for a different action.'); return; }
      next.events.push({ id: newId(), userId: 'demo-user', opportunityId: id, type: 'application_opened', oldStage: null, newStage: null, occurredAt: now().toISOString(), provenance: 'user', idempotencyKey }); write(next);
    },
    async deleteOpportunity(id) { const next = load(); ownedOpportunity(next, id); next.opportunities = next.opportunities.filter(o => o.id !== id); next.events = next.events.filter(e => e.opportunityId !== id); next.tasks = next.tasks.filter(t => t.opportunityId !== id); write(next); },
    async saveTask(input: Task) {
      const next = load(); ownedOpportunity(next, input.opportunityId);
      const existing = next.tasks.find(t => t.id === input.id);
      const task = taskSchema.parse({ ...input, userId: 'demo-user', updatedAt: now().toISOString(), completedAt: input.status === 'done' ? existing?.completedAt ?? input.completedAt ?? now().toISOString() : null });
      if (task.status === 'snoozed' && !task.snoozedUntil) throw new Error('Choose a date to snooze this task until.');
      if (existing) next.tasks = next.tasks.map(t => t.id === task.id ? task : t); else next.tasks.push(task);
      write(next); return structuredClone(task);
    },
    async deleteTask(id) { const next = load(); next.tasks = next.tasks.filter(t => t.id !== id); write(next); },
    async savePreferences(input: Preferences) { const next = load(); next.preferences = preferencesSchema.parse(input); write(next); },
    async saveCompanyNote(input: CompanyNote) { const next = load(), note = companyNoteSchema.parse({ ...input, userId: 'demo-user', updatedAt: now().toISOString() }); next.companyNotes = [...next.companyNotes.filter(n => n.companyKey !== note.companyKey), note]; write(next); },
    async setJobPreference(input: JobPreference) { const next = load(), preference = jobPreferenceSchema.parse({ ...input, userId: 'demo-user' }); next.jobPreferences = [...next.jobPreferences.filter(p => p.jobId !== preference.jobId), preference]; write(next); },
    async exportBackup() { return backupFromState(load(), now()); },
    async importBackup(backup: Backup): Promise<ImportResult> { const merged = mergeBackup(load(), backup, 'demo-user'); write(merged.state); return merged.result; },
    async resetDemo() { reference = options.referenceDate ?? now(); write(privateState(createDemoSnapshot(reference))); },
  };
}
