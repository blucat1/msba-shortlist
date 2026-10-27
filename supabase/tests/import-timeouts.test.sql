begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();

-- Check the stored RPC settings rather than SHOW statement_timeout: PostgREST
-- hoists the function setting into its transaction before executing the call.
select ok((select proconfig @> array['statement_timeout=60s'] from pg_proc
  where oid='public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Employer finalization has a bounded function-specific 60 second timeout');
select ok((select not prosecdef from pg_proc
  where oid='public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Employer finalization retains invoker security');
select ok((select proconfig @> array['search_path=""'] from pg_proc
  where oid='public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Employer finalization retains an empty search path');
select ok(not has_function_privilege('anon',
  'public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Anonymous callers have no employer finalization execute grant');
select ok(not has_function_privilege('authenticated',
  'public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Authenticated callers have no employer finalization execute grant');
select ok(has_function_privilege('service_role',
  'public.finalize_source_run(text,uuid,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Service role retains the employer finalization execute grant');

select ok((select proconfig @> array['statement_timeout=60s'] from pg_proc
  where oid='public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Market finalization has a bounded function-specific 60 second timeout');
select ok((select not prosecdef from pg_proc
  where oid='public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Market finalization retains invoker security');
select ok((select proconfig @> array['search_path=""'] from pg_proc
  where oid='public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)'::regprocedure),
  'Market finalization retains an empty search path');
select ok(not has_function_privilege('anon',
  'public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Anonymous callers have no market finalization execute grant');
select ok(not has_function_privilege('authenticated',
  'public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Authenticated callers have no market finalization execute grant');
select ok(has_function_privilege('service_role',
  'public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamptz)','EXECUTE'),
  'Service role retains the market finalization execute grant');

select * from finish();
rollback;
