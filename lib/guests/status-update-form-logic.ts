import {
  CAUSA_DECESSO_OPTIONS,
  CAUSA_USCITA_OPTIONS,
  DECESSO_CAUSA_USCITA,
  DECESSO_DOVE_DORME,
  DOCUMENTI_OPTIONS,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIE_OPTIONS,
  REDDITO_OPTIONS,
  RESIDENZA_OPTIONS,
  SI_NO_OPTIONS,
  RIENTRO_STESSA_STRUTTURA_OPTIONS,
  STRUTTURA_RIENTRO_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  TIPO_REDDITO_OPTIONS,
  normalizePatologiaPsichiatrica,
} from "./status-update-options.ts";

export type StatusUpdateType = "followup" | "exit" | "death" | "reentry";

export type StatusUpdateFormValues = {
  data_ultimo_contatto: string;
  dove_dorme: string;
  data_decesso_followup: string;
  causa_decesso_followup: string;
  ha_residenza: string;
  ha_un_reddito: string;
  al_momento_dell_ingresso_ha_i_seguenti_documenti: string;
  tipo_di_reddito_followup: string;
  tipo_di_lavoro_followup: string;
  data_uscita: string;
  causa_uscita: string;
  data_decesso: string;
  causa_decesso: string;
  al_momento_dell_uscita_ha_i_seguenti_documenti: string;
  al_momento_dell_uscita_ha_residenza: string;
  al_momento_dell_uscita_ha_un_reddito: string;
  tipo_di_reddito_uscita: string;
  tipo_di_lavoro_uscita: string;
  siamo_ancora_in_contatto: string;
  chi_e_in_contatto: string;
  ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: string;
  ha_gia_fatto_domanda_di_casa_popolare: string;
  data_domanda_casa_popolare: string;
  data_rientro: string;
  rientro_stessa_struttura: string;
  struttura_rientro: string;
  dipendenze: string;
  patologie: string;
  patologia_psichiatrica: string;
  note: string;
};

const NONE_LABEL = "Nessuna";

function isAllowed(options: readonly string[], value: string): boolean {
  return options.includes(value);
}

function orderedUnique(options: readonly string[], rawValues: readonly string[]): string[] {
  const selected = new Set(
    rawValues
      .map((item) => item.trim())
      .filter(Boolean)
  );
  return options.filter((option) => selected.has(option));
}

function ensureRequired(value: string, errorMessage: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(errorMessage);
  }
  return trimmed;
}

function validateRequiredIsoDate(value: string, label: string): string {
  const trimmed = ensureRequired(value, `${label} obbligatoria.`);
  if (!isValidIsoDate(trimmed)) {
    throw new Error(`${label} non valida.`);
  }
  return trimmed;
}

function validateAllowed(value: string, options: readonly string[], errorMessage: string): string {
  const trimmed = ensureRequired(value, errorMessage);
  if (!isAllowed(options, trimmed)) {
    throw new Error(errorMessage);
  }
  return trimmed;
}

function normalizeAllowedSelections(
  value: string,
  options: readonly string[],
  fieldLabel: string
): string[] {
  const selected = orderedUnique(options, splitCsvValues(value));
  const raw = splitCsvValues(value);
  if (raw.some((item) => !isAllowed(options, item))) {
    throw new Error(`${fieldLabel} non valido.`);
  }
  return selected;
}

function normalizeOptionalSelections(value: string, options: readonly string[], fieldLabel: string): string[] {
  if (!value.trim()) return [];
  return normalizeAllowedSelections(value, options, fieldLabel);
}

export function splitCsvValues(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toCsvValue(values: readonly string[]): string {
  return values.join(", ");
}

export function normalizeYesNo(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "true" || value === "Si") return "Sì";
  if (value === "false") return "No";
  return value;
}

export function isYes(value: string | null | undefined): boolean {
  return value === "Sì";
}

export function isTrueLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return value === "true" || value === "Sì" || value === "Si";
}

export function normalizeToIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }
  return "";
}

