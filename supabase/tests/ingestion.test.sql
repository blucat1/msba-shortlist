begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();
insert into auth.users(id,email) values('90000000-0000-0000-0000-000000000009','retention@example.invalid');
insert into public.employers(id,name,careers_url) values('ingest-test','Ingest Test','https://example.invalid/careers');
insert into public.job_sources(id,employer_id,provider,board_id,state,enabled)
values('ingest-source','ingest-test','greenhouse','ingest-board','verified',true),
      ('drop-source','ingest-test','lever','drop-board','verified',true);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok($q$select public.finalize_source_run('ingest-source','71000000-0000-0000-0000-000000000001',
 '[{"external_id":"one","title":"Data Analyst","posting_url":"https://example.invalid/one","application_url":"https://example.invalid/apply-one","summary":{"classification":{"scope":"included"}},"description":"Bounded plain source text","content_hash":"one-hash"},
   {"external_id":"two","title":"Product Analyst","posting_url":"https://example.invalid/two","application_url":"https://example.invalid/apply-two","summary":{"classification":{"scope":"included"}},"description":"Original details","content_hash":"two-hash"}]',true,2,null,now()-interval '3 days')$q$,'First complete snapshot publishes atomically');
select is((select count(*)::integer from public.catalog_jobs where source_id='ingest-source'),2,'Stable source keys create exactly two jobs');
select lives_ok($q$select public.finalize_source_run('ingest-source','71000000-0000-0000-0000-000000000001','[]',true,0,null,now()-interval '2 days')$q$,'Retry of a finalized run is a replay');
select is((select count(*)::integer from public.catalog_jobs where source_id='ingest-source'),2,'Replay never duplicates or removes catalog records');
select is((select count(*)::integer from public.source_runs where source_id='ingest-source'),1,'Replay never manufactures additional completed runs');
select is((select first_seen_at from public.catalog_jobs where source_id='ingest-source' and external_id='one'),now()-interval '3 days','First discovery time is retained exactly');
select lives_ok($q$select public.finalize_source_run('ingest-source',gen_random_uuid(),'[]',false,0,'network failure',now()-interval '3 days'+interval '5 hours')$q$,'Incomplete failed check is recorded safely');
select is((select count(*)::integer from public.catalog_jobs where source_id='ingest-source' and availability='open'),2,'Failed feed cannot close or unconfirm existing records');
select is((select last_success_at from public.job_sources where id='ingest-source'),now()-interval '3 days','Failed feed does not advance last successful verification');
select is((select last_warning from public.job_sources where id='ingest-source'),'Source check failed or incomplete','Public warning is a controlled safe message rather than raw diagnostic input');

select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"one","title":"Data Analyst","posting_url":"https://example.invalid/one","application_url":"https://example.invalid/apply-one","summary":{"classification":{"scope":"included"}},"description":"Bounded plain source text","content_hash":"one-hash"}]',true,1,null,now()-interval '3 days'+interval '13 hours');
select is((select availability from public.catalog_jobs where source_id='ingest-source' and external_id='two'),'availability_unconfirmed','A single complete absence becomes unconfirmed');
select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"one","title":"Data Analyst","posting_url":"https://example.invalid/one","application_url":"https://example.invalid/apply-one","summary":{"classification":{"scope":"included"}},"description":"Bounded plain source text","content_hash":"one-hash"}]',true,1,null,now()-interval '3 days'+interval '14 hours');
select is((select availability from public.catalog_jobs where source_id='ingest-source' and external_id='two'),'availability_unconfirmed','Two absences less than 12 hours apart cannot close a listing');
select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"one","title":"Data Analyst","posting_url":"https://example.invalid/one","application_url":"https://example.invalid/apply-one","summary":{"classification":{"scope":"included"}},"description":"Bounded plain source text","content_hash":"one-hash"}]',true,1,null,now()-interval '3 days'+interval '25 hours');
select is((select availability from public.catalog_jobs where source_id='ingest-source' and external_id='two'),'closed','Two complete absences at least 12 hours apart close a listing');
select is((select description from public.job_details d join public.catalog_jobs j on j.id=d.job_id where j.source_id='ingest-source' and j.external_id='two'),'Original details','Closing preserves details for existing private snapshots');
select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"two","title":"Product Analyst reopened","posting_url":"https://example.invalid/two","application_url":"https://example.invalid/apply-two","summary":{"classification":{"scope":"included"}},"description":"Reopened details","content_hash":"two-new-hash"}]',true,1,null,now()-interval '1 day');
select is((select availability from public.catalog_jobs where source_id='ingest-source' and external_id='two'),'open','Reappearing stable source ID reopens the same catalog record');
select is((select first_seen_at from public.catalog_jobs where source_id='ingest-source' and external_id='two'),now()-interval '3 days','Reopening never replaces first discovery time');
select is((select count(*)::integer from public.catalog_jobs where source_id='ingest-source'),2,'Distinct requisitions remain distinct across repeated checks');

select public.finalize_source_run('drop-source',gen_random_uuid(),
 '[{"external_id":"stable","title":"Analyst","posting_url":"https://example.invalid/stable","application_url":"https://example.invalid/stable","summary":{"classification":{"scope":"included"}},"content_hash":"stable"}]',true,100,null,now()-interval '2 days');
