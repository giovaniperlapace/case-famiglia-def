import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
  struttura: string | null;
  nome_della_persona: string | null;
  cognome: string | null;
  tipo_aggiornamento: string | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select("id,submission_id,submitted_at,struttura,nome_della_persona,cognome,tipo_aggiornamento")
    .order("submitted_at", { ascending: false });

  const rows = (data ?? []) as SubmissionRow[];

  return (
    <main>
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {user?.email}</p>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Persone ospitate</h2>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {rows.length === 0 ? <p className="muted">No submissions yet.</p> : null}

        {rows.length > 0 ? (
          <ul style={{ margin: "1rem 0 0", padding: 0, listStyle: "none" }}>
            {rows.map((row) => (
              <li
                key={row.id}
                style={{
                  padding: "0.75rem 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <Link href={`/dashboard/submissions/${row.id}`}>
                  <strong>
                    {`${row.nome_della_persona ?? ""} ${row.cognome ?? ""}`.trim() ||
                      row.submission_id ||
                      row.id}
                  </strong>
                </Link>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Struttura: {row.struttura ?? "n/a"} | Aggiornamento:{" "}
                  {row.tipo_aggiornamento ?? "n/a"} | Inviato: {row.submitted_at ?? "n/a"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
