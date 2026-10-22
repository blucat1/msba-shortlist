begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();

create function pg_temp.market_job(p_id text,p_scope text default 'included') returns jsonb
language sql set search_path = '' as $$
  select jsonb_build_object('external_id',p_id,'title','Graduate Data Analyst',
    'posting_url','https://example.invalid/jobs/'||p_id,'application_url','https://example.invalid/apply/'||p_id,
    'summary',jsonb_build_object('company','Actual Hiring Company','classification',jsonb_build_object('scope',p_scope)),
    'description','Plain public source description','content_hash','hash-'||p_id)
$$;
create function pg_temp.market_statuses(p_status text default 'unknown') returns jsonb
language sql set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('external_id',external_id,'status',p_status) order by external_id),'[]'::jsonb)
    from public.catalog_jobs where source_id='market-source' and availability<>'closed'
$$;

insert into public.employers(id,name,careers_url) values('market-test','Market Provider','https://example.invalid/market');
insert into public.job_sources(id,employer_id,provider,board_id,state,enabled)
values('market-source','market-test','jobicy','market-window','verified',true),
      ('market-other','market-test','jobicy','other-window','verified',true),
      ('market-legacy','market-test','greenhouse','legacy-board','verified',true);
insert into public.catalog_jobs(source_id,external_id,employer_id,title,posting_url,application_url,content_hash)
values('market-other','foreign-only','market-test','Other Source','https://example.invalid/foreign','https://example.invalid/foreign','foreign-hash');

select ok(not has_function_privilege('anon','public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamp with time zone)','EXECUTE'),'Anonymous has no market finalization grant');
select ok(not has_function_privilege('authenticated','public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamp with time zone)','EXECUTE'),'Authenticated has no market finalization grant');
select ok(has_function_privilege('service_role','public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamp with time zone)','EXECUTE'),'Server role has market finalization grant');
select ok((select not prosecdef from pg_proc where oid='public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamp with time zone)'::regprocedure),'Market finalization uses invoker security');
select is((select array_to_string(proconfig,',') from pg_proc where oid='public.finalize_market_source_run(text,uuid,jsonb,jsonb,boolean,integer,text,timestamp with time zone)'::regprocedure),'search_path=""','Market finalization fixes an empty search path');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0)$q$,'42501',null,'Anonymous cannot finalize a market run');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0)$q$,'42501',null,'Forged role claims cannot supply a missing execute grant');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0)$q$,'42501',null,'Signed-in users cannot finalize a market run');
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0)$q$,'42501',null,'Invoker caller check rejects a nonserver JWT role');
select set_config('request.jwt.claims','{"role":"service_role"}',true);

select throws_ok($q$select public.finalize_market_source_run('missing-source',gen_random_uuid(),'[]','[]',true,0)$q$,'22023',null,'Unknown market source is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-legacy',gen_random_uuid(),'[]','[]',true,0)$q$,'22023',null,'Employer-board sources cannot use rolling reconciliation');
select throws_ok($q$select public.finalize_source_run('market-source',gen_random_uuid(),'[]',true,0)$q$,'22023',null,'A rolling feed cannot accidentally use absence-based legacy finalization');

select lives_ok($q$select public.finalize_market_source_run('market-source','72000000-0000-0000-0000-000000000001',
  jsonb_build_array(pg_temp.market_job('active'),pg_temp.market_job('uncertain'),pg_temp.market_job('to-close'),pg_temp.market_job('excluded-old','excluded')),
  '[]',true,4,null,now()-interval '5 days')$q$,'A complete rolling window publishes all valid identities atomically');
select is((select count(*)::integer from public.catalog_jobs where source_id='market-source'),4,'Window retains relevant and excluded source identities');
select is((select count(*)::integer from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),3,'Only role-relevant window records cache descriptions');
select is((select summary->>'company' from public.catalog_jobs where source_id='market-source' and external_id='active'),'Actual Hiring Company','Cross-employer records retain the actual hiring company');
select is((select first_seen_at from public.catalog_jobs where source_id='market-source' and external_id='active'),now()-interval '5 days','Initial market discovery time is exact');

