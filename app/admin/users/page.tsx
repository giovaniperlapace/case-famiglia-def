import { createSupabaseServerClient } from "@/lib/supabase/server";
import UsersManagementClient from "./users-management-client";

export const dynamic = "force-dynamic";

type UserWithStructuresRow = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email: string;
  telefono: string | null;
  ruolo: "admin" | "manager" | "responsabile_casa";
  app_utenti_strutture: { struttura: string }[] | null;
};

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();

  const { data: usersData, error: usersError } = await supabase
    .from("app_utenti")
    .select("id,nome,cognome,email,telefono,ruolo,app_utenti_strutture(struttura)")
    .order("cognome", { ascending: true, nullsFirst: false })
    .order("nome", { ascending: true, nullsFirst: false });

  if (usersError) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Users</h2>
        <p style={{ color: "var(--danger)" }}>{usersError.message}</p>
      </div>
    );
  }

  const { data: assignedStructuresData, error: assignedStructuresError } = await supabase
    .from("app_utenti_strutture")
    .select("struttura");
  if (assignedStructuresError) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Users</h2>
        <p style={{ color: "var(--danger)" }}>{assignedStructuresError.message}</p>
      </div>
    );
  }

  const { data: caseAlloggioStructuresData, error: caseAlloggioStructuresError } = await supabase
    .from("case_alloggio_submissions")
    .select("struttura")
    .not("struttura", "is", null);
  if (caseAlloggioStructuresError) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Users</h2>
        <p style={{ color: "var(--danger)" }}>{caseAlloggioStructuresError.message}</p>
      </div>
    );
  }

  const users = ((usersData ?? []) as UserWithStructuresRow[]).map((user) => ({
    id: user.id,
    nome: user.nome,
    cognome: user.cognome,
    email: user.email,
    telefono: user.telefono,
    ruolo: user.ruolo,
    strutture: (user.app_utenti_strutture ?? []).map((item) => item.struttura).sort(),
  }));

  const availableStructures = Array.from(
    new Set(
      [...(assignedStructuresData ?? []), ...(caseAlloggioStructuresData ?? [])]
        .map((item) => item.struttura)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).sort((a, b) => a.localeCompare(b, "it-IT"));

  return (
    <UsersManagementClient
      initialUsers={users}
      availableStructures={availableStructures}
    />
  );
}
