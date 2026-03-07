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
