import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStatus } from "@/lib/guests/status";

export const dynamic = "force-dynamic";

type StatsRow = {
  id: string;
  struttura: string | null;
  current_status: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  data_decesso_2: string | null;
  tipo_aggiornamento: string | null;
};

export default async function AdminStatisticsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,struttura,current_status,data_uscita,data_decesso,data_decesso_2,tipo_aggiornamento"
    );

  const rows = (data ?? []) as StatsRow[];
  const grouped = new Map<string, { inAccoglienza: number; storico: number }>();

  for (const row of rows) {
    const casa = row.struttura?.trim() || "n/d";
    const status = getCurrentStatus(row);
    const prev = grouped.get(casa) ?? { inAccoglienza: 0, storico: 0 };

    if (status === "IN_ACCOGLIENZA") {
      prev.inAccoglienza += 1;
    } else {
      prev.storico += 1;
    }

    grouped.set(casa, prev);
  }

  const items = Array.from(grouped.entries())
    .map(([casa, counts]) => ({ casa, ...counts }))
    .sort((a, b) => a.casa.localeCompare(b.casa, "it-IT"));

  const totals = items.reduce(
    (acc, item) => ({
      inAccoglienza: acc.inAccoglienza + item.inAccoglienza,
      storico: acc.storico + item.storico,
    }),
    { inAccoglienza: 0, storico: 0 }
  );

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Statistiche</h1>
      <div className="card" style={{ display: "inline-block", width: "fit-content", maxWidth: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Persone per accoglienza e stato</h2>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && items.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun dato disponibile.
          </p>
        ) : null}

        {!error && items.length > 0 ? (
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "auto", borderCollapse: "collapse", marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th
                    style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: "8px 6px" }}
                  >
                    Accoglienza
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 130,
                    }}
                  >
                    In accoglienza
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 90,
                    }}
                  >
                    Storico
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.casa}>
                    <td
                      style={{
                        borderBottom: "1px solid var(--border)",
                        padding: "8px 6px",
                        whiteSpace: "nowrap",
                        paddingRight: 18,
                      }}
                    >
                      {item.casa}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      {item.inAccoglienza}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      {item.storico}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700 }}>Totale</td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    {totals.inAccoglienza}
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    {totals.storico}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
