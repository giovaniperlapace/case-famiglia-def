alter table public.app_utenti
  add column if not exists nome text null,
  add column if not exists cognome text null,
  add column if not exists telefono text null;

alter table public.app_utenti
  alter column ruolo set default 'responsabile_casa'::public.app_role;

-- Backfill split name only when separate fields are still empty.
update public.app_utenti
set
  nome = split_part(trim(nome_completo), ' ', 1),
  cognome = nullif(trim(substr(trim(nome_completo), length(split_part(trim(nome_completo), ' ', 1)) + 1)), '')
where nome_completo is not null
  and (nome is null and cognome is null);
