import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { isValidIsoDate } from "@/lib/guests/status-update-form-logic";
import { STRUTTURA_OPTIONS } from "@/lib/guests/status-update-options";

type ReentryBody = {
  targetStruttura?: string;
  dataRientro?: string;
};

function isAllowedStructure(value: string): boolean {
  return STRUTTURA_OPTIONS.includes(value as (typeof STRUTTURA_OPTIONS)[number]);
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

  let body: ReentryBody = {};
  try {
    body = (await req.json()) as ReentryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const targetStruttura = (body.targetStruttura ?? "").trim();
  const dataRientro = (body.dataRientro ?? "").trim();

  if (!targetStruttura || !isAllowedStructure(targetStruttura)) {
    return NextResponse.json({ error: "Accoglienza di rientro non valida." }, { status: 400 });
  }

  if (!dataRientro || !isValidIsoDate(dataRientro)) {
    return NextResponse.json({ error: "Data rientro non valida." }, { status: 400 });
  }

  if (role !== "admin" && role !== "manager") {
    const { data: canAccessTarget, error: targetAccessError } = await supabase.rpc(
      "can_access_struttura",
      { target_struttura: targetStruttura }
    );

    if (targetAccessError || !canAccessTarget) {
      return NextResponse.json(
        { error: "Non sei autorizzato sulla struttura di rientro selezionata." },
        { status: 403 }
      );
    }
  }

  const { error: reentryError } = await supabase.rpc("create_duplicate_reentry", {
    p_guest_id: id,
    p_target_struttura: targetStruttura,
    p_data_rientro: dataRientro,
    p_created_by: appUserId,
  });

  if (reentryError) {
    const message = reentryError.message ?? "Errore durante la registrazione del rientro.";
    const lowered = message.toLowerCase();
    const status = lowered.includes("forbidden")
      ? 403
      : lowered.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, guestId: id });
}
