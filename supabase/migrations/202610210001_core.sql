-- MSBA Shortlist. No fictional/demo data is inserted into the public database.
begin;

create extension if not exists pgcrypto with schema extensions;

create table public.employers (
  id text primary key check (length(id) between 1 and 120),
  name text not null check (length(name) between 1 and 240),
  careers_url text not null check (careers_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create table public.job_sources (
  id text primary key check (length(id) between 1 and 180),
  employer_id text not null references public.employers(id) on delete restrict,
  provider text not null check (provider in ('greenhouse','lever','ashby')),
  board_id text not null check (length(board_id) between 1 and 180),
  region text,
  state text not null default 'candidate' check (state in ('candidate','verified','disabled','failed')),
  enabled boolean not null default false,
  verified_at timestamptz,
  evidence_url text check (evidence_url is null or evidence_url ~ '^https://'),
  usage_note text not null default '' check (length(usage_note) <= 4000),
  last_success_at timestamptz,
  last_check_at timestamptz,
  last_run_status text check (last_run_status in ('success','failed','quarantined')),
  raw_count integer check (raw_count >= 0),
  relevant_count integer check (relevant_count >= 0),
  snapshot_count integer check (snapshot_count >= 0),
  last_warning text check (length(last_warning) <= 240),
  unique (provider,board_id),
  unique (id,employer_id)
);
create table public.catalog_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  external_id text not null check (length(external_id) between 1 and 240),
  employer_id text not null,
  title text not null check (length(title) between 1 and 500),
  posting_url text not null check (posting_url ~ '^https://'),
  application_url text not null check (application_url ~ '^https://'),
  -- Compact normalized domain fields; description is kept only in job_details.
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 64000),
  content_hash text not null check (length(content_hash) between 1 and 128),
  availability text not null default 'open' check (availability in ('open','availability_unconfirmed','closed')),
  source_published_at timestamptz,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  missing_since timestamptz,
  missing_count integer not null default 0 check (missing_count >= 0),
  foreign key (source_id,employer_id) references public.job_sources(id,employer_id) on delete restrict,
  unique (source_id,external_id)
);
create index catalog_jobs_source_availability on public.catalog_jobs(source_id,availability,last_seen_at desc);
create index catalog_jobs_employer on public.catalog_jobs(employer_id);
create index catalog_jobs_first_seen on public.catalog_jobs(first_seen_at desc,id);
create table public.job_details (
  job_id uuid primary key references public.catalog_jobs(id) on delete cascade,
  description text not null check (length(description) <= 80000),
  evidence jsonb not null default '{}'::jsonb check (octet_length(evidence::text) <= 32000),
  updated_at timestamptz not null default now()
);
create table public.source_runs (
  id uuid primary key,
  source_id text not null references public.job_sources(id) on delete cascade,
  checked_at timestamptz not null,
  finished_at timestamptz not null default now(),
  status text not null check (status in ('success','failed','quarantined')),
  complete boolean not null,
  raw_count integer not null check (raw_count >= 0),
  relevant_count integer not null check (relevant_count >= 0),
  -- Only controlled codes/safe diagnostics; never raw provider payloads or secrets.
  warning text check (length(warning) <= 240)
);
create index source_runs_source_time on public.source_runs(source_id,checked_at desc);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object' and octet_length(preferences::text) <= 32000),
  updated_at timestamptz not null default now()
);
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  catalog_job_id uuid references public.catalog_jobs(id) on delete set null,
  company text not null check (length(trim(company)) between 1 and 240),
  title text not null check (length(trim(title)) between 1 and 500),
  company_key text not null check (length(company_key) between 1 and 240),
  stage text not null default 'Saved' check (stage in ('Saved','Applied','Assessment','Interviewing','Offer','Rejected','Withdrawn')),
  priority text not null default 'Normal' check (priority in ('High','Normal','Low')),
  application_date date,
  application_date_precision text not null default 'unknown' check (application_date_precision in ('day','month','unknown')),
  notes text not null default '' check (length(notes) <= 20000),
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 96000),
  -- Optional manual/editable fields in the maintained domain model.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 64000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,user_id),
  constraint application_date_consistent check ((application_date is null) = (application_date_precision = 'unknown'))
);
create unique index opportunities_owner_catalog on public.opportunities(user_id,catalog_job_id) where catalog_job_id is not null;
create index opportunities_owner_stage on public.opportunities(user_id,stage,updated_at desc);
create index opportunities_owner_company on public.opportunities(user_id,company_key);
create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null,
  event_type text not null check (event_type in ('created','stage_changed','application_opened','application_date_corrected','edited')),
  old_stage text check (old_stage in ('Saved','Applied','Assessment','Interviewing','Offer','Rejected','Withdrawn')),
  new_stage text check (new_stage in ('Saved','Applied','Assessment','Interviewing','Offer','Rejected','Withdrawn')),
  occurred_at timestamptz not null default now(),
  provenance text not null default 'user' check (provenance in ('user','import')),
  idempotency_key text not null check (length(idempotency_key) between 1 and 240),
  request_hash text check (request_hash is null or length(request_hash) = 32),
  foreign key (opportunity_id,user_id) references public.opportunities(id,user_id) on delete cascade,
  unique (user_id,idempotency_key)
);
create index opportunity_events_owner_opportunity on public.opportunity_events(user_id,opportunity_id,occurred_at);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  opportunity_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 500),
  kind text not null default 'general' check (kind in ('general','interview','offer','review','application')),
  due_date date,
  due_at timestamptz,
  done_at timestamptz,
  status text not null default 'open' check (status in ('open','done','snoozed')),
  snoozed_until date,
  origin text not null default 'user' check (origin in ('user','suggested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (opportunity_id,user_id) references public.opportunities(id,user_id) on delete cascade,
  check (due_date is null or due_at is null)
);
create index tasks_owner_due on public.tasks(user_id,due_date,due_at) where done_at is null;
create index tasks_owner_opportunity on public.tasks(user_id,opportunity_id);
create table public.company_notes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_key text not null check (length(company_key) between 1 and 240),
  note text not null default '' check (length(note) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id,company_key)
);
create table public.job_preferences (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id uuid not null references public.catalog_jobs(id) on delete cascade,
  dismissed boolean not null default false,
  seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,job_id)
);

