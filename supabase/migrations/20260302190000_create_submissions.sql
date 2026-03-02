create extension if not exists pgcrypto;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  tally_submission_id text not null,
  tally_respondent_id text null,
  owner_email text not null,
  submitted_at_tally timestamptz null,
  raw_payload jsonb not null,
  normalized_data jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_tally_submission_id_key unique (tally_submission_id)
);

create index if not exists submissions_owner_email_idx
  on public.submissions (owner_email);

create index if not exists submissions_submitted_at_idx
  on public.submissions (submitted_at_tally desc);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  submission_id text null,
  respondent_id text null,
  email text null,
  status text not null,
  error_code text null,
  error_message text null,
  payload jsonb not null,
  normalized jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists webhook_events_source_created_at_idx
  on public.webhook_events (source, created_at desc);

create index if not exists webhook_events_submission_id_idx
  on public.webhook_events (submission_id);

create index if not exists webhook_events_email_idx
  on public.webhook_events (email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_submissions_set_updated_at on public.submissions;
create trigger trg_submissions_set_updated_at
before update on public.submissions
for each row
execute function public.set_updated_at();

alter table public.submissions enable row level security;

-- Users can only read rows where owner_email matches their auth email.
drop policy if exists submissions_select_own on public.submissions;
create policy submissions_select_own
on public.submissions
for select
to authenticated
using (lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')));

revoke all on public.webhook_events from anon, authenticated;
