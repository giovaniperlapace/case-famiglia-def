"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type DuplicateMatch = {
  id: string;
  nome: string;
  cognome: string;
  struttura: string | null;
  submitted_at: string | null;
  current_status: "IN_ACCOGLIENZA" | "USCITO" | "DECEDUTO";
  similarity: number;
  exact: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "data n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short" }).format(parsed);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewRegistrationClient({ tallyUrl }: { tallyUrl: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataRientro, setDataRientro] = useState(todayIsoDate);
  const [targetStruttura, setTargetStruttura] = useState("");
  const [assignedStructures, setAssignedStructures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [decisionRequired, setDecisionRequired] = useState(false);

  const canSubmit = useMemo(
    () => nome.trim().length > 0 && cognome.trim().length > 0 && !loading,
    [nome, cognome, loading]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setActionMessage(null);
    setLoading(true);
    setMatches([]);
    setDecisionRequired(false);

    try {
      const response = await fetch("/api/guests/check-duplicates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, cognome }),
      });

      const payload = (await response.json()) as {
        matches?: DuplicateMatch[];
        assignedStructures?: string[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Errore durante il controllo duplicati.");
        return;
      }

      const found = payload.matches ?? [];
      const structures = payload.assignedStructures ?? [];
      setMatches(found);
      setAssignedStructures(structures);
      setTargetStruttura((prev) => prev || structures[0] || "");

      if (found.length === 0) {
        window.location.assign(tallyUrl);
        return;
      }

      setDecisionRequired(true);
    } catch {
      setError("Errore inatteso durante il controllo duplicati.");
    } finally {
      setLoading(false);
    }
  }

  async function registerReentry(match: DuplicateMatch) {
    setError(null);
    setActionMessage(null);

    if (!targetStruttura) {
      setError("Seleziona l'accoglienza in cui registrare il rientro.");
      return;
    }

    setActionLoadingId(match.id);
    try {
      const response = await fetch(`/api/guests/${match.id}/duplicate-reentry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetStruttura, dataRientro }),
      });
      const payload = (await response.json()) as { error?: string; guestId?: string };

      if (!response.ok) {
        setError(payload.error ?? "Errore durante la registrazione del rientro.");
        return;
      }

      router.push(`/dashboard/submissions/${payload.guestId ?? match.id}`);
      router.refresh();
    } catch {
      setError("Errore inatteso durante la registrazione del rientro.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function sendTransferRequest(match: DuplicateMatch) {
    setError(null);
    setActionMessage(null);

    if (!targetStruttura) {
      setError("Seleziona l'accoglienza verso cui chiedere il trasferimento.");
      return;
    }

    setActionLoadingId(match.id);
    try {
      const response = await fetch(`/api/guests/${match.id}/transfer-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetStruttura }),
      });
      const payload = (await response.json()) as { error?: string; sentTo?: number };

      if (!response.ok) {
        setError(payload.error ?? "Errore durante l'invio della richiesta di trasferimento.");
        return;
      }

      setActionMessage(`Richiesta inviata ai coordinatori (${payload.sentTo ?? 0}).`);
    } catch {
      setError("Errore inatteso durante l'invio della richiesta di trasferimento.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>Nuova registrazione ospite</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Inserisci nome e cognome per controllare possibili duplicati prima di aprire il form Tally.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Nome</span>
          <input value={nome} onChange={(event) => setNome(event.target.value)} required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Cognome</span>
          <input value={cognome} onChange={(event) => setCognome(event.target.value)} required />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" disabled={!canSubmit}>
            {loading ? "Controllo in corso..." : "Controlla"}
          </button>
        </div>
      </form>

      {error ? (
        <p style={{ color: "var(--danger)", marginTop: 10 }}>
          {error}
        </p>
      ) : null}

      {actionMessage ? (
        <p style={{ color: "#166534", marginTop: 10 }}>
          {actionMessage}
        </p>
      ) : null}

      {matches.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
            Possibile duplicato trovato nel database
          </p>
          {assignedStructures.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                margin: "10px 0",
                maxWidth: 720,
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span>Accoglienza di destinazione</span>
                <select
                  value={targetStruttura}
                  onChange={(event) => setTargetStruttura(event.target.value)}
                >
                  {assignedStructures.map((structure) => (
                    <option key={structure} value={structure}>
                      {structure}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Data rientro</span>
                <input
                  type="date"
                  value={dataRientro}
                  onChange={(event) => setDataRientro(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {matches.slice(0, 8).map((item, index) => (
              <li key={`${item.nome}-${item.cognome}-${item.struttura ?? "na"}-${index}`}>
                {item.nome} {item.cognome} | Casa: {item.struttura ?? "n/d"} | Similarità:{" "}
                {Math.round(item.similarity * 100)}% | Stato: {item.current_status} | Ultimo invio:{" "}
                {formatDate(item.submitted_at)}
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.current_status === "USCITO" ? (
                    <button
                      type="button"
                      onClick={() => registerReentry(item)}
                      disabled={Boolean(actionLoadingId) || assignedStructures.length === 0}
                    >
                      {actionLoadingId === item.id ? "Registrazione..." : "Registra rientro"}
                    </button>
                  ) : null}
                  {item.current_status === "IN_ACCOGLIENZA" &&
                  item.struttura &&
                  !assignedStructures.includes(item.struttura) ? (
                    <button
                      type="button"
                      onClick={() => sendTransferRequest(item)}
                      disabled={Boolean(actionLoadingId) || assignedStructures.length === 0}
                    >
                      {actionLoadingId === item.id
                        ? "Invio..."
                        : "Chiedi trasferimento ai coordinatori"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {decisionRequired ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => router.push("/dashboard")} disabled={loading}>
                Annulla
              </button>
              <button type="button" onClick={() => window.location.assign(tallyUrl)} disabled={loading}>
                Continua comunque
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
