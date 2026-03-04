-- Align authorization to schema source of truth:
-- app_utenti + app_utenti_strutture drive access to shelter-scoped data.

create or replace function public.can_access_struttura(target_struttura text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_utenti u
    join public.app_utenti_strutture us on us.utente_id = u.id
    where u.attivo = true
      and (
        u.auth_user_id = auth.uid()
        or lower(u.email) = lower(coalesce(auth.jwt()->>'email', ''))
      )
      and lower(us.struttura) = lower(coalesce(target_struttura, ''))
  );
$$;

grant execute on function public.can_access_struttura(text) to authenticated;

-- app_utenti tables: explicit grants for authenticated + RLS policies already present.
grant select on table public.app_utenti to authenticated;
grant select on table public.app_utenti_strutture to authenticated;

-- submissions (generic payload store): read-only for coordinators, full for admins.
alter table public.submissions enable row level security;
grant select on table public.submissions to authenticated;

drop policy if exists submissions_select_own on public.submissions;
drop policy if exists submissions_admin_all on public.submissions;
drop policy if exists submissions_manager_select on public.submissions;

create policy submissions_admin_all
on public.submissions
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy submissions_manager_select
on public.submissions
for select
to authenticated
using (public.current_user_is_manager());

create policy submissions_responsabile_select
on public.submissions
for select
to authenticated
using (
  public.current_user_is_responsabile_casa()
  and public.can_access_struttura(normalized_data->>'struttura')
);

-- case_alloggio_submissions (operational table): coordinators can read/update only assigned shelters.
alter table public.case_alloggio_submissions enable row level security;
grant select, update on table public.case_alloggio_submissions to authenticated;

drop policy if exists case_alloggio_submissions_select_own on public.case_alloggio_submissions;
drop policy if exists case_alloggio_admin_all on public.case_alloggio_submissions;
drop policy if exists case_alloggio_manager_select on public.case_alloggio_submissions;
drop policy if exists case_alloggio_responsabile_select on public.case_alloggio_submissions;
drop policy if exists case_alloggio_submissions_admin_all on public.case_alloggio_submissions;
drop policy if exists case_alloggio_submissions_manager_select on public.case_alloggio_submissions;
drop policy if exists case_alloggio_submissions_responsabile_casa_select on public.case_alloggio_submissions;
drop policy if exists case_alloggio_submissions_responsabile_casa_update on public.case_alloggio_submissions;

create policy case_alloggio_submissions_admin_all
on public.case_alloggio_submissions
for all
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy case_alloggio_submissions_manager_select
on public.case_alloggio_submissions
for select
to authenticated
using (public.current_user_is_manager());

create policy case_alloggio_submissions_responsabile_casa_select
on public.case_alloggio_submissions
for select
to authenticated
using (
  public.current_user_is_responsabile_casa()
  and public.can_access_struttura(struttura)
);

create policy case_alloggio_submissions_responsabile_casa_update
on public.case_alloggio_submissions
for update
to authenticated
using (
  public.current_user_is_responsabile_casa()
  and public.can_access_struttura(struttura)
)
with check (
  public.current_user_is_responsabile_casa()
  and public.can_access_struttura(struttura)
);
