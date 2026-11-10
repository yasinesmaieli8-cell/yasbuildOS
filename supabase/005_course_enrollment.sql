-- Run after review on the intended Supabase project; this file does not activate itself.
begin;
create table public.yb_course_enrollments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null check (course_id = 'budget-intro-v1'),
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
alter table public.yb_course_enrollments enable row level security;
revoke all on public.yb_course_enrollments from public, anon, authenticated;
grant select, insert on public.yb_course_enrollments to authenticated;
create policy yb_course_enrollment_select on public.yb_course_enrollments for select to authenticated using (user_id = (select auth.uid()));
create policy yb_course_enrollment_insert on public.yb_course_enrollments for insert to authenticated with check (user_id = (select auth.uid()));
commit;
