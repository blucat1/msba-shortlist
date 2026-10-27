begin;

-- Complete source snapshots are finalized atomically. Larger legitimate feeds
-- can exceed PostgREST's short default request budget on the Free instance.
-- PostgREST hoists this function setting into the RPC transaction. Keep it
-- bounded and specific to these existing server-only import functions: no
-- role-wide change, altered caller checks, grants, RLS or snapshot semantics.
alter function public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)
  set statement_timeout = '60s';
alter function public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)
  set statement_timeout = '60s';

-- Public discovery reads the supported subset, in this order, with an exact
-- count. Avoid scanning and sorting every excluded source row as feeds grow.
-- Keep the public request budget and every RLS policy unchanged.
create index catalog_supported_discovery_idx
  on public.catalog_jobs(first_seen_at desc,id) include(source_id)
  where (summary->'classification'->>'scope') <> 'excluded';
analyze public.catalog_jobs;

notify pgrst, 'reload schema';
commit;
