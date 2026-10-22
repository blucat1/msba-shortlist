/** Maintained alongside supabase/migrations; regenerate with supabase gen types
 * typescript --local as a schema reference after changing the schema. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<T> = { Row: { [K in keyof T]: T[K] }; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
export interface EmployerRow { id: string; name: string; careers_url: string; created_at: string; }
export interface SourceRow {
  id: string; employer_id: string; provider: 'greenhouse' | 'lever' | 'ashby' | 'jobicy'; board_id: string; region: string | null;
  state: 'candidate' | 'verified' | 'disabled' | 'failed'; enabled: boolean; verified_at: string | null; evidence_url: string | null;
  usage_note: string; last_success_at: string | null; last_check_at: string | null; last_run_status: 'success' | 'failed' | 'quarantined' | null;
  snapshot_count: number | null; raw_count: number | null; relevant_count: number | null; last_warning: string | null;
}
export interface CatalogRow {
  id: string; source_id: string; external_id: string; employer_id: string; title: string; posting_url: string; application_url: string;
  summary: Json; content_hash: string; availability: 'open' | 'availability_unconfirmed' | 'closed';
  source_published_at: string | null; source_updated_at: string | null; first_seen_at: string; last_seen_at: string;
  missing_since: string | null; missing_count: number;
}
export interface OpportunityRow {
  id: string; user_id: string; catalog_job_id: string | null; company: string; title: string; company_key: string;
  stage: 'Saved' | 'Applied' | 'Assessment' | 'Interviewing' | 'Offer' | 'Rejected' | 'Withdrawn'; priority: 'High' | 'Normal' | 'Low';
  application_date: string | null; application_date_precision: 'day' | 'month' | 'unknown'; notes: string; snapshot: Json; data: Json;
  created_at: string; updated_at: string;
}
export interface EventRow {
  id: string; user_id: string; opportunity_id: string;
  event_type: 'created' | 'stage_changed' | 'application_opened' | 'application_date_corrected' | 'edited';
  old_stage: OpportunityRow['stage'] | null; new_stage: OpportunityRow['stage'] | null;
  occurred_at: string; provenance: 'user' | 'import'; idempotency_key: string; request_hash: string | null;
}
export interface TaskRow {
  id: string; user_id: string; opportunity_id: string; title: string; kind: 'general' | 'interview' | 'offer' | 'review' | 'application';
  due_date: string | null; due_at: string | null; done_at: string | null; status: 'open' | 'done' | 'snoozed'; snoozed_until: string | null;
  origin: 'user' | 'suggested'; created_at: string; updated_at: string;
}
export interface Database {
  public: {
    Tables: {
      employers: Table<EmployerRow>;
      job_sources: Table<SourceRow>;
      catalog_jobs: Table<CatalogRow>;
      job_details: Table<{ job_id: string; description: string; evidence: Json; updated_at: string }>;
      source_runs: Table<{ id: string; source_id: string; checked_at: string; finished_at: string; status: string; complete: boolean; raw_count: number; relevant_count: number; warning: string | null }>;
      profiles: Table<{ user_id: string; preferences: Json; updated_at: string }>;
      opportunities: Table<OpportunityRow>;
      opportunity_events: Table<EventRow>;
      tasks: Table<TaskRow>;
      company_notes: Table<{ user_id: string; company_key: string; note: string; updated_at: string }>;
      job_preferences: Table<{ user_id: string; job_id: string; dismissed: boolean; seen_at: string | null; updated_at: string }>;
    };
    Views: { source_coverage: { Row: Omit<SourceRow, 'last_warning'> & { employer_name: string; careers_url: string; freshness: string }; Relationships: [] } };
    Functions: {
      save_opportunity: { Args: { p_opportunity: Json }; Returns: OpportunityRow };
      change_opportunity_stage: { Args: { p_opportunity_id: string; p_stage: string; p_idempotency_key: string; p_occurred_at?: string; p_application_date?: string | null }; Returns: OpportunityRow };
      record_application_opened: { Args: { p_opportunity_id: string; p_idempotency_key: string }; Returns: undefined };
      import_tracker_backup: { Args: { p_backup: Json }; Returns: Json };
      finalize_source_run: { Args: { p_source_id: string; p_run_key: string; p_jobs: Json; p_complete: boolean; p_raw_count: number; p_warning?: string | null; p_checked_at?: string }; Returns: Json };
      finalize_market_source_run: { Args: { p_source_id: string; p_run_key: string; p_jobs: Json; p_statuses: Json; p_complete: boolean; p_raw_count: number; p_warning?: string | null; p_checked_at?: string }; Returns: Json };
      run_catalog_maintenance: { Args: { p_retention_days?: number }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
