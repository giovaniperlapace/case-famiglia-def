import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";

type CreateBody = {
  nome?: string | null;
  cognome?: string | null;
  email?: string | null;
  telefono?: string | null;
  ruolo?: "admin" | "manager" | "responsabile_casa" | null;
  strutture?: string[] | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStructures(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getServerAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nome = normalizeOptionalText(body.nome);
  const cognome = normalizeOptionalText(body.cognome);
  const email = normalizeOptionalText(body.email)?.toLowerCase() ?? "";
  const telefono = normalizeOptionalText(body.telefono);
  const ruolo = body.ruolo ?? "responsabile_casa";
  const strutture = normalizeStructures(body.strutture);

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!["admin", "manager", "responsabile_casa"].includes(ruolo)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const nomeCompleto =
    [nome, cognome].filter((item): item is string => Boolean(item)).join(" ").trim() || null;

  const { data: createdUser, error: createError } = await supabase
    .from("app_utenti")
    .insert({
      nome,
      cognome,
      email,
      telefono,
      ruolo,
      nome_completo: nomeCompleto,
    })
    .select("id")
    .single();

  if (createError || !createdUser) {
    const status = createError?.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: createError?.message ?? "User creation failed" }, { status });
  }

  if (strutture.length > 0) {
    const { error: structuresError } = await supabase
      .from("app_utenti_strutture")
      .insert(strutture.map((struttura) => ({ utente_id: createdUser.id, struttura })));

    if (structuresError) {
      await supabase.from("app_utenti").delete().eq("id", createdUser.id);
      return NextResponse.json({ error: structuresError.message }, { status: 400 });
    }
  }

  const { data: fullUser, error: selectError } = await supabase
    .from("app_utenti")
    .select("id,nome,cognome,email,telefono,ruolo,app_utenti_strutture(struttura)")
    .eq("id", createdUser.id)
    .maybeSingle();

  if (selectError || !fullUser) {
    return NextResponse.json({ error: selectError?.message ?? "Created user not found" }, { status: 500 });
  }

  return NextResponse.json(
    {
      user: {
        id: fullUser.id,
        nome: fullUser.nome,
        cognome: fullUser.cognome,
        email: fullUser.email,
        telefono: fullUser.telefono,
        ruolo: fullUser.ruolo,
        strutture: (fullUser.app_utenti_strutture ?? [])
          .map((item) => item.struttura)
          .sort((a, b) => a.localeCompare(b, "it-IT")),
      },
    },
    { status: 201 }
  );
}
