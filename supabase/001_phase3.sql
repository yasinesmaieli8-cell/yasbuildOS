-- YasBuildOS phase 3: private, single-owner projects and saved calculations.
-- Review and execute once on the intended Supabase project. Do not use service keys in the browser.
begin;

create table public.yb_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  city text not null default '' check (char_length(city) <= 100),
  project_type text not null default '' check (project_type in ('', 'مسکونی', 'ویلایی', 'تجاری', 'بازسازی', 'سایر')),
  area numeric check (area between 0 and 1000000000),
  budget numeric check (budget between 0 and 1000000000000000),
  status text not null default 'برنامه‌ریزی' check (status in ('برنامه‌ریزی', 'در حال اجرا', 'متوقف', 'پایان‌یافته')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.yb_calculations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null,
  tool_name text not null check (char_length(trim(tool_name)) between 1 and 150),
  title text not null check (char_length(trim(title)) between 1 and 150),
  inputs jsonb not null check (jsonb_typeof(inputs) = 'object' and pg_column_size(inputs) <= 65536),
  outputs jsonb not null check (jsonb_typeof(outputs) in ('object', 'array') and pg_column_size(outputs) <= 65536),
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references public.yb_projects(id, owner_id) on delete cascade
);

create index yb_projects_owner_idx on public.yb_projects(owner_id);
create index yb_calculations_project_owner_idx on public.yb_calculations(project_id, owner_id);
alter table public.yb_projects enable row level security;
alter table public.yb_calculations enable row level security;
revoke all on public.yb_projects, public.yb_calculations from anon, authenticated;
grant select, insert, update, delete on public.yb_projects, public.yb_calculations to authenticated;

create policy yb_projects_select on public.yb_projects for select to authenticated using (owner_id = (select auth.uid()));
create policy yb_projects_insert on public.yb_projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy yb_projects_update on public.yb_projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy yb_projects_delete on public.yb_projects for delete to authenticated using (owner_id = (select auth.uid()));
create policy yb_calculations_select on public.yb_calculations for select to authenticated using (owner_id = (select auth.uid()));
create policy yb_calculations_insert on public.yb_calculations for insert to authenticated with check (owner_id = (select auth.uid()));
create policy yb_calculations_update on public.yb_calculations for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy yb_calculations_delete on public.yb_calculations for delete to authenticated using (owner_id = (select auth.uid()));
commit;
