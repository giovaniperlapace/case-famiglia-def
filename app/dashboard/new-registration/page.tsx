import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/server";
import NewRegistrationClient from "./new-registration-client";

export const dynamic = "force-dynamic";

export default async function NewRegistrationPage() {
  const { user, role, appUserId } = await getServerAuthContext();

  if (!user) {
    redirect("/login?next=/dashboard/new-registration");
  }

  if (role !== "responsabile_casa") {
    redirect("/dashboard");
  }

  const tallyUrl = appUserId
    ? `https://tally.so/r/nW6KZe?id_utente=${encodeURIComponent(appUserId)}`
    : `https://tally.so/r/nW6KZe?id_utente=${encodeURIComponent(user.id)}`;

  return (
    <main>
      <p>
        <Link href="/dashboard" aria-label="Torna alla dashboard" title="Torna alla dashboard">
          ← Dashboard
        </Link>
      </p>
      <h1>Verifica nuova registrazione</h1>
      <NewRegistrationClient tallyUrl={tallyUrl} />
    </main>
  );
}
