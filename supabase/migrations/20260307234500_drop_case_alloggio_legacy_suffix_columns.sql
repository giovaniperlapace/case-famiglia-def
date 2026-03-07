-- Drop deprecated legacy columns used by old Tally update flow.
-- These fields are superseded by:
-- - current snapshot columns (non-suffixed)
-- - guest_status_events.payload event history

alter table public.case_alloggio_submissions
  drop column if exists tipo_di_reddito_2,
  drop column if exists tipo_di_reddito_pensione_2,
  drop column if exists tipo_di_reddito_invalidita_2,
  drop column if exists tipo_di_reddito_reddito_di_inclusione_2,
  drop column if exists tipo_di_reddito_reddito_da_lavoro_2,
  drop column if exists tipo_di_lavoro_2,
  drop column if exists data_decesso_2,
  drop column if exists causa_decesso_2,
  drop column if exists tipo_di_reddito_3,
  drop column if exists tipo_di_reddito_pensione_3,
  drop column if exists tipo_di_reddito_invalidita_3,
  drop column if exists tipo_di_reddito_reddito_di_inclusione_3,
  drop column if exists tipo_di_reddito_reddito_da_lavoro_3,
  drop column if exists tipo_di_lavoro_3;
