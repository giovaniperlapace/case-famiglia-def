create or replace function public.create_guest_status_event(
  p_guest_id uuid,
  p_event_type text,
  p_effective_date timestamptz default null,
  p_to_status text default null,
  p_payload jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns public.guest_status_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.case_alloggio_submissions%rowtype;
  v_from_status text;
  v_event public.guest_status_events%rowtype;
  v_effective timestamptz := coalesce(p_effective_date, now());
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  select * into v_guest
  from public.case_alloggio_submissions
  where id = p_guest_id
  for update;

  if not found then
    raise exception 'Guest not found' using errcode = 'P0002';
  end if;

  if not public.current_user_can_manage_guest(p_guest_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  v_from_status := coalesce(v_guest.current_status, 'IN_ACCOGLIENZA');

  if v_from_status = 'DECEDUTO' then
    raise exception 'Guest is deceased. Status updates are disabled.';
  end if;

  if p_event_type not in ('STATUS_CHANGE', 'MEDICAL_UPDATE') then
    raise exception 'Invalid event type';
  end if;

  if p_to_status is not null and p_to_status not in ('IN_ACCOGLIENZA', 'USCITO', 'DECEDUTO') then
    raise exception 'Invalid target status';
  end if;

  if p_event_type = 'STATUS_CHANGE' and p_to_status is null then
    raise exception 'Target status is required for STATUS_CHANGE';
  end if;

  if p_to_status = 'DECEDUTO' and p_effective_date is null then
    raise exception 'Death updates require an effective date';
  end if;

  if p_to_status = 'DECEDUTO'
    and coalesce(
      nullif(btrim(coalesce(v_payload->>'causa_decesso', '')), ''),
      nullif(btrim(coalesce(v_payload->>'cause_of_death', '')), '')
    ) is null then
    raise exception 'Death updates require cause of death';
  end if;

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
    p_event_type,
    v_from_status,
    p_to_status,
    p_effective_date,
    v_payload,
    p_created_by
  )
  returning * into v_event;

  if p_to_status is not null and p_to_status <> v_from_status then
    update public.case_alloggio_submissions
    set
      current_status = p_to_status,
      current_status_at = v_effective,
      deceased_at = case when p_to_status = 'DECEDUTO' then v_effective else null end,
      data_uscita = case
        when p_to_status = 'USCITO' then coalesce(nullif(data_uscita, ''), to_char(v_effective::date, 'YYYY-MM-DD'))
        else data_uscita
      end,
      causa_uscita = case
        when p_to_status = 'USCITO' then coalesce(nullif(v_payload->>'causa_uscita', ''), causa_uscita)
        else causa_uscita
      end,
      data_decesso = case
        when p_to_status = 'DECEDUTO' then to_char(v_effective::date, 'YYYY-MM-DD')
        else data_decesso
      end,
      causa_decesso = case
        when p_to_status = 'DECEDUTO' then coalesce(nullif(v_payload->>'causa_decesso', ''), causa_decesso)
        else causa_decesso
      end
    where id = p_guest_id;
  end if;

  update public.case_alloggio_submissions
  set
    data_ultimo_contatto = case
      when v_payload ? 'data_ultimo_contatto' then nullif(v_payload->>'data_ultimo_contatto', '')
      else data_ultimo_contatto
    end,
    dove_dorme = case
      when v_payload ? 'dove_dorme' then nullif(v_payload->>'dove_dorme', '')
      else dove_dorme
    end,
    data_decesso_2 = case
      when v_payload ? 'data_decesso_2' then nullif(v_payload->>'data_decesso_2', '')
      else data_decesso_2
    end,
    causa_decesso_2 = case
      when v_payload ? 'causa_decesso_2' then nullif(v_payload->>'causa_decesso_2', '')
      else causa_decesso_2
    end,
    ha_residenza = case
      when v_payload ? 'ha_residenza' then nullif(v_payload->>'ha_residenza', '')
      else ha_residenza
    end,
    ha_un_reddito = case
      when v_payload ? 'ha_un_reddito' then nullif(v_payload->>'ha_un_reddito', '')
      else ha_un_reddito
    end,
    tipo_di_reddito_3 = case
      when v_payload ? 'tipo_di_reddito_3' then nullif(v_payload->>'tipo_di_reddito_3', '')
      else tipo_di_reddito_3
    end,
    tipo_di_lavoro_3 = case
      when v_payload ? 'tipo_di_lavoro_3' then nullif(v_payload->>'tipo_di_lavoro_3', '')
      else tipo_di_lavoro_3
    end,
    data_uscita = case
      when v_payload ? 'data_uscita' then nullif(v_payload->>'data_uscita', '')
      else data_uscita
    end,
    causa_uscita = case
      when v_payload ? 'causa_uscita' then nullif(v_payload->>'causa_uscita', '')
      else causa_uscita
    end,
    data_decesso = case
      when v_payload ? 'data_decesso' then nullif(v_payload->>'data_decesso', '')
      else data_decesso
    end,
    causa_decesso = case
      when v_payload ? 'causa_decesso' then nullif(v_payload->>'causa_decesso', '')
      else causa_decesso
    end,
    al_momento_dell_uscita_ha_residenza = case
      when v_payload ? 'al_momento_dell_uscita_ha_residenza' then nullif(v_payload->>'al_momento_dell_uscita_ha_residenza', '')
      else al_momento_dell_uscita_ha_residenza
    end,
    al_momento_dell_uscita_ha_un_reddito = case
      when v_payload ? 'al_momento_dell_uscita_ha_un_reddito' then nullif(v_payload->>'al_momento_dell_uscita_ha_un_reddito', '')
      else al_momento_dell_uscita_ha_un_reddito
    end,
    tipo_di_reddito_2 = case
      when v_payload ? 'tipo_di_reddito_2' then nullif(v_payload->>'tipo_di_reddito_2', '')
      else tipo_di_reddito_2
    end,
    tipo_di_lavoro_2 = case
      when v_payload ? 'tipo_di_lavoro_2' then nullif(v_payload->>'tipo_di_lavoro_2', '')
      else tipo_di_lavoro_2
    end,
    dipendenze = case
      when v_payload ? 'dipendenze' then nullif(v_payload->>'dipendenze', '')
      else dipendenze
    end,
    patologie = case
      when v_payload ? 'patologie' then nullif(v_payload->>'patologie', '')
      else patologie
    end,
    patologia_psichiatrica = case
      when v_payload ? 'patologia_psichiatrica' then nullif(v_payload->>'patologia_psichiatrica', '')
      else patologia_psichiatrica
    end
  where id = p_guest_id;

  return v_event;
end;
$$;

grant execute on function public.create_guest_status_event(uuid, text, timestamptz, text, jsonb, uuid)
to authenticated;
