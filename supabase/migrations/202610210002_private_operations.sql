begin;

-- These functions are SECURITY DEFINER solely because clients cannot write stages
-- or events directly. Every target is constrained by the verified JWT's auth.uid().
create function public.save_opportunity(p_opportunity jsonb)
returns public.opportunities language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_id uuid; v_current public.opportunities; v_saved public.opportunities;
  v_catalog uuid; v_stage text; v_date date; v_precision text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_opportunity) <> 'object' or octet_length(p_opportunity::text) > 200000 then
    raise exception 'Invalid opportunity' using errcode = '22023';
  end if;
  if p_opportunity->>'expectedUserId' is not null and p_opportunity->>'expectedUserId' <> v_uid::text then
    raise exception 'Account changed before saving; retry in the current account' using errcode = '42501';
  end if;
  if p_opportunity->'snapshot'->>'isDemo' = 'true' then raise exception 'Keep demo records in demo mode' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  v_id := coalesce(nullif(p_opportunity->>'id','')::uuid,gen_random_uuid());
  v_catalog := nullif(p_opportunity->>'catalogJobId','')::uuid;
  v_stage := coalesce(p_opportunity->>'stage','Saved');
  v_date := nullif(p_opportunity->>'applicationDate','')::date;
  v_precision := case when v_date is null then 'unknown' else coalesce(nullif(p_opportunity->>'applicationDatePrecision','unknown'),'day') end;
  select * into v_current from public.opportunities where id = v_id and user_id = v_uid for update;
  if found then
    if v_current.stage <> v_stage then
      raise exception 'Use change_opportunity_stage to change status' using errcode = '22023';
    end if;
    update public.opportunities set company = trim(p_opportunity->>'company'),title = trim(p_opportunity->>'title'),
      company_key = p_opportunity->>'companyKey',priority = coalesce(p_opportunity->>'priority','Normal'),
      application_date = v_date,application_date_precision = v_precision,notes = coalesce(p_opportunity->>'notes',''),
      snapshot = case when jsonb_typeof(p_opportunity->'snapshot') = 'object' then p_opportunity->'snapshot' else '{}'::jsonb end,
      data = p_opportunity - array['id','userId','expectedUserId','catalogJobId','company','title','companyKey','stage','priority','applicationDate','applicationDatePrecision','notes','snapshot','createdAt','updatedAt']
    where id = v_id and user_id = v_uid returning * into v_saved;
    if v_current.application_date is distinct from v_date or v_current.application_date_precision <> v_precision then
      insert into public.opportunity_events(user_id,opportunity_id,event_type,old_stage,new_stage,idempotency_key)
      values(v_uid,v_id,'application_date_corrected',v_stage,v_stage,'date:' || gen_random_uuid()::text);
    end if;
  else
    -- A forged UUID that belongs to another owner cannot be overwritten.
    if exists(select 1 from public.opportunities where id = v_id) then
      raise exception 'Opportunity is unavailable' using errcode = '42501';
    end if;
    -- Saving the same catalog job again returns the existing private record.
    if v_catalog is not null then
      select * into v_saved from public.opportunities where user_id = v_uid and catalog_job_id = v_catalog;
      if found then return v_saved; end if;
    end if;
    insert into public.opportunities(id,user_id,catalog_job_id,company,title,company_key,stage,priority,application_date,application_date_precision,notes,snapshot,data)
    values(v_id,v_uid,v_catalog,trim(p_opportunity->>'company'),trim(p_opportunity->>'title'),p_opportunity->>'companyKey',v_stage,
      coalesce(p_opportunity->>'priority','Normal'),v_date,v_precision,coalesce(p_opportunity->>'notes',''),
      case when jsonb_typeof(p_opportunity->'snapshot') = 'object' then p_opportunity->'snapshot' else '{}'::jsonb end,
      p_opportunity - array['id','userId','expectedUserId','catalogJobId','company','title','companyKey','stage','priority','applicationDate','applicationDatePrecision','notes','snapshot','createdAt','updatedAt'])
    returning * into v_saved;
    insert into public.opportunity_events(user_id,opportunity_id,event_type,new_stage,idempotency_key)
    values(v_uid,v_id,'created',v_stage,'create:' || v_id::text);
  end if;
  return v_saved;
