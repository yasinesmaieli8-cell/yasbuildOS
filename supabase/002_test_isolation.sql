-- Tests execute within a transaction and end in ROLLBACK; use only in a test project.
begin;
insert into auth.users (id,email) values ('11111111-1111-4111-8111-111111111111','yb-phase3-test-a@example.invalid'),('22222222-2222-4222-8222-222222222222','yb-phase3-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.yb_projects(id,name) values ('33333333-3333-4333-8333-333333333333','test');
insert into public.yb_calculations(project_id,tool_name,title,inputs,outputs) values ('33333333-3333-4333-8333-333333333333','test','test','{}','{}');
do $$ begin if (select count(*) from public.yb_projects) <> 1 or (select count(*) from public.yb_calculations) <> 1 then raise exception 'owner access failed'; end if; end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare blocked boolean := false; begin if (select count(*) from public.yb_projects) <> 0 or (select count(*) from public.yb_calculations) <> 0 then raise exception 'cross-user read allowed'; end if; begin insert into public.yb_projects(owner_id,name) values ('11111111-1111-4111-8111-111111111111','forged'); exception when insufficient_privilege then blocked := true; end; if not blocked then raise exception 'owner forgery allowed'; end if; end $$;
do $$ declare affected integer; begin update public.yb_projects set name='bad' where id='33333333-3333-4333-8333-333333333333'; get diagnostics affected = row_count; if affected <> 0 then raise exception 'cross-user update allowed'; end if; delete from public.yb_projects where id='33333333-3333-4333-8333-333333333333'; get diagnostics affected = row_count; if affected <> 0 then raise exception 'cross-user delete allowed'; end if; end $$;
rollback;
