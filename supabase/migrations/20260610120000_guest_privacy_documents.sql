insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-privacy-documents',
  'guest-privacy-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.guest_privacy_documents (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.case_alloggio_submissions(id) on delete cascade,
  document_type text not null,
  file_bucket text not null default 'guest-privacy-documents',
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  consent_accepted boolean null,
  created_by uuid null references public.app_utenti(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint guest_privacy_documents_document_type_check
    check (document_type in ('photo', 'upload', 'electronic_signature')),
  constraint guest_privacy_documents_mime_type_check
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint guest_privacy_documents_file_size_check
    check (file_size > 0 and file_size <= 10485760)
);

create index if not exists guest_privacy_documents_guest_id_created_at_idx
  on public.guest_privacy_documents (guest_id, created_at desc);

alter table public.guest_privacy_documents enable row level security;

grant select, insert on table public.guest_privacy_documents to authenticated;

drop policy if exists guest_privacy_documents_admin_all on public.guest_privacy_documents;
create policy guest_privacy_documents_admin_all
on public.guest_privacy_documents
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists guest_privacy_documents_manager_select on public.guest_privacy_documents;
create policy guest_privacy_documents_manager_select
on public.guest_privacy_documents
for select
to authenticated
using (public.current_user_role() = 'manager');

drop policy if exists guest_privacy_documents_responsabile_casa_select on public.guest_privacy_documents;
create policy guest_privacy_documents_responsabile_casa_select
on public.guest_privacy_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.case_alloggio_submissions guest
    join public.app_utenti user_row
      on user_row.auth_user_id = auth.uid()
      or lower(user_row.email) = lower(coalesce(auth.email(), ''))
    join public.app_utenti_strutture user_structure
      on user_structure.id_utente = user_row.id
    where guest.id = guest_privacy_documents.guest_id
      and lower(user_structure.struttura) = lower(guest.struttura)
  )
);

drop policy if exists guest_privacy_documents_responsabile_casa_insert on public.guest_privacy_documents;
create policy guest_privacy_documents_responsabile_casa_insert
on public.guest_privacy_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.case_alloggio_submissions guest
    join public.app_utenti user_row
      on user_row.auth_user_id = auth.uid()
      or lower(user_row.email) = lower(coalesce(auth.email(), ''))
    join public.app_utenti_strutture user_structure
      on user_structure.id_utente = user_row.id
    where guest.id = guest_privacy_documents.guest_id
      and lower(user_structure.struttura) = lower(guest.struttura)
  )
);