end $$;

create function public.change_opportunity_stage(
  p_opportunity_id uuid,p_stage text,p_idempotency_key text,
  p_occurred_at timestamptz default now(),p_application_date date default null
) returns public.opportunities language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_current public.opportunities; v_existing public.opportunity_events;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_stage not in ('Saved','Applied','Assessment','Interviewing','Offer','Rejected','Withdrawn') or p_stage is null
    or p_idempotency_key is null or length(p_idempotency_key) not between 1 and 240
    or p_occurred_at is null or p_occurred_at > now() + interval '5 minutes' then
    raise exception 'Invalid stage change' using errcode = '22023';
  end if;
  select * into v_current from public.opportunities where id = p_opportunity_id and user_id = v_uid for update;
  if not found then raise exception 'Opportunity is unavailable' using errcode = '42501'; end if;
  select * into v_existing from public.opportunity_events where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.opportunity_id <> p_opportunity_id or v_existing.new_stage <> p_stage or v_existing.event_type not in ('stage_changed','application_date_corrected')
      or v_existing.request_hash is distinct from md5(p_stage || ':' || coalesce(p_application_date::text,'unchanged')) then
      raise exception 'Idempotency key was already used for another action' using errcode = '22023';
    end if;
    return v_current;
  end if;
  -- Repeated same-state changes are harmless; no duplicate historical milestones.
  if v_current.stage = p_stage then
    if p_application_date is not null and (v_current.application_date is distinct from p_application_date or v_current.application_date_precision <> 'day') then
      update public.opportunities set application_date = p_application_date,application_date_precision = 'day' where id = p_opportunity_id and user_id = v_uid;
      insert into public.opportunity_events(user_id,opportunity_id,event_type,old_stage,new_stage,occurred_at,idempotency_key,request_hash)
      values(v_uid,p_opportunity_id,'application_date_corrected',p_stage,p_stage,p_occurred_at,p_idempotency_key,md5(p_stage || ':' || p_application_date::text));
      select * into v_current from public.opportunities where id = p_opportunity_id and user_id = v_uid;
    end if;
    return v_current;
  end if;
  update public.opportunities set stage = p_stage,
    application_date = coalesce(p_application_date,application_date),
    application_date_precision = case when p_application_date is not null then 'day' else application_date_precision end
  where id = p_opportunity_id and user_id = v_uid;
  insert into public.opportunity_events(user_id,opportunity_id,event_type,old_stage,new_stage,occurred_at,idempotency_key,request_hash)
  values(v_uid,p_opportunity_id,'stage_changed',v_current.stage,p_stage,p_occurred_at,p_idempotency_key,md5(p_stage || ':' || coalesce(p_application_date::text,'unchanged')));
  select * into v_current from public.opportunities where id = p_opportunity_id and user_id = v_uid;
  return v_current;
end $$;

