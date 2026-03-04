alter table public.case_alloggio_submissions
  add column if not exists id_utente uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_alloggio_submissions_id_utente_fkey'
      and conrelid = 'public.case_alloggio_submissions'::regclass
  ) then
    alter table public.case_alloggio_submissions
      add constraint case_alloggio_submissions_id_utente_fkey
      foreign key (id_utente)
      references public.app_utenti (id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists case_alloggio_submissions_id_utente_idx
  on public.case_alloggio_submissions (id_utente);
