/** Supplementary PostgreSQL WASM smoke checks. Real Supabase/pgTAP tests still require Docker. */
import console from 'node:console';
import process from 'node:process';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const db = new PGlite();
await db.exec(`
create schema extensions;
create schema auth;
create role anon noinherit;
create role authenticated noinherit;
create role service_role noinherit bypassrls;
grant usage on schema public,auth,extensions to anon,authenticated,service_role;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
`);
await db.exec(`create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'$$;`);
for (const file of readdirSync('supabase/migrations').sort()) {
  const sql=readFileSync('supabase/migrations/'+file,'utf8').replace('create extension if not exists pgcrypto with schema extensions;','');
  try { await db.exec(sql); console.log('MIGRATION PASS',file); } catch(error) { console.error('MIGRATION FAIL',file,error.message,error.where);process.exit(1); }
}
await db.exec(`
create function extensions.no_plan() returns text language sql as $$select 'No fixed plan'::text$$;
create function extensions.finish() returns setof text language sql as $$select 'Finished'::text$$;
create function extensions.ok(v boolean,d text) returns text language plpgsql as $$begin if v is distinct from true then raise exception 'ASSERTION FAILED: %',d;end if;return 'PASS '||d;end$$;
create function extensions.is(v anycompatible,e anycompatible,d text) returns text language plpgsql as $$begin if v is distinct from e then raise exception 'ASSERTION FAILED: %, got %, expected %',d,v,e;end if;return 'PASS '||d;end$$;
create function extensions.lives_ok(q text,d text) returns text language plpgsql as $$begin execute q;return 'PASS '||d;exception when others then raise exception 'ASSERTION FAILED: %, SQL error % [%]',d,sqlerrm,sqlstate;end$$;
create function extensions.throws_ok(q text,e text,m text,d text) returns text language plpgsql as $$declare s text;begin begin execute q;exception when others then get stacked diagnostics s=returned_sqlstate;end;if s is distinct from e then raise exception 'ASSERTION FAILED: %, got SQLSTATE %, expected %',d,s,e;end if;return 'PASS '||d;end$$;
create function extensions.results_eq(q text,e text,d text) returns text language plpgsql as $$declare a jsonb;b jsonb;begin execute 'with q as ('||q||') select jsonb_agg(q) from q' into a;execute 'with q as ('||e||') select jsonb_agg(q) from q' into b;if a is distinct from b then raise exception 'ASSERTION FAILED: %, got %, expected %',d,a,b;end if;return 'PASS '||d;end$$;
grant execute on all functions in schema extensions to anon,authenticated,service_role;
`);
let count=0;
for(const file of readdirSync('supabase/tests').sort()) {
  const sql=readFileSync('supabase/tests/'+file,'utf8').replace('create extension if not exists pgtap with schema extensions;','');
  try {
    const result=await db.exec(sql);
    for(const part of result) for(const row of part.rows??[]) for(const val of Object.values(row)) if(typeof val==='string'&&val.startsWith('PASS ')){count++;console.log(val);}
    console.log('SUITE PASS',file);
  } catch(error) { console.error('SUITE FAIL',file,error.message,error.where);process.exit(1); }
}
console.log('PostgreSQL WASM assertion total:',count);
await db.close();
