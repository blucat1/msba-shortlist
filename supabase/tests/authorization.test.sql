begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select no_plan();

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('10000000-0000-0000-0000-000000000001','a@example.invalid','{}','{}',now(),now()),
       ('20000000-0000-0000-0000-000000000002','b@example.invalid','{}','{}',now(),now());
insert into public.employers(id,name,careers_url) values('test-employer','Test Employer','https://example.invalid/careers');
insert into public.job_sources(id,employer_id,provider,board_id,state,enabled)
values('test-source','test-employer','greenhouse','test-board','verified',true);
insert into public.catalog_jobs(id,source_id,external_id,employer_id,title,posting_url,application_url,content_hash)
values('30000000-0000-0000-0000-000000000003','test-source','test-job','test-employer','Analyst','https://example.invalid/job','https://example.invalid/apply','hash');
insert into public.opportunities(id,user_id,company,title,company_key)
values('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','Private B','Secret B','manual:b');
insert into public.tasks(id,user_id,opportunity_id,title)
values('50000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','Private B task');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select lives_ok('select * from public.catalog_jobs','Anonymous visitors can read the public catalog');
select lives_ok('select * from public.source_coverage','Public coverage is readable');
select throws_ok('select * from public.opportunities','42501',null,'Anonymous cannot read private opportunities');
select throws_ok('select * from public.tasks','42501',null,'Anonymous cannot read private tasks');
select throws_ok('select * from public.source_runs','42501',null,'Source diagnostics are not public');
select throws_ok($q$insert into public.employers(id,name,careers_url) values('evil','Evil','https://example.invalid')$q$,'42501',null,'Anonymous cannot write catalog');
select throws_ok($q$select public.change_opportunity_stage('40000000-0000-0000-0000-000000000004','Applied','anon-key')$q$,'42501',null,'Anonymous cannot execute private RPC');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.opportunities),0,'User A cannot select B opportunities');
select is((select count(*)::integer from public.tasks),0,'User A cannot select B tasks');
select results_eq($q$delete from public.opportunities where id='40000000-0000-0000-0000-000000000004' returning id$q$,$q$select null::uuid where false$q$,'User A cannot delete B opportunity');
select results_eq($q$update public.tasks set title='Attack edit' where id='50000000-0000-0000-0000-000000000005' returning id$q$,$q$select null::uuid where false$q$,'User A cannot edit B task');
select throws_ok($q$update public.opportunities set stage='Offer' where id='40000000-0000-0000-0000-000000000004'$q$,'42501',null,'Direct stage writes are forbidden');
select throws_ok($q$insert into public.tasks(user_id,opportunity_id,title) values('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','Forged parent')$q$,'23503',null,'Composite parent FK rejects attaching an A task to B opportunity');
select throws_ok($q$insert into public.tasks(user_id,opportunity_id,title) values('20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','Forged owner')$q$,'42501',null,'WITH CHECK rejects a B-owned task from A');
select throws_ok($q$select public.change_opportunity_stage('40000000-0000-0000-0000-000000000004','Offer','forged-key')$q$,'42501',null,'Forged RPC target cannot modify B');
select throws_ok($q$select public.save_opportunity('{"id":"40000000-0000-0000-0000-000000000004","company":"Forged","title":"Forged","companyKey":"manual:evil","stage":"Saved"}')$q$,'42501',null,'Forged save cannot overwrite B');
select throws_ok($q$insert into public.opportunity_events(user_id,opportunity_id,event_type,idempotency_key) values('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','stage_changed','fake')$q$,'42501',null,'Client cannot insert arbitrary history directly');
select throws_ok($q$select public.finalize_source_run('test-source',gen_random_uuid(),'[]',true,0)$q$,'42501',null,'Authenticated client cannot impersonate ingestion');
select throws_ok($q$select public.run_catalog_maintenance()$q$,'42501',null,'Authenticated client cannot prune catalog');
select throws_ok($q$select public.save_opportunity('{"expectedUserId":"20000000-0000-0000-0000-000000000002","company":"Prior account draft","title":"Analyst","companyKey":"manual:prior"}')$q$,'42501',null,'An account switch rejects a previously initiated save');
select throws_ok($q$select public.import_tracker_backup('{"version":1,"expectedUserId":"20000000-0000-0000-0000-000000000002","opportunities":[] }')$q$,'42501',null,'An account switch rejects a previously initiated import');
select throws_ok($q$select public.import_tracker_backup('{"version":1,"sourceMode":"demo","opportunities":[] }')$q$,'22023',null,'A demo-origin backup cannot merge into a cloud account');
select lives_ok($q$select public.save_opportunity('{"id":"60000000-0000-0000-0000-000000000006","userId":"20000000-0000-0000-0000-000000000002","company":"Mine","title":"My Analyst","companyKey":"manual:mine","stage":"Saved"}')$q$,'Owner may create an opportunity; submitted owner is ignored');
select is((select user_id::text from public.opportunities where id='60000000-0000-0000-0000-000000000006'),'10000000-0000-0000-0000-000000000001','Creation derives ownership from auth.uid()');
select lives_ok($q$insert into public.tasks(id,opportunity_id,title) values('61000000-0000-0000-0000-000000000006','60000000-0000-0000-0000-000000000006','Own task')$q$,'Owner can create task for own parent');
select throws_ok($q$update public.tasks set user_id='20000000-0000-0000-0000-000000000002' where id='61000000-0000-0000-0000-000000000006'$q$,'42501',null,'Owner cannot transfer record ownership');
select lives_ok($q$select public.record_application_opened('60000000-0000-0000-0000-000000000006','open-1')$q$,'Application opening is recorded');
select is((select stage from public.opportunities where id='60000000-0000-0000-0000-000000000006'),'Saved','Opening application does not mark Applied');
select is((select application_date from public.opportunities where id='60000000-0000-0000-0000-000000000006'),null::date,'Opening application does not fabricate a date');
select lives_ok($q$select public.change_opportunity_stage('60000000-0000-0000-0000-000000000006','Applied','stage-1',now(),'2026-10-20')$q$,'Explicit application confirmation changes stage');
select lives_ok($q$select public.change_opportunity_stage('60000000-0000-0000-0000-000000000006','Applied','stage-1',now(),'2026-10-20')$q$,'Status retry is idempotent');
select is((select count(*)::integer from public.opportunity_events where idempotency_key='stage-1'),1,'A retry creates exactly one historical event');
select throws_ok($q$select public.change_opportunity_stage('60000000-0000-0000-0000-000000000006','Offer','stage-1')$q$,'22023',null,'Reusing an idempotency key for a different action fails');
select throws_ok($q$select public.change_opportunity_stage('60000000-0000-0000-0000-000000000006','Applied','stage-1',now(),'2026-10-19')$q$,'22023',null,'A changed application-date payload cannot reuse a prior action key');
select lives_ok($q$select public.change_opportunity_stage('60000000-0000-0000-0000-000000000006','Applied','correct-date-1',now(),'2026-10-19')$q$,'Explicit same-stage application date correction succeeds');
select is((select application_date from public.opportunities where id='60000000-0000-0000-0000-000000000006'),'2026-10-19'::date,'Same-stage confirmation updates the corrected date');
select is((select count(*)::integer from public.opportunity_events where idempotency_key='correct-date-1' and event_type='application_date_corrected'),1,'Date correction is audited separately from a submission');
select lives_ok($q$select public.save_opportunity('{"id":"60000000-0000-0000-0000-000000000006","company":"Mine","title":"My Analyst","companyKey":"manual:mine","stage":"Applied","applicationDate":"2026-10-18","applicationDatePrecision":"day"}')$q$,'Generic edit corrects date while preserving current stage');
select is((select count(*)::integer from public.opportunity_events where opportunity_id='60000000-0000-0000-0000-000000000006' and event_type='application_date_corrected'),2,'Generic edit appends a date-correction audit event');
select throws_ok($q$insert into public.profiles(user_id) values('20000000-0000-0000-0000-000000000002')$q$,'42501',null,'Profile WITH CHECK blocks another user identity');
select lives_ok($q$select public.import_tracker_backup('{"version":1,"opportunities":[{"id":"untrusted-import-id","userId":"20000000-0000-0000-0000-000000000002","company":"Imported","title":"Data Scientist","companyKey":"manual:imported","stage":"Interviewing"}],"tasks":[{"opportunityId":"untrusted-import-id","userId":"20000000-0000-0000-0000-000000000002","title":"Prepare","type":"interview"}],"events":[{"id":"foreign-event","opportunityId":"untrusted-import-id","userId":"20000000-0000-0000-0000-000000000002","type":"stage_changed","newStage":"Interviewing","idempotencyKey":"foreign-key"}]}')$q$,'Import remaps arbitrary imported identity and parent IDs');
select is((select count(*)::integer from public.opportunities where company='Imported' and user_id='10000000-0000-0000-0000-000000000001'),1,'Imported opportunity belongs to caller');
select is((select application_date from public.opportunities where company='Imported'),null::date,'Historical Interviewing import does not invent application date');
select is((select count(*)::integer from public.tasks where title='Prepare' and user_id='10000000-0000-0000-0000-000000000001'),1,'Imported child belongs to caller');
select is((select provenance from public.opportunity_events where idempotency_key like 'import:%' limit 1),'import','Imported history retains provenance');
select throws_ok($q$select public.import_tracker_backup('{"version":1,"opportunities":[{"id":"demo","company":"Sample","title":"Fake","companyKey":"sample","snapshot":{"isDemo":true}}]}')$q$,'22023',null,'Demo fixture cannot be merged into cloud account');
reset role;

