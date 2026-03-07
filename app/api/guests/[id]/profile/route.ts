import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { NATIONALITY_SET } from "@/lib/guests/nationalities";

type ProfilePatchBody = {
  nome_della_persona?: string | null;
  cognome?: string | null;
  data_di_nascita?: string | null;
  luogo_di_nascita?: string | null;
  sesso_della_persona?: string | null;
  nazionalita?: string | null;
  contatto_della_persona?: string | null;
};

const ALLOWED_FIELDS = new Set([
  "nome_della_persona",
  "cognome",
  "data_di_nascita",
  "luogo_di_nascita",
  "sesso_della_persona",
  "nazionalita",
  "contatto_della_persona",
]);
const SEX_OPTIONS = new Set(["Uomo", "Donna", "Altro"]);

function isValidItalianDate(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [dayRaw, monthRaw, yearRaw] = value.split("/");
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

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "");
}

export async function PATCH(
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

  let body: ProfilePatchBody;
  try {
    body = (await req.json()) as ProfilePatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    patch[key] = typeof value === "string" ? value.trim() : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  if (patch.data_di_nascita && !isValidItalianDate(patch.data_di_nascita)) {
    return NextResponse.json(
      { error: "Data di nascita non valida. Usa il formato gg/mm/aaaa." },
      { status: 400 }
    );
  }

  if (patch.nazionalita && !NATIONALITY_SET.has(patch.nazionalita)) {
    return NextResponse.json(
      { error: "Nazionalità non valida. Seleziona un valore dall'elenco previsto." },
      { status: 400 }
    );
  }

  if (patch.sesso_della_persona && !SEX_OPTIONS.has(patch.sesso_della_persona)) {
    return NextResponse.json(
      { error: "Sesso non valido. Valori ammessi: Uomo, Donna, Altro." },
      { status: 400 }
    );
  }

  if (patch.contatto_della_persona) {
    const normalizedPhone = normalizePhone(patch.contatto_della_persona);
    if (!/^\+\d{6,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Contatto non valido. Usa il formato internazionale, es. +3932678766." },
        { status: 400 }
      );
    }
    patch.contatto_della_persona = normalizedPhone;
  }

  const { data, error } = await supabase.rpc("update_guest_profile_with_audit", {
    p_guest_id: id,
    p_patch: patch,
    p_changed_by: appUserId,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true, result: data });
}
