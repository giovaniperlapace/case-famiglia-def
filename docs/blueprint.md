# Blueprint from `global-friendship`

This document maps the architecture of the reference app (`https://github.com/steorlando/global-friendship`) and how it is reused in this new scaffold.

## 1) Webhook ingestion and validation

Reference files:
- `/tmp/global-friendship-ref/app/api/tally/webhook/route.ts`
- `/tmp/global-friendship-ref/app/api/webhook/route.ts` (re-export)

Reference pattern:
- The webhook route reads the raw request body first.
- Signature is validated with HMAC SHA-256 using `TALLY_WEBHOOK_SECRET` and headers `tally-signature`, `x-tally-signature`, or `tally-signature-v1`.
- Payload is normalized into DB fields.
- Ingestion is duplicate-safe by checking or constraining `tally_submission_id`.
- Webhook audit events are stored in `webhook_events` with status/error metadata.

Reused here:
- `app/api/tally/webhook/route.ts`
- `lib/tally/webhook.ts`
- Signature verification and idempotent upsert on `tally_submission_id`.
- Structured logging to `webhook_events` with safe error responses.

## 2) Supabase clients and env handling

Reference files:
- `/tmp/global-friendship-ref/lib/supabase/server.ts`
- `/tmp/global-friendship-ref/lib/supabase/client.ts`
- `/tmp/global-friendship-ref/lib/supabase/service.ts`

Reference pattern:
- Browser client uses anon key (`NEXT_PUBLIC_*`) with PKCE.
- Server client uses cookies + anon key for user-context reads.
- Service client uses `SUPABASE_SERVICE_ROLE_KEY` for privileged server-only writes (webhook).

Reused here:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/service.ts`
- `.env.example` includes only placeholders; no secrets are hardcoded.

## 3) Auth and protected routes

Reference files:
- `/tmp/global-friendship-ref/app/login/page.tsx`
- `/tmp/global-friendship-ref/app/auth/callback/page.tsx`
- `/tmp/global-friendship-ref/middleware.ts`

Reference pattern:
- Magic-link login via Supabase Auth.
- Callback exchanges code/token for session.
- `middleware.ts` protects `/dashboard/*` and redirects unauthenticated users to `/login`.

Reused here:
- `app/login/page.tsx`
- `app/auth/callback/page.tsx`
- `middleware.ts`
- `app/auth/signout/route.ts`

## 4) Database migrations and schema

Reference files:
- `/tmp/global-friendship-ref/supabase/tally_webhook_migration.sql`
- `/tmp/global-friendship-ref/supabase/tally_webhook_extended_columns.sql`

Reference pattern:
- SQL files under `supabase/` manage schema and evolution.
- Adds webhook audit table and normalized submission columns.
- Uses indexes for webhook and submission identifiers.

Reused here:
- `supabase/migrations/20260302190000_create_submissions.sql`
- Creates `submissions` + `webhook_events` tables and indexes.
- Adds unique `tally_submission_id` for idempotent ingestion.
- Stores `raw_payload` and `normalized_data` for debugging.

## 5) RLS scoping strategy

Reference app observation:
- Participant self-service reads are mostly enforced in server routes by deriving user identity (email) and filtering query results.
- Other modules use explicit RLS policies for manager/admin domains.

Implementation in this scaffold:
- RLS is enabled on `public.submissions`.
- `SELECT` policy allows authenticated users to read only rows where `owner_email` equals JWT email.
- Webhook writes use service-role client server-side.

## 6) User-specific UI data flow

Reference files:
- `/tmp/global-friendship-ref/app/dashboard/partecipante/page.tsx`
- `/tmp/global-friendship-ref/app/dashboard/partecipante/partecipante-form.tsx`
- `/tmp/global-friendship-ref/app/api/partecipante/me/route.ts`

Reference pattern:
- Dashboard pages fetch user-scoped data through server/API routes under authenticated session.
- UI has loading/error states and only exposes records matching the user identity.

Reused here:
- `app/dashboard/page.tsx`
- `app/dashboard/submissions/[id]/page.tsx`
- `app/api/submissions/route.ts`
- `app/api/submissions/[id]/route.ts`
- Data access uses logged-in user context + RLS, so users see only their own submissions.
