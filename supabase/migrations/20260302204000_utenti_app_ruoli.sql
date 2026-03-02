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

create table if not exists public.app_utenti (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique null references auth.users (id) on delete set null,
  email text not null unique,
  nome_completo text null,
  ruolo public.app_role not null,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_utenti_strutture (
  utente_id uuid not null references public.app_utenti (id) on delete cascade,
  struttura text not null,
  created_at timestamptz not null default now(),
  constraint app_utenti_strutture_pkey primary key (utente_id, struttura)
);

create index if not exists app_utenti_strutture_struttura_idx
  on public.app_utenti_strutture (struttura);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_utenti_set_updated_at on public.app_utenti;
create trigger trg_app_utenti_set_updated_at
before update on public.app_utenti
for each row
execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select u.ruolo
  from public.app_utenti u
  where u.attivo = true
    and (
      u.auth_user_id = auth.uid()
      or lower(u.email) = lower(coalesce(auth.jwt()->>'email', ''))
    )
  order by case when u.auth_user_id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'::public.app_role;
$$;

create or replace function public.current_user_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'manager'::public.app_role;
$$;

create or replace function public.current_user_is_responsabile_casa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'responsabile_casa'::public.app_role;
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_manager() to authenticated;
grant execute on function public.current_user_is_responsabile_casa() to authenticated;

alter table public.app_utenti enable row level security;
alter table public.app_utenti_strutture enable row level security;

drop policy if exists app_utenti_admin_all on public.app_utenti;
create policy app_utenti_admin_all
on public.app_utenti
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists app_utenti_self_select on public.app_utenti;
create policy app_utenti_self_select
on public.app_utenti
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
);

drop policy if exists app_utenti_strutture_admin_all on public.app_utenti_strutture;
create policy app_utenti_strutture_admin_all
on public.app_utenti_strutture
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists app_utenti_strutture_self_select on public.app_utenti_strutture;
create policy app_utenti_strutture_self_select
on public.app_utenti_strutture
for select
to authenticated
using (
  exists (
    select 1
    from public.app_utenti u
    where u.id = app_utenti_strutture.utente_id
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(coalesce(auth.jwt()->>'email', ''))
      )
  )
);

-- Policies dati (solo se le tabelle esistono)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'case_alloggio_submissions'
  ) then
    alter table public.case_alloggio_submissions enable row level security;

    drop policy if exists case_alloggio_admin_all on public.case_alloggio_submissions;
    create policy case_alloggio_admin_all
    on public.case_alloggio_submissions
    for all
    to authenticated
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());

    drop policy if exists case_alloggio_manager_select on public.case_alloggio_submissions;
    create policy case_alloggio_manager_select
    on public.case_alloggio_submissions
    for select
    to authenticated
    using (public.current_user_is_manager());

    drop policy if exists case_alloggio_responsabile_select on public.case_alloggio_submissions;
    create policy case_alloggio_responsabile_select
    on public.case_alloggio_submissions
    for select
    to authenticated
    using (
      public.current_user_is_responsabile_casa()
      and exists (
        select 1
        from public.app_utenti u
        join public.app_utenti_strutture us on us.utente_id = u.id
        where (u.auth_user_id = auth.uid()
          or lower(u.email) = lower(coalesce(auth.jwt()->>'email', '')))
          and lower(us.struttura) = lower(case_alloggio_submissions.struttura)
      )
    );
  end if;
end $$;

-- Esempi assegnazione ruoli:
-- insert into public.app_utenti (email, nome_completo, ruolo)
-- values
--   ('admin@tuodominio.it', 'Admin', 'admin'),
--   ('manager@tuodominio.it', 'Manager', 'manager'),
--   ('resp.buonpastore@tuodominio.it', 'Resp Casa Buon Pastore', 'responsabile_casa');
--
-- insert into public.app_utenti_strutture (utente_id, struttura)
-- select id, 'Buon Pastore'
-- from public.app_utenti
-- where email = 'resp.buonpastore@tuodominio.it';
