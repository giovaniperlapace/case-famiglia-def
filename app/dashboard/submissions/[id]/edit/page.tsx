import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditDataClient from "./edit-data-client";

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
    .select(
      "id,submission_id,nome_della_persona,cognome,data_di_nascita,luogo_di_nascita,sesso_della_persona,nazionalita,contatto_della_persona,struttura,updated_at"
    )
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
      <h1>Edit data</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {data.struttura ?? "n/d"} | Ultima modifica:{" "}
        {data.updated_at ?? "n/d"}
      </p>
      <EditDataClient
        guestId={data.id}
        initialValues={{
          nome_della_persona: data.nome_della_persona,
          cognome: data.cognome,
          data_di_nascita: data.data_di_nascita,
          luogo_di_nascita: data.luogo_di_nascita,
          sesso_della_persona: data.sesso_della_persona,
          nazionalita: data.nazionalita,
          contatto_della_persona: data.contatto_della_persona,
        }}
      />
    </main>
  );
}
