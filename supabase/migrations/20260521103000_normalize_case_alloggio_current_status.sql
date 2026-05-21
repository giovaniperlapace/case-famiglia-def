create or replace function public.derive_case_alloggio_current_status(
  p_current_status text,
  p_data_uscita text,
  p_data_decesso text,
  p_tipo_aggiornamento text
)
returns text
language sql
immutable
as $$
  select case
    when p_current_status in ('IN_ACCOGLIENZA', 'USCITO', 'DECEDUTO') then p_current_status
    when nullif(p_data_decesso, '') is not null then 'DECEDUTO'
    when nullif(p_data_uscita, '') is not null then 'USCITO'
    when lower(coalesce(p_tipo_aggiornamento, '')) like '%decesso%' then 'DECEDUTO'
    when lower(coalesce(p_tipo_aggiornamento, '')) like '%uscita%' then 'USCITO'
    else 'IN_ACCOGLIENZA'
  end
$$;

create or replace function public.set_case_alloggio_current_status_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_status is null then
    new.current_status := public.derive_case_alloggio_current_status(
      new.current_status,
      new.data_uscita,
      new.data_decesso,
      new.tipo_aggiornamento
    );
  end if;

  if new.current_status is not null and new.current_status_at is null then
    new.current_status_at := coalesce(new.submitted_at, new.created_at, now());
  end if;

  if new.current_status = 'DECEDUTO' and new.deceased_at is null then
    new.deceased_at := new.current_status_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_case_alloggio_current_status_defaults
  on public.case_alloggio_submissions;

create trigger trg_case_alloggio_current_status_defaults
before insert or update of current_status, current_status_at, data_uscita, data_decesso, tipo_aggiornamento
on public.case_alloggio_submissions
for each row
execute function public.set_case_alloggio_current_status_defaults();

update public.case_alloggio_submissions
set
  current_status = public.derive_case_alloggio_current_status(
    current_status,
    data_uscita,
    data_decesso,
    tipo_aggiornamento
  ),
  current_status_at = coalesce(current_status_at, submitted_at, created_at, now()),
  deceased_at = case
    when public.derive_case_alloggio_current_status(
      current_status,
      data_uscita,
      data_decesso,
      tipo_aggiornamento
    ) = 'DECEDUTO' then coalesce(deceased_at, current_status_at, submitted_at, created_at, now())
    else deceased_at
  end
where current_status is null
   or current_status_at is null
   or (
    public.derive_case_alloggio_current_status(
      current_status,
      data_uscita,
      data_decesso,
      tipo_aggiornamento
    ) = 'DECEDUTO'
    and deceased_at is null
   );
