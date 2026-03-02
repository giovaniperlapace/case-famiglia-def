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
    .from("submissions")
    .select("id,tally_submission_id,owner_email,submitted_at_tally,normalized_data,raw_payload")
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
      <h1>Submission {data.tally_submission_id ?? data.id}</h1>
      <p className="muted">Owner: {data.owner_email}</p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Normalized data</h2>
        <pre style={{ overflowX: "auto" }}>
          {JSON.stringify(data.normalized_data ?? {}, null, 2)}
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