select is((public.finalize_source_run('drop-source',gen_random_uuid(),'[]',true,0,null,now()-interval '1 day')->>'status'),'quarantined','Suspicious mass drop is quarantined');
select is((select availability from public.catalog_jobs where source_id='drop-source'),'open','Quarantine preserves availability');
select is((select last_success_at from public.job_sources where id='drop-source'),now()-interval '2 days','Quarantine does not advance successful verification');
select is((public.finalize_source_run('drop-source',gen_random_uuid(),'[]',true,100,'partial payload',now()-interval '12 hours')->>'status'),'quarantined','Validation warning quarantines a claimed complete payload');
select is((select availability from public.catalog_jobs where source_id='drop-source'),'open','Partial validation warning never closes jobs');
select throws_ok($q$select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"duplicate","title":"Analyst","posting_url":"https://example.invalid/a","application_url":"https://example.invalid/a","summary":{"classification":{"scope":"included"}},"content_hash":"a"},
 {"external_id":"duplicate","title":"Analyst","posting_url":"https://example.invalid/b","application_url":"https://example.invalid/b","summary":{"classification":{"scope":"included"}},"content_hash":"b"}]',true,2)$q$,'22023',null,'Duplicate IDs reject the entire snapshot');
select throws_ok($q$select public.finalize_source_run('ingest-source',gen_random_uuid(),
 '[{"external_id":"bad","title":"Analyst","posting_url":"javascript:evil()","application_url":"https://example.invalid/bad","summary":{"classification":{"scope":"included"}},"content_hash":"bad"}]',true,1)$q$,'22023',null,'Unsafe source URL rejects the snapshot');
select is((select count(*)::integer from public.catalog_jobs where source_id='ingest-source'),2,'Rejected malformed snapshots preserve valid catalog');
select is((public.finalize_source_run('ingest-source',gen_random_uuid(),'[]',true,0,null,now()-interval '2 days')->>'status'),'quarantined','Out-of-order successful snapshots cannot rewind source state');
select is((select last_run_status from public.job_sources where id='ingest-source'),'success','An out-of-order finalization cannot overwrite newer public source health');
select public.finalize_source_run('ingest-source',gen_random_uuid(),'[]',false,0,null,now()-interval '2 days');
select is((select last_run_status from public.job_sources where id='ingest-source'),'success','An older failed check cannot overwrite a newer complete success');
select public.finalize_source_run('drop-source',gen_random_uuid(),(select jsonb_agg(jsonb_build_object('external_id','listed-'||i,'title','Data Analyst','posting_url','https://example.invalid/'||i,'application_url','https://example.invalid/apply-'||i,'summary',jsonb_build_object('classification',jsonb_build_object('scope','included')),'content_hash','hash-'||i)) from generate_series(1,20) i),true,100,null,now()-interval '6 hours');
select is((public.finalize_source_run('drop-source',gen_random_uuid(),'[]',true,100,null,now()-interval '1 hour')->>'status'),'quarantined','A listed-job mass drop is quarantined even if raw unlisted count stays high');
select is((select count(*)::integer from public.catalog_jobs where source_id='drop-source' and availability='open'),20,'Listed-count quarantine preserves all prior listed availability');
select throws_ok($q$select public.run_catalog_maintenance(1)$q$,'22023',null,'Retention cannot silently shorten below 90 days');
insert into public.catalog_jobs(id,source_id,external_id,employer_id,title,posting_url,application_url,content_hash,availability,first_seen_at,last_seen_at)
values('81000000-0000-0000-0000-000000000001','ingest-source','retired-unreferenced','ingest-test','Retired Analyst','https://example.invalid/retired-one','https://example.invalid/retired-one','old-one','closed',now()-interval '120 days',now()-interval '120 days'),
      ('82000000-0000-0000-0000-000000000002','ingest-source','retired-referenced','ingest-test','Preserved Analyst','https://example.invalid/retired-two','https://example.invalid/retired-two','old-two','closed',now()-interval '120 days',now()-interval '120 days');
insert into public.job_details(job_id,description) values('81000000-0000-0000-0000-000000000001','Unreferenced obsolete details'),('82000000-0000-0000-0000-000000000002','Referenced details');
insert into public.opportunities(user_id,catalog_job_id,company,title,company_key,snapshot) values('90000000-0000-0000-0000-000000000009','82000000-0000-0000-0000-000000000002','Preserved employer','Preserved Analyst','manual:preserved','{"title":"Preserved private snapshot"}');
insert into public.source_runs(id,source_id,checked_at,finished_at,status,complete,raw_count,relevant_count) values('83000000-0000-0000-0000-000000000003','ingest-source',now()-interval '120 days',now()-interval '120 days','success',true,2,2);
select lives_ok('select public.run_catalog_maintenance()','Server maintenance executes with the supported default retention');
select is((select count(*)::integer from public.source_runs where id='83000000-0000-0000-0000-000000000003'),0,'Maintenance prunes obsolete source-run diagnostics');
select is((select count(*)::integer from public.job_details where job_id='81000000-0000-0000-0000-000000000001'),0,'Maintenance prunes unreferenced obsolete closed details');
select is((select count(*)::integer from public.job_details where job_id='82000000-0000-0000-0000-000000000002'),1,'Maintenance preserves referenced source details');
select is((select snapshot->>'title' from public.opportunities where user_id='90000000-0000-0000-0000-000000000009'),'Preserved private snapshot','Maintenance preserves private opportunity snapshots');
select is((select count(*)::integer from public.catalog_jobs where external_id like 'retired-%'),2,'Maintenance preserves stable compact catalog identities');
reset role;
select * from finish();
rollback;
