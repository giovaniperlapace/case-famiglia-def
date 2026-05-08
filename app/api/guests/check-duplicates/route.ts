import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCurrentStatus } from "@/lib/guests/status";
import { STRUTTURA_OPTIONS } from "@/lib/guests/status-update-options";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type CandidateRow = {
  id: string;
  nome_della_persona: string | null;
  cognome: string | null;
  struttura: string | null;
  submitted_at: string | null;
  current_status: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  tipo_aggiornamento: string | null;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBigrams(value: string): string[] {
  if (value.length < 2) return [value];
  const grams: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    grams.push(value.slice(i, i + 2));
  }
  return grams;
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const gramsA = toBigrams(a);
  const gramsB = toBigrams(b);
  const counts = new Map<string, number>();
  for (const gram of gramsA) {
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  let overlap = 0;
  for (const gram of gramsB) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (gramsA.length + gramsB.length);
}

function scoreSimilarity(
  inputNome: string,
  inputCognome: string,
  nome: string,
  cognome: string
): { similarity: number; exact: boolean } {
  const inNome = normalizeText(inputNome);
  const inCognome = normalizeText(inputCognome);
  const rowNome = normalizeText(nome);
  const rowCognome = normalizeText(cognome);

  const direct =
    (diceSimilarity(inNome, rowNome) + diceSimilarity(inCognome, rowCognome)) / 2;
  const swapped =
    (diceSimilarity(inNome, rowCognome) + diceSimilarity(inCognome, rowNome)) / 2;

  const similarity = Math.max(direct, swapped);
  const exact = inNome === rowNome && inCognome === rowCognome;
  return { similarity, exact };
}

export async function POST(req: Request) {
  const { supabase, user, role, appUserId } = await getServerAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { nome?: string; cognome?: string } = {};
  try {
    body = (await req.json()) as { nome?: string; cognome?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const nome = (body.nome ?? "").trim();
  const cognome = (body.cognome ?? "").trim();

  if (!nome || !cognome) {
    return NextResponse.json({ error: "Nome e cognome sono obbligatori." }, { status: 400 });
  }

  const serviceSupabase = createSupabaseServiceClient();
  let assignedStructures: string[] = [];

  if (role === "admin" || role === "manager") {
    assignedStructures = [...STRUTTURA_OPTIONS];
  } else if (appUserId) {
    const { data: structuresData } = await supabase
      .from("app_utenti_strutture")
      .select("struttura")
      .eq("utente_id", appUserId)
      .order("struttura", { ascending: true });

    assignedStructures = (structuresData ?? [])
      .map((item) => item.struttura)
      .filter((item): item is string => Boolean(item));
  }

  const { data, error } = await serviceSupabase
    .from("case_alloggio_submissions")
    .select(
      "id,nome_della_persona,cognome,struttura,submitted_at,current_status,data_uscita,data_decesso,tipo_aggiornamento"
    )
    .not("nome_della_persona", "is", null)
    .not("cognome", "is", null)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Errore durante la ricerca duplicati." }, { status: 500 });
  }

  const rows = (data ?? []) as CandidateRow[];
  const latestPerGuest = new Map<string, CandidateRow>();

  for (const row of rows) {
    const key = `${normalizeText(row.nome_della_persona ?? "")}|${normalizeText(
      row.cognome ?? ""
    )}|${normalizeText(row.struttura ?? "")}`;
    if (!latestPerGuest.has(key)) {
      latestPerGuest.set(key, row);
    }
  }

  const matches = Array.from(latestPerGuest.values())
    .map((row) => {
      const personNome = row.nome_della_persona ?? "";
      const personCognome = row.cognome ?? "";
      const { similarity, exact } = scoreSimilarity(nome, cognome, personNome, personCognome);
      return {
        id: row.id,
        nome: personNome,
        cognome: personCognome,
        struttura: row.struttura,
        submitted_at: row.submitted_at,
        current_status: getCurrentStatus(row),
        similarity,
        exact,
      };
    })
    .filter((row) => row.exact || row.similarity >= 0.72)
    .sort((a, b) => {
      if (a.exact !== b.exact) return a.exact ? -1 : 1;
      return b.similarity - a.similarity;
    })
    .slice(0, 8);

  return NextResponse.json({ matches, assignedStructures });
}
