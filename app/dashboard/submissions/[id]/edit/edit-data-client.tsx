"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { NATIONALITY_OPTIONS } from "@/lib/guests/nationalities";
import {
  DOCUMENTI_OPTIONS,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIA_PSICHIATRICA_OPTIONS,
  PATOLOGIE_OPTIONS,
  REDDITO_OPTIONS,
  RESIDENZA_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  normalizePatologiaPsichiatrica,
} from "@/lib/guests/status-update-options";

const SEX_OPTIONS = ["Uomo", "Donna", "Altro"] as const;
const YES_NO_OPTIONS = ["Sì", "No"] as const;
const DIPENDENZE_CHECKBOXES = [
  { label: "Alcolismo", key: "dipendenze_alcolismo" as const },
  { label: "Sostanze", key: "dipendenze_sostanze" as const },
  { label: "Ludopatia", key: "dipendenze_ludopatia" as const },
  { label: "Nessuna", key: "dipendenze_nessuna" as const },
] as const;
const PATOLOGIE_CHECKBOXES = [
  { label: "Malattie infettive e parassitarie", key: "patologie_malattie_infettive_e_parassitarie" as const },
  { label: "Neoplasie", key: "patologie_neoplasie_tumori" as const },
  {
    label: "Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario",
    key: "patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123" as const,
  },
  { label: "Malattie endocrine, nutrizionali e metaboliche", key: "patologie_malattie_endocrine_nutrizionali_e_metaboliche" as const },
  { label: "Disturbi psichici e comportamentali", key: "patologie_disturbi_psichici_e_comportamentali" as const },
  { label: "Malattie del sistema nervoso", key: "patologie_malattie_del_sistema_nervoso" as const },
  { label: "Malattie dell'occhio e degli annessi oculari", key: "patologie_malattie_dell_occhio_e_degli_annessi_oculari" as const },
  { label: "Malattie dell'orecchio e del processo mastoideo", key: "patologie_malattie_dell_orecchio_e_del_processo_mastoideo" as const },
  { label: "Malattie del sistema circolatorio", key: "patologie_malattie_del_sistema_circolatorio" as const },
  { label: "Malattie del sistema respiratorio", key: "patologie_malattie_del_sistema_respiratorio" as const },
  { label: "Malattie dell'apparato digerente", key: "patologie_malattie_dell_apparato_digerente" as const },
  { label: "Malattie della pelle e del tessuto sottocutaneo", key: "patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo" as const },
  { label: "Malattie del sistema muscoloscheletrico e del tessuto connettivo", key: "patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101" as const },
  { label: "Malattie dell'apparato genito-urinario", key: "patologie_malattie_dell_apparato_genito_urinario" as const },
  { label: "Malformazioni congenite, deformità e anomalie cromosomiche", key: "patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a" as const },
  { label: "Traumi, avvelenamenti e alcune altre conseguenze di cause esterne", key: "patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11" as const },
  { label: "Nessuna", key: "patologie_nessuna" as const },
  { label: "Altro", key: "patologie_altro" as const },
] as const;
const POVERTA_OPTIONS = [
  "Economica",
  "Sociale",
  "Psicosi",
  "Alcolismo",
  "Dipendenza",
  "Ludopatia",
  "Salute",
  "Altro",
] as const;

type EditableGuestValues = {
  nome_della_persona: string | null;
  cognome: string | null;
  data_di_nascita: string | null;
  luogo_di_nascita: string | null;
  sesso_della_persona: string | null;
  nazionalita: string | null;
  contatto_della_persona: string | null;
  data_ingresso: string | null;
  e_gia_stato_in_un_accoglienza_della_comunita: string | null;
  al_momento_dell_ingresso_ha_un_reddito: string | null;
  tipo_di_reddito: string | null;
  tipo_di_reddito_pensione: string | null;
  tipo_di_reddito_invalidita: string | null;
  tipo_di_reddito_reddito_di_inclusione: string | null;
  tipo_di_reddito_reddito_da_lavoro: string | null;
  tipo_di_lavoro: string | null;
  al_momento_dell_ingresso_ha_residenza: string | null;
  dove_dormiva: string | null;
  principale_causa_poverta: string | null;
  al_momento_dell_ingresso_ha_i_seguenti_documenti: string | null;
  al_momento_dell_uscita_ha_i_seguenti_documenti: string | null;
  siamo_ancora_in_contatto: string | null;
  chi_e_in_contatto: string | null;
  ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: string | null;
  ha_gia_fatto_domanda_di_casa_popolare: string | null;
  data_domanda_casa_popolare: string | null;
  dipendenze: string | null;
  dipendenze_alcolismo: string | null;
  dipendenze_sostanze: string | null;
  dipendenze_ludopatia: string | null;
  dipendenze_nessuna: string | null;
  patologie: string | null;
  patologie_malattie_infettive_e_parassitarie: string | null;
  patologie_neoplasie_tumori: string | null;
  patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123: string | null;
  patologie_malattie_endocrine_nutrizionali_e_metaboliche: string | null;
  patologie_disturbi_psichici_e_comportamentali: string | null;
  patologie_malattie_del_sistema_nervoso: string | null;
  patologie_malattie_dell_occhio_e_degli_annessi_oculari: string | null;
  patologie_malattie_dell_orecchio_e_del_processo_mastoideo: string | null;
  patologie_malattie_del_sistema_circolatorio: string | null;
  patologie_malattie_del_sistema_respiratorio: string | null;
  patologie_malattie_dell_apparato_digerente: string | null;
  patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo: string | null;
  patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101: string | null;
  patologie_malattie_dell_apparato_genito_urinario: string | null;
  patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a: string | null;
  patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11: string | null;
  patologie_nessuna: string | null;
  patologie_altro: string | null;
  patologia_psichiatrica: string | null;
};

