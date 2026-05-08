# AGENTS.md

## Purpose
This repo contains the web app for Comunita di Sant'Egidio to manage census and updates for people hosted in night shelters ("case di accoglienza notturna").

The app must be secure by default:
- coordinators authenticate with Supabase magic link
- coordinators can only see and update guests in their assigned shelter(s)
- authorization must be enforced server-side with Supabase RLS, never only with client-side filtering

## Mandatory Working Style
- Start every session with a repo sync check:
  - current branch
  - `git status`
  - `git fetch`
  - ahead/behind vs `origin/main`
  - summarize before coding
- Keep diffs small and reviewable.
- Prefer existing patterns over new abstractions.
- Do not add dependencies unless truly needed.
- Keep secrets out of the repo and out of logs.
- Run validation when possible:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
- If the worktree is dirty, do not revert user changes. Inspect them and work around them unless the task explicitly requires touching the same files.

## Product And Security Rules
- Each hosted person belongs to exactly one shelter.
- Core auth tables:
  - `public.app_utenti`
  - `public.app_utenti_strutture`
- Core operational guest table:
  - `public.case_alloggio_submissions`
- Audit/error table:
  - `public.webhook_events`
- Legacy generic `public.submissions` was intentionally removed from the flow and should stay removed unless there is a strong reason to restore it.
- Default privilege model:
  - `admin`: broad access
  - `manager`: broader read access if explicitly enabled by policy
  - `responsabile_casa`: only assigned shelters
- Status/ownership workflow:
  - `IN_ACCOGLIENZA`: the guest is managed by coordinators assigned to `case_alloggio_submissions.struttura`
  - `USCITO`: the guest can be re-entered into one of the current coordinator's assigned shelters from duplicate detection
  - `DECEDUTO`: status updates are disabled
  - Transfers between shelters keep the guest `IN_ACCOGLIENZA`, change `struttura`, and must be recorded in `guest_status_events`
- Duplicate checks for new registrations intentionally search names across all shelters, but only through server-side controlled APIs/RPCs. Do not widen normal RLS dashboard access to all guests.
- If a duplicate is `IN_ACCOGLIENZA` in another shelter, the new shelter coordinator should request a transfer by email to the current shelter coordinators instead of directly taking over the record.

## Current Architecture
- Next.js app with Supabase SSR/browser/service clients.
- Supabase is now self-hosted on Hetzner/Coolify after the 2026-05-06 migration.
  - Source Supabase Cloud project was `menmuxslzhvlgwjrshrx` (`Accoglienze notturne`); do not mutate/delete it during follow-up checks.
  - Target Supabase URL: `https://supabase-accoglienze.stefano-orlando.it`
  - Target Coolify service suffix: `nt8ib6ylya0gyvwhu9zpuq9z`
  - Target DB container: `supabase-db-nt8ib6ylya0gyvwhu9zpuq9z`
  - Hetzner server: `coolify-supabase-01`, IP `178.105.59.79`
  - Local migration backups live in `/Users/stefanolaptop/Documents/codex_new/migrazione-supabase/backups/accoglienze-notturne/`
  - Local `.env.local` and Vercel envs should point at the target URL and target JWT keys; never print the keys.
- Tally webhook route:
  - `app/api/tally/webhook/route.ts`
- Tally field mapping:
  - `lib/tally/case-alloggio.ts`
- Guest status/domain helpers:
  - `lib/guests/status.ts`
  - `lib/guests/schema.ts`
- Guest detail and timeline UI:
  - `app/dashboard/submissions/[id]/page.tsx`
  - Timeline events should be displayed with user-facing Italian labels, not raw enum values: e.g. `Cambio stato`, `In accoglienza`, `Uscito`, `Deceduto`
  - Timeline dates should be shown as `dd/mm/yyyy`; keep raw JSON only inside the collapsible technical details
- New-registration duplicate and cross-shelter handoff flow:
  - `app/dashboard/new-registration/new-registration-client.tsx`
  - `app/api/guests/check-duplicates/route.ts`
  - `app/api/guests/[id]/duplicate-reentry/route.ts`
  - `app/api/guests/[id]/transfer-request/route.ts`
- Dashboard/API read from `case_alloggio_submissions`, not from legacy `submissions`.

## Auth State
- Magic link login is already implemented and hardened.
- Relevant files:
  - `app/login/page.tsx`
  - `app/auth/callback/page.tsx`
  - `app/api/auth/login/magic-link/route.ts`
  - `app/api/auth/login/preflight/route.ts`
  - `lib/auth/login-access.ts`
  - `lib/email/gmail.ts`
  - `lib/email/settings.ts`
  - `middleware.ts`
- Current behavior:
  - unauthenticated access to `/dashboard/*` and `/admin/*` redirects to `/login?next=...`
  - login page posts to `POST /api/auth/login/magic-link`
  - the route verifies the email against active `app_utenti`, calls Supabase Auth admin `generate_link` with the service role key, builds an app callback URL with `token_hash`, and sends the email through Gmail via `GMAIL_USER` / `GMAIL_APP_PASSWORD`
  - this avoids relying on the self-hosted Supabase Auth mailer/redirect configuration for user-facing login links
  - callback supports both legacy `code` exchange and `token_hash` verification
  - post-login redirect is role-aware:
    - admin -> `/admin`
    - everyone else -> `/dashboard`
  - `next` redirect is sanitized to avoid open redirects

## Important Migrations
- `20260304180000_align_rls_to_app_utenti.sql`
  - aligns RLS to `app_utenti` / `app_utenti_strutture`
