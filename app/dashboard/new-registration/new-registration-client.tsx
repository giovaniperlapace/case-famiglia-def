"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type DuplicateMatch = {
  nome: string;
  cognome: string;
  struttura: string | null;
  submitted_at: string | null;
  similarity: number;
  exact: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "data n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short" }).format(parsed);
}

export default function NewRegistrationClient({ tallyUrl }: { tallyUrl: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [decisionRequired, setDecisionRequired] = useState(false);

  const canSubmit = useMemo(
    () => nome.trim().length > 0 && cognome.trim().length > 0 && !loading,
    [nome, cognome, loading]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setMatches([]);
    setDecisionRequired(false);

    try {
      const response = await fetch("/api/guests/check-duplicates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, cognome }),
      });

      const payload = (await response.json()) as { matches?: DuplicateMatch[]; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Errore durante il controllo duplicati.");
        return;
      }

      const found = payload.matches ?? [];
      setMatches(found);

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

      {matches.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
            Possibile duplicato trovato nel database
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {matches.slice(0, 8).map((item, index) => (
              <li key={`${item.nome}-${item.cognome}-${item.struttura ?? "na"}-${index}`}>
                {item.nome} {item.cognome} | Casa: {item.struttura ?? "n/d"} | Similarità:{" "}
                {Math.round(item.similarity * 100)}% | Ultimo invio: {formatDate(item.submitted_at)}
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
