alter table public.case_alloggio_submissions
  add column if not exists note_libere text;

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(
    'public.update_guest_profile_with_audit(uuid,jsonb,uuid)'::regprocedure
  ) into v_sql;

  if strpos(v_sql, $needle$'note_libere'$needle$) = 0 then
    if strpos(v_sql, $needle$    'patologia_psichiatrica'
  ];$needle$) = 0 then
      raise exception 'Unable to find profile field allow-list in update_guest_profile_with_audit';
    end if;

    v_sql := replace(
      v_sql,
      $needle$    'patologia_psichiatrica'
  ];$needle$,
      $replacement$    'patologia_psichiatrica',
    'note_libere'
  ];$replacement$
    );
  end if;

  if strpos(v_sql, $needle$note_libere = v_new->>'note_libere'$needle$) = 0 then
    if strpos(v_sql, $needle$    patologia_psichiatrica = v_new->>'patologia_psichiatrica'$needle$) = 0 then
      raise exception 'Unable to find profile update assignments in update_guest_profile_with_audit';
    end if;

    v_sql := replace(
      v_sql,
      $needle$    patologia_psichiatrica = v_new->>'patologia_psichiatrica'$needle$,
      $replacement$    patologia_psichiatrica = v_new->>'patologia_psichiatrica',
    note_libere = v_new->>'note_libere'$replacement$
    );
  end if;

  execute v_sql;
end;
$$;
