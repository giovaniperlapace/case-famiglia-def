import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubmissionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select("id,submission_id,nome_della_persona,cognome,struttura,tipo_aggiornamento,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const guestName = `${data.nome_della_persona ?? ""} ${data.cognome ?? ""}`.trim();

  return (
    <main>
      <p>
        <Link href={`/dashboard/submissions/${data.id}`}>Back to detail</Link>
      </p>
      <h1>Modifica scheda</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {data.struttura ?? "n/d"} | Ultima modifica:{" "}
        {data.updated_at ?? "n/d"}
      </p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p style={{ marginTop: 0 }}>
          Flusso di modifica in costruzione. Questa pagina e il percorso URL sono pronti per il
          prossimo step di editing server-side con RLS.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Riferimento scheda: {data.submission_id ?? data.id}
        </p>
      </div>
    </main>
  );
}
