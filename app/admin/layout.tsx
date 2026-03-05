import { redirect } from "next/navigation";
import AuthenticatedShell from "@/app/_components/authenticated-shell";
import { getServerAuthContext } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, role, appUserId } = await getServerAuthContext();
  if (!user) {
    redirect("/login?next=/admin");
  }

  if (role !== "admin" && role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <AuthenticatedShell email={user.email ?? null} role={role} userId={appUserId ?? user.id}>
      {children}
    </AuthenticatedShell>
  );
}
