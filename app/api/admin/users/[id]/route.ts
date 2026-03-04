import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PatchBody = {
  nome?: string | null;
  cognome?: string | null;
  email?: string | null;
  telefono?: string | null;
  strutture?: string[] | null;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: role, error: roleError } = await supabase.rpc("current_user_role");
  if (roleError || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const strutture = Array.isArray(body.strutture)
    ? body.strutture.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [];

  const { error: updateError } = await supabase.rpc("admin_update_app_utente", {
    target_user_id: id,
    target_nome: body.nome ?? null,
    target_cognome: body.cognome ?? null,
    target_email: email,
    target_telefono: body.telefono ?? null,
    target_strutture: strutture,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const { data: updatedUser, error: selectError } = await supabase
    .from("app_utenti")
    .select("id,nome,cognome,email,telefono,app_utenti_strutture(struttura)")
    .eq("id", id)
    .maybeSingle();

  if (selectError || !updatedUser) {
    return NextResponse.json({ error: selectError?.message ?? "User not found" }, { status: 500 });
  }

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      nome: updatedUser.nome,
      cognome: updatedUser.cognome,
      email: updatedUser.email,
      telefono: updatedUser.telefono,
      strutture: (updatedUser.app_utenti_strutture ?? [])
        .map((item) => item.struttura)
        .sort((a, b) => a.localeCompare(b, "it-IT")),
    },
  });
}
