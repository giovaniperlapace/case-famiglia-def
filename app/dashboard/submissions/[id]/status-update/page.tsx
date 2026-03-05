import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStatus } from "@/lib/guests/status";
import { type GuestStatus } from "@/lib/guests/schema";
import StatusUpdateClient from "./status-update-client";

export const dynamic = "force-dynamic";

export default async function SubmissionStatusUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select("id,submission_id,nome_della_persona,cognome,struttura,current_status,data_uscita,data_decesso,data_decesso_2,tipo_aggiornamento")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const guestName = `${data.nome_della_persona ?? ""} ${data.cognome ?? ""}`.trim();
  const currentStatus = getCurrentStatus(data) as GuestStatus;

  return (
    <main>
      <p>
        <Link href={`/dashboard/submissions/${data.id}`}>Back to detail</Link>
      </p>
      <h1>Update status</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {data.struttura ?? "n/d"} | Scheda:{" "}
        {data.submission_id ?? data.id}
      </p>
      <StatusUpdateClient guestId={data.id} currentStatus={currentStatus} />
    </main>
  );
}
