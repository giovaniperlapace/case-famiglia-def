do $$
declare
  v_sql text;
begin
  v_sql := pg_get_functiondef(
    'public.create_guest_status_event(uuid,text,timestamp with time zone,text,jsonb,uuid)'::regprocedure
  );

  v_sql := replace(
    v_sql,
    'v_from_status := coalesce(v_guest.current_status, ''IN_ACCOGLIENZA'');',
    $replacement$
  v_from_status := coalesce(v_guest.current_status, case
    when nullif(v_guest.data_decesso, '') is not null then 'DECEDUTO'
    when nullif(v_guest.data_uscita, '') is not null then 'USCITO'
    when lower(coalesce(v_guest.tipo_aggiornamento, '')) like '%decesso%' then 'DECEDUTO'
    when lower(coalesce(v_guest.tipo_aggiornamento, '')) like '%uscita%' then 'USCITO'
    else 'IN_ACCOGLIENZA'
  end);$replacement$
  );

  if v_sql not like '%nullif(v_guest.data_uscita, '''') is not null then ''USCITO''%' then
    raise exception 'Unable to patch create_guest_status_event status fallback';
  end if;

  execute v_sql;
end;
$$;
