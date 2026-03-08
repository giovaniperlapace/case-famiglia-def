alter table public.case_alloggio_submissions
  add column if not exists nome_compilatore text null,
  add column if not exists al_momento_dell_ingresso_ha_i_seguenti_documenti text null,
  add column if not exists al_momento_dell_uscita_ha_i_seguenti_documenti text null,
  add column if not exists siamo_ancora_in_contatto text null,
  add column if not exists chi_e_in_contatto text null,
  add column if not exists ha_i_requisiti_per_fare_la_domanda_di_casa_popolare text null,
  add column if not exists ha_gia_fatto_domanda_di_casa_popolare text null,
  add column if not exists data_domanda_casa_popolare text null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'case_alloggio_submissions'
      and column_name = 'nome_e_cognome_compilatore'
  ) then
    execute $sql$
      update public.case_alloggio_submissions
      set nome_compilatore = coalesce(nome_compilatore, nome_e_cognome_compilatore)
      where nome_compilatore is null
    $sql$;
  end if;
end
$$;

create or replace function public.update_guest_profile_with_audit(
  p_guest_id uuid,
  p_patch jsonb,
  p_changed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.case_alloggio_submissions%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_changed text[] := array[]::text[];
  v_allowed constant text[] := array[
    'nome_della_persona',
    'cognome',
    'data_di_nascita',
    'luogo_di_nascita',
    'sesso_della_persona',
    'nazionalita',
    'contatto_della_persona',
    'data_ingresso',
    'e_gia_stato_in_un_accoglienza_della_comunita',
    'al_momento_dell_ingresso_ha_un_reddito',
    'tipo_di_reddito',
    'tipo_di_reddito_pensione',
    'tipo_di_reddito_invalidita',
    'tipo_di_reddito_reddito_di_inclusione',
    'tipo_di_reddito_reddito_da_lavoro',
    'tipo_di_lavoro',
    'al_momento_dell_ingresso_ha_residenza',
    'dove_dormiva',
    'principale_causa_poverta',
    'al_momento_dell_ingresso_ha_i_seguenti_documenti',
    'al_momento_dell_uscita_ha_i_seguenti_documenti',
    'siamo_ancora_in_contatto',
    'chi_e_in_contatto',
    'ha_i_requisiti_per_fare_la_domanda_di_casa_popolare',
    'ha_gia_fatto_domanda_di_casa_popolare',
    'data_domanda_casa_popolare',
    'dipendenze',
    'dipendenze_alcolismo',
    'dipendenze_sostanze',
    'dipendenze_ludopatia',
    'dipendenze_nessuna',
    'patologie',
    'patologie_malattie_infettive_e_parassitarie',
    'patologie_neoplasie_tumori',
    'patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123',
    'patologie_malattie_endocrine_nutrizionali_e_metaboliche',
    'patologie_disturbi_psichici_e_comportamentali',
    'patologie_malattie_del_sistema_nervoso',
    'patologie_malattie_dell_occhio_e_degli_annessi_oculari',
    'patologie_malattie_dell_orecchio_e_del_processo_mastoideo',
    'patologie_malattie_del_sistema_circolatorio',
    'patologie_malattie_del_sistema_respiratorio',
    'patologie_malattie_dell_apparato_digerente',
    'patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo',
    'patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101',
    'patologie_malattie_dell_apparato_genito_urinario',
    'patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a',
    'patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11',
    'patologie_nessuna',
    'patologie_altro',
    'patologia_psichiatrica'
  ];
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

  if p_patch is null or p_patch = '{}'::jsonb then
    return jsonb_build_object('updated', false, 'reason', 'empty_patch');
  end if;

  v_old := jsonb_build_object(
    'nome_della_persona', v_guest.nome_della_persona,
    'cognome', v_guest.cognome,
    'data_di_nascita', v_guest.data_di_nascita,
    'luogo_di_nascita', v_guest.luogo_di_nascita,
    'sesso_della_persona', v_guest.sesso_della_persona,
    'nazionalita', v_guest.nazionalita,
    'contatto_della_persona', v_guest.contatto_della_persona,
    'data_ingresso', v_guest.data_ingresso,
    'e_gia_stato_in_un_accoglienza_della_comunita', v_guest.e_gia_stato_in_un_accoglienza_della_comunita,
    'al_momento_dell_ingresso_ha_un_reddito', v_guest.al_momento_dell_ingresso_ha_un_reddito,
    'tipo_di_reddito', v_guest.tipo_di_reddito,
    'tipo_di_reddito_pensione', v_guest.tipo_di_reddito_pensione,
    'tipo_di_reddito_invalidita', v_guest.tipo_di_reddito_invalidita,
    'tipo_di_reddito_reddito_di_inclusione', v_guest.tipo_di_reddito_reddito_di_inclusione,
    'tipo_di_reddito_reddito_da_lavoro', v_guest.tipo_di_reddito_reddito_da_lavoro,
    'tipo_di_lavoro', v_guest.tipo_di_lavoro,
    'al_momento_dell_ingresso_ha_residenza', v_guest.al_momento_dell_ingresso_ha_residenza,
    'dove_dormiva', v_guest.dove_dormiva,
    'principale_causa_poverta', v_guest.principale_causa_poverta,
    'al_momento_dell_ingresso_ha_i_seguenti_documenti', v_guest.al_momento_dell_ingresso_ha_i_seguenti_documenti,
    'al_momento_dell_uscita_ha_i_seguenti_documenti', v_guest.al_momento_dell_uscita_ha_i_seguenti_documenti,
    'siamo_ancora_in_contatto', v_guest.siamo_ancora_in_contatto,
    'chi_e_in_contatto', v_guest.chi_e_in_contatto,
    'ha_i_requisiti_per_fare_la_domanda_di_casa_popolare', v_guest.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare,
    'ha_gia_fatto_domanda_di_casa_popolare', v_guest.ha_gia_fatto_domanda_di_casa_popolare,
    'data_domanda_casa_popolare', v_guest.data_domanda_casa_popolare,
    'dipendenze', v_guest.dipendenze,
    'dipendenze_alcolismo', v_guest.dipendenze_alcolismo,
    'dipendenze_sostanze', v_guest.dipendenze_sostanze,
    'dipendenze_ludopatia', v_guest.dipendenze_ludopatia,
    'dipendenze_nessuna', v_guest.dipendenze_nessuna,
    'patologie', v_guest.patologie,
    'patologie_malattie_infettive_e_parassitarie', v_guest.patologie_malattie_infettive_e_parassitarie,
    'patologie_neoplasie_tumori', v_guest.patologie_neoplasie_tumori,
    'patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123', v_guest.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,
    'patologie_malattie_endocrine_nutrizionali_e_metaboliche', v_guest.patologie_malattie_endocrine_nutrizionali_e_metaboliche,
    'patologie_disturbi_psichici_e_comportamentali', v_guest.patologie_disturbi_psichici_e_comportamentali,
    'patologie_malattie_del_sistema_nervoso', v_guest.patologie_malattie_del_sistema_nervoso,
    'patologie_malattie_dell_occhio_e_degli_annessi_oculari', v_guest.patologie_malattie_dell_occhio_e_degli_annessi_oculari,
    'patologie_malattie_dell_orecchio_e_del_processo_mastoideo', v_guest.patologie_malattie_dell_orecchio_e_del_processo_mastoideo,
    'patologie_malattie_del_sistema_circolatorio', v_guest.patologie_malattie_del_sistema_circolatorio,
    'patologie_malattie_del_sistema_respiratorio', v_guest.patologie_malattie_del_sistema_respiratorio,
    'patologie_malattie_dell_apparato_digerente', v_guest.patologie_malattie_dell_apparato_digerente,
    'patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo', v_guest.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,
    'patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101', v_guest.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,
    'patologie_malattie_dell_apparato_genito_urinario', v_guest.patologie_malattie_dell_apparato_genito_urinario,
    'patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a', v_guest.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,
    'patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11', v_guest.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,
    'patologie_nessuna', v_guest.patologie_nessuna,
    'patologie_altro', v_guest.patologie_altro,
    'patologia_psichiatrica', v_guest.patologia_psichiatrica
  );

  v_new := v_old;

  foreach v_key in array v_allowed loop
    if p_patch ? v_key then
      v_new := jsonb_set(
        v_new,
        array[v_key],
        to_jsonb(nullif(btrim(coalesce(p_patch->>v_key, '')), '')),
        true
      );
    end if;
  end loop;

  foreach v_key in array v_allowed loop
    if (v_old->>v_key) is distinct from (v_new->>v_key) then
      v_changed := array_append(v_changed, v_key);
    end if;
  end loop;

  if coalesce(array_length(v_changed, 1), 0) = 0 then
    return jsonb_build_object('updated', false, 'reason', 'no_changes');
  end if;

  update public.case_alloggio_submissions
  set
    nome_della_persona = v_new->>'nome_della_persona',
    cognome = v_new->>'cognome',
    data_di_nascita = v_new->>'data_di_nascita',
    luogo_di_nascita = v_new->>'luogo_di_nascita',
    sesso_della_persona = v_new->>'sesso_della_persona',
    nazionalita = v_new->>'nazionalita',
    contatto_della_persona = v_new->>'contatto_della_persona',
    data_ingresso = v_new->>'data_ingresso',
    e_gia_stato_in_un_accoglienza_della_comunita = v_new->>'e_gia_stato_in_un_accoglienza_della_comunita',
    al_momento_dell_ingresso_ha_un_reddito = v_new->>'al_momento_dell_ingresso_ha_un_reddito',
    tipo_di_reddito = v_new->>'tipo_di_reddito',
    tipo_di_reddito_pensione = v_new->>'tipo_di_reddito_pensione',
    tipo_di_reddito_invalidita = v_new->>'tipo_di_reddito_invalidita',
    tipo_di_reddito_reddito_di_inclusione = v_new->>'tipo_di_reddito_reddito_di_inclusione',
    tipo_di_reddito_reddito_da_lavoro = v_new->>'tipo_di_reddito_reddito_da_lavoro',
    tipo_di_lavoro = v_new->>'tipo_di_lavoro',
    al_momento_dell_ingresso_ha_residenza = v_new->>'al_momento_dell_ingresso_ha_residenza',
    dove_dormiva = v_new->>'dove_dormiva',
    principale_causa_poverta = v_new->>'principale_causa_poverta',
    al_momento_dell_ingresso_ha_i_seguenti_documenti = v_new->>'al_momento_dell_ingresso_ha_i_seguenti_documenti',
    al_momento_dell_uscita_ha_i_seguenti_documenti = v_new->>'al_momento_dell_uscita_ha_i_seguenti_documenti',
    siamo_ancora_in_contatto = v_new->>'siamo_ancora_in_contatto',
    chi_e_in_contatto = v_new->>'chi_e_in_contatto',
    ha_i_requisiti_per_fare_la_domanda_di_casa_popolare = v_new->>'ha_i_requisiti_per_fare_la_domanda_di_casa_popolare',
    ha_gia_fatto_domanda_di_casa_popolare = v_new->>'ha_gia_fatto_domanda_di_casa_popolare',
    data_domanda_casa_popolare = v_new->>'data_domanda_casa_popolare',
    dipendenze = v_new->>'dipendenze',
    dipendenze_alcolismo = v_new->>'dipendenze_alcolismo',
    dipendenze_sostanze = v_new->>'dipendenze_sostanze',
    dipendenze_ludopatia = v_new->>'dipendenze_ludopatia',
    dipendenze_nessuna = v_new->>'dipendenze_nessuna',
    patologie = v_new->>'patologie',
    patologie_malattie_infettive_e_parassitarie = v_new->>'patologie_malattie_infettive_e_parassitarie',
    patologie_neoplasie_tumori = v_new->>'patologie_neoplasie_tumori',
    patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123 = v_new->>'patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123',
    patologie_malattie_endocrine_nutrizionali_e_metaboliche = v_new->>'patologie_malattie_endocrine_nutrizionali_e_metaboliche',
    patologie_disturbi_psichici_e_comportamentali = v_new->>'patologie_disturbi_psichici_e_comportamentali',
    patologie_malattie_del_sistema_nervoso = v_new->>'patologie_malattie_del_sistema_nervoso',
    patologie_malattie_dell_occhio_e_degli_annessi_oculari = v_new->>'patologie_malattie_dell_occhio_e_degli_annessi_oculari',
    patologie_malattie_dell_orecchio_e_del_processo_mastoideo = v_new->>'patologie_malattie_dell_orecchio_e_del_processo_mastoideo',
    patologie_malattie_del_sistema_circolatorio = v_new->>'patologie_malattie_del_sistema_circolatorio',
    patologie_malattie_del_sistema_respiratorio = v_new->>'patologie_malattie_del_sistema_respiratorio',
    patologie_malattie_dell_apparato_digerente = v_new->>'patologie_malattie_dell_apparato_digerente',
    patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo = v_new->>'patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo',
    patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101 = v_new->>'patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101',
    patologie_malattie_dell_apparato_genito_urinario = v_new->>'patologie_malattie_dell_apparato_genito_urinario',
    patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a = v_new->>'patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a',
    patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11 = v_new->>'patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11',
    patologie_nessuna = v_new->>'patologie_nessuna',
    patologie_altro = v_new->>'patologie_altro',
    patologia_psichiatrica = v_new->>'patologia_psichiatrica'
  where id = p_guest_id;

  insert into public.guest_profile_audit (
    guest_id,
    changed_fields,
    old_values,
    new_values,
    changed_by
  )
  values (
    p_guest_id,
    to_jsonb(v_changed),
    v_old,
    v_new,
    p_changed_by
  );

  return jsonb_build_object(
    'updated', true,
    'changed_fields', to_jsonb(v_changed)
  );
end;
$$;

grant execute on function public.update_guest_profile_with_audit(uuid, jsonb, uuid) to authenticated;

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
  v_struttura_rientro text := nullif(btrim(coalesce(v_payload->>'struttura_rientro', '')), '');
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
      struttura = case
        when p_to_status = 'IN_ACCOGLIENZA' and v_struttura_rientro is not null then v_struttura_rientro
        else struttura
      end,
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
    ha_residenza = case
      when v_payload ? 'ha_residenza' then nullif(v_payload->>'ha_residenza', '')
      else ha_residenza
    end,
    ha_un_reddito = case
      when v_payload ? 'ha_un_reddito' then nullif(v_payload->>'ha_un_reddito', '')
      else ha_un_reddito
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
    al_momento_dell_ingresso_ha_i_seguenti_documenti = case
      when v_payload ? 'al_momento_dell_ingresso_ha_i_seguenti_documenti' then nullif(v_payload->>'al_momento_dell_ingresso_ha_i_seguenti_documenti', '')
      else al_momento_dell_ingresso_ha_i_seguenti_documenti
    end,
    al_momento_dell_uscita_ha_i_seguenti_documenti = case
      when v_payload ? 'al_momento_dell_uscita_ha_i_seguenti_documenti' then nullif(v_payload->>'al_momento_dell_uscita_ha_i_seguenti_documenti', '')
      else al_momento_dell_uscita_ha_i_seguenti_documenti
    end,
    siamo_ancora_in_contatto = case
      when v_payload ? 'siamo_ancora_in_contatto' then nullif(v_payload->>'siamo_ancora_in_contatto', '')
      else siamo_ancora_in_contatto
    end,
    chi_e_in_contatto = case
      when v_payload ? 'chi_e_in_contatto' then nullif(v_payload->>'chi_e_in_contatto', '')
      else chi_e_in_contatto
    end,
    ha_i_requisiti_per_fare_la_domanda_di_casa_popolare = case
      when v_payload ? 'ha_i_requisiti_per_fare_la_domanda_di_casa_popolare' then nullif(v_payload->>'ha_i_requisiti_per_fare_la_domanda_di_casa_popolare', '')
      else ha_i_requisiti_per_fare_la_domanda_di_casa_popolare
    end,
    ha_gia_fatto_domanda_di_casa_popolare = case
      when v_payload ? 'ha_gia_fatto_domanda_di_casa_popolare' then nullif(v_payload->>'ha_gia_fatto_domanda_di_casa_popolare', '')
      else ha_gia_fatto_domanda_di_casa_popolare
    end,
    data_domanda_casa_popolare = case
      when v_payload ? 'data_domanda_casa_popolare' then nullif(v_payload->>'data_domanda_casa_popolare', '')
      else data_domanda_casa_popolare
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
