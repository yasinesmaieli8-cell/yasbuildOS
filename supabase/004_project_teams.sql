-- Phase 3 teams. Review and test before applying; run once after 001_phase3.sql.
-- Owners invite an existing user ID; the recipient must accept before gaining access.
begin;
create schema if not exists yb_private;
revoke all on schema yb_private from public, anon;
grant usage on schema yb_private to authenticated;

create table public.yb_project_members (
  project_id uuid not null references public.yb_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index yb_project_members_user_idx on public.yb_project_members(user_id, status);
alter table public.yb_project_members enable row level security;
revoke all on public.yb_project_members from public, anon, authenticated;
grant select on public.yb_project_members to authenticated;

create function yb_private.project_role(p_project uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.yb_projects p where p.id = p_project and p.owner_id = (select auth.uid())) then 'owner'
    else (select m.role from public.yb_project_members m where m.project_id = p_project and m.user_id = (select auth.uid()) and m.status = 'active')
  end
$$;
revoke all on function yb_private.project_role(uuid) from public, anon, authenticated;
grant execute on function yb_private.project_role(uuid) to authenticated;

create policy yb_members_select on public.yb_project_members for select to authenticated
  using (user_id = (select auth.uid()) or yb_private.project_role(project_id) = 'owner');

create function public.yb_invite_member(p_project uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or yb_private.project_role(p_project) is distinct from 'owner' then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_user is null or p_user = auth.uid() or p_role not in ('viewer','editor') then raise exception 'invalid invitation'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user and u.email_confirmed_at is not null) then raise exception 'user unavailable'; end if;
  insert into public.yb_project_members(project_id,user_id,role,status) values (p_project,p_user,p_role,'pending')
  on conflict (project_id,user_id) do update set role = excluded.role, status = 'pending', created_at = now();
end $$;

create function public.yb_accept_invitation(p_project uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authorized' using errcode = '42501'; end if;
  update public.yb_project_members set status = 'active' where project_id = p_project and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'invitation unavailable'; end if;
end $$;

create function public.yb_remove_member(p_project uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or (yb_private.project_role(p_project) is distinct from 'owner' and p_user is distinct from auth.uid()) then raise exception 'not authorized' using errcode = '42501'; end if;
  delete from public.yb_project_members where project_id = p_project and user_id = p_user;
  if not found then raise exception 'membership unavailable'; end if;
end $$;

revoke all on function public.yb_invite_member(uuid,uuid,text), public.yb_accept_invitation(uuid), public.yb_remove_member(uuid,uuid) from public, anon, authenticated;
grant execute on function public.yb_invite_member(uuid,uuid,text), public.yb_accept_invitation(uuid), public.yb_remove_member(uuid,uuid) to authenticated;

drop policy yb_projects_select on public.yb_projects;
drop policy yb_projects_update on public.yb_projects;
create policy yb_projects_select on public.yb_projects for select to authenticated using (yb_private.project_role(id) is not null);
create policy yb_projects_update on public.yb_projects for update to authenticated
  using (yb_private.project_role(id) in ('owner','editor')) with check (yb_private.project_role(id) in ('owner','editor'));
-- Prevent editors or owners from changing IDs, ownership, or audit fields through direct updates.
revoke update on public.yb_projects from authenticated;
grant update (name,city,project_type,area,budget,status) on public.yb_projects to authenticated;

drop policy yb_calculations_select on public.yb_calculations;
drop policy yb_calculations_insert on public.yb_calculations;
drop policy yb_calculations_update on public.yb_calculations;
drop policy yb_calculations_delete on public.yb_calculations;
create policy yb_calculations_select on public.yb_calculations for select to authenticated using (yb_private.project_role(project_id) is not null);
create policy yb_calculations_insert on public.yb_calculations for insert to authenticated with check (yb_private.project_role(project_id) in ('owner','editor'));
create policy yb_calculations_update on public.yb_calculations for update to authenticated using (yb_private.project_role(project_id) in ('owner','editor')) with check (yb_private.project_role(project_id) in ('owner','editor'));
create policy yb_calculations_delete on public.yb_calculations for delete to authenticated using (yb_private.project_role(project_id) in ('owner','editor'));
revoke update on public.yb_calculations from authenticated;
grant update (tool_name,title,inputs,outputs) on public.yb_calculations to authenticated;
commit;
