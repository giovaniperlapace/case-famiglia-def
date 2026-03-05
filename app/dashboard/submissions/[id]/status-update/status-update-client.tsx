"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { CLINICAL_FIELDS, FOLLOW_UP_FIELDS, GUEST_STATUS_LABEL, type GuestStatus } from "@/lib/guests/schema";

type UpdateType = "medical" | "exit" | "death";

type StatusUpdateClientProps = {
  guestId: string;
  currentStatus: GuestStatus;
};

export default function StatusUpdateClient({ guestId, currentStatus }: StatusUpdateClientProps) {
  const router = useRouter();
  const [updateType, setUpdateType] = useState<UpdateType>("medical");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [payload, setPayload] = useState<Record<string, string>>({
    causa_uscita: "",
    exit_destination: "",
    causa_decesso: "",
    place_of_death: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = currentStatus === "DECEDUTO";
  const canSubmit = useMemo(() => !loading && !isTerminal, [loading, isTerminal]);

  function setPayloadField(key: string, value: string) {
    setPayload((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isTerminal) {
      setError("Lo stato è DECEDUTO. Non è possibile registrare nuovi status update.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/guests/${guestId}/status-events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updateType,
          effectiveDate: effectiveDate || null,
          payload,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Errore durante il salvataggio dell'evento.");
        return;
      }

      router.push(`/dashboard/submissions/${guestId}`);
      router.refresh();
    } catch {
      setError("Errore inatteso durante il salvataggio dell'evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: "1rem", display: "grid", gap: 12 }}>
      <p className="muted" style={{ margin: 0 }}>
        Stato attuale: {GUEST_STATUS_LABEL[currentStatus]}
      </p>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Tipo aggiornamento</span>
        <select value={updateType} onChange={(event) => setUpdateType(event.target.value as UpdateType)} disabled={isTerminal}>
          <option value="medical">Medical / Follow-up</option>
          <option value="exit">Exit update (USCITO)</option>
          <option value="death">Death update (DECEDUTO)</option>
        </select>
      </label>

      {(updateType === "exit" || updateType === "death") ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span>Data evento</span>
          <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
        </label>
      ) : null}

      {updateType === "exit" ? (
        <>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Causa uscita</span>
            <input value={payload.causa_uscita ?? ""} onChange={(event) => setPayloadField("causa_uscita", event.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Destinazione uscita</span>
            <input value={payload.exit_destination ?? ""} onChange={(event) => setPayloadField("exit_destination", event.target.value)} />
          </label>
        </>
      ) : null}

      {updateType === "death" ? (
        <>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Causa decesso</span>
            <input value={payload.causa_decesso ?? ""} onChange={(event) => setPayloadField("causa_decesso", event.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Luogo decesso</span>
            <input value={payload.place_of_death ?? ""} onChange={(event) => setPayloadField("place_of_death", event.target.value)} />
          </label>
        </>
      ) : null}

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
          Dati follow-up (schema condiviso con flussi “già fuori casa”)
        </p>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {FOLLOW_UP_FIELDS.map((field) => (
            <label key={field.key} style={{ display: "grid", gap: 4 }}>
              <span>{field.label}</span>
              <input value={payload[field.key] ?? ""} onChange={(event) => setPayloadField(field.key, event.target.value)} />
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
          Dati clinici / patologici
        </p>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {CLINICAL_FIELDS.map((field) => (
            <label key={field.key} style={{ display: "grid", gap: 4 }}>
              <span>{field.label}</span>
              <input value={payload[field.key] ?? ""} onChange={(event) => setPayloadField(field.key, event.target.value)} />
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Note</span>
        <textarea value={payload.note ?? ""} onChange={(event) => setPayloadField("note", event.target.value)} rows={3} />
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={!canSubmit}>
          {loading ? "Salvataggio..." : "Registra aggiornamento"}
        </button>
        <button type="button" onClick={() => router.push(`/dashboard/submissions/${guestId}`)} disabled={loading}>
          Annulla
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
