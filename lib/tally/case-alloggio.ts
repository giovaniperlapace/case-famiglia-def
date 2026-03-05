import { extractTallyAnswers, normalizeText, type TallyPayload } from "@/lib/tally/webhook";

export const CASE_ALLOGGIO_HEADER_TO_COLUMN = {
  id_utente: "id_utente",
  "Submission ID": "submission_id",
  "Respondent ID": "respondent_id",
  "Submitted at": "submitted_at",
  "Nome e cognome compilatore": "nome_e_cognome_compilatore",
  "Cognome compilatore": "cognome_compilatore",
  "Contatto compilatore": "contatto_compilatore",
  "Telefono compilatore": "telefono",
  Telefono: "contatto_della_persona",
  Struttura: "struttura",
  "Nome della persona": "nome_della_persona",
  Cognome: "cognome",
  "Data di nascita": "data_di_nascita",
  "Luogo di nascita": "luogo_di_nascita",
  "Sesso della persona": "sesso_della_persona",
  Nazionalità: "nazionalita",
  "Contatto della persona": "contatto_della_persona",
  Registrazione: "registrazione",
  "Tipo aggiornamento": "tipo_aggiornamento",
  "Data ingresso": "data_ingresso",
  "È già stato in un'accoglienza della Comunità":
    "e_gia_stato_in_un_accoglienza_della_comunita",
  "Al momento dell'ingresso ha un reddito": "al_momento_dell_ingresso_ha_un_reddito",
  "Tipo di reddito": "tipo_di_reddito",
  "Tipo di reddito (Pensione)": "tipo_di_reddito_pensione",
  "Tipo di reddito (Invalidità)": "tipo_di_reddito_invalidita",
  "Tipo di reddito (Reddito di inclusione)": "tipo_di_reddito_reddito_di_inclusione",
  "Tipo di reddito (Reddito da lavoro)": "tipo_di_reddito_reddito_da_lavoro",
  "Tipo di lavoro": "tipo_di_lavoro",
  "Al momento dell'ingresso ha residenza": "al_momento_dell_ingresso_ha_residenza",
  "Dove dormiva": "dove_dormiva",
  "Principale causa povertà": "principale_causa_poverta",
  "Data uscita": "data_uscita",
  "Causa uscita": "causa_uscita",
  "Data decesso": "data_decesso",
  "Causa decesso": "causa_decesso",
  "Al momento dell'uscita ha residenza": "al_momento_dell_uscita_ha_residenza",
  "Al momento dell'uscita ha un reddito": "al_momento_dell_uscita_ha_un_reddito",
  "Tipo di reddito (2)": "tipo_di_reddito_2",
  "Tipo di reddito (Pensione) (2)": "tipo_di_reddito_pensione_2",
  "Tipo di reddito (Invalidità) (2)": "tipo_di_reddito_invalidita_2",
  "Tipo di reddito (Reddito di inclusione) (2)":
    "tipo_di_reddito_reddito_di_inclusione_2",
  "Tipo di reddito (Reddito da lavoro) (2)": "tipo_di_reddito_reddito_da_lavoro_2",
  "Tipo di lavoro (2)": "tipo_di_lavoro_2",
  "Data ultimo contatto": "data_ultimo_contatto",
  "Dove dorme": "dove_dorme",
  "Data decesso (2)": "data_decesso_2",
  "Causa decesso (2)": "causa_decesso_2",
  "Ha residenza": "ha_residenza",
  "Ha un reddito": "ha_un_reddito",
  "Tipo di reddito (3)": "tipo_di_reddito_3",
  "Tipo di reddito (Pensione) (3)": "tipo_di_reddito_pensione_3",
  "Tipo di reddito (Invalidità) (3)": "tipo_di_reddito_invalidita_3",
  "Tipo di reddito (Reddito di inclusione) (3)":
    "tipo_di_reddito_reddito_di_inclusione_3",
  "Tipo di reddito (Reddito da lavoro) (3)": "tipo_di_reddito_reddito_da_lavoro_3",
  "Tipo di lavoro (3)": "tipo_di_lavoro_3",
  Dipendenze: "dipendenze",
  "Dipendenze (Alcolismo)": "dipendenze_alcolismo",
  "Dipendenze (Sostanze)": "dipendenze_sostanze",
  "Dipendenze (Ludopatia)": "dipendenze_ludopatia",
  "Dipendenze (Nessuna)": "dipendenze_nessuna",
  Patologie: "patologie",
  "Patologie (Malattie infettive e parassitarie)":
    "patologie_malattie_infettive_e_parassitarie",
  "Patologie (Neoplasie (tumori))": "patologie_neoplasie_tumori",
  "Patologie (Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario)":
    "patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123",
  "Patologie (Malattie endocrine, nutrizionali e metaboliche)":
    "patologie_malattie_endocrine_nutrizionali_e_metaboliche",
  "Patologie (Disturbi psichici e comportamentali)":
    "patologie_disturbi_psichici_e_comportamentali",
  "Patologie (Malattie del sistema nervoso)": "patologie_malattie_del_sistema_nervoso",
  "Patologie (Malattie dell’occhio e degli annessi oculari)":
    "patologie_malattie_dell_occhio_e_degli_annessi_oculari",
  "Patologie (Malattie dell’orecchio e del processo mastoideo)":
    "patologie_malattie_dell_orecchio_e_del_processo_mastoideo",
  "Patologie (Malattie del sistema circolatorio)":
    "patologie_malattie_del_sistema_circolatorio",
  "Patologie (Malattie del sistema respiratorio)":
    "patologie_malattie_del_sistema_respiratorio",
  "Patologie (Malattie dell’apparato digerente)":
    "patologie_malattie_dell_apparato_digerente",
  "Patologie (Malattie della pelle e del tessuto sottocutaneo)":
    "patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo",
  "Patologie (Malattie del sistema muscoloscheletrico e del tessuto connettivo)":
    "patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101",
  "Patologie (Malattie dell’apparato genito-urinario)":
    "patologie_malattie_dell_apparato_genito_urinario",
  "Patologie (Malformazioni congenite, deformità e anomalie cromosomiche)":
    "patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a",
  "Patologie (Traumi, avvelenamenti e alcune altre conseguenze di cause esterne)":
    "patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11",
  "Patologie (Nessuna)": "patologie_nessuna",
  "Patologie (Altro)": "patologie_altro",
  "Patologia psichiatrica": "patologia_psichiatrica",
} as const;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NORMALIZED_HEADER_TO_COLUMN = new Map<string, string>(
  Object.entries(CASE_ALLOGGIO_HEADER_TO_COLUMN).map(([header, column]) => [
    normalizeHeader(header),
    column,
  ])
);

