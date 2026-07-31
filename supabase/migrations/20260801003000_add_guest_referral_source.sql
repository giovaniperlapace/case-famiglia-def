alter table public.case_alloggio_submissions
  add column if not exists segnalato_da text,
  add column if not exists segnalato_da_altro text;

alter table public.case_alloggio_submissions
  drop constraint if exists case_alloggio_submissions_segnalato_da_check;

alter table public.case_alloggio_submissions
  add constraint case_alloggio_submissions_segnalato_da_check check (
    segnalato_da is null or segnalato_da in (
      'Altri servizi della Comunità',
      'Servizi sociali municipio',
      'Servizi sociali ospedale',
      'Servizi sociali ASL',
      'Parrocchie e altri enti no-profit',
      'Altro...'
    )
  );

alter table public.case_alloggio_submissions
  drop constraint if exists case_alloggio_submissions_segnalato_da_altro_check;

alter table public.case_alloggio_submissions
  add constraint case_alloggio_submissions_segnalato_da_altro_check check (
    (segnalato_da = 'Altro...' and nullif(btrim(segnalato_da_altro), '') is not null)
    or (segnalato_da is distinct from 'Altro...' and segnalato_da_altro is null)
  );

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(
    'public.update_guest_profile_with_audit(uuid,jsonb,uuid)'::regprocedure
  ) into v_sql;

  if strpos(v_sql, $needle$'segnalato_da'$needle$) = 0 then
    if strpos(v_sql, $needle$    'note_libere'
  ];$needle$) = 0 then
      raise exception 'Unable to find profile field allow-list in update_guest_profile_with_audit';
    end if;

    v_sql := replace(
      v_sql,
      $needle$    'note_libere'
  ];$needle$,
      $replacement$    'note_libere',
    'segnalato_da',
    'segnalato_da_altro'
  ];$replacement$
    );
  end if;

  if strpos(v_sql, $needle$segnalato_da = v_new->>'segnalato_da'$needle$) = 0 then
    if strpos(v_sql, $needle$    note_libere = v_new->>'note_libere'$needle$) = 0 then
      raise exception 'Unable to find profile update assignments in update_guest_profile_with_audit';
    end if;

    v_sql := replace(
      v_sql,
      $needle$    note_libere = v_new->>'note_libere'$needle$,
      $replacement$    note_libere = v_new->>'note_libere',
    segnalato_da = v_new->>'segnalato_da',
    segnalato_da_altro = v_new->>'segnalato_da_altro'$replacement$
    );
  end if;

  execute v_sql;
end;
$$;
