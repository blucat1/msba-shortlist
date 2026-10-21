begin;

-- Invoker security + execute granted only to service_role. This role is reached
-- only with a server secret, never from a browser publishable key/user JWT.
create function public.finalize_source_run(
  p_source_id text,p_run_key uuid,p_jobs jsonb,p_complete boolean,p_raw_count integer,
  p_warning text default null,p_checked_at timestamptz default now()
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_source public.job_sources; v_run public.source_runs; v_job jsonb; v_job_id uuid;
  v_count integer; v_relevant integer; v_status text; v_warning text; v_closed integer := 0;
begin
  if coalesce(auth.role(),'') <> 'service_role' and current_user not in ('postgres','supabase_admin') then
    raise exception 'Server credentials required' using errcode = '42501';
  end if;
  select * into v_source from public.job_sources where id = p_source_id for update;
  if not found then raise exception 'Unknown source' using errcode = '22023'; end if;
  select * into v_run from public.source_runs where id = p_run_key;
  if found then
    if v_run.source_id <> p_source_id then raise exception 'Run key already used by another source' using errcode = '22023'; end if;
    return jsonb_build_object('status',v_run.status,'relevantCount',v_run.relevant_count,'replayed',true);
  end if;
  if p_run_key is null or p_complete is null or p_raw_count is null or p_raw_count < 0 or p_checked_at is null
    or p_checked_at > now() + interval '5 minutes'
    or jsonb_typeof(p_jobs) is distinct from 'array'
    or octet_length(p_jobs::text) > 25000000 or jsonb_array_length(p_jobs) > 10000 then
    raise exception 'Invalid source snapshot' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_jobs);
  select count(*) into v_relevant from jsonb_array_elements(p_jobs) j
    where j->'summary'->'classification'->>'scope' in ('included','needs-details');
  v_status := 'success';
  if not p_complete then v_status := 'failed'; v_warning := 'Source check failed or incomplete';
  elsif not v_source.enabled or v_source.state <> 'verified' then
    v_status := 'quarantined'; v_warning := 'Source is not enabled and verified';
  elsif v_source.last_success_at is not null and p_checked_at <= v_source.last_success_at then
    v_status := 'quarantined'; v_warning := 'Out-of-order source snapshot';
  elsif p_raw_count < v_count then
    v_status := 'quarantined'; v_warning := 'Snapshot count is inconsistent';
  elsif (coalesce(v_source.raw_count,0) >= 20 and p_raw_count < v_source.raw_count * 0.4)
      or (coalesce(v_source.snapshot_count,0) >= 20 and v_count < v_source.snapshot_count * 0.4) then
    v_status := 'quarantined'; v_warning := 'Large source count drop; operator review required';
  elsif p_warning is not null and length(trim(p_warning)) > 0 then
    -- The CLI uses this only for completeness/shape warnings. Do not publish it.
    v_status := 'quarantined'; v_warning := 'Snapshot validation requires operator review';
  end if;
  if v_status = 'success' then
    if exists(select 1 from jsonb_array_elements(p_jobs) j where
      nullif(j->>'external_id','') is null or nullif(j->>'title','') is null
      or coalesce(j->>'posting_url','') !~ '^https://' or coalesce(j->>'application_url','') !~ '^https://'
      or nullif(j->>'content_hash','') is null or jsonb_typeof(j->'summary') is distinct from 'object'
      or coalesce(j->'summary'->'classification'->>'scope','') not in ('included','needs-details','excluded')
      or length(coalesce(j->>'description','')) > 80000)
      or exists(select 1 from jsonb_array_elements(p_jobs) j group by j->>'external_id' having count(*) > 1) then
      raise exception 'Invalid/duplicate source job records' using errcode = '22023';
    end if;
    for v_job in select value from jsonb_array_elements(p_jobs) loop
      insert into public.catalog_jobs(source_id,external_id,employer_id,title,posting_url,application_url,summary,content_hash,
        source_published_at,source_updated_at,first_seen_at,last_seen_at)
      values(p_source_id,v_job->>'external_id',v_source.employer_id,v_job->>'title',v_job->>'posting_url',v_job->>'application_url',
        (v_job->'summary') - 'description',v_job->>'content_hash',nullif(v_job->>'source_published_at','')::timestamptz,
        nullif(v_job->>'source_updated_at','')::timestamptz,p_checked_at,p_checked_at)
      on conflict(source_id,external_id) do update set
        title = excluded.title,posting_url = excluded.posting_url,application_url = excluded.application_url,
        summary = case when catalog_jobs.content_hash is distinct from excluded.content_hash then excluded.summary else catalog_jobs.summary end,
        content_hash = excluded.content_hash,source_published_at = excluded.source_published_at,source_updated_at = excluded.source_updated_at,
        availability = 'open',last_seen_at = excluded.last_seen_at,missing_since = null,missing_count = 0
      returning id into v_job_id;
      if v_job->'summary'->'classification'->>'scope' in ('included','needs-details') then
      insert into public.job_details(job_id,description,evidence,updated_at)
      values(v_job_id,coalesce(v_job->>'description',''),coalesce(v_job->'evidence','{}'::jsonb),p_checked_at)
      on conflict(job_id) do update set description = excluded.description,evidence = excluded.evidence,updated_at = excluded.updated_at
      where job_details.description is distinct from excluded.description or job_details.evidence is distinct from excluded.evidence;
      end if;
    end loop;
    -- Only this fully validated transaction advances absence. Checks less than
    -- 12h apart keep unconfirmed; first absence is never a definitive closure.
    update public.catalog_jobs c set
      availability = case when c.missing_since is not null and p_checked_at - c.missing_since >= interval '12 hours'
        then 'closed' else 'availability_unconfirmed' end,
      missing_since = coalesce(c.missing_since,p_checked_at),missing_count = c.missing_count + 1
    where c.source_id = p_source_id and c.availability <> 'closed'
      and not exists(select 1 from jsonb_array_elements(p_jobs) j where j->>'external_id' = c.external_id);
    select count(*) into v_closed from public.catalog_jobs where source_id = p_source_id and availability = 'closed';
    update public.job_sources set last_success_at = p_checked_at,raw_count = p_raw_count,relevant_count = v_relevant,snapshot_count = v_count where id = p_source_id;
  end if;
  insert into public.source_runs(id,source_id,checked_at,status,complete,raw_count,relevant_count,warning)
  values(p_run_key,p_source_id,p_checked_at,v_status,p_complete,p_raw_count,v_relevant,v_warning);
  update public.job_sources set last_check_at = p_checked_at,last_run_status = v_status,last_warning = v_warning
    where id = p_source_id and (last_check_at is null or p_checked_at >= last_check_at);
  return jsonb_build_object('status',v_status,'relevantCount',v_relevant,'closedCount',v_closed,'warning',v_warning,'replayed',false);
