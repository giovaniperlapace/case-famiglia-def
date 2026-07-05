do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(
    'public.update_guest_profile_with_audit(uuid,jsonb,uuid)'::regprocedure
  ) into v_sql;

  if strpos(v_sql, $needle$    'data_decesso',$needle$) = 0 then
    raise exception 'Unable to find data_decesso in update_guest_profile_with_audit';
  end if;

  v_sql := replace(
    v_sql,
    $needle$    'data_decesso',$needle$,
    $replacement$    'data_uscita',
    'data_decesso',$replacement$
  );

  if strpos(
    v_sql,
    $needle$  if p_patch ? 'data_decesso' and v_current_status <> 'DECEDUTO' then$needle$
  ) = 0 then
    raise exception 'Unable to find status validation in update_guest_profile_with_audit';
  end if;

  v_sql := replace(
    v_sql,
    $needle$  if p_patch ? 'data_decesso' and v_current_status <> 'DECEDUTO' then$needle$,
    $replacement$  if p_patch ? 'data_uscita' and v_current_status <> 'USCITO' then
    raise exception 'La data uscita e modificabile solo per ospiti usciti' using errcode = '42501';
  end if;

  if p_patch ? 'data_decesso' and v_current_status <> 'DECEDUTO' then$replacement$
  );

  if strpos(v_sql, $needle$    'data_uscita',$needle$) = 0
     or strpos(v_sql, $needle$p_patch ? 'data_uscita'$needle$) = 0 then
    raise exception 'Unable to patch data_uscita into update_guest_profile_with_audit';
  end if;

  execute v_sql;
end;
$$;
