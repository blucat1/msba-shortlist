import type { AppSnapshot, Backup, CompanyNote, ImportResult, Job, JobPreference, Opportunity, OpportunityEvent, Preferences, Stage, Task } from '../domain/types';

export interface StageChangeOptions { occurredAt?: string; applicationDate?: string | null; idempotencyKey: string; }
export interface Repository {
  readonly mode: 'demo' | 'live';
  getSnapshot(): Promise<AppSnapshot>;
  getJobDetails(id: string): Promise<Job | null>;
  /** Explicit opt-in to relevant roles outside the graduate catalog; never a default read. */
  getExpandedCatalog?(): Promise<{ jobs: Job[]; total: number; truncated: boolean }>;
  saveOpportunity(opportunity: Opportunity): Promise<Opportunity>;
  changeStage(id: string, stage: Stage, options: StageChangeOptions): Promise<Opportunity>;
  recordApplicationOpened(id: string, idempotencyKey: string): Promise<void>;
  deleteOpportunity(id: string): Promise<void>;
  saveTask(task: Task): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  savePreferences(preferences: Preferences): Promise<void>;
  saveCompanyNote(note: CompanyNote): Promise<void>;
  setJobPreference(preference: JobPreference): Promise<void>;
  exportBackup(): Promise<Backup>;
  importBackup(backup: Backup): Promise<ImportResult>;
  resetDemo?(): Promise<void>;
}
export interface PrivateState { preferences: Preferences; opportunities: Opportunity[]; events: OpportunityEvent[]; tasks: Task[]; companyNotes: CompanyNote[]; jobPreferences: JobPreference[]; }
