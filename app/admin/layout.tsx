import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/admin");
  }

  const { data: role, error: roleError } = await supabase.rpc("current_user_role");

  if (roleError || role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main>
      <h1>Admin Dashboard</h1>
      <p className="muted">Amministratore: {user.email}</p>

      <div
        className="card"
        style={{
          marginTop: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <nav style={{ display: "flex", gap: 16, fontWeight: 600 }}>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/structures">Structures</Link>
        </nav>
        <form action="/auth/signout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </div>

      <div style={{ marginTop: "1rem" }}>{children}</div>
    </main>
  );
}
