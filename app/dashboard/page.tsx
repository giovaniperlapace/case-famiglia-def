import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
  updated_at: string;
  struttura: string | null;
  nome_della_persona: string | null;
  cognome: string | null;
  tipo_aggiornamento: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  data_decesso_2: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function deriveGuestStatus(row: SubmissionRow) {
  if (row.data_decesso || row.data_decesso_2) return "Deceduto";
  if (row.data_uscita) return "Uscito";

  const updateType = (row.tipo_aggiornamento ?? "").toLowerCase();
  if (updateType.includes("decesso")) return "Deceduto";
  if (updateType.includes("uscita")) return "Uscito";

  return "In accoglienza";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,submitted_at,updated_at,struttura,nome_della_persona,cognome,tipo_aggiornamento,data_uscita,data_decesso,data_decesso_2"
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

        {rows.length > 0 ? (
          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Ospite
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Struttura
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Stato
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Tipo aggiornamento
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Inviato
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Ultima modifica
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      <strong>
                        {`${row.nome_della_persona ?? ""} ${row.cognome ?? ""}`.trim() ||
                          row.submission_id ||
                          row.id}
                      </strong>
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      {row.struttura ?? "n/d"}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      {deriveGuestStatus(row)}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      {row.tipo_aggiornamento ?? "n/d"}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      {formatDateTime(row.submitted_at)}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      {formatDateTime(row.updated_at)}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Link href={`/dashboard/submissions/${row.id}`}>Dettaglio</Link>
                        <Link href={`/dashboard/submissions/${row.id}/edit`}>Modifica</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
