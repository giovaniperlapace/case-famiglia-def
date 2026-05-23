create or replace function public.normalize_person_name(p_value text)
returns text
language sql
immutable
as $$
  select nullif(initcap(lower(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g'))), '')
$$;

create or replace function public.set_case_alloggio_person_names_normalized()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nome_della_persona := public.normalize_person_name(new.nome_della_persona);
  new.cognome := public.normalize_person_name(new.cognome);
  return new;
end;
$$;

drop trigger if exists trg_case_alloggio_person_names_normalized
  on public.case_alloggio_submissions;

create trigger trg_case_alloggio_person_names_normalized
before insert or update of nome_della_persona, cognome
on public.case_alloggio_submissions
for each row
execute function public.set_case_alloggio_person_names_normalized();

update public.case_alloggio_submissions
set
  nome_della_persona = public.normalize_person_name(nome_della_persona),
  cognome = public.normalize_person_name(cognome)
where nome_della_persona is distinct from public.normalize_person_name(nome_della_persona)
   or cognome is distinct from public.normalize_person_name(cognome);
