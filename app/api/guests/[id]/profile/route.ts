import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";

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
