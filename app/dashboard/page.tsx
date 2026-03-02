import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  tally_submission_id: string | null;
  owner_email: string;
  submitted_at_tally: string | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("submissions")
    .select("id,tally_submission_id,owner_email,submitted_at_tally")
    .order("submitted_at_tally", { ascending: false });

  const rows = (data ?? []) as SubmissionRow[];

  return (
    <main>
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {user?.email}</p>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Your submissions</h2>
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
                  <strong>{row.tally_submission_id ?? row.id}</strong>
                </Link>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Submitted at: {row.submitted_at_tally ?? "n/a"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
