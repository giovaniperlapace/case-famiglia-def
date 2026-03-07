"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { NATIONALITY_OPTIONS } from "@/lib/guests/nationalities";
import { type GuestProfileFieldKey } from "@/lib/guests/schema";

type EditDataClientProps = {
  guestId: string;
  initialValues: Record<GuestProfileFieldKey, string | null>;
};

const SEX_OPTIONS = ["Uomo", "Donna", "Altro"] as const;

function normalizeToIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }
  return "";
}

function isoToItalianDate(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  const [year, month, day] = trimmed.split("-");
  return `${day}/${month}/${year}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  if (year < 1900 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toE164(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function isValidPhone(value: string): boolean {
  return /^\+\d{6,15}$/.test(value);
}

export default function EditDataClient({ guestId, initialValues }: EditDataClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<Record<GuestProfileFieldKey, string>>({
    nome_della_persona: initialValues.nome_della_persona ?? "",
    cognome: initialValues.cognome ?? "",
    data_di_nascita: normalizeToIsoDate(initialValues.data_di_nascita ?? ""),
    luogo_di_nascita: initialValues.luogo_di_nascita ?? "",
    sesso_della_persona: initialValues.sesso_della_persona ?? "",
    nazionalita: initialValues.nazionalita ?? "",
    contatto_della_persona: toE164(initialValues.contatto_della_persona ?? "") || "+39",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameChangeConfirmed, setNameChangeConfirmed] = useState(false);

  const initialName = (initialValues.nome_della_persona ?? "").trim();
  const initialSurname = (initialValues.cognome ?? "").trim();
  const hasNameOrSurnameChange = useMemo(() => {
    return (
      form.nome_della_persona.trim() !== initialName || form.cognome.trim() !== initialSurname
    );
  }, [form.cognome, form.nome_della_persona, initialName, initialSurname]);

  useEffect(() => {
    if (!hasNameOrSurnameChange) {
      setNameChangeConfirmed(false);
    }
  }, [hasNameOrSurnameChange]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.data_di_nascita && !isValidIsoDate(form.data_di_nascita)) {
      setError("Data di nascita non valida.");
      return;
    }

    const normalizedPhone = toE164(form.contatto_della_persona);
    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      setError("Il contatto deve essere un telefono valido in formato internazionale, es. +3932678766.");
      return;
    }

    if (form.nazionalita && !NATIONALITY_OPTIONS.includes(form.nazionalita as (typeof NATIONALITY_OPTIONS)[number])) {
      setError("Seleziona una nazionalità valida dall'elenco.");
      return;
    }

    if (!SEX_OPTIONS.includes(form.sesso_della_persona as (typeof SEX_OPTIONS)[number])) {
      setError("Seleziona il sesso tra Uomo, Donna o Altro.");
      return;
    }

    if (hasNameOrSurnameChange && !nameChangeConfirmed) {
      setError("Conferma esplicita richiesta per modificare nome o cognome.");
      return;
    }

    if (hasNameOrSurnameChange) {
      const ok = window.confirm("Confermi di voler modificare nome e/o cognome di questa persona?");
      if (!ok) return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        data_di_nascita: form.data_di_nascita ? isoToItalianDate(form.data_di_nascita) : "",
        contatto_della_persona: normalizedPhone,
      };

      const response = await fetch(`/api/guests/${guestId}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Errore durante il salvataggio.");
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
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "start",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span>Nome</span>
          <input
            value={form.nome_della_persona}
            onChange={(event) => setForm((prev) => ({ ...prev, nome_della_persona: event.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Cognome</span>
          <input
            value={form.cognome}
            onChange={(event) => setForm((prev) => ({ ...prev, cognome: event.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Data di nascita</span>
          <input
            type="date"
            value={form.data_di_nascita}
            lang="it-IT"
            onChange={(event) => {
              setForm((prev) => ({ ...prev, data_di_nascita: event.target.value }));
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Luogo di nascita</span>
          <input
            value={form.luogo_di_nascita}
            onChange={(event) => setForm((prev) => ({ ...prev, luogo_di_nascita: event.target.value }))}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Sesso</span>
          <select
            value={form.sesso_della_persona}
            onChange={(event) => setForm((prev) => ({ ...prev, sesso_della_persona: event.target.value }))}
            required
          >
            <option value="">Seleziona...</option>
            {SEX_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Nazionalità</span>
          <input
            list="nazionalita-options"
            value={form.nazionalita}
            onChange={(event) => setForm((prev) => ({ ...prev, nazionalita: event.target.value }))}
            placeholder="Seleziona o digita per filtrare"
          />
          <datalist id="nazionalita-options">
            {NATIONALITY_OPTIONS.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span>Contatto della persona</span>
          <input
            type="tel"
            value={form.contatto_della_persona}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                contatto_della_persona: event.target.value,
              }))
            }
            pattern="\+\d{6,15}"
            placeholder="+3932678766"
          />
        </label>
      </div>

      {hasNameOrSurnameChange ? (
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={nameChangeConfirmed}
            onChange={(event) => setNameChangeConfirmed(event.target.checked)}
          />
          <span>Confermo che voglio modificare nome/cognome</span>
        </label>
      ) : null}

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