function normalizeEmail(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toNullable(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function extractHiddenUserId(
  payload: TallyPayload,
  answers: Record<string, string>
): string | null {
  const fromAnswers = toNullable(answers.id_utente);
  if (fromAnswers) return fromAnswers;

  const hiddenSources = [payload.data?.hiddenFields, payload.hiddenFields];

  for (const hidden of hiddenSources) {
    if (!hidden) continue;

    if (Array.isArray(hidden)) {
      for (const entry of hidden) {
        if (!entry || typeof entry !== "object") continue;
        const item = entry as Record<string, unknown>;
        const key = normalizeText(item.key ?? item.name ?? item.label ?? item.id ?? "");
        if (key === "id_utente") {
          const value = toNullable(item.value ?? item.text);
          if (value) return value;
        }
      }
    }

    if (typeof hidden === "object") {
      const value = toNullable((hidden as Record<string, unknown>).id_utente);
      if (value) return value;
    }
  }

  return null;
}

export function mapCaseAlloggioSubmission(payload: TallyPayload) {
  const answers = extractTallyAnswers(payload);
  const answersByNormalizedHeader = new Map<string, string>();

  for (const [label, value] of Object.entries(answers)) {
    const normalizedLabel = normalizeHeader(label);
    if (!normalizedLabel) continue;
    answersByNormalizedHeader.set(normalizedLabel, value);
  }

  const row: Record<string, string | null> = {};
  for (const column of Object.values(CASE_ALLOGGIO_HEADER_TO_COLUMN)) {
    row[column] = null;
  }

  for (const [normalizedHeader, value] of answersByNormalizedHeader.entries()) {
    const column = NORMALIZED_HEADER_TO_COLUMN.get(normalizedHeader);
    if (!column) continue;
    row[column] = toNullable(value);
  }

  row.submission_id =
    row.submission_id ??
    toNullable(payload.data?.submissionId ?? payload.submissionId);
  row.respondent_id =
    row.respondent_id ??
    toNullable(payload.data?.respondentId ?? payload.respondentId);
  row.submitted_at =
    row.submitted_at ??
    toNullable(payload.data?.createdAt ?? payload.createdAt);
  row.id_utente = row.id_utente ?? extractHiddenUserId(payload, answers);

  const ownerEmail =
    normalizeEmail(row.contatto_compilatore) ??
    normalizeEmail(row.contatto_della_persona);

  return {
    row,
    ownerEmail,
    submissionId: row.submission_id,
    respondentId: row.respondent_id,
    submittedAt: row.submitted_at,
    mappedAnswers: answers,
  };
}