select is((public.finalize_market_source_run('market-source','72000000-0000-0000-0000-000000000001','[]','[]',true,0)->>'replayed'),'true','A finalized market run replays without reapplying a different payload');
select is((select count(*)::integer from public.source_runs where source_id='market-source'),1,'Idempotent replay creates no second diagnostic');
select is((select count(*)::integer from public.catalog_jobs where source_id='market-source' and availability='open'),4,'Replay cannot remove or unconfirm existing market records');
select throws_ok($q$select public.finalize_market_source_run('market-other','72000000-0000-0000-0000-000000000001','[]','[]',true,0)$q$,'22023',null,'A run key cannot be reused for another source');

-- Capture only synthetic fixture rows so rejected/failed transactions can be
-- compared in full, including timestamps, details, hashes and availability.
select set_config('test.market_before',(select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),true);
select set_config('test.market_details_before',(select jsonb_agg(to_jsonb(d) order by d.job_id)::text from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('new')), '[]',true,1,null,now()-interval '4 days')$q$,'22023',null,'Missing aged-out status IDs reject the entire new window');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',pg_temp.market_statuses()||'[{"external_id":"active","status":"closed"}]',true,0,null,now()-interval '4 days')$q$,'22023',null,'Duplicate status IDs reject the complete run');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',pg_temp.market_statuses()||'[{"external_id":"foreign-only","status":"closed"}]',true,0,null,now()-interval '4 days')$q$,'22023',null,'A status ID belonging only to another source is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('active')),pg_temp.market_statuses(),true,1,null,now()-interval '4 days')$q$,'22023',null,'Statuses may not overlap identities present in the new window');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',jsonb_build_array(jsonb_build_object('external_id','active','status','missing')),true,0,null,now()-interval '4 days')$q$,'22023',null,'Unknown status vocabulary cannot imply a closure');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'Every rejected status set preserves the full prior catalog');
select is((select count(*)::integer from public.source_runs where source_id='market-source'),1,'Rejected status sets leave no finalized diagnostic or partial run');

select is((public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',false,0,'untrusted private diagnostic',now()-interval '4 days')->>'status'),'failed','Incomplete runs can be recorded without claiming complete status coverage');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'An incomplete rolling run preserves every catalog field');
select is((select jsonb_agg(to_jsonb(d) order by d.job_id)::text from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),current_setting('test.market_details_before'),'An incomplete run preserves cached source details');
select is((select last_success_at from public.job_sources where id='market-source'),now()-interval '5 days','Failure does not advance successful verification');
select is((select last_warning from public.job_sources where id='market-source'),'Source check failed or incomplete','Raw failure text is replaced with a controlled public warning');
select is((public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0,'partial remote window',now()-interval '4 days'+interval '1 hour')->>'status'),'quarantined','A validation warning quarantines a claimed complete rolling run');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'Quarantined runs preserve the entire catalog');
select is((select last_warning from public.job_sources where id='market-source'),'Snapshot validation requires operator review','Quarantine does not publish untrusted diagnostic text');

select lives_ok($q$select public.finalize_market_source_run('market-source','72000000-0000-0000-0000-000000000002',
  jsonb_build_array(pg_temp.market_job('new'),pg_temp.market_job('excluded-new','excluded')),
  '[{"external_id":"active","status":"active"},{"external_id":"uncertain","status":"unknown"},{"external_id":"to-close","status":"closed"},{"external_id":"excluded-old","status":"active"}]',
  true,2,null,now()-interval '3 days')$q$,'A new window and independent status checks reconcile atomically');