select throws_ok($q$insert into public.opportunity_events(user_id,opportunity_id,event_type,idempotency_key) values('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','created','admin-forged-parent')$q$,'23503',null,'Event composite FK prevents cross-owner parents even with privileged table access');
select is((select stage from public.opportunities where id='40000000-0000-0000-0000-000000000004'),'Saved','All attacks preserved B stage');
select is((select count(*)::integer from public.tasks where user_id='20000000-0000-0000-0000-000000000002'),1,'All attacks preserved B tasks');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='source_coverage' and column_name in ('user_id','email','warning')),'Public status exposes no private identity or raw diagnostics');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),'Every exposed table has RLS enabled');

update public.job_sources set enabled=false where id='test-source';
set local role anon;
select is((select count(*)::integer from public.catalog_jobs),0,'Disabled sources disappear immediately at the public database boundary');
reset role;
update public.job_sources set enabled=true where id='test-source';

-- Auth deletion cascades private data while the shared catalog remains intact.
delete from auth.users where id='10000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.opportunities where user_id='10000000-0000-0000-0000-000000000001'),0,'Auth deletion cascades private opportunities');
select is((select count(*)::integer from public.tasks where user_id='10000000-0000-0000-0000-000000000001'),0,'Auth deletion cascades private tasks');
select is((select count(*)::integer from public.opportunity_events where user_id='10000000-0000-0000-0000-000000000001'),0,'Auth deletion cascades private history');
select is((select count(*)::integer from public.catalog_jobs),1,'Account deletion preserves shared catalog');
select * from finish();
rollback;
