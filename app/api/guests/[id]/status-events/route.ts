import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import {
  CAUSA_DECESSO_OPTIONS,
  CAUSA_USCITA_OPTIONS,
  DECESSO_CAUSA_USCITA,
  DECESSO_DOVE_DORME,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIA_PSICHIATRICA_OPTIONS,
  PATOLOGIE_OPTIONS,
  RESIDENZA_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  TIPO_REDDITO_OPTIONS,
  isAffirmative,
  isAllowedOption,
} from "@/lib/guests/status-update-options";

type EventBody = {
  updateType?: "followup" | "medical" | "exit" | "death";
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
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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
  if (!updateTypeRaw || !["followup", "medical", "exit", "death"].includes(updateTypeRaw)) {
    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
  }
  const updateType = updateTypeRaw === "medical" ? "followup" : updateTypeRaw;

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
  setPayloadKeys(rawPayload, payload, ["dipendenze", "patologie", "patologia_psichiatrica", "note"]);

  let eventType: "STATUS_CHANGE" | "MEDICAL_UPDATE" = "MEDICAL_UPDATE";
  let toStatus: "USCITO" | "DECEDUTO" | null = null;
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
        payload.tipo_di_reddito_3 = requireAllowed(
          TIPO_REDDITO_OPTIONS,
          rawPayload.tipo_di_reddito_3,
          "Tipo di reddito non valido"
        );
        if ((payload.tipo_di_reddito_3 as string) === "Reddito da lavoro") {
          payload.tipo_di_lavoro_3 = requireAllowed(
            TIPO_LAVORO_OPTIONS,
            rawPayload.tipo_di_lavoro_3,
            "Tipo di lavoro non valido"
          );
        }
      }

      if ((payload.dove_dorme as string) === DECESSO_DOVE_DORME) {
        const deathDate = requireIsoDate(rawPayload.data_decesso_2, "Data decesso obbligatoria");
        const deathCause = requireAllowed(
          CAUSA_DECESSO_OPTIONS,
          rawPayload.causa_decesso_2,
          "Causa decesso non valida"
        );
        payload.data_decesso_2 = deathDate;
        payload.causa_decesso_2 = deathCause;
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
        payload.tipo_di_reddito_2 = requireAllowed(
          TIPO_REDDITO_OPTIONS,
          rawPayload.tipo_di_reddito_2,
          "Tipo di reddito all'uscita non valido"
        );
        if ((payload.tipo_di_reddito_2 as string) === "Reddito da lavoro") {
          payload.tipo_di_lavoro_2 = requireAllowed(
            TIPO_LAVORO_OPTIONS,
            rawPayload.tipo_di_lavoro_2,
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
    } else {
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
    }
  } catch (validationError) {
    return NextResponse.json(
      { error: validationError instanceof Error ? validationError.message : "Invalid payload" },
      { status: 400 }
    );
  }

  if (payload.dipendenze && !isAllowedOption(DIPENDENZE_OPTIONS, String(payload.dipendenze))) {
    return NextResponse.json({ error: "Dipendenze non valido" }, { status: 400 });
  }
  if (payload.patologie && !isAllowedOption(PATOLOGIE_OPTIONS, String(payload.patologie))) {
    return NextResponse.json({ error: "Patologie non valido" }, { status: 400 });
  }
  if (
    payload.patologia_psichiatrica &&
    !isAllowedOption(PATOLOGIA_PSICHIATRICA_OPTIONS, String(payload.patologia_psichiatrica))
  ) {
    return NextResponse.json({ error: "Patologia psichiatrica non valida" }, { status: 400 });
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
