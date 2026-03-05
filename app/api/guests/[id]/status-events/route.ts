import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";

type EventBody = {
  updateType?: "medical" | "exit" | "death";
  effectiveDate?: string | null;
  payload?: Record<string, unknown>;
};

function toNullableTrimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  const updateType = body.updateType;
  if (!updateType || !["medical", "exit", "death"].includes(updateType)) {
    return NextResponse.json({ error: "Invalid update type" }, { status: 400 });
  }

  const payload = Object.entries(body.payload ?? {}).reduce<Record<string, unknown>>(
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

  const effectiveDateRaw = toNullableTrimmed(body.effectiveDate);
  const effectiveDate = effectiveDateRaw ? `${effectiveDateRaw}T00:00:00.000Z` : null;

  let eventType: "STATUS_CHANGE" | "MEDICAL_UPDATE" = "MEDICAL_UPDATE";
  let toStatus: "USCITO" | "DECEDUTO" | null = null;

  if (updateType === "exit") {
    eventType = "STATUS_CHANGE";
    toStatus = "USCITO";
    if (!effectiveDate) {
      return NextResponse.json({ error: "Exit date is required" }, { status: 400 });
    }
  }

  if (updateType === "death") {
    eventType = "STATUS_CHANGE";
    toStatus = "DECEDUTO";
    if (!effectiveDate) {
      return NextResponse.json({ error: "Death date is required" }, { status: 400 });
    }
    if (!toNullableTrimmed(payload.causa_decesso)) {
      return NextResponse.json({ error: "Cause of death is required" }, { status: 400 });
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
