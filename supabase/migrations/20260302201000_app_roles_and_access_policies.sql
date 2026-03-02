do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role'
      and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('admin', 'manager', 'responsabile_casa');
  end if;
end $$;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  full_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.responsabili_case (
  user_id uuid not null references auth.users (id) on delete cascade,
  struttura text not null,
  created_at timestamptz not null default now(),
  constraint responsabili_case_pkey primary key (user_id, struttura)
);

create index if not exists responsabili_case_struttura_idx
  on public.responsabili_case (struttura);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_set_updated_at on public.user_profiles;
create trigger trg_user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.user_profiles up
  where up.user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin'::public.app_role;
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'manager'::public.app_role;
$$;

create or replace function public.is_responsabile_casa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'responsabile_casa'::public.app_role;
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_responsabile_casa() to authenticated;

alter table public.user_profiles enable row level security;
alter table public.responsabili_case enable row level security;

grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.responsabili_case to authenticated;

-- user_profiles policies
drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all
on public.user_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists user_profiles_manager_select on public.user_profiles;
create policy user_profiles_manager_select
on public.user_profiles
for select
to authenticated
using (public.is_manager());

drop policy if exists user_profiles_self_select on public.user_profiles;
create policy user_profiles_self_select
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

-- responsabili_case policies
drop policy if exists responsabili_case_admin_all on public.responsabili_case;
create policy responsabili_case_admin_all
on public.responsabili_case
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists responsabili_case_manager_select on public.responsabili_case;
create policy responsabili_case_manager_select
on public.responsabili_case
for select
to authenticated
using (public.is_manager());

drop policy if exists responsabili_case_self_select on public.responsabili_case;
create policy responsabili_case_self_select
on public.responsabili_case
for select
to authenticated
using (auth.uid() = user_id);

-- submissions policies
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'submissions'
  ) then
    alter table public.submissions enable row level security;
    grant select, insert, update, delete on table public.submissions to authenticated;

    drop policy if exists submissions_select_own on public.submissions;
    drop policy if exists submissions_admin_all on public.submissions;
    create policy submissions_admin_all
    on public.submissions
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists submissions_manager_select on public.submissions;
    create policy submissions_manager_select
    on public.submissions
    for select
    to authenticated
    using (public.is_manager());

    drop policy if exists submissions_select_own on public.submissions;
    create policy submissions_select_own
    on public.submissions
    for select
    to authenticated
    using (lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')));
  end if;
end $$;

-- case_alloggio_submissions policies
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'case_alloggio_submissions'
  ) then
    alter table public.case_alloggio_submissions enable row level security;
    grant select, insert, update, delete on table public.case_alloggio_submissions to authenticated;

    drop policy if exists case_alloggio_submissions_select_own on public.case_alloggio_submissions;
    drop policy if exists case_alloggio_submissions_admin_all on public.case_alloggio_submissions;
    create policy case_alloggio_submissions_admin_all
    on public.case_alloggio_submissions
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists case_alloggio_submissions_manager_select on public.case_alloggio_submissions;
    create policy case_alloggio_submissions_manager_select
    on public.case_alloggio_submissions
    for select
    to authenticated
    using (public.is_manager());

    drop policy if exists case_alloggio_submissions_responsabile_casa_select on public.case_alloggio_submissions;
    create policy case_alloggio_submissions_responsabile_casa_select
    on public.case_alloggio_submissions
    for select
    to authenticated
    using (
      public.is_responsabile_casa()
      and exists (
        select 1
        from public.responsabili_case rc
        where rc.user_id = auth.uid()
          and lower(rc.struttura) = lower(case_alloggio_submissions.struttura)
      )
    );
  end if;
end $$;

-- Esempi di bootstrap ruoli (sostituisci UUID reali utenti auth.users):
-- insert into public.user_profiles (user_id, role, full_name)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin User'),
--   ('00000000-0000-0000-0000-000000000002', 'manager', 'Manager User'),
--   ('00000000-0000-0000-0000-000000000003', 'responsabile_casa', 'Responsabile Casa A');
--
-- insert into public.responsabili_case (user_id, struttura)
-- values ('00000000-0000-0000-0000-000000000003', 'Buon Pastore');
