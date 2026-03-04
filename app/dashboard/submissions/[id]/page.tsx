import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,owner_email,submitted_at,struttura,nome_della_persona,cognome,tipo_aggiornamento,mapped_answers,raw_payload"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <p>
        <Link href={`/dashboard/submissions/${data.id}/edit`}>Go to edit flow</Link>
      </p>
      <h1>Submission {data.submission_id ?? data.id}</h1>
      <p className="muted">
        Ospite: {`${data.nome_della_persona ?? ""} ${data.cognome ?? ""}`.trim() || "n/a"} |
        Struttura: {data.struttura ?? "n/a"} | Aggiornamento: {data.tipo_aggiornamento ?? "n/a"}
      </p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Mapped answers</h2>
        <pre style={{ overflowX: "auto" }}>
          {JSON.stringify(data.mapped_answers ?? {}, null, 2)}
        </pre>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Raw payload</h2>
        <pre style={{ overflowX: "auto" }}>
          {JSON.stringify(data.raw_payload ?? {}, null, 2)}
        </pre>
      </div>
    </main>
  );
}
