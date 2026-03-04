-- Legacy cleanup: submissions duplicated case_alloggio_submissions data.
-- Keep webhook_events for audit; remove generic submissions store.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'submissions'
  ) then
    drop trigger if exists trg_submissions_set_updated_at on public.submissions;

    drop policy if exists submissions_select_own on public.submissions;
    drop policy if exists submissions_admin_all on public.submissions;
    drop policy if exists submissions_manager_select on public.submissions;
    drop policy if exists submissions_responsabile_select on public.submissions;

    revoke all on table public.submissions from authenticated;
    revoke all on table public.submissions from anon;

    drop table public.submissions;
  end if;
end $$;
