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

  const [guestResult, privacyResult] = await Promise.all([
    supabase
      .from("case_alloggio_submissions")
      .select(
        "id,submission_id,submitted_at,updated_at,current_status,struttura,nome_della_persona,cognome,tipo_aggiornamento,data_di_nascita,data_ingresso,data_uscita,data_decesso,data_ultimo_contatto,dove_dorme"
      )
      .order("submitted_at", { ascending: false }),
    supabase.from("guest_privacy_documents").select("guest_id"),
  ]);

  const { data, error } = guestResult;
  const { data: privacyDocuments, error: privacyError } = privacyResult;
  const queryError = error ?? privacyError;

  const baseRows = (data ?? []) as Omit<SubmissionRow, "privacy_documents_count">[];
  const privacyDocumentCounts = new Map<string, number>();

  for (const document of (privacyDocuments ?? []) as Array<{ guest_id: string }>) {
    privacyDocumentCounts.set(
      document.guest_id,
      (privacyDocumentCounts.get(document.guest_id) ?? 0) + 1
    );
  }

  const rows: SubmissionRow[] = baseRows.map((row) => ({
    ...row,
    privacy_documents_count: privacyDocumentCounts.get(row.id) ?? 0,
  }));
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

        {queryError ? <p style={{ color: "var(--danger)" }}>{queryError.message}</p> : null}

        {!queryError && rows.length === 0 ? (
          <p className="muted">Nessuna persona visibile per le tue strutture.</p>
        ) : null}

        {!queryError && rows.length > 0 ? <DashboardTableClient rows={rows} /> : null}
      </div>
    </>
  );
}