create function public.record_application_opened(p_opportunity_id uuid,p_idempotency_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_existing public.opportunity_events;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 1 and 240 then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  if not exists(select 1 from public.opportunities where id = p_opportunity_id and user_id = v_uid) then
    raise exception 'Opportunity is unavailable' using errcode = '42501';
  end if;
  select * into v_existing from public.opportunity_events where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.opportunity_id <> p_opportunity_id or v_existing.event_type <> 'application_opened' then
      raise exception 'Idempotency key was already used for another action' using errcode = '22023';
    end if;
    return;
  end if;
  insert into public.opportunity_events(user_id,opportunity_id,event_type,idempotency_key)
  values(v_uid,p_opportunity_id,'application_opened',p_idempotency_key);
  -- Intentionally does not change stage or application date.
end $$;

-- Atomic merge import: existing opportunities are preserved and ownership is
-- always server-derived. Foreign client UUIDs are treated only as mapping keys.
create function public.import_tracker_backup(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_item jsonb; v_map jsonb := '{}'::jsonb; v_op uuid; v_catalog uuid;
  v_old_id text; v_imported integer := 0; v_skipped integer := 0; v_key text; v_date date; v_precision text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_backup->>'expectedUserId' is not null and p_backup->>'expectedUserId' <> v_uid::text then
    raise exception 'Account changed before importing; retry in the current account' using errcode = '42501';
  end if;
  if p_backup->>'version' is distinct from '1' or jsonb_typeof(p_backup->'opportunities') is distinct from 'array'
    or octet_length(p_backup::text) > 10000000 then raise exception 'Unsupported or oversized backup' using errcode = '22023'; end if;
  if jsonb_array_length(p_backup->'opportunities') > 2000
    or jsonb_array_length(coalesce(p_backup->'events','[]'::jsonb)) > 10000
    or jsonb_array_length(coalesce(p_backup->'tasks','[]'::jsonb)) > 10000
    or jsonb_array_length(coalesce(p_backup->'companyNotes','[]'::jsonb)) > 2000
    or jsonb_array_length(coalesce(p_backup->'jobPreferences','[]'::jsonb)) > 10000 then
    raise exception 'Backup record limit exceeded' using errcode = '22023';
  end if;
  if p_backup->>'sourceMode' = 'demo'
    or exists(select 1 from jsonb_array_elements(p_backup->'opportunities') j where j->'snapshot'->>'isDemo' = 'true')
    or exists(select 1 from jsonb_array_elements(coalesce(p_backup->'events','[]'::jsonb)) j where j->>'provenance' = 'demo') then
    raise exception 'Keep demo records in demo mode' using errcode = '22023';
  end if;
  -- Serialize two imports for one account without locking unrelated accounts.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  for v_item in select value from jsonb_array_elements(p_backup->'opportunities') loop
    v_old_id := v_item->>'id';
    if v_old_id is null or v_map ? v_old_id then raise exception 'Duplicate/missing backup ID' using errcode = '22023'; end if;
    v_catalog := null;
    if (v_item->>'catalogJobId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select id into v_catalog from public.catalog_jobs where id = (v_item->>'catalogJobId')::uuid;
    end if;
    v_op := null;
    select id into v_op from public.opportunities where user_id = v_uid and
      ((v_catalog is not null and catalog_job_id = v_catalog)
       or (catalog_job_id is null and v_catalog is null and lower(trim(company)) = lower(trim(v_item->>'company')) and lower(trim(title)) = lower(trim(v_item->>'title'))
           and lower(trim(coalesce(data->>'location',''))) = lower(trim(coalesce(v_item->>'location','')))
           and application_date is not distinct from nullif(v_item->>'applicationDate','')::date
           and coalesce(data->>'postingUrl','') = coalesce(v_item->>'postingUrl','')))
      order by created_at limit 1;
    if v_op is null then
      v_op := gen_random_uuid();
      v_date := nullif(v_item->>'applicationDate','')::date;
      v_precision := case when v_date is null then 'unknown' else coalesce(nullif(v_item->>'applicationDatePrecision','unknown'),'day') end;
      insert into public.opportunities(id,user_id,catalog_job_id,company,title,company_key,stage,priority,application_date,application_date_precision,notes,snapshot,data,created_at)
      values(v_op,v_uid,v_catalog,trim(v_item->>'company'),trim(v_item->>'title'),v_item->>'companyKey',coalesce(v_item->>'stage','Saved'),
        coalesce(v_item->>'priority','Normal'),v_date,v_precision,coalesce(v_item->>'notes',''),
        case when jsonb_typeof(v_item->'snapshot') = 'object' then v_item->'snapshot' else '{}'::jsonb end,
        v_item - array['id','userId','expectedUserId','catalogJobId','company','title','companyKey','stage','priority','applicationDate','applicationDatePrecision','notes','snapshot','createdAt','updatedAt'],
        coalesce(nullif(v_item->>'createdAt','')::timestamptz,now()));
      v_imported := v_imported + 1;
    else v_skipped := v_skipped + 1; v_op := null;
    end if;
    v_map := v_map || jsonb_build_object(v_old_id,v_op::text);
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_backup->'events','[]'::jsonb)) loop
    v_op := (v_map->>(v_item->>'opportunityId'))::uuid;
    if not (v_map ? (v_item->>'opportunityId')) then raise exception 'Event has no imported parent' using errcode = '22023'; end if;
    if v_op is null then continue; end if;
    -- Own imported history is allowed and visibly marked import; no userId is read.
    v_key := 'import:' || v_op::text || ':' || md5(coalesce(nullif(v_item->>'idempotencyKey',''),v_item->>'id'));
    if length(v_key) > 240 then v_key := 'import:' || md5(v_key); end if;
    insert into public.opportunity_events(user_id,opportunity_id,event_type,old_stage,new_stage,occurred_at,provenance,idempotency_key)
    values(v_uid,v_op,v_item->>'type',v_item->>'oldStage',v_item->>'newStage',coalesce((v_item->>'occurredAt')::timestamptz,now()),'import',v_key)
    on conflict (user_id,idempotency_key) do nothing;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_backup->'tasks','[]'::jsonb)) loop
    v_op := (v_map->>(v_item->>'opportunityId'))::uuid;
    if not (v_map ? (v_item->>'opportunityId')) then raise exception 'Task has no imported parent' using errcode = '22023'; end if;
    if v_op is null then continue; end if;
    -- Repeated backups do not multiply tasks; compare semantic parent/title/dates.
    if not exists(select 1 from public.tasks where user_id = v_uid and opportunity_id = v_op and title = v_item->>'title'
      and due_date is not distinct from nullif(v_item->>'dueDate','')::date
      and due_at is not distinct from nullif(v_item->>'dueAt','')::timestamptz) then
      insert into public.tasks(user_id,opportunity_id,title,kind,due_date,due_at,status,done_at,snoozed_until,origin,created_at)
      values(v_uid,v_op,v_item->>'title',coalesce(v_item->>'type','general'),nullif(v_item->>'dueDate','')::date,
        nullif(v_item->>'dueAt','')::timestamptz,coalesce(v_item->>'status','open'),nullif(v_item->>'completedAt','')::timestamptz,
        nullif(v_item->>'snoozedUntil','')::date,coalesce(v_item->>'origin','user'),coalesce((v_item->>'createdAt')::timestamptz,now()));
    end if;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_backup->'companyNotes','[]'::jsonb)) loop
    insert into public.company_notes(user_id,company_key,note) values(v_uid,v_item->>'companyKey',coalesce(v_item->>'note',''))
    on conflict (user_id,company_key) do nothing;
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_backup->'jobPreferences','[]'::jsonb)) loop
    if (v_item->>'jobId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      if exists(select 1 from public.catalog_jobs where id = (v_item->>'jobId')::uuid) then
        insert into public.job_preferences(user_id,job_id,dismissed,seen_at)
        values(v_uid,(v_item->>'jobId')::uuid,coalesce((v_item->>'dismissed')::boolean,false),nullif(v_item->>'seenAt','')::timestamptz)
        on conflict(user_id,job_id) do nothing;
      end if;
    end if;
  end loop;
  if jsonb_typeof(p_backup->'preferences') = 'object' then
    insert into public.profiles(user_id,preferences) values(v_uid,p_backup->'preferences')
    on conflict(user_id) do update set preferences = excluded.preferences;
  end if;
  return jsonb_build_object('imported',v_imported,'skipped',v_skipped);
end $$;

revoke all on function public.save_opportunity(jsonb) from public,anon;
revoke all on function public.change_opportunity_stage(uuid,text,text,timestamptz,date) from public,anon;
revoke all on function public.record_application_opened(uuid,text) from public,anon;
revoke all on function public.import_tracker_backup(jsonb) from public,anon;
grant execute on function public.save_opportunity(jsonb),public.change_opportunity_stage(uuid,text,text,timestamptz,date),public.record_application_opened(uuid,text),public.import_tracker_backup(jsonb) to authenticated;
commit;
