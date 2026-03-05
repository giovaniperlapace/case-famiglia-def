"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteGuestButtonProps = {
  guestId: string;
};

export default function DeleteGuestButton({ guestId }: DeleteGuestButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare definitivamente questo record? I dati non saranno più recuperabili."
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/guests/${guestId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Errore durante l'eliminazione del record.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Errore inatteso durante l'eliminazione del record.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        style={{
          border: "1px solid #b91c1c",
          borderRadius: 10,
          background: "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)",
          color: "#ffffff",
          fontWeight: 700,
          lineHeight: 1.1,
          padding: "0.55rem 0.85rem",
          boxShadow: "0 1px 2px rgba(185, 28, 28, 0.28)",
        }}
        title="Elimina record"
      >
        {loading ? "Eliminazione..." : "🗑 Elimina record"}
      </button>
      {error ? (
        <p style={{ margin: "8px 0 0", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
