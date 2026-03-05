-- Allow controlled deletion of guest records from operational table.
grant delete on table public.case_alloggio_submissions to authenticated;

drop policy if exists case_alloggio_submissions_manager_delete on public.case_alloggio_submissions;
create policy case_alloggio_submissions_manager_delete
on public.case_alloggio_submissions
for delete
to authenticated
using (public.current_user_is_manager());

drop policy if exists case_alloggio_submissions_responsabile_casa_delete on public.case_alloggio_submissions;
create policy case_alloggio_submissions_responsabile_casa_delete
on public.case_alloggio_submissions
for delete
to authenticated
using (
  public.current_user_is_responsabile_casa()
  and public.can_access_struttura(struttura)
);
