create or replace function public.admin_update_app_utente(
  target_user_id uuid,
  target_nome text,
  target_cognome text,
  target_email text,
  target_telefono text,
  target_strutture text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_strutture text[];
begin
  if not public.current_user_is_admin() then
    raise exception 'Forbidden'
      using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'Missing user id';
  end if;

  if target_email is null or btrim(target_email) = '' then
    raise exception 'Missing email';
  end if;

  update public.app_utenti
  set
    nome = nullif(btrim(coalesce(target_nome, '')), ''),
    cognome = nullif(btrim(coalesce(target_cognome, '')), ''),
    email = lower(btrim(target_email)),
    telefono = nullif(btrim(coalesce(target_telefono, '')), '')
  where id = target_user_id;

  if not found then
    raise exception 'User not found'
      using errcode = 'P0002';
  end if;

  normalized_strutture := array(
    select distinct btrim(struttura)
    from unnest(coalesce(target_strutture, '{}'::text[])) as struttura
    where btrim(struttura) <> ''
  );

  delete from public.app_utenti_strutture
  where utente_id = target_user_id;

  if array_length(normalized_strutture, 1) is not null then
    insert into public.app_utenti_strutture (utente_id, struttura)
    select target_user_id, struttura
    from unnest(normalized_strutture) as struttura;
  end if;
end;
$$;

grant execute on function public.admin_update_app_utente(uuid, text, text, text, text, text[])
to authenticated;