export function isValidIsoDate(value: string): boolean {
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

export function normalizeIncomeSelections(value: string): string[] {
  return normalizeAllowedSelections(value, TIPO_REDDITO_OPTIONS, "Tipo di reddito");
}

export function normalizeExclusiveSelections(
  value: string,
  options: readonly string[],
  fieldLabel: string
): string[] {
  const selected = normalizeAllowedSelections(value, options, fieldLabel);
  if (selected.includes(NONE_LABEL) && selected.length > 1) {
    throw new Error(`${fieldLabel} non valido.`);
  }
  return selected;
}

export function summarizeSelections(selected: string[]): string {
  if (selected.includes(NONE_LABEL)) return NONE_LABEL;
  return toCsvValue(selected.filter((item) => item !== NONE_LABEL));
}

export function toggleCsvOption(
  currentValue: string,
  option: string,
  options: readonly string[]
): string {
  if (!isAllowed(options, option)) return currentValue;
  const current = splitCsvValues(currentValue);
  const next = current.includes(option)
    ? current.filter((item) => item !== option)
    : [...current, option];
  return toCsvValue(orderedUnique(options, next));
}

export function toggleExclusiveCsvOption(
  currentValue: string,
  option: string,
  options: readonly string[],
  exclusiveOption: string = NONE_LABEL
): string {
  if (!isAllowed(options, option)) return currentValue;
  const current = splitCsvValues(currentValue);
  const hasOption = current.includes(option);

  let next: string[];
  if (hasOption) {
    next = current.filter((item) => item !== option);
  } else if (option === exclusiveOption) {
    next = [exclusiveOption];
  } else {
    next = [...current.filter((item) => item !== exclusiveOption), option];
  }

  return toCsvValue(orderedUnique(options, next));
}

export function validateStatusUpdateForm(
  updateType: StatusUpdateType,
  form: StatusUpdateFormValues
): string | null {
  try {
    normalizeOptionalSelections(
      form.al_momento_dell_ingresso_ha_i_seguenti_documenti,
      DOCUMENTI_OPTIONS,
      "Documenti all'ingresso"
    );
    normalizeOptionalSelections(
      form.al_momento_dell_uscita_ha_i_seguenti_documenti,
      DOCUMENTI_OPTIONS,
      "Documenti all'uscita"
    );

    normalizeExclusiveSelections(form.dipendenze, DIPENDENZE_OPTIONS, "Dipendenze");
    normalizeExclusiveSelections(form.patologie, PATOLOGIE_OPTIONS, "Patologie");

    if (
      form.patologia_psichiatrica &&
      !normalizePatologiaPsichiatrica(form.patologia_psichiatrica)
    ) {
      throw new Error("Patologia psichiatrica non valida.");
    }

    if (form.siamo_ancora_in_contatto && !isAllowed(SI_NO_OPTIONS, form.siamo_ancora_in_contatto)) {
      throw new Error("Valore non valido per 'Siamo ancora in contatto'.");
    }

    if (form.siamo_ancora_in_contatto === "Sì" && !form.chi_e_in_contatto.trim()) {
      throw new Error("Se siamo ancora in contatto, indica chi è in contatto.");
    }

    if (
      form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare &&
      !isAllowed(SI_NO_OPTIONS, form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare)
    ) {
      throw new Error("Valore non valido per i requisiti casa popolare.");
    }

    if (
      form.ha_gia_fatto_domanda_di_casa_popolare &&
      !isAllowed(SI_NO_OPTIONS, form.ha_gia_fatto_domanda_di_casa_popolare)
    ) {
      throw new Error("Valore non valido per la domanda di casa popolare.");
    }

    if (form.ha_gia_fatto_domanda_di_casa_popolare === "Sì") {
      validateRequiredIsoDate(form.data_domanda_casa_popolare, "In data");
    }

    if (updateType === "followup") {
      validateRequiredIsoDate(form.data_ultimo_contatto, "Data ultimo contatto");
      validateAllowed(form.dove_dorme, DOVE_DORME_OPTIONS, "Dove dorme non valido.");
      validateAllowed(form.ha_residenza, RESIDENZA_OPTIONS, "Ha residenza non valido.");
      validateAllowed(form.ha_un_reddito, REDDITO_OPTIONS, "Ha reddito non valido.");

      if (isYes(form.ha_un_reddito)) {
        const selectedIncome = normalizeIncomeSelections(form.tipo_di_reddito_followup);
        if (selectedIncome.length === 0) {
          throw new Error("Se Ha reddito è Sì, seleziona almeno un tipo di reddito.");
        }
        if (
          selectedIncome.includes("Reddito da lavoro") &&
          !isAllowed(TIPO_LAVORO_OPTIONS, form.tipo_di_lavoro_followup)
        ) {
          throw new Error("Tipo di lavoro non valido.");
        }
      }

      if (form.dove_dorme === DECESSO_DOVE_DORME) {
        validateRequiredIsoDate(form.data_decesso_followup, "Data decesso");
        validateAllowed(
          form.causa_decesso_followup,
          CAUSA_DECESSO_OPTIONS,
          "Causa decesso non valida."
        );
      }
    }

    if (updateType === "exit") {
      validateRequiredIsoDate(form.data_uscita, "Data uscita");
      validateAllowed(form.causa_uscita, CAUSA_USCITA_OPTIONS, "Causa uscita non valida.");
      validateAllowed(
        form.al_momento_dell_uscita_ha_residenza,
        RESIDENZA_OPTIONS,
        "Residenza all'uscita non valida."
      );
      validateAllowed(
        form.al_momento_dell_uscita_ha_un_reddito,
        REDDITO_OPTIONS,
        "Reddito all'uscita non valido."
      );

      if (isYes(form.al_momento_dell_uscita_ha_un_reddito)) {
        const selectedIncome = normalizeIncomeSelections(form.tipo_di_reddito_uscita);
        if (selectedIncome.length === 0) {
          throw new Error("Se Reddito all'uscita è Sì, seleziona almeno un tipo di reddito.");
        }
        if (
          selectedIncome.includes("Reddito da lavoro") &&
          !isAllowed(TIPO_LAVORO_OPTIONS, form.tipo_di_lavoro_uscita)
        ) {
          throw new Error("Tipo di lavoro all'uscita non valido.");
        }
      }

      if (form.causa_uscita === DECESSO_CAUSA_USCITA) {
        validateRequiredIsoDate(form.data_decesso, "Data decesso");
        validateAllowed(form.causa_decesso, CAUSA_DECESSO_OPTIONS, "Causa decesso non valida.");
      }
    }

    if (updateType === "death") {
      validateRequiredIsoDate(form.data_decesso, "Data decesso");
      validateAllowed(form.causa_decesso, CAUSA_DECESSO_OPTIONS, "Causa decesso non valida.");
    }

    if (updateType === "reentry") {
      validateRequiredIsoDate(form.data_rientro, "Data rientro");
      validateAllowed(
        form.rientro_stessa_struttura,
        RIENTRO_STESSA_STRUTTURA_OPTIONS,
        "Valore 'stessa struttura' non valido."
      );
      if (form.rientro_stessa_struttura === "No") {
        validateAllowed(
          form.struttura_rientro,
          STRUTTURA_RIENTRO_OPTIONS,
          "Struttura di rientro non valida."
        );
      }
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Dati del form non validi.";
  }
}

export function buildStatusUpdatePayload(
  updateType: StatusUpdateType,
  form: StatusUpdateFormValues,
  currentStruttura: string
): Record<string, string> {
  const payload: Record<string, string> = {
    note: form.note,
  };

  const dipendenzeSelections = normalizeExclusiveSelections(
    form.dipendenze,
    DIPENDENZE_OPTIONS,
    "Dipendenze"
  );
  if (dipendenzeSelections.length > 0) {
    payload.dipendenze = summarizeSelections(dipendenzeSelections);
  }

  const patologieSelections = normalizeExclusiveSelections(
    form.patologie,
    PATOLOGIE_OPTIONS,
    "Patologie"
  );
  if (patologieSelections.length > 0) {
    payload.patologie = summarizeSelections(patologieSelections);
  }

  const normalizedPsych = normalizePatologiaPsichiatrica(form.patologia_psichiatrica);
  if (normalizedPsych) {
    payload.patologia_psichiatrica = normalizedPsych;
  }

  const ingressDocs = normalizeOptionalSelections(
    form.al_momento_dell_ingresso_ha_i_seguenti_documenti,
    DOCUMENTI_OPTIONS,
    "Documenti all'ingresso"
  );
  const exitDocs = normalizeOptionalSelections(
    form.al_momento_dell_uscita_ha_i_seguenti_documenti,
    DOCUMENTI_OPTIONS,
    "Documenti all'uscita"
  );
  if (ingressDocs.length > 0) {
    payload.al_momento_dell_ingresso_ha_i_seguenti_documenti = toCsvValue(ingressDocs);
  }
  if (exitDocs.length > 0) {
    payload.al_momento_dell_uscita_ha_i_seguenti_documenti = toCsvValue(exitDocs);
  }

  if (form.siamo_ancora_in_contatto) {
    payload.siamo_ancora_in_contatto = form.siamo_ancora_in_contatto;
    if (form.siamo_ancora_in_contatto === "Sì" && form.chi_e_in_contatto.trim()) {
      payload.chi_e_in_contatto = form.chi_e_in_contatto.trim();
    }
  }

  if (form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare) {
    payload.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare =
      form.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare;
  }

  if (form.ha_gia_fatto_domanda_di_casa_popolare) {
    payload.ha_gia_fatto_domanda_di_casa_popolare =
      form.ha_gia_fatto_domanda_di_casa_popolare;
    if (
      form.ha_gia_fatto_domanda_di_casa_popolare === "Sì" &&
      form.data_domanda_casa_popolare.trim()
    ) {
      payload.data_domanda_casa_popolare = form.data_domanda_casa_popolare;
    }
  }

  if (updateType === "followup") {
    payload.data_ultimo_contatto = form.data_ultimo_contatto;
    payload.dove_dorme = form.dove_dorme;
    payload.ha_residenza = form.ha_residenza;
    payload.ha_un_reddito = form.ha_un_reddito;

    if (isYes(form.ha_un_reddito)) {
      const selectedIncome = normalizeIncomeSelections(form.tipo_di_reddito_followup);
      payload.tipo_di_reddito_followup = toCsvValue(selectedIncome);
      if (selectedIncome.includes("Reddito da lavoro")) {
        payload.tipo_di_lavoro_followup = form.tipo_di_lavoro_followup;
      }
    }

    if (form.dove_dorme === DECESSO_DOVE_DORME) {
      payload.data_decesso_followup = form.data_decesso_followup;
      payload.causa_decesso_followup = form.causa_decesso_followup;
      payload.causa_decesso = form.causa_decesso_followup;
    }

    return payload;
  }

  if (updateType === "exit") {
    payload.data_uscita = form.data_uscita;
    payload.causa_uscita = form.causa_uscita;
    payload.al_momento_dell_uscita_ha_residenza = form.al_momento_dell_uscita_ha_residenza;
    payload.al_momento_dell_uscita_ha_un_reddito = form.al_momento_dell_uscita_ha_un_reddito;

    if (isYes(form.al_momento_dell_uscita_ha_un_reddito)) {
      const selectedIncome = normalizeIncomeSelections(form.tipo_di_reddito_uscita);
      payload.tipo_di_reddito_uscita = toCsvValue(selectedIncome);
      if (selectedIncome.includes("Reddito da lavoro")) {
        payload.tipo_di_lavoro_uscita = form.tipo_di_lavoro_uscita;
      }
    }

    if (form.causa_uscita === DECESSO_CAUSA_USCITA) {
      payload.data_decesso = form.data_decesso;
      payload.causa_decesso = form.causa_decesso;
    }

    return payload;
  }

  if (updateType === "death") {
    payload.data_decesso = form.data_decesso;
    payload.causa_decesso = form.causa_decesso;
    return payload;
  }

  payload.data_rientro = form.data_rientro;
  payload.rientro_stessa_struttura = form.rientro_stessa_struttura;
  payload.struttura_rientro =
    form.rientro_stessa_struttura === "Sì" ? currentStruttura : form.struttura_rientro;

  return payload;
}
