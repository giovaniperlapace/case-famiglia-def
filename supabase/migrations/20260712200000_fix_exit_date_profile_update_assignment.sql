do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(
    'public.update_guest_profile_with_audit(uuid,jsonb,uuid)'::regprocedure
  ) into v_sql;

  if strpos(v_sql, $needle$    data_uscita = v_new->>'data_uscita',$needle$) > 0 then
    return;
  end if;

  if strpos(v_sql, $needle$    data_di_nascita = v_new->>'data_di_nascita',
    data_decesso = v_new->>'data_decesso',$needle$) = 0 then
    raise exception 'Unable to find profile date assignments in update_guest_profile_with_audit';
  end if;

  v_sql := replace(
    v_sql,
    $needle$    data_di_nascita = v_new->>'data_di_nascita',
    data_decesso = v_new->>'data_decesso',$needle$,
    $replacement$    data_di_nascita = v_new->>'data_di_nascita',
    data_uscita = v_new->>'data_uscita',
    data_decesso = v_new->>'data_decesso',$replacement$
  );

  execute v_sql;
end;
$$;