-- Keep ownership immutable and maintain update timestamps even if a future grant is broadened.
create function public.protect_owner() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Record ownership cannot change' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_profile_owner before update on public.profiles for each row execute function public.protect_owner();
create trigger protect_opportunity_owner before update on public.opportunities for each row execute function public.protect_owner();
create trigger protect_task_owner before update on public.tasks for each row execute function public.protect_owner();
create trigger protect_company_note_owner before update on public.company_notes for each row execute function public.protect_owner();
create trigger protect_job_preference_owner before update on public.job_preferences for each row execute function public.protect_owner();

-- Explicitly reset Supabase default grants; a future table receives no accidental policy.
revoke all on public.employers,public.job_sources,public.catalog_jobs,public.job_details,public.source_runs,
  public.profiles,public.opportunities,public.opportunity_events,public.tasks,public.company_notes,public.job_preferences from anon,authenticated;
grant select on public.employers,public.job_sources,public.catalog_jobs,public.job_details to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.tasks,public.company_notes,public.job_preferences to authenticated;
-- All opportunity writes, event writes and stage changes are transactional RPCs.
grant select,delete on public.opportunities to authenticated;
grant select on public.opportunity_events to authenticated;
grant all on public.employers,public.job_sources,public.catalog_jobs,public.job_details,public.source_runs,
  public.profiles,public.opportunities,public.opportunity_events,public.tasks,public.company_notes,public.job_preferences to service_role;

alter table public.employers enable row level security;
alter table public.job_sources enable row level security;
alter table public.catalog_jobs enable row level security;
alter table public.job_details enable row level security;
alter table public.source_runs enable row level security;
alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_events enable row level security;
alter table public.tasks enable row level security;
alter table public.company_notes enable row level security;
alter table public.job_preferences enable row level security;

create policy public_employers on public.employers for select to anon,authenticated using (true);
create policy public_sources on public.job_sources for select to anon,authenticated using (true);
create policy public_catalog on public.catalog_jobs for select to anon,authenticated
  using (exists(select 1 from public.job_sources s where s.id = source_id and s.enabled and s.state = 'verified'));
create policy public_details on public.job_details for select to anon,authenticated
  using (exists(select 1 from public.catalog_jobs c where c.id = job_id));
-- No policy and no grants on source_runs: service diagnostics are never public.
create policy owner_profile on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_opportunity on public.opportunities for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_events on public.opportunity_events for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_tasks on public.tasks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_company_notes on public.company_notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_job_preferences on public.job_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Only safe public source aggregates. Explicit invoker security preserves base RLS.
create view public.source_coverage with (security_invoker = true) as
select s.id,s.employer_id,e.name as employer_name,e.careers_url,s.provider,s.board_id,s.region,s.state,s.enabled,
  s.verified_at,s.evidence_url,s.usage_note,s.last_success_at,s.last_check_at,s.last_run_status,s.raw_count,s.relevant_count,s.snapshot_count,
  case when s.last_success_at is null then 'never_verified'
       when s.last_success_at < now() - interval '72 hours' then 'unverified'
       when s.last_success_at < now() - interval '36 hours' then 'stale' else 'fresh' end as freshness
from public.job_sources s join public.employers e on e.id = s.employer_id;
grant select on public.source_coverage to anon,authenticated;

revoke all on function public.protect_owner() from public,anon,authenticated;
commit;
