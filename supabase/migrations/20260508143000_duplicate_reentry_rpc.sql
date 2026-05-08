create or replace function public.create_duplicate_reentry(
  p_guest_id uuid,
  p_target_struttura text,
  p_data_rientro date,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.case_alloggio_submissions%rowtype;
  v_from_status text;
  v_target_struttura text := nullif(btrim(coalesce(p_target_struttura, '')), '');
  v_effective timestamptz := p_data_rientro::timestamptz;
  v_event public.guest_status_events%rowtype;
  v_payload jsonb;
begin
  if v_target_struttura is null then
    raise exception 'Target struttura is required';
  end if;

  if v_target_struttura <> all(array[
    'Buon Pastore',
    'San Calisto',
    'Villetta',
    'Palazzo Migliori',
    'Casa di Heidi',
    'Caio Manilio',
    'Via dei Campani'
  ]) then
    raise exception 'Invalid target struttura';
  end if;

  if not (
    public.current_user_is_admin()
    or public.current_user_is_manager()
    or public.can_access_struttura(v_target_struttura)
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_guest
  from public.case_alloggio_submissions
  where id = p_guest_id
  for update;

  if not found then
    raise exception 'Guest not found' using errcode = 'P0002';
  end if;

  v_from_status := coalesce(v_guest.current_status, case
    when nullif(v_guest.data_decesso, '') is not null then 'DECEDUTO'
    when nullif(v_guest.data_uscita, '') is not null then 'USCITO'
    when lower(coalesce(v_guest.tipo_aggiornamento, '')) like '%decesso%' then 'DECEDUTO'
    when lower(coalesce(v_guest.tipo_aggiornamento, '')) like '%uscita%' then 'USCITO'
    else 'IN_ACCOGLIENZA'
  end);

  if v_from_status <> 'USCITO' then
    raise exception 'Duplicate reentry is available only for exited guests';
  end if;

  v_payload := jsonb_build_object(
    'data_rientro', to_char(p_data_rientro, 'YYYY-MM-DD'),
    'rientro_stessa_struttura', case when coalesce(v_guest.struttura, '') = v_target_struttura then 'Sì' else 'No' end,
    'struttura_rientro', v_target_struttura,
    'struttura_origine', v_guest.struttura,
    'note', 'Rientro registrato da controllo duplicati nuova registrazione.'
  );

  insert into public.guest_status_events (
    guest_id,
    event_type,
    from_status,
    to_status,
    effective_date,
    payload,
    created_by
  )
  values (
    p_guest_id,
    'STATUS_CHANGE',
    v_from_status,
    'IN_ACCOGLIENZA',
    v_effective,
    v_payload,
    p_created_by
  )
  returning * into v_event;

  update public.case_alloggio_submissions
  set
    current_status = 'IN_ACCOGLIENZA',
    current_status_at = v_effective,
    struttura = v_target_struttura,
    deceased_at = null
  where id = p_guest_id;

  return jsonb_build_object(
    'ok', true,
    'guest_id', p_guest_id,
    'event_id', v_event.id
  );
end;
$$;

grant execute on function public.create_duplicate_reentry(uuid, text, date, uuid) to authenticated;
