import { createSupabaseServerClient } from "@/lib/supabase/server";
import DashboardTableClient, { type SubmissionRow } from "./dashboard-table-client";
import { getCurrentStatus } from "@/lib/guests/status";

export const dynamic = "force-dynamic";

function deriveGuestStatus(row: SubmissionRow) {
  const status = getCurrentStatus(row);
  if (status === "DECEDUTO") return "Deceduto";
  if (status === "USCITO") return "Uscito";
  return "In accoglienza";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,submitted_at,updated_at,current_status,struttura,nome_della_persona,cognome,tipo_aggiornamento,data_uscita,data_decesso,data_decesso_2"
    )
    .order("submitted_at", { ascending: false });

  const rows = (data ?? []) as SubmissionRow[];
  const activeCount = rows.filter((row) => deriveGuestStatus(row) === "In accoglienza").length;
  const exitedCount = rows.filter((row) => deriveGuestStatus(row) === "Uscito").length;
  const deceasedCount = rows.filter((row) => deriveGuestStatus(row) === "Deceduto").length;

  return (
    <>
      <h1>Persone ospitate</h1>

      <div
        style={{
          marginTop: "1rem",
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Totale visibili
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{rows.length}</p>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            In accoglienza
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{activeCount}</p>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Usciti
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{exitedCount}</p>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Deceduti
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700 }}>{deceasedCount}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Elenco coordinatore</h2>
        </div>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {rows.length === 0 ? <p className="muted">Nessuna persona visibile per le tue strutture.</p> : null}

        {rows.length > 0 ? <DashboardTableClient rows={rows} /> : null}
      </div>
    </>
  );
}
