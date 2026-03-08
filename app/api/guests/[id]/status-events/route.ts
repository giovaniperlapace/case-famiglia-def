import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCurrentStatus } from "@/lib/guests/status";
import {
  isValidIsoDate,
  normalizeExclusiveSelections,
  normalizeIncomeSelections,
  summarizeSelections,
  toCsvValue,
} from "@/lib/guests/status-update-form-logic";
import {
  CAUSA_DECESSO_OPTIONS,
  CAUSA_USCITA_OPTIONS,
  DECESSO_CAUSA_USCITA,
  DECESSO_DOVE_DORME,
  DOCUMENTI_OPTIONS,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIA_PSICHIATRICA_OPTIONS,
  PATOLOGIE_OPTIONS,
  RIENTRO_STESSA_STRUTTURA_OPTIONS,
  RESIDENZA_OPTIONS,
  STRUTTURA_RIENTRO_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  isAffirmative,
  isAllowedOption,
  normalizePatologiaPsichiatrica,
} from "@/lib/guests/status-update-options";

type EventBody = {
  updateType?: "followup" | "medical" | "exit" | "death" | "reentry";
  effectiveDate?: string | null;
  payload?: Record<string, unknown>;
};

function toNullableTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireIsoDate(value: unknown, errorMessage: string): string {
  const date = toNullableTrimmed(value);
  if (!date || !isValidIsoDate(date)) {
    throw new Error(errorMessage);
  }
  return date;
}

function requireAllowed<T extends readonly string[]>(
  options: T,
  value: unknown,
  errorMessage: string
): T[number] {
  const normalized = toNullableTrimmed(value);
  if (!normalized || !isAllowedOption(options, normalized)) {
    throw new Error(errorMessage);
  }
  return normalized;
}

function requireReddito(value: unknown, errorMessage: string): "Sì" | "No" {
  const normalized = toNullableTrimmed(value);
  if (normalized === "Sì" || normalized === "Si") return "Sì";
  if (normalized === "No") return "No";
  throw new Error(errorMessage);
}

function requireIncomeSelection(
  value: unknown,
  requiredMessage: string
): string[] {
  const normalized = toNullableTrimmed(value);
  if (!normalized) {
    throw new Error(requiredMessage);
  }
  const selected = normalizeIncomeSelections(normalized);
  if (selected.length === 0) {
    throw new Error(requiredMessage);
  }
  return selected;
}

function requireText(value: unknown, errorMessage: string): string {
  const normalized = toNullableTrimmed(value);
  if (!normalized) {
    throw new Error(errorMessage);
  }
  return normalized;
}

function normalizeCsvSelections(value: unknown, options: readonly string[], fieldLabel: string): string | null {
  const normalized = toNullableTrimmed(value);
  if (!normalized) return null;
  const selected = normalizeSelections(normalized, options, fieldLabel);
  if (selected.length === 0) return null;
  return toCsvValue(selected);
}

function normalizeSelections(value: string, options: readonly string[], fieldLabel: string): string[] {
  const selected = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = options.filter((option) => selected.includes(option));
  if (selected.some((item) => !options.includes(item))) {
    throw new Error(`${fieldLabel} non valido`);
  }
  return unique;
}

function toIsoDateStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function setPayloadKeys(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined) {
      target[key] = value;
    }
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, role, appUserId } = await getServerAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: EventBody = {};
  try {
    body = (await req.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateTypeRaw = body.updateType;
  if (!updateTypeRaw || !["followup", "medical", "exit", "death", "reentry"].includes(updateTypeRaw)) {
    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
  }
  const updateType = (updateTypeRaw === "medical" ? "followup" : updateTypeRaw) as
    | "followup"
    | "exit"
    | "death"
    | "reentry";

  const { data: guestRow, error: guestError } = await supabase
    .from("case_alloggio_submissions")
    .select("id,current_status,data_uscita,data_decesso,tipo_aggiornamento,struttura")
    .eq("id", id)
    .maybeSingle();

  if (guestError) {
    return NextResponse.json({ error: guestError.message }, { status: 400 });
  }

  if (!guestRow) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const currentStatus = getCurrentStatus(guestRow);
  const allowedUpdateTypes =
    currentStatus === "USCITO"
      ? new Set(["followup", "death", "reentry"])
      : currentStatus === "IN_ACCOGLIENZA"
        ? new Set(["followup", "exit"])
        : new Set<string>();

  if (!allowedUpdateTypes.has(updateType)) {
    return NextResponse.json(
      { error: `Tipo aggiornamento non valido per stato attuale (${currentStatus}).` },
      { status: 400 }
    );
  }

  const rawPayload = Object.entries(body.payload ?? {}).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) acc[key] = trimmed;
        return acc;
      }
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  const payload: Record<string, unknown> = {};
  setPayloadKeys(rawPayload, payload, ["note"]);

  let eventType: "STATUS_CHANGE" | "MEDICAL_UPDATE" = "MEDICAL_UPDATE";
  let toStatus: "IN_ACCOGLIENZA" | "USCITO" | "DECEDUTO" | null = null;
  let effectiveDate: string | null = null;

  try {
    if (updateType === "followup") {
      payload.data_ultimo_contatto = requireIsoDate(
        rawPayload.data_ultimo_contatto,
        "Data ultimo contatto obbligatoria (YYYY-MM-DD)"
      );
      payload.dove_dorme = requireAllowed(
        DOVE_DORME_OPTIONS,
        rawPayload.dove_dorme,
        "Dove dorme non valido"
      );

      payload.ha_residenza = requireAllowed(
        RESIDENZA_OPTIONS,
        rawPayload.ha_residenza,
        "Ha residenza non valido"
      );

      payload.ha_un_reddito = requireReddito(rawPayload.ha_un_reddito, "Ha reddito non valido");

      if (isAffirmative(payload.ha_un_reddito as string)) {
        const selectedIncome = requireIncomeSelection(
          rawPayload.tipo_di_reddito_followup ?? rawPayload.tipo_di_reddito_3,
          "Se Ha reddito è Sì, seleziona almeno un tipo di reddito."
        );
        payload.tipo_di_reddito_followup = toCsvValue(selectedIncome);
        if (selectedIncome.includes("Reddito da lavoro")) {
          payload.tipo_di_lavoro_followup = requireAllowed(
            TIPO_LAVORO_OPTIONS,
            rawPayload.tipo_di_lavoro_followup ?? rawPayload.tipo_di_lavoro_3,
            "Tipo di lavoro non valido"
          );
        }
      }

      if ((payload.dove_dorme as string) === DECESSO_DOVE_DORME) {
        const deathDate = requireIsoDate(
          rawPayload.data_decesso_followup ?? rawPayload.data_decesso_2,
          "Data decesso obbligatoria"
        );
        const deathCause = requireAllowed(
          CAUSA_DECESSO_OPTIONS,
          rawPayload.causa_decesso_followup ?? rawPayload.causa_decesso_2,
          "Causa decesso non valida"
        );
        payload.data_decesso_followup = deathDate;
        payload.causa_decesso_followup = deathCause;
        payload.causa_decesso = deathCause;
        eventType = "STATUS_CHANGE";
        toStatus = "DECEDUTO";
        effectiveDate = toIsoDateStart(deathDate);
      }
    } else if (updateType === "exit") {
      const exitDate = requireIsoDate(rawPayload.data_uscita ?? body.effectiveDate, "Data uscita obbligatoria");
      payload.data_uscita = exitDate;
      payload.causa_uscita = requireAllowed(
        CAUSA_USCITA_OPTIONS,
        rawPayload.causa_uscita,
        "Causa uscita non valida"
      );

      payload.al_momento_dell_uscita_ha_residenza = requireAllowed(
        RESIDENZA_OPTIONS,
        rawPayload.al_momento_dell_uscita_ha_residenza,
        "Residenza all'uscita non valida"
      );
      payload.al_momento_dell_uscita_ha_un_reddito = requireReddito(
        rawPayload.al_momento_dell_uscita_ha_un_reddito,
        "Reddito all'uscita non valido"
      );

      if (isAffirmative(payload.al_momento_dell_uscita_ha_un_reddito as string)) {
        const selectedIncome = requireIncomeSelection(
          rawPayload.tipo_di_reddito_uscita ?? rawPayload.tipo_di_reddito_2,
          "Se Reddito all'uscita è Sì, seleziona almeno un tipo di reddito."
        );
        payload.tipo_di_reddito_uscita = toCsvValue(selectedIncome);
        if (selectedIncome.includes("Reddito da lavoro")) {
          payload.tipo_di_lavoro_uscita = requireAllowed(
            TIPO_LAVORO_OPTIONS,
            rawPayload.tipo_di_lavoro_uscita ?? rawPayload.tipo_di_lavoro_2,
            "Tipo di lavoro all'uscita non valido"
          );
        }
      }

      eventType = "STATUS_CHANGE";
      if ((payload.causa_uscita as string) === DECESSO_CAUSA_USCITA) {
        const deathDate = requireIsoDate(rawPayload.data_decesso, "Data decesso obbligatoria");
        const deathCause = requireAllowed(
          CAUSA_DECESSO_OPTIONS,
          rawPayload.causa_decesso,
          "Causa decesso non valida"
        );
        payload.data_decesso = deathDate;
        payload.causa_decesso = deathCause;
        toStatus = "DECEDUTO";
        effectiveDate = toIsoDateStart(deathDate);
      } else {
        toStatus = "USCITO";
        effectiveDate = toIsoDateStart(exitDate);
      }
    } else if (updateType === "death") {
      eventType = "STATUS_CHANGE";
      toStatus = "DECEDUTO";
      const deathDate = requireIsoDate(rawPayload.data_decesso ?? body.effectiveDate, "Data decesso obbligatoria");
      payload.data_decesso = deathDate;
      payload.causa_decesso = requireAllowed(
        CAUSA_DECESSO_OPTIONS,
        rawPayload.causa_decesso,
        "Causa decesso non valida"
      );
      effectiveDate = toIsoDateStart(deathDate);
    } else {
      const reentryDate = requireIsoDate(rawPayload.data_rientro ?? body.effectiveDate, "Data rientro obbligatoria");
      const sameStruttura = requireAllowed(
        RIENTRO_STESSA_STRUTTURA_OPTIONS,
        rawPayload.rientro_stessa_struttura,
        "Valore 'stessa struttura' non valido"
      );

      const currentStruttura = toNullableTrimmed(guestRow.struttura);
      let strutturaRientro = currentStruttura;
      if (sameStruttura === "No") {
        strutturaRientro = requireAllowed(
          STRUTTURA_RIENTRO_OPTIONS,
          rawPayload.struttura_rientro,
          "Struttura di rientro non valida"
        );
      }

      if (!strutturaRientro) {
        throw new Error("Struttura di rientro obbligatoria");
      }

      if (role !== "admin") {
        const { data: canAccessTarget, error: targetAccessError } = await supabase.rpc(
          "can_access_struttura",
          { target_struttura: strutturaRientro }
        );
        if (targetAccessError || !canAccessTarget) {
          throw new Error("Non autorizzato sulla struttura di rientro selezionata");
        }
      }

      payload.data_rientro = reentryDate;
      payload.rientro_stessa_struttura = sameStruttura;
      payload.struttura_rientro = strutturaRientro;
      eventType = "STATUS_CHANGE";
      toStatus = "IN_ACCOGLIENZA";
      effectiveDate = toIsoDateStart(reentryDate);
    }
  } catch (validationError) {
    return NextResponse.json(
      { error: validationError instanceof Error ? validationError.message : "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    if (rawPayload.dipendenze !== undefined) {
      const rawDipendenze = toNullableTrimmed(rawPayload.dipendenze);
      if (!rawDipendenze) {
        throw new Error("Dipendenze non valido");
      }
      const selectedDipendenze = normalizeExclusiveSelections(
        rawDipendenze,
        DIPENDENZE_OPTIONS,
        "Dipendenze"
      );
      payload.dipendenze = summarizeSelections(selectedDipendenze);
    }

    if (rawPayload.patologie !== undefined) {
      const rawPatologie = toNullableTrimmed(rawPayload.patologie);
      if (!rawPatologie) {
        throw new Error("Patologie non valido");
      }
      const selectedPatologie = normalizeExclusiveSelections(
        rawPatologie,
        PATOLOGIE_OPTIONS,
        "Patologie"
      );
      payload.patologie = summarizeSelections(selectedPatologie);
    }
  } catch (validationError) {
    return NextResponse.json(
      {
        error:
          validationError instanceof Error
            ? validationError.message
            : "Dipendenze/Patologie non validi",
      },
      { status: 400 }
    );
  }

  if (rawPayload.patologia_psichiatrica !== undefined) {
    const normalizedPsych = normalizePatologiaPsichiatrica(
      String(rawPayload.patologia_psichiatrica)
    );
    if (!normalizedPsych || !isAllowedOption(PATOLOGIA_PSICHIATRICA_OPTIONS, normalizedPsych)) {
      return NextResponse.json({ error: "Patologia psichiatrica non valida" }, { status: 400 });
    }
    payload.patologia_psichiatrica = normalizedPsych;
  }

  try {
    const docsIngresso = normalizeCsvSelections(
      rawPayload.al_momento_dell_ingresso_ha_i_seguenti_documenti,
      DOCUMENTI_OPTIONS,
      "Documenti all'ingresso"
    );
    if (docsIngresso) {
      payload.al_momento_dell_ingresso_ha_i_seguenti_documenti = docsIngresso;
    }

    const docsUscita = normalizeCsvSelections(
      rawPayload.al_momento_dell_uscita_ha_i_seguenti_documenti,
      DOCUMENTI_OPTIONS,
      "Documenti all'uscita"
    );
    if (docsUscita) {
      payload.al_momento_dell_uscita_ha_i_seguenti_documenti = docsUscita;
    }
  } catch (validationError) {
    return NextResponse.json(
      {
        error:
          validationError instanceof Error
            ? validationError.message
            : "Documenti non validi",
      },
      { status: 400 }
    );
  }

  if (rawPayload.siamo_ancora_in_contatto !== undefined) {
    const inContatto = requireReddito(
      rawPayload.siamo_ancora_in_contatto,
      "Valore non valido per 'Siamo ancora in contatto'"
    );
    payload.siamo_ancora_in_contatto = inContatto;
    if (inContatto === "Sì") {
      payload.chi_e_in_contatto = requireText(
        rawPayload.chi_e_in_contatto,
        "Chi è in contatto obbligatorio"
      );
    } else {
      payload.chi_e_in_contatto = "";
    }
  }

  if (rawPayload.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare !== undefined) {
    payload.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare = requireReddito(
      rawPayload.ha_i_requisiti_per_fare_la_domanda_di_casa_popolare,
      "Valore non valido per i requisiti casa popolare"
    );
  }

  if (rawPayload.ha_gia_fatto_domanda_di_casa_popolare !== undefined) {
    const giaFatta = requireReddito(
      rawPayload.ha_gia_fatto_domanda_di_casa_popolare,
      "Valore non valido per la domanda di casa popolare"
    );
    payload.ha_gia_fatto_domanda_di_casa_popolare = giaFatta;
    if (giaFatta === "Sì") {
      payload.data_domanda_casa_popolare = requireIsoDate(
        rawPayload.data_domanda_casa_popolare,
        "In data obbligatoria (YYYY-MM-DD)"
      );
    } else {
      payload.data_domanda_casa_popolare = "";
    }
  }

  const { data, error } = await supabase.rpc("create_guest_status_event", {
    p_guest_id: id,
    p_event_type: eventType,
    p_effective_date: effectiveDate,
    p_to_status: toStatus,
    p_payload: payload,
    p_created_by: appUserId,
  });

  if (error) {
    const message = error.message ?? "Cannot create event";
    const lowered = message.toLowerCase();
    const status =
      lowered.includes("forbidden") || lowered.includes("disabled") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, event: data });
}