select is((select availability from public.catalog_jobs where source_id='market-source' and external_id='active'),'open','An aged-out explicitly active listing remains open');
select is((select last_seen_at from public.catalog_jobs where source_id='market-source' and external_id='active'),now()-interval '3 days','Independent active proof advances last seen verification');
select is((select first_seen_at from public.catalog_jobs where source_id='market-source' and external_id='active'),now()-interval '5 days','Aged-out active verification preserves first discovery');
select is((select availability from public.catalog_jobs where source_id='market-source' and external_id='uncertain'),'availability_unconfirmed','Unknown independent status makes availability unconfirmed');
select is((select last_seen_at from public.catalog_jobs where source_id='market-source' and external_id='uncertain'),now()-interval '5 days','An unknown status does not fabricate a newer sighting');
select is((select availability from public.catalog_jobs where source_id='market-source' and external_id='to-close'),'closed','Only an explicit independently closed status closes its ID');
select is((select availability from public.catalog_jobs where source_id='market-other' and external_id='foreign-only'),'open','Status reconciliation cannot modify another source');
select is((select relevant_count from public.job_sources where id='market-source'),3,'Relevant health count includes retained nonclosed roles outside the window');
select is((select snapshot_count from public.job_sources where id='market-source'),2,'Snapshot health count describes only current window identities');
select is((select raw_count from public.job_sources where id='market-source'),2,'Raw health count preserves the current API window count');
select is((select relevant_count from public.source_runs where id='72000000-0000-0000-0000-000000000002'),3,'Safe run diagnostics use the reconciled nonclosed relevant count');
select is((select count(*)::integer from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),4,'New excluded identities do not cache descriptions; prior closed details remain');

select lives_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',pg_temp.market_statuses(),true,0,null,now()-interval '1 day')$q$,'A zero-sized moving window may succeed with complete independent status coverage');
select is((select availability from public.catalog_jobs where source_id='market-source' and external_id='uncertain'),'availability_unconfirmed','Repeated unknown statuses days apart never become closure proof');
select is((select count(*)::integer from public.catalog_jobs where source_id='market-source' and availability='closed'),1,'Moving-window absence never closes other known IDs');
select is((select snapshot_count from public.job_sources where id='market-source'),0,'Successful empty window records an honest zero discovery count');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',pg_temp.market_statuses()||'[{"external_id":"to-close","status":"active"}]',true,0)$q$,'22023',null,'Already closed IDs are outside the required aged-out status set');

select is((public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0,null,now()-interval '2 days')->>'status'),'quarantined','Out-of-order windows cannot rewind reconciliation');
select is((select last_success_at from public.job_sources where id='market-source'),now()-interval '1 day','Out-of-order success cannot change the successful timestamp');
select is((select last_run_status from public.job_sources where id='market-source'),'success','Out-of-order quarantine cannot replace newer public source health');
select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',false,0,null,now()-interval '2 days');
select is((select last_run_status from public.job_sources where id='market-source'),'success','An older failure cannot replace newer public source health');

-- Reappearance updates the existing stable identity and clears uncertainty.
select lives_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),
  jsonb_build_array(pg_temp.market_job('to-close')||'{"title":"Reopened Graduate Analyst","content_hash":"new-hash"}'),pg_temp.market_statuses('active'),true,1,null,now()-interval '12 hours')$q$,'A reappearing previously closed listing reopens with complete status coverage for other IDs');
select is((select availability from public.catalog_jobs where source_id='market-source' and external_id='to-close'),'open','Current-window presence explicitly reopens its stable ID');
select is((select first_seen_at from public.catalog_jobs where source_id='market-source' and external_id='to-close'),now()-interval '5 days','Reopening retains original discovery time');
select is((select title from public.catalog_jobs where source_id='market-source' and external_id='to-close'),'Reopened Graduate Analyst','New window content updates a stable listing');
select is((select missing_count from public.catalog_jobs where source_id='market-source' and external_id='to-close'),0,'Current presence resets missing counters');

-- Rolling windows may shrink by over 60%; independent ID checks are the safety
-- condition instead of the full-employer-board mass-drop heuristic.
update public.job_sources set raw_count=100,snapshot_count=100 where id='market-source';
select is((public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',pg_temp.market_statuses('active'),true,0,null,now()-interval '6 hours')->>'status'),'success','A large moving-window count drop is valid with exhaustive independent checks');
select is((public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('fresh')),'[]',true,0,null,now()-interval '5 hours')->>'status'),'quarantined','A raw count smaller than the supplied window is quarantined');

select lives_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),
  jsonb_build_array(pg_temp.market_job('to-close')||jsonb_build_object('content_hash','new-hash','summary',
    jsonb_build_object('company','Changed without a new hash','classification',jsonb_build_object('scope','included')))),
  (select jsonb_agg(s) from jsonb_array_elements(pg_temp.market_statuses('active')) s where s->>'external_id'<>'to-close'),
  true,1,null,now()-interval '4 hours')$q$,'Unchanged-hash window refresh follows the existing stable-content rules');