end $$;

-- Retention never touches private opportunities, snapshots, tasks, or history.
create function public.run_catalog_maintenance(p_retention_days integer default 90)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_runs integer; v_details integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' and current_user not in ('postgres','supabase_admin') then
    raise exception 'Server credentials required' using errcode = '42501';
  end if;
  if p_retention_days < 90 or p_retention_days > 3650 or p_retention_days is null then
    raise exception 'Retention must be between 90 and 3650 days' using errcode = '22023';
  end if;
  delete from public.source_runs where finished_at < now() - pg_catalog.make_interval(days => p_retention_days);
  get diagnostics v_runs = row_count;
  delete from public.job_details d using public.catalog_jobs j where d.job_id = j.id
    and j.availability = 'closed' and j.last_seen_at < now() - pg_catalog.make_interval(days => p_retention_days)
    and not exists(select 1 from public.opportunities o where o.catalog_job_id = j.id);
  get diagnostics v_details = row_count;
  return jsonb_build_object('sourceRunsDeleted',v_runs,'unreferencedDetailsDeleted',v_details);
end $$;
revoke all on function public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz) from public,anon,authenticated;
revoke all on function public.run_catalog_maintenance(integer) from public,anon,authenticated;
grant execute on function public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz),public.run_catalog_maintenance(integer) to service_role;
commit;
