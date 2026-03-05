import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/server";

export default async function AdminIndexPage() {
  const { user, role } = await getServerAuthContext();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (role === "manager") {
    redirect("/admin/statistics");
  }

  redirect("/admin/users");
}