- `20260304193000_drop_legacy_submissions_table.sql`
  - drops legacy `public.submissions`
- `20260304195000_app_utenti_add_contact_fields_and_default_role.sql`
  - adds `nome`, `cognome`, `telefono`
  - sets default `ruolo = responsabile_casa`
- `20260508120000_guest_transfer_updates_structure.sql`
  - updates `create_guest_status_event` so transfers can change `struttura` while keeping `IN_ACCOGLIENZA`
- `20260508143000_duplicate_reentry_rpc.sql`
  - adds `create_duplicate_reentry` for controlled re-entry of `USCITO` duplicates into one of the current coordinator's shelters
- `20260508160000_fix_status_event_null_current_status_fallback.sql`
  - fixes `create_guest_status_event` so rows with null `current_status` derive status from `data_uscita` / `data_decesso` before deciding whether a re-entry changes the main record
- There are also newer guest/status/audit migrations in `supabase/migrations/`; inspect the latest ones before changing guest behavior.

## Applying Migrations To Self-Hosted Supabase
- Never print database passwords, JWT keys, service role keys, or full connection strings.
- Preferred first attempt: use Supabase CLI with a direct DB URL if the target Postgres accepts the CLI connection:
  - open an SSH tunnel to the target DB container if needed
  - run `supabase db push --db-url "$DB_URL" --dry-run`
  - if the dry-run is correct, run `supabase db push --db-url "$DB_URL"`
- Current self-hosted target detail:
  - SSH host: `root@178.105.59.79`
  - DB container: `supabase-db-nt8ib6ylya0gyvwhu9zpuq9z`
  - DB name/user: `postgres` / `postgres`
- Known caveat: the current self-hosted Postgres container refused TLS during the 2026-05-08 migration apply, while Supabase CLI attempted TLS even with `sslmode=disable`. When this happens, use the reliable SSH + Docker + `psql` pattern below.
- Reliable fallback for one or more local migration files:
  ```bash
  ssh root@178.105.59.79 \
    'docker exec -i supabase-db-nt8ib6ylya0gyvwhu9zpuq9z psql --single-transaction --set ON_ERROR_STOP=1 -U postgres -d postgres' \
    < supabase/migrations/<migration-file>.sql
  ```
- After applying with `psql`, ensure Supabase migration history exists and record the applied migration version/name:
  ```bash
  ssh root@178.105.59.79 \
    'docker exec -i supabase-db-nt8ib6ylya0gyvwhu9zpuq9z psql --single-transaction --set ON_ERROR_STOP=1 -U postgres -d postgres' <<'SQL'
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text not null primary key);
  alter table supabase_migrations.schema_migrations add column if not exists name text;
  alter table supabase_migrations.schema_migrations add column if not exists statements text[];
  insert into supabase_migrations.schema_migrations(version, name, statements)
  values ('<yyyymmddhhmmss>', '<migration_name_without_timestamp>', array[]::text[])
  on conflict (version) do update
  set name = excluded.name,
      statements = excluded.statements;
  SQL
  ```
- If the history table was absent or incomplete on the self-hosted DB, backfill all local migration filenames into `supabase_migrations.schema_migrations` after confirming the schema already includes those changes. This prevents future `supabase db push` runs from trying to replay old migrations.
- Verify after applying:
  - query `supabase_migrations.schema_migrations` for the new version
  - inspect the changed function/table/policy directly with `psql`
  - run app validation locally when code depends on the migration

## Import Scripts
- Legacy Tally guest import:
  - `scripts/import-legacy-case-alloggio.rb`
- User import into `app_utenti` and `app_utenti_strutture`:
  - `scripts/import-app-utenti.rb`
- These scripts use Supabase REST with service-role credentials and are intended to be idempotent via upsert.

## Recommended Files To Read First
- `app/login/page.tsx`
- `app/auth/callback/page.tsx`
- `middleware.ts`
- `app/dashboard/page.tsx`
- `app/admin/statistics/page.tsx`
- `app/api/tally/webhook/route.ts`
- `lib/guests/schema.ts`
- `lib/guests/status.ts`
- latest files in `supabase/migrations/`

## Resume Snapshot
This section is a snapshot, not a replacement for `git status`.

As of 2026-04-11:
- branch was `main`
- local branch was aligned with `origin/main` (`0` behind / `0` ahead)
- the worktree was not clean
- local in-progress changes existed in:
  - `.codex/environments/environment.toml`
  - `app/admin/statistics/page.tsx`
  - `app/api/tally/webhook/route.ts`
  - `app/dashboard/page.tsx`
  - `lib/guests/schema.ts`
  - `lib/guests/status.ts`
  - `next-env.d.ts`
  - `tsconfig.tsbuildinfo`
- untracked migrations existed:
  - `supabase/migrations/20260305150000_allow_cascade_delete_for_guest_audit_tables.sql`
  - `supabase/migrations/20260323091205_fix_profile_audit_json_null_handling.sql`

Treat those local changes as possible user WIP. Inspect them before editing the same area.

## Likely Next Resume Point
The project is past the initial login setup. The likely active area is now:
- coordinator dashboard and guest listing UX
- admin statistics page
- guest status normalization / schema handling
- Tally webhook refinements tied to that schema

If resuming without a more specific user request:
1. run the sync check
2. inspect current local changes
3. read the key files above
4. continue from the active dashboard/admin/status work without breaking RLS guarantees

## Notes
- UI copy can be in Italian.
- Avoid logging personal/sensitive guest data unless absolutely necessary.
- If schema and code disagree, prefer the real database schema plus the newest migration intent, then make the safest fix explicitly.
