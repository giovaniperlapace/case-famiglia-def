export const UPDATE_TYPE_OPTIONS = ["followup", "exit", "death", "reentry"] as const;
export type UpdateTypeOption = (typeof UPDATE_TYPE_OPTIONS)[number];

export const RIENTRO_STESSA_STRUTTURA_OPTIONS = ["Sì", "No"] as const;

export const STRUTTURA_RIENTRO_OPTIONS = [
  "Buon Pastore",
  "San Calisto",
  "Villetta",
  "Palazzo Migliori",
  "Casa di Heidi",
  "Caio Manilio",
  "Via dei Campani",
] as const;

export const DOVE_DORME_OPTIONS = [
  "Strada",
  "Altro centro accoglienza",
  "Sistemazione abitativa precaria",
  "Convivenza",
  "Casa",
  "Ricovero in struttura sanitaria",
  "Detenzione",
  "Deceduto",
] as const;

export const CAUSA_USCITA_OPTIONS = [
  "Abitazione reperita autonomamente",
  "Abitazione reperita tramite Comunità",
  "Convivenza reperita autonomamente",
  "Convivenza reperita tramite Comunità",
  "Trasferimento in altra accoglienza Comunità",
  "Accoglienza in altri organismi",
  "Allontanamento volontario",
  "Allontanamento motivato",
  "Ricovero in struttura sanitaria",
  "Ritorno in famiglia",
  "Ritorno in Paese di provenienza",
  "Ritorno per strada",
  "Alloggio precario",
  "Decesso",
] as const;

export const CAUSA_DECESSO_OPTIONS = [
  "Neoplasia",
  "Complicazione dialisi",
  "Cardiopatia",
  "Shock settico",
  "Malattie senili",
  "Morte in strada",
  "Coma diabetico",
  "Incidente",
  "IMA (Infarto del Miocardio)",
  "Suicidio",
  "Altro",
] as const;

export const RESIDENZA_OPTIONS = [
  "Sì, nel Comune di Roma ma presso un indirizzo diverso da una casa privata (residenza fittizia, es. residente in via Modesta Valenti)",
  "Sì, nel Comune di Roma",
  "Sì, in altro comune (italiano)",
  "No",
] as const;

export const REDDITO_OPTIONS = ["Sì", "No"] as const;
export const SI_NO_OPTIONS = ["Sì", "No"] as const;

export const DOCUMENTI_OPTIONS = [
  "Carta d’identità",
  "Passaporto",
  "Permesso di soggiorno",
  "Codice fiscale",
  "Tessera sanitaria",
  "STP/ENI",
  "Nessuno",
  "Altro",
] as const;

export const TIPO_REDDITO_OPTIONS = [
  "Pensione",
  "Invalidità",
  "Reddito di inclusione",
  "Reddito da lavoro",
] as const;

export const TIPO_LAVORO_OPTIONS = [
  "Lavoro subordinato",
  "Lavoro autonomo",
  "Lavoro domestico",
  "Altro tipo di contratto (es. prestazione occasionale)",
] as const;

export const DIPENDENZE_OPTIONS = ["Alcolismo", "Sostanze", "Ludopatia", "Nessuna"] as const;

export const PATOLOGIE_OPTIONS = [
  "Malattie infettive e parassitarie",
  "Neoplasie",
  "Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario",
  "Malattie endocrine, nutrizionali e metaboliche",
  "Disturbi psichici e comportamentali",
  "Cardiopatie",
  "Malattie del sistema nervoso",
  "Malattie dell'occhio e degli annessi oculari",
  "Malattie dell'orecchio e del processo mastoideo",
  "Malattie del sistema circolatorio",
  "Malattie del sistema respiratorio",
  "Malattie dell'apparato digerente",
  "Malattie della pelle e del tessuto sottocutaneo",
  "Malattie del sistema muscoloscheletrico e del tessuto connettivo",
  "Malattie dell'apparato genito-urinario",
  "Malformazioni congenite, deformità e anomalie cromosomiche",
  "Traumi, avvelenamenti e alcune altre conseguenze di cause esterne",
  "Nessuna",
  "Altro",
] as const;

export const PATOLOGIA_PSICHIATRICA_OPTIONS = [
  "No",
  "Si, diagnosticata",
  "Si, non diagnosticata",
  "Disabilità",
] as const;

export const DECESSO_DOVE_DORME = "Deceduto";
export const DECESSO_CAUSA_USCITA = "Decesso";

export function isAllowedOption<T extends readonly string[]>(
  options: T,
  value: string | null | undefined
): value is T[number] {
  return Boolean(value && options.includes(value));
}

export function isAffirmative(value: string | null | undefined): boolean {
  return value === "Sì" || value === "Si";
}

export function normalizePatologiaPsichiatrica(
  value: string | null | undefined
): (typeof PATOLOGIA_PSICHIATRICA_OPTIONS)[number] | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "no") return "No";
  if (normalized === "disabilità" || normalized === "disabilita") return "Disabilità";
  if (
    normalized === "si, diagnosticata" ||
    normalized === "sì, diagnosticata" ||
    normalized === "si diagnosticata" ||
    normalized === "sì diagnosticata"
  ) {
    return "Si, diagnosticata";
  }
  if (
    normalized === "si, non diagnosticata" ||
    normalized === "sì, non diagnosticata" ||
    normalized === "si non diagnosticata" ||
    normalized === "sì non diagnosticata"
  ) {
    return "Si, non diagnosticata";
  }
  return null;
}
