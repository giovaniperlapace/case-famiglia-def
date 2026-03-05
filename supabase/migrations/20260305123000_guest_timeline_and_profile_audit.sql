alter table public.case_alloggio_submissions
  add column if not exists current_status text null,
  add column if not exists current_status_at timestamptz null,
  add column if not exists deceased_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_alloggio_submissions_current_status_check'
      and conrelid = 'public.case_alloggio_submissions'::regclass
  ) then
    alter table public.case_alloggio_submissions
      add constraint case_alloggio_submissions_current_status_check
      check (
        current_status in ('IN_ACCOGLIENZA', 'USCITO', 'DECEDUTO')
        or current_status is null
      );
  end if;
end $$;

update public.case_alloggio_submissions
set current_status = case
  when coalesce(data_decesso_2, '') <> ''
    or coalesce(data_decesso, '') <> ''
    or lower(coalesce(tipo_aggiornamento, '')) like '%decesso%'
    then 'DECEDUTO'
  when coalesce(data_uscita, '') <> ''
    or lower(coalesce(tipo_aggiornamento, '')) like '%uscita%'
    then 'USCITO'
  else 'IN_ACCOGLIENZA'
end
where current_status is null;

update public.case_alloggio_submissions
set current_status_at = coalesce(current_status_at, submitted_at, created_at, now())
where current_status is not null;

update public.case_alloggio_submissions
set deceased_at = coalesce(deceased_at, current_status_at)
where current_status = 'DECEDUTO'
  and deceased_at is null;

create index if not exists case_alloggio_submissions_current_status_idx
  on public.case_alloggio_submissions (current_status);

create table if not exists public.guest_status_events (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.case_alloggio_submissions(id) on delete cascade,
  event_type text not null,
  from_status text null,
  to_status text null,
  effective_date timestamptz null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid null references public.app_utenti(id) on delete set null,
  source text null
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_status_events_event_type_check'
      and conrelid = 'public.guest_status_events'::regclass
  ) then
    alter table public.guest_status_events
      add constraint guest_status_events_event_type_check
      check (event_type in ('STATUS_CHANGE', 'MEDICAL_UPDATE'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_status_events_from_status_check'
      and conrelid = 'public.guest_status_events'::regclass
  ) then
    alter table public.guest_status_events
      add constraint guest_status_events_from_status_check
      check (
        from_status in ('IN_ACCOGLIENZA', 'USCITO', 'DECEDUTO')
        or from_status is null
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_status_events_to_status_check'
      and conrelid = 'public.guest_status_events'::regclass
  ) then
    alter table public.guest_status_events
      add constraint guest_status_events_to_status_check
      check (
        to_status in ('IN_ACCOGLIENZA', 'USCITO', 'DECEDUTO')
        or to_status is null
      );
  end if;
end $$;

create index if not exists guest_status_events_guest_effective_idx
  on public.guest_status_events (guest_id, effective_date desc, created_at desc);

create table if not exists public.guest_profile_audit (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.case_alloggio_submissions(id) on delete cascade,
  changed_fields jsonb not null,
  old_values jsonb not null,
  new_values jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid null references public.app_utenti(id) on delete set null
);

create index if not exists guest_profile_audit_guest_changed_idx
  on public.guest_profile_audit (guest_id, changed_at desc);

create or replace function public.prevent_append_only_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Append-only table: operation not allowed';
end;
$$;

drop trigger if exists trg_guest_status_events_append_only_update on public.guest_status_events;
create trigger trg_guest_status_events_append_only_update
before update on public.guest_status_events
for each row
execute function public.prevent_append_only_change();

drop trigger if exists trg_guest_status_events_append_only_delete on public.guest_status_events;
create trigger trg_guest_status_events_append_only_delete
before delete on public.guest_status_events
for each row
execute function public.prevent_append_only_change();

drop trigger if exists trg_guest_profile_audit_append_only_update on public.guest_profile_audit;
create trigger trg_guest_profile_audit_append_only_update
before update on public.guest_profile_audit
for each row
execute function public.prevent_append_only_change();

drop trigger if exists trg_guest_profile_audit_append_only_delete on public.guest_profile_audit;
create trigger trg_guest_profile_audit_append_only_delete
before delete on public.guest_profile_audit
for each row
execute function public.prevent_append_only_change();

create or replace function public.current_user_can_manage_guest(target_guest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_alloggio_submissions g
    where g.id = target_guest_id
      and (
        public.current_user_is_admin()
        or public.current_user_is_manager()
        or (
          public.current_user_is_responsabile_casa()
          and public.can_access_struttura(g.struttura)
        )
      )
  );
$$;

grant execute on function public.current_user_can_manage_guest(uuid) to authenticated;

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
    'contatto_della_persona'
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
    'contatto_della_persona', v_guest.contatto_della_persona
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
    contatto_della_persona = v_new->>'contatto_della_persona'
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

  return v_event;
end;
$$;

grant execute on function public.create_guest_status_event(uuid, text, timestamptz, text, jsonb, uuid)
to authenticated;

alter table public.guest_status_events enable row level security;
alter table public.guest_profile_audit enable row level security;

grant select, insert on table public.guest_status_events to authenticated;
grant select on table public.guest_profile_audit to authenticated;

revoke update, delete on table public.guest_status_events from authenticated;
revoke update, delete, insert on table public.guest_profile_audit from authenticated;

drop policy if exists guest_status_events_select on public.guest_status_events;
create policy guest_status_events_select
on public.guest_status_events
for select
to authenticated
using (public.current_user_can_manage_guest(guest_id));

drop policy if exists guest_status_events_insert on public.guest_status_events;
create policy guest_status_events_insert
on public.guest_status_events
for insert
to authenticated
with check (public.current_user_can_manage_guest(guest_id));

drop policy if exists guest_profile_audit_select on public.guest_profile_audit;
create policy guest_profile_audit_select
on public.guest_profile_audit
for select
to authenticated
using (public.current_user_can_manage_guest(guest_id));
