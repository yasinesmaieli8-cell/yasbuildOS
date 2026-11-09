import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const db = new PGlite();
await db.waitReady;
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
await db.exec(await readFile('supabase/001_phase3.sql','utf8'));
await db.exec(await readFile('supabase/004_project_teams.sql','utf8'));
const owner='11111111-1111-4111-8111-111111111111', viewer='22222222-2222-4222-8222-222222222222', editor='33333333-3333-4333-8333-333333333333', outsider='44444444-4444-4444-8444-444444444444', project='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await db.exec(`insert into auth.users values ('${owner}',now()),('${viewer}',now()),('${editor}',now()),('${outsider}',now()); set role authenticated;`);
async function as(id){ await db.exec(`select set_config('request.jwt.claim.sub','${id}',false);`); }
async function denied(sql,label){let ok=false;try{await db.exec(sql)}catch{ok=true}if(!ok)throw Error('expected rejection: '+label);console.log('PASS '+label)}
async function count(sql,n,label){let result=await db.query(sql);if(Number(result.rows[0].n)!==n)throw Error(label+': '+JSON.stringify(result.rows));console.log('PASS '+label)}
await as(owner);
await db.exec(`insert into public.yb_projects(id,name) values ('${project}','test'); select public.yb_invite_member('${project}','${viewer}','viewer'); select public.yb_invite_member('${project}','${editor}','editor');`);
await as(viewer);
await count(`select count(*) n from public.yb_projects where id='${project}'`,0,'pending invitation has no access');
await denied(`select public.yb_invite_member('${project}','${outsider}','editor')`,'non-owner cannot invite');
await db.exec(`select public.yb_accept_invitation('${project}')`);
await count(`select count(*) n from public.yb_projects where id='${project}'`,1,'viewer can read');
await count(`with changed as (update public.yb_projects set name='bad' where id='${project}' returning id) select count(*) n from changed`,0,'viewer cannot edit');
await denied(`insert into public.yb_calculations(project_id,owner_id,tool_name,title,inputs,outputs) values ('${project}','${owner}','x','x','{}','{}')`,'viewer cannot create calculation');
await as(editor);
await db.exec(`select public.yb_accept_invitation('${project}')`);
await count(`with changed as (update public.yb_projects set name='edited' where id='${project}' returning id) select count(*) n from changed`,1,'editor can edit');
await denied(`update public.yb_projects set owner_id='${editor}' where id='${project}'`,'editor cannot transfer ownership');
await db.exec(`insert into public.yb_calculations(project_id,owner_id,tool_name,title,inputs,outputs) values ('${project}','${owner}','x','x','{}','{}')`);
await count(`select count(*) n from public.yb_calculations where project_id='${project}'`,1,'editor can save calculation');
await count(`with gone as (delete from public.yb_projects where id='${project}' returning id) select count(*) n from gone`,0,'editor cannot delete project');
await as(outsider);
await count(`select count(*) n from public.yb_projects where id='${project}'`,0,'outsider cannot read');
await denied(`select public.yb_accept_invitation('${project}')`,'outsider cannot accept invitation');
await as(owner);
await db.exec(`select public.yb_remove_member('${project}','${viewer}')`);
await as(viewer);
await count(`select count(*) n from public.yb_projects where id='${project}'`,0,'revoked member loses access');
await db.close();