type EditDataClientProps = {
  guestId: string;
  initialValues: EditableGuestValues;
};

type EditableGuestFieldKey = keyof EditableGuestValues;
type EditableForm = Record<EditableGuestFieldKey, string>;

function normalizeToIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }
  return "";
}

function isoToItalianDate(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  const [year, month, day] = trimmed.split("-");
  return `${day}/${month}/${year}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  if (year < 1900 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeYesNo(value: string): string {
  if (value === "true" || value === "Si") return "Sì";
  if (value === "false") return "No";
  return value;
}

function toE164(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function isValidPhone(value: string): boolean {
  return /^\+\d{6,15}$/.test(value);
}

function initForm(initialValues: EditableGuestValues): EditableForm {
  return {
    nome_della_persona: initialValues.nome_della_persona ?? "",
    cognome: initialValues.cognome ?? "",
    data_di_nascita: normalizeToIsoDate(initialValues.data_di_nascita ?? ""),
    luogo_di_nascita: initialValues.luogo_di_nascita ?? "",
    sesso_della_persona: initialValues.sesso_della_persona ?? "",
    nazionalita: initialValues.nazionalita ?? "",
    contatto_della_persona: toE164(initialValues.contatto_della_persona ?? "") || "+39",
    data_ingresso: normalizeToIsoDate(initialValues.data_ingresso ?? ""),
    e_gia_stato_in_un_accoglienza_della_comunita: normalizeYesNo(
      initialValues.e_gia_stato_in_un_accoglienza_della_comunita ?? ""
    ),
    al_momento_dell_ingresso_ha_un_reddito: normalizeYesNo(
      initialValues.al_momento_dell_ingresso_ha_un_reddito ?? ""
    ),
    tipo_di_reddito: initialValues.tipo_di_reddito ?? "",
    tipo_di_reddito_pensione: normalizeYesNo(initialValues.tipo_di_reddito_pensione ?? ""),
    tipo_di_reddito_invalidita: normalizeYesNo(initialValues.tipo_di_reddito_invalidita ?? ""),
    tipo_di_reddito_reddito_di_inclusione: normalizeYesNo(
      initialValues.tipo_di_reddito_reddito_di_inclusione ?? ""
    ),
    tipo_di_reddito_reddito_da_lavoro: normalizeYesNo(
      initialValues.tipo_di_reddito_reddito_da_lavoro ?? ""
    ),
    tipo_di_lavoro: initialValues.tipo_di_lavoro ?? "",
    al_momento_dell_ingresso_ha_residenza:
      initialValues.al_momento_dell_ingresso_ha_residenza ?? "",
    dove_dormiva: initialValues.dove_dormiva ?? "",
    principale_causa_poverta: initialValues.principale_causa_poverta ?? "",
    al_momento_dell_ingresso_ha_i_seguenti_documenti:
      initialValues.al_momento_dell_ingresso_ha_i_seguenti_documenti ?? "",
    al_momento_dell_uscita_ha_i_seguenti_documenti:
      initialValues.al_momento_dell_uscita_ha_i_seguenti_documenti ?? "",
    siamo_ancora_in_contatto: normalizeYesNo(initialValues.siamo_ancora_in_contatto ?? ""),
    chi_e_in_contatto: initialValues.chi_e_in_contatto ?? "",
    ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: normalizeYesNo(
      initialValues.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare ?? ""
    ),
    ha_gia_fatto_domanda_di_casa_popolare: normalizeYesNo(
      initialValues.ha_gia_fatto_domanda_di_casa_popolare ?? ""
    ),
    data_domanda_casa_popolare: normalizeToIsoDate(initialValues.data_domanda_casa_popolare ?? ""),
    dipendenze: initialValues.dipendenze ?? "",
    dipendenze_alcolismo: normalizeYesNo(initialValues.dipendenze_alcolismo ?? ""),
    dipendenze_sostanze: normalizeYesNo(initialValues.dipendenze_sostanze ?? ""),
    dipendenze_ludopatia: normalizeYesNo(initialValues.dipendenze_ludopatia ?? ""),
    dipendenze_nessuna: normalizeYesNo(initialValues.dipendenze_nessuna ?? ""),
    patologie: initialValues.patologie ?? "",
    patologie_malattie_infettive_e_parassitarie: normalizeYesNo(
      initialValues.patologie_malattie_infettive_e_parassitarie ?? ""
    ),
    patologie_neoplasie_tumori: normalizeYesNo(initialValues.patologie_neoplasie_tumori ?? ""),
    patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123: normalizeYesNo(
      initialValues.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123 ?? ""
    ),
    patologie_malattie_endocrine_nutrizionali_e_metaboliche: normalizeYesNo(
      initialValues.patologie_malattie_endocrine_nutrizionali_e_metaboliche ?? ""
    ),
    patologie_disturbi_psichici_e_comportamentali: normalizeYesNo(
      initialValues.patologie_disturbi_psichici_e_comportamentali ?? ""
    ),
    patologie_malattie_del_sistema_nervoso: normalizeYesNo(
      initialValues.patologie_malattie_del_sistema_nervoso ?? ""
    ),
    patologie_malattie_dell_occhio_e_degli_annessi_oculari: normalizeYesNo(
      initialValues.patologie_malattie_dell_occhio_e_degli_annessi_oculari ?? ""
    ),
    patologie_malattie_dell_orecchio_e_del_processo_mastoideo: normalizeYesNo(
      initialValues.patologie_malattie_dell_orecchio_e_del_processo_mastoideo ?? ""
    ),
    patologie_malattie_del_sistema_circolatorio: normalizeYesNo(
      initialValues.patologie_malattie_del_sistema_circolatorio ?? ""
    ),
    patologie_malattie_del_sistema_respiratorio: normalizeYesNo(
      initialValues.patologie_malattie_del_sistema_respiratorio ?? ""
    ),
    patologie_malattie_dell_apparato_digerente: normalizeYesNo(
      initialValues.patologie_malattie_dell_apparato_digerente ?? ""
    ),
    patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo: normalizeYesNo(
      initialValues.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo ?? ""
    ),
    patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101: normalizeYesNo(
      initialValues.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101 ?? ""
    ),
    patologie_malattie_dell_apparato_genito_urinario: normalizeYesNo(
      initialValues.patologie_malattie_dell_apparato_genito_urinario ?? ""
    ),
    patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a: normalizeYesNo(
      initialValues.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a ?? ""
    ),
    patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11: normalizeYesNo(
      initialValues.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11 ?? ""
    ),
    patologie_nessuna: normalizeYesNo(initialValues.patologie_nessuna ?? ""),
    patologie_altro: initialValues.patologie_altro ?? "",
    patologia_psichiatrica: normalizePatologiaPsichiatrica(initialValues.patologia_psichiatrica) ?? "",
  };
}

function isAllowed(options: readonly string[], value: string): boolean {
  return options.includes(value);
}

function isYes(value: string): boolean {
  return value === "Sì";
}

function isTrueLike(value: string): boolean {
  return value === "true" || value === "Sì" || value === "Si";
}

function splitCsvValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTokensToAllowed(value: string, options: readonly string[]): string[] {
  return splitCsvValues(value)
    .map((token) => {
      const normalized = normalizeOptionValue(token);
      return options.find((option) => normalizeOptionValue(option) === normalized) ?? null;
    })
    .filter((token): token is string => Boolean(token));
}

function toCsvValue(values: string[]): string {
  return values.join(", ");
}

function orderedUnique(options: readonly string[], values: string[]): string[] {
  const selected = new Set(values.map((item) => item.trim()).filter(Boolean));
  return options.filter((option) => selected.has(option));
}

function toggleCsvOption(currentValue: string, option: string, options: readonly string[]): string {
  if (!options.includes(option)) return currentValue;
  const current = splitCsvValues(currentValue);
  const next = current.includes(option)
    ? current.filter((item) => item !== option)
    : [...current, option];
  return toCsvValue(orderedUnique(options, next));
}

export default function EditDataClient({ guestId, initialValues }: EditDataClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditableForm>(() => initForm(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameChangeConfirmed, setNameChangeConfirmed] = useState(false);

  const initialName = (initialValues.nome_della_persona ?? "").trim();
  const initialSurname = (initialValues.cognome ?? "").trim();
  const hasNameOrSurnameChange = useMemo(() => {
    return (
      form.nome_della_persona.trim() !== initialName || form.cognome.trim() !== initialSurname
    );
  }, [form.cognome, form.nome_della_persona, initialName, initialSurname]);

  const hasIngressoIncome = form.al_momento_dell_ingresso_ha_un_reddito === "Sì";
  const selectedPovertyCauses = splitCsvValues(form.principale_causa_poverta);
  const selectedDocumentiIngresso = normalizeTokensToAllowed(
    form.al_momento_dell_ingresso_ha_i_seguenti_documenti,
    DOCUMENTI_OPTIONS
  );
  const selectedDocumentiUscita = normalizeTokensToAllowed(
    form.al_momento_dell_uscita_ha_i_seguenti_documenti,
    DOCUMENTI_OPTIONS
  );
  const ingressoIncomeSelections = [
    { label: "Pensione", key: "tipo_di_reddito_pensione" as const },
    { label: "Invalidità", key: "tipo_di_reddito_invalidita" as const },
    { label: "Reddito di inclusione", key: "tipo_di_reddito_reddito_di_inclusione" as const },
    { label: "Reddito da lavoro", key: "tipo_di_reddito_reddito_da_lavoro" as const },
  ];
  const selectedIngressoIncomeTypes = ingressoIncomeSelections
    .filter((item) => isYes(form[item.key]))
    .map((item) => item.label);
  const needsIngressoWorkType = hasIngressoIncome && selectedIngressoIncomeTypes.includes("Reddito da lavoro");
  const selectedDependencies = DIPENDENZE_CHECKBOXES.filter((item) => isYes(form[item.key])).map(
    (item) => item.label
  );
  const selectedPatologie = Array.from(
    new Set([
      ...PATOLOGIE_CHECKBOXES.filter((item) =>
        item.key === "patologie_altro"
          ? Boolean(form.patologie_altro && form.patologie_altro !== "false")
          : isTrueLike(form[item.key])
      ).map((item) => item.label),
      ...normalizeTokensToAllowed(form.patologie, PATOLOGIE_OPTIONS),
    ])
  );
  const needsChiEInContatto = form.siamo_ancora_in_contatto === "Sì";
  const needsDataDomandaCasaPopolare = form.ha_gia_fatto_domanda_di_casa_popolare === "Sì";

  useEffect(() => {
    if (!hasNameOrSurnameChange) {
      setNameChangeConfirmed(false);
    }
  }, [hasNameOrSurnameChange]);

  function setField<K extends EditableGuestFieldKey>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm(): string | null {
    if (form.data_di_nascita && !isValidIsoDate(form.data_di_nascita)) {
      return "Data di nascita non valida.";
    }

    if (form.data_ingresso && !isValidIsoDate(form.data_ingresso)) {
      return "Data ingresso non valida.";
    }

    const normalizedPhone = toE164(form.contatto_della_persona);
    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return "Il contatto deve essere un telefono valido in formato internazionale, es. +3932678766.";
    }

    if (form.nazionalita && !isAllowed(NATIONALITY_OPTIONS, form.nazionalita)) {
      return "Seleziona una nazionalità valida dall'elenco.";
    }

    if (!isAllowed(SEX_OPTIONS, form.sesso_della_persona)) {
      return "Seleziona il sesso tra Uomo, Donna o Altro.";
    }

    if (
      form.e_gia_stato_in_un_accoglienza_della_comunita &&
      !isAllowed(YES_NO_OPTIONS, form.e_gia_stato_in_un_accoglienza_della_comunita)
    ) {
      return "Il campo 'Già stato in accoglienza' accetta solo Sì/No.";
    }

    if (
      form.al_momento_dell_ingresso_ha_un_reddito &&
      !isAllowed(YES_NO_OPTIONS, form.al_momento_dell_ingresso_ha_un_reddito)
    ) {
      return "Il campo 'Reddito all\'ingresso' accetta solo Sì/No.";
    }

    if (hasIngressoIncome) {
      if (selectedIngressoIncomeTypes.length === 0) {
        return "Se Reddito all'ingresso è Sì, seleziona almeno un tipo di reddito.";
      }
      if (needsIngressoWorkType && !isAllowed(TIPO_LAVORO_OPTIONS, form.tipo_di_lavoro)) {
        return "Tipo di lavoro all'ingresso non valido.";
      }
    }

    if (
      form.al_momento_dell_ingresso_ha_residenza &&
      !isAllowed(RESIDENZA_OPTIONS, form.al_momento_dell_ingresso_ha_residenza)
    ) {
      return "Residenza all'ingresso non valida.";
    }

    if (form.dove_dormiva && !isAllowed(DOVE_DORME_OPTIONS, form.dove_dormiva)) {
      return "Dove dormiva non valido.";
    }

    if (
      selectedPovertyCauses.some((cause) => !isAllowed(POVERTA_OPTIONS, cause)) ||
      selectedPovertyCauses.length > 2
    ) {
      return "Principale causa povertà: seleziona massimo 2 opzioni valide.";
    }

    if (
      selectedDocumentiIngresso.some((documento) => !isAllowed(DOCUMENTI_OPTIONS, documento)) ||
      selectedDocumentiUscita.some((documento) => !isAllowed(DOCUMENTI_OPTIONS, documento))
    ) {
      return "Documenti non validi.";
    }

    if (
      selectedDependencies.some((dependency) => !isAllowed(DIPENDENZE_OPTIONS, dependency)) ||
      (selectedDependencies.includes("Nessuna") && selectedDependencies.length > 1)
    ) {
      return "Dipendenze non valide.";
    }

    if (
      selectedPatologie.some((patologia) => !isAllowed(PATOLOGIE_OPTIONS, patologia)) ||
      (selectedPatologie.includes("Nessuna") && selectedPatologie.length > 1)
    ) {
      return "Patologie non valide.";
    }

    if (
      form.patologia_psichiatrica &&
      !isAllowed(PATOLOGIA_PSICHIATRICA_OPTIONS, form.patologia_psichiatrica)
    ) {
      return "Patologia psichiatrica non valida.";
    }

    if (form.siamo_ancora_in_contatto && !isAllowed(YES_NO_OPTIONS, form.siamo_ancora_in_contatto)) {
      return "Il campo 'Siamo ancora in contatto' accetta solo Sì/No.";
    }

    if (needsChiEInContatto && !form.chi_e_in_contatto.trim()) {
      return "Se siamo ancora in contatto, indica chi è in contatto.";
    }

    if (
      form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare &&
      !isAllowed(YES_NO_OPTIONS, form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare)
    ) {
      return "Il campo requisiti casa popolare accetta solo Sì/No.";
    }

    if (
      form.ha_gia_fatto_domanda_di_casa_popolare &&
      !isAllowed(YES_NO_OPTIONS, form.ha_gia_fatto_domanda_di_casa_popolare)
    ) {
      return "Il campo domanda casa popolare accetta solo Sì/No.";
    }

    if (needsDataDomandaCasaPopolare && !isValidIsoDate(form.data_domanda_casa_popolare)) {
      return "In data non valida.";
    }

    const yesNoFields: EditableGuestFieldKey[] = [
      "tipo_di_reddito_pensione",
      "tipo_di_reddito_invalidita",
      "tipo_di_reddito_reddito_di_inclusione",
      "tipo_di_reddito_reddito_da_lavoro",
      "dipendenze_alcolismo",
      "dipendenze_sostanze",
      "dipendenze_ludopatia",
      "dipendenze_nessuna",
      "siamo_ancora_in_contatto",
      "ha_i_requisiti_per_fare_la_domanda_di_casa_popolare",
      "ha_gia_fatto_domanda_di_casa_popolare",
    ];

    for (const field of yesNoFields) {
      if (form[field] && !isAllowed(YES_NO_OPTIONS, form[field])) {
        return `Valore non valido per ${field}. Usa Sì/No.`;
      }
    }

    if (hasNameOrSurnameChange && !nameChangeConfirmed) {
      return "Conferma esplicita richiesta per modificare nome o cognome.";
    }

    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (hasNameOrSurnameChange) {
      const ok = window.confirm("Confermi di voler modificare nome e/o cognome di questa persona?");
      if (!ok) return;
    }

    setLoading(true);

    try {
      const payload: EditableForm = {
        ...form,
        tipo_di_reddito: hasIngressoIncome ? selectedIngressoIncomeTypes.join(", ") : "",
        tipo_di_reddito_pensione: hasIngressoIncome ? form.tipo_di_reddito_pensione : "No",
        tipo_di_reddito_invalidita: hasIngressoIncome ? form.tipo_di_reddito_invalidita : "No",
        tipo_di_reddito_reddito_di_inclusione: hasIngressoIncome ? form.tipo_di_reddito_reddito_di_inclusione : "No",
        tipo_di_reddito_reddito_da_lavoro: hasIngressoIncome ? form.tipo_di_reddito_reddito_da_lavoro : "No",
        tipo_di_lavoro: needsIngressoWorkType ? form.tipo_di_lavoro : "",
        al_momento_dell_ingresso_ha_i_seguenti_documenti: selectedDocumentiIngresso.join(", "),
        al_momento_dell_uscita_ha_i_seguenti_documenti: selectedDocumentiUscita.join(", "),
        siamo_ancora_in_contatto: form.siamo_ancora_in_contatto,
        chi_e_in_contatto: needsChiEInContatto ? form.chi_e_in_contatto.trim() : "",
        ha_i_requisiti_per_fare_la_domanda_di_casa_popolare:
          form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare,
        ha_gia_fatto_domanda_di_casa_popolare: form.ha_gia_fatto_domanda_di_casa_popolare,
        data_domanda_casa_popolare:
          needsDataDomandaCasaPopolare && form.data_domanda_casa_popolare
            ? isoToItalianDate(form.data_domanda_casa_popolare)
            : "",
        dipendenze: selectedDependencies.includes("Nessuna")
          ? "Nessuna"
          : selectedDependencies.filter((item) => item !== "Nessuna").join(", "),
        dipendenze_alcolismo: selectedDependencies.includes("Alcolismo") ? "Sì" : "No",
        dipendenze_sostanze: selectedDependencies.includes("Sostanze") ? "Sì" : "No",
        dipendenze_ludopatia: selectedDependencies.includes("Ludopatia") ? "Sì" : "No",
        dipendenze_nessuna: selectedDependencies.includes("Nessuna") ? "Sì" : "No",
        patologie: selectedPatologie.includes("Nessuna")
          ? "Nessuna"
          : selectedPatologie.filter((item) => item !== "Nessuna").join(", "),
        patologie_malattie_infettive_e_parassitarie: selectedPatologie.includes("Malattie infettive e parassitarie") ? "true" : "false",
        patologie_neoplasie_tumori: selectedPatologie.includes("Neoplasie") ? "true" : "false",
        patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123:
          selectedPatologie.includes("Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario") ? "true" : "false",
        patologie_malattie_endocrine_nutrizionali_e_metaboliche:
          selectedPatologie.includes("Malattie endocrine, nutrizionali e metaboliche") ? "true" : "false",
        patologie_disturbi_psichici_e_comportamentali: selectedPatologie.includes("Disturbi psichici e comportamentali") ? "true" : "false",
        patologie_malattie_del_sistema_nervoso: selectedPatologie.includes("Malattie del sistema nervoso") ? "true" : "false",
        patologie_malattie_dell_occhio_e_degli_annessi_oculari: selectedPatologie.includes("Malattie dell'occhio e degli annessi oculari") ? "true" : "false",
        patologie_malattie_dell_orecchio_e_del_processo_mastoideo: selectedPatologie.includes("Malattie dell'orecchio e del processo mastoideo") ? "true" : "false",
        patologie_malattie_del_sistema_circolatorio: selectedPatologie.includes("Malattie del sistema circolatorio") ? "true" : "false",
        patologie_malattie_del_sistema_respiratorio: selectedPatologie.includes("Malattie del sistema respiratorio") ? "true" : "false",
        patologie_malattie_dell_apparato_digerente: selectedPatologie.includes("Malattie dell'apparato digerente") ? "true" : "false",
        patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo: selectedPatologie.includes("Malattie della pelle e del tessuto sottocutaneo") ? "true" : "false",
        patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101: selectedPatologie.includes("Malattie del sistema muscoloscheletrico e del tessuto connettivo") ? "true" : "false",
        patologie_malattie_dell_apparato_genito_urinario: selectedPatologie.includes("Malattie dell'apparato genito-urinario") ? "true" : "false",
        patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a: selectedPatologie.includes("Malformazioni congenite, deformità e anomalie cromosomiche") ? "true" : "false",
        patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11: selectedPatologie.includes("Traumi, avvelenamenti e alcune altre conseguenze di cause esterne") ? "true" : "false",
        patologie_nessuna: selectedPatologie.includes("Nessuna") ? "true" : "false",
        patologie_altro: selectedPatologie.includes("Altro") ? "true" : "false",
        data_di_nascita: form.data_di_nascita ? isoToItalianDate(form.data_di_nascita) : "",
        data_ingresso: form.data_ingresso ? isoToItalianDate(form.data_ingresso) : "",
        contatto_della_persona: toE164(form.contatto_della_persona),
      };

      const response = await fetch(`/api/guests/${guestId}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Errore durante il salvataggio.");
        return;
      }

      router.push(`/dashboard/submissions/${guestId}`);
      router.refresh();
    } catch {
      setError("Errore inatteso durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  }

  const sectionGridStyle = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    alignItems: "start",
  } as const;

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: "1rem", display: "grid", gap: 12 }}>
      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Dati personali</h2>
        <div style={sectionGridStyle}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Nome</span>
            <input value={form.nome_della_persona} onChange={(e) => setField("nome_della_persona", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Cognome</span>
            <input value={form.cognome} onChange={(e) => setField("cognome", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Data di nascita</span>
            <input type="date" value={form.data_di_nascita} lang="it-IT" onChange={(e) => setField("data_di_nascita", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Luogo di nascita</span>
            <input value={form.luogo_di_nascita} onChange={(e) => setField("luogo_di_nascita", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Sesso</span>
            <select value={form.sesso_della_persona} onChange={(e) => setField("sesso_della_persona", e.target.value)} required>
              <option value="">Seleziona...</option>
              {SEX_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Nazionalità</span>
            <input
              list="nazionalita-options"
              value={form.nazionalita}
              onChange={(e) => setField("nazionalita", e.target.value)}
              placeholder="Seleziona o digita per filtrare"
            />
            <datalist id="nazionalita-options">
              {NATIONALITY_OPTIONS.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Contatto della persona</span>
            <input
              type="tel"
              value={form.contatto_della_persona}
              onChange={(e) => setField("contatto_della_persona", e.target.value)}
              pattern="\+\d{6,15}"
              placeholder="+3932678766"
            />
          </label>
        </div>

        {hasNameOrSurnameChange ? (
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={nameChangeConfirmed}
              onChange={(e) => setNameChangeConfirmed(e.target.checked)}
            />
            <span>Confermo che voglio modificare nome/cognome</span>
          </label>
        ) : null}
      </div>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Situazione all&apos;ingresso</h2>
        <div style={sectionGridStyle}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Data ingresso</span>
            <input type="date" value={form.data_ingresso} lang="it-IT" onChange={(e) => setField("data_ingresso", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Già stato in accoglienza Comunità</span>
            <select
              value={form.e_gia_stato_in_un_accoglienza_della_comunita}
              onChange={(e) => setField("e_gia_stato_in_un_accoglienza_della_comunita", e.target.value)}
            >
              <option value="">Seleziona...</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Reddito all&apos;ingresso</span>
            <select
              value={form.al_momento_dell_ingresso_ha_un_reddito}
              onChange={(e) => {
                const value = e.target.value;
                setField("al_momento_dell_ingresso_ha_un_reddito", value);
                if (value === "No") {
                  setForm((prev) => ({
                    ...prev,
                    tipo_di_reddito: "",
                    tipo_di_reddito_pensione: "No",
                    tipo_di_reddito_invalidita: "No",
                    tipo_di_reddito_reddito_di_inclusione: "No",
                    tipo_di_reddito_reddito_da_lavoro: "No",
                    tipo_di_lavoro: "",
                  }));
                }
              }}
            >
              <option value="">Seleziona...</option>
              {REDDITO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div
            style={{
              display: "grid",
              gap: 6,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
              gridColumn: "1 / -1",
            }}
          >
            <span style={{ fontWeight: 600 }}>Tipo di reddito</span>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
              {ingressoIncomeSelections.map((item) => (
                <label key={item.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    disabled={!hasIngressoIncome}
                    checked={isYes(form[item.key])}
                    onChange={(e) => setField(item.key, e.target.checked ? "Sì" : "No")}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Tipo di lavoro</span>
            <select
              value={form.tipo_di_lavoro}
              onChange={(e) => setField("tipo_di_lavoro", e.target.value)}
              disabled={!needsIngressoWorkType}
            >
              <option value="">Seleziona...</option>
              {TIPO_LAVORO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Residenza all&apos;ingresso</span>
            <select
              value={form.al_momento_dell_ingresso_ha_residenza}
              onChange={(e) => setField("al_momento_dell_ingresso_ha_residenza", e.target.value)}
              style={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={form.al_momento_dell_ingresso_ha_residenza || "Seleziona..."}
            >
              <option value="">Seleziona...</option>
              {RESIDENZA_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Dove dormiva</span>
            <select value={form.dove_dormiva} onChange={(e) => setField("dove_dormiva", e.target.value)}>
              <option value="">Seleziona...</option>
              {DOVE_DORME_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
            <span>Principale causa povertà (max 2)</span>
            <div style={{ display: "grid", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {POVERTA_OPTIONS.map((option) => {
                  const checked = selectedPovertyCauses.includes(option);
                  const disabled = !checked && selectedPovertyCauses.length >= 2;
                  return (
                    <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          const current = splitCsvValues(form.principale_causa_poverta);
                          const next = e.target.checked
                            ? [...current, option]
                            : current.filter((item) => item !== option);
                          setField("principale_causa_poverta", next.join(", "));
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </label>

          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
            <span>Al momento dell&apos;ingresso ha i seguenti documenti</span>
            <div style={{ display: "grid", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {DOCUMENTI_OPTIONS.map((option) => (
                  <label key={`doc-ingresso-${option}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedDocumentiIngresso.includes(option)}
                      onChange={() =>
                        setField(
                          "al_momento_dell_ingresso_ha_i_seguenti_documenti",
                          toggleCsvOption(
                            form.al_momento_dell_ingresso_ha_i_seguenti_documenti,
                            option,
                            DOCUMENTI_OPTIONS
                          )
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Contatti successivi e casa popolare</h2>
        <div style={sectionGridStyle}>
          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
            <span>Al momento dell&apos;uscita ha i seguenti documenti</span>
            <div style={{ display: "grid", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {DOCUMENTI_OPTIONS.map((option) => (
                  <label key={`doc-uscita-${option}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedDocumentiUscita.includes(option)}
                      onChange={() =>
                        setField(
                          "al_momento_dell_uscita_ha_i_seguenti_documenti",
                          toggleCsvOption(
                            form.al_momento_dell_uscita_ha_i_seguenti_documenti,
                            option,
                            DOCUMENTI_OPTIONS
                          )
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Siamo ancora in contatto</span>
            <select
              value={form.siamo_ancora_in_contatto}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  siamo_ancora_in_contatto: value,
                  chi_e_in_contatto: value === "Sì" ? prev.chi_e_in_contatto : "",
                }));
              }}
            >
              <option value="">Seleziona...</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Chi è in contatto</span>
            <input
              value={form.chi_e_in_contatto}
              onChange={(e) => setField("chi_e_in_contatto", e.target.value)}
              disabled={!needsChiEInContatto}
            />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Ha i requisiti per fare la domanda di casa popolare</span>
            <select
              value={form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare}
              onChange={(e) =>
                setField("ha_i_requisiti_per_fare_la_domanda_di_casa_popolare", e.target.value)
              }
            >
              <option value="">Seleziona...</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>Ha già fatto domanda di casa popolare</span>
            <select
              value={form.ha_gia_fatto_domanda_di_casa_popolare}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  ha_gia_fatto_domanda_di_casa_popolare: value,
                  data_domanda_casa_popolare:
                    value === "Sì" ? prev.data_domanda_casa_popolare : "",
                }));
              }}
            >
              <option value="">Seleziona...</option>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span>In data</span>
            <input
              type="date"
              value={form.data_domanda_casa_popolare}
              onChange={(e) => setField("data_domanda_casa_popolare", e.target.value)}
              disabled={!needsDataDomandaCasaPopolare}
            />
          </label>
        </div>
      </div>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Patologie e Dipendenze</h2>
        <div style={sectionGridStyle}>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Patologia psichiatrica</span>
            <select
              value={form.patologia_psichiatrica}
              onChange={(e) => setField("patologia_psichiatrica", e.target.value)}
            >
              <option value="">Seleziona...</option>
              {PATOLOGIA_PSICHIATRICA_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <span style={{ fontWeight: 600 }}>Dipendenze</span>
            {DIPENDENZE_CHECKBOXES.map((item) => (
              <label key={item.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={isYes(form[item.key])}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (item.key === "dipendenze_nessuna") {
                      setForm((prev) => ({
                        ...prev,
                        dipendenze_alcolismo: "No",
                        dipendenze_sostanze: "No",
                        dipendenze_ludopatia: "No",
                        dipendenze_nessuna: checked ? "Sì" : "No",
                      }));
                      return;
                    }

                    setForm((prev) => ({
                      ...prev,
                      [item.key]: checked ? "Sì" : "No",
                      dipendenze_nessuna: checked ? "No" : prev.dipendenze_nessuna,
                    }));
                  }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gap: 6,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
              gridColumn: "1 / -1",
            }}
          >
            <span style={{ fontWeight: 600 }}>Patologie</span>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              {PATOLOGIE_CHECKBOXES.map((item) => (
                <label key={item.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={
                      item.key === "patologie_altro"
                        ? Boolean(form.patologie_altro && form.patologie_altro !== "false")
                        : isTrueLike(form[item.key])
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (item.key === "patologie_nessuna") {
                        setForm((prev) => ({
                          ...prev,
                          patologie_malattie_infettive_e_parassitarie: "false",
                          patologie_neoplasie_tumori: "false",
                          patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123: "false",
                          patologie_malattie_endocrine_nutrizionali_e_metaboliche: "false",
                          patologie_disturbi_psichici_e_comportamentali: "false",
                          patologie_malattie_del_sistema_nervoso: "false",
                          patologie_malattie_dell_occhio_e_degli_annessi_oculari: "false",
                          patologie_malattie_dell_orecchio_e_del_processo_mastoideo: "false",
                          patologie_malattie_del_sistema_circolatorio: "false",
                          patologie_malattie_del_sistema_respiratorio: "false",
                          patologie_malattie_dell_apparato_digerente: "false",
                          patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo: "false",
                          patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101: "false",
                          patologie_malattie_dell_apparato_genito_urinario: "false",
                          patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a: "false",
                          patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11: "false",
                          patologie_altro: "false",
                          patologie: checked ? "Nessuna" : prev.patologie,
                          patologie_nessuna: checked ? "true" : "false",
                        }));
                        return;
                      }

                      setForm((prev) => ({
                        ...prev,
                        [item.key]: checked ? "true" : "false",
                        patologie: prev.patologie === "Nessuna" ? "" : prev.patologie,
                        patologie_nessuna: checked ? "false" : prev.patologie_nessuna,
                      }));
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={loading}>
          {loading ? "Salvataggio..." : "Salva modifiche"}
        </button>
        <button type="button" onClick={() => router.push(`/dashboard/submissions/${guestId}`)} disabled={loading}>
          Annulla
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
