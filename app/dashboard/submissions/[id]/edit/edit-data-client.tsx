"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GUEST_PROFILE_FIELDS, type GuestProfileFieldKey } from "@/lib/guests/schema";

type EditDataClientProps = {
  guestId: string;
  initialValues: Record<GuestProfileFieldKey, string | null>;
};

export default function EditDataClient({ guestId, initialValues }: EditDataClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<Record<GuestProfileFieldKey, string>>({
    nome_della_persona: initialValues.nome_della_persona ?? "",
    cognome: initialValues.cognome ?? "",
    data_di_nascita: initialValues.data_di_nascita ?? "",
    luogo_di_nascita: initialValues.luogo_di_nascita ?? "",
    sesso_della_persona: initialValues.sesso_della_persona ?? "",
    nazionalita: initialValues.nazionalita ?? "",
    contatto_della_persona: initialValues.contatto_della_persona ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/guests/${guestId}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Errore durante il salvataggio.");
        return;
      }

      router.push(`/dashboard/submissions/${guestId}`);
      router.refresh();
    } catch {
      setError("Errore inatteso durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: "1rem", display: "grid", gap: 12 }}>
      {GUEST_PROFILE_FIELDS.map((field) => (
        <label key={field.key} style={{ display: "grid", gap: 4 }}>
          <span>{field.label}</span>
          <input
            value={form[field.key]}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                [field.key]: event.target.value,
              }))
            }
          />
        </label>
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={loading}>
          {loading ? "Salvataggio..." : "Salva modifiche"}
        </button>
        <button type="button" onClick={() => router.push(`/dashboard/submissions/${guestId}`)} disabled={loading}>
          Annulla
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
