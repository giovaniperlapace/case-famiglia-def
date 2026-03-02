create table if not exists public.case_alloggio_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  respondent_id text null,
  submitted_at timestamptz null,
  owner_email text null,
  nome_e_cognome_compilatore text null,
  cognome_compilatore text null,
  contatto_compilatore text null,
  telefono text null,
  struttura text null,
  nome_della_persona text null,
  cognome text null,
  data_di_nascita text null,
  luogo_di_nascita text null,
  sesso_della_persona text null,
  nazionalita text null,
  contatto_della_persona text null,
  registrazione text null,
  tipo_aggiornamento text null,
  data_ingresso text null,
  e_gia_stato_in_un_accoglienza_della_comunita text null,
  al_momento_dell_ingresso_ha_un_reddito text null,
  tipo_di_reddito text null,
  tipo_di_reddito_pensione text null,
  tipo_di_reddito_invalidita text null,
  tipo_di_reddito_reddito_di_inclusione text null,
  tipo_di_reddito_reddito_da_lavoro text null,
  tipo_di_lavoro text null,
  al_momento_dell_ingresso_ha_residenza text null,
  dove_dormiva text null,
  principale_causa_poverta text null,
  data_uscita text null,
  causa_uscita text null,
  data_decesso text null,
  causa_decesso text null,
  al_momento_dell_uscita_ha_residenza text null,
  al_momento_dell_uscita_ha_un_reddito text null,
  tipo_di_reddito_2 text null,
  tipo_di_reddito_pensione_2 text null,
  tipo_di_reddito_invalidita_2 text null,
  tipo_di_reddito_reddito_di_inclusione_2 text null,
  tipo_di_reddito_reddito_da_lavoro_2 text null,
  tipo_di_lavoro_2 text null,
  data_ultimo_contatto text null,
  dove_dorme text null,
  data_decesso_2 text null,
  causa_decesso_2 text null,
  ha_residenza text null,
  ha_un_reddito text null,
  tipo_di_reddito_3 text null,
  tipo_di_reddito_pensione_3 text null,
  tipo_di_reddito_invalidita_3 text null,
  tipo_di_reddito_reddito_di_inclusione_3 text null,
  tipo_di_reddito_reddito_da_lavoro_3 text null,
  tipo_di_lavoro_3 text null,
  dipendenze text null,
  dipendenze_alcolismo text null,
  dipendenze_sostanze text null,
  dipendenze_ludopatia text null,
  dipendenze_nessuna text null,
  patologie text null,
  patologie_malattie_infettive_e_parassitarie text null,
  patologie_neoplasie_tumori text null,
  patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123 text null,
  patologie_malattie_endocrine_nutrizionali_e_metaboliche text null,
  patologie_disturbi_psichici_e_comportamentali text null,
  patologie_malattie_del_sistema_nervoso text null,
  patologie_malattie_dell_occhio_e_degli_annessi_oculari text null,
  patologie_malattie_dell_orecchio_e_del_processo_mastoideo text null,
  patologie_malattie_del_sistema_circolatorio text null,
  patologie_malattie_del_sistema_respiratorio text null,
  patologie_malattie_dell_apparato_digerente text null,
  patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo text null,
  patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101 text null,
  patologie_malattie_dell_apparato_genito_urinario text null,
  patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a text null,
  patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11 text null,
  patologie_nessuna text null,
  patologie_altro text null,
  patologia_psichiatrica text null,
  raw_payload jsonb not null,
  mapped_answers jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_alloggio_submissions_submission_id_key unique (submission_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists case_alloggio_submissions_submitted_at_idx
  on public.case_alloggio_submissions (submitted_at desc);

create index if not exists case_alloggio_submissions_owner_email_idx
  on public.case_alloggio_submissions (owner_email);

drop trigger if exists trg_case_alloggio_submissions_set_updated_at on public.case_alloggio_submissions;
create trigger trg_case_alloggio_submissions_set_updated_at
before update on public.case_alloggio_submissions
for each row
execute function public.set_updated_at();

alter table public.case_alloggio_submissions enable row level security;

drop policy if exists case_alloggio_submissions_select_own on public.case_alloggio_submissions;
create policy case_alloggio_submissions_select_own
on public.case_alloggio_submissions
for select
to authenticated
using (lower(owner_email) = lower(coalesce(auth.jwt()->>'email', '')));