select is((select summary->>'company' from public.catalog_jobs where source_id='market-source' and external_id='to-close'),'Actual Hiring Company','An unchanged content hash preserves the previous normalized summary');
select is((select updated_at from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source' and c.external_id='to-close'),now()-interval '5 days','Identical description and evidence do not manufacture a details update timestamp');

select set_config('test.market_before',(select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('dup'),pg_temp.market_job('dup')),pg_temp.market_statuses(),true,2)$q$,'22023',null,'Duplicate window IDs reject atomically');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad')||'{"posting_url":"javascript:alert(1)"}'),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Unsafe posting URL rejects atomically');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad')||'{"application_url":"https://trusted.invalid@other.invalid/job"}'),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Credential-bearing application URL is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad','invented')),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Invalid role scope rejects atomically');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad')||jsonb_build_object('summary','{}'::jsonb)),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Missing actual employer name rejects a market record');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad')||jsonb_build_object('title',repeat('x',501))),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Overlong title is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('bad')||jsonb_build_object('description',repeat('x',80001))),pg_temp.market_statuses(),true,1)$q$,'22023',null,'Overlong source description is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'{}','[]',true,0)$q$,'22023',null,'A nonarray discovery payload is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','{}',true,0)$q$,'22023',null,'A nonarray independent-status payload is rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),(select jsonb_agg(pg_temp.market_job(i::text)) from generate_series(1,10001) i),'[]',true,10001)$q$,'22023',null,'Window records are bounded to 10000');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]',(select jsonb_agg(jsonb_build_object('external_id',i::text,'status','active')) from generate_series(1,10001) i),true,0)$q$,'22023',null,'Independent status records are bounded to 10000');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),jsonb_build_array(pg_temp.market_job('large')||jsonb_build_object('description',repeat('x',25000001))),'[]',true,1)$q$,'22023',null,'Combined market payload is bounded to 25 MB');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,-1)$q$,'22023',null,'Negative raw counts are rejected');
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0,null,now()+interval '6 minutes')$q$,'22023',null,'Future verification timestamps are rejected');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'All malformed market snapshots preserve the full valid catalog');

select set_config('test.market_details_before',(select jsonb_agg(to_jsonb(d) order by d.job_id)::text from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),true);
select set_config('test.market_source_before',(select to_jsonb(s)::text from public.job_sources s where id='market-source'),true);
select set_config('test.market_runs_before',(select count(*)::text from public.source_runs where source_id='market-source'),true);
select throws_ok($q$select public.finalize_market_source_run('market-source',gen_random_uuid(),
  jsonb_build_array(pg_temp.market_job('valid-before-error'),pg_temp.market_job('bad-time')||'{"source_published_at":"not-a-timestamp"}'),
  pg_temp.market_statuses('active'),true,2)$q$,'22007',null,'An invalid timestamp after an earlier valid loop write aborts the whole transaction');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'A later write failure rolls back every earlier catalog insertion');
select is((select jsonb_agg(to_jsonb(d) order by d.job_id)::text from public.job_details d join public.catalog_jobs c on c.id=d.job_id where c.source_id='market-source'),current_setting('test.market_details_before'),'A later write failure rolls back earlier cached detail insertion');
select is((select to_jsonb(s)::text from public.job_sources s where id='market-source'),current_setting('test.market_source_before'),'A rejected transaction preserves all prior source health');
select is((select count(*)::text from public.source_runs where source_id='market-source'),current_setting('test.market_runs_before'),'A rejected transaction leaves no completed diagnostic');

reset role;
update public.job_sources set enabled=false where id='market-source';
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is((public.finalize_market_source_run('market-source',gen_random_uuid(),'[]','[]',true,0)->>'status'),'quarantined','Disabled market sources cannot publish');
select is((select jsonb_agg(to_jsonb(c) order by external_id)::text from public.catalog_jobs c where source_id='market-source'),current_setting('test.market_before'),'Disabled source quarantine preserves catalog data');
reset role;
select * from finish();
rollback;
