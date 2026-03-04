import { redirect } from "next/navigation";
import AuthenticatedShell from "@/app/_components/authenticated-shell";
import { getServerAuthContext } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, role } = await getServerAuthContext();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <AuthenticatedShell email={user.email ?? null} role={role}>
      {children}
    </AuthenticatedShell>
  );
}
