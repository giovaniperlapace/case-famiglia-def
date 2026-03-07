"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { GUEST_STATUS_LABEL, type GuestStatus } from "@/lib/guests/schema";
import {
  CAUSA_DECESSO_OPTIONS,
  CAUSA_USCITA_OPTIONS,
  DECESSO_CAUSA_USCITA,
  DECESSO_DOVE_DORME,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIA_PSICHIATRICA_OPTIONS,
  PATOLOGIE_OPTIONS,
  REDDITO_OPTIONS,
  RESIDENZA_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  TIPO_REDDITO_OPTIONS,
  type UpdateTypeOption,
} from "@/lib/guests/status-update-options";

type StatusUpdateForm = {
  data_ultimo_contatto: string;
  dove_dorme: string;
  data_decesso_2: string;
  causa_decesso_2: string;
  ha_residenza: string;
  ha_un_reddito: string;
  tipo_di_reddito_3: string;
  tipo_di_lavoro_3: string;
  data_uscita: string;
  causa_uscita: string;
  data_decesso: string;
  causa_decesso: string;
  al_momento_dell_uscita_ha_residenza: string;
  al_momento_dell_uscita_ha_un_reddito: string;
  tipo_di_reddito_2: string;
  tipo_di_lavoro_2: string;
  dipendenze: string;
  patologie: string;
  patologia_psichiatrica: string;
  note: string;
};

type StatusUpdateClientProps = {
  guestId: string;
  currentStatus: GuestStatus;
};

export default function StatusUpdateClient({ guestId, currentStatus }: StatusUpdateClientProps) {
  const router = useRouter();
  const [updateType, setUpdateType] = useState<UpdateTypeOption>("followup");
  const [form, setForm] = useState<StatusUpdateForm>({
    data_ultimo_contatto: "",
    dove_dorme: "",
    data_decesso_2: "",
    causa_decesso_2: "",
    ha_residenza: "",
    ha_un_reddito: "",
    tipo_di_reddito_3: "",
    tipo_di_lavoro_3: "",
    data_uscita: "",
    causa_uscita: "",
    data_decesso: "",
    causa_decesso: "",
    al_momento_dell_uscita_ha_residenza: "",
    al_momento_dell_uscita_ha_un_reddito: "",
    tipo_di_reddito_2: "",
    tipo_di_lavoro_2: "",
    dipendenze: "",
    patologie: "",
    patologia_psichiatrica: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = currentStatus === "DECEDUTO";
  const canSubmit = useMemo(() => !loading && !isTerminal, [loading, isTerminal]);
  const isFollowUpDeath = updateType === "followup" && form.dove_dorme === DECESSO_DOVE_DORME;
  const isExitDeath = updateType === "exit" && form.causa_uscita === DECESSO_CAUSA_USCITA;
  const hasFollowUpIncome = form.ha_un_reddito === "Sì";
  const hasExitIncome = form.al_momento_dell_uscita_ha_un_reddito === "Sì";
  const needsFollowUpWorkType = hasFollowUpIncome && form.tipo_di_reddito_3 === "Reddito da lavoro";
  const needsExitWorkType = hasExitIncome && form.tipo_di_reddito_2 === "Reddito da lavoro";

  function setField<K extends keyof StatusUpdateForm>(key: K, value: StatusUpdateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      const payload: Record<string, string> = {
        dipendenze: form.dipendenze,
        patologie: form.patologie,
        patologia_psichiatrica: form.patologia_psichiatrica,
        note: form.note,
      };

      if (updateType === "followup") {
        payload.data_ultimo_contatto = form.data_ultimo_contatto;
        payload.dove_dorme = form.dove_dorme;
        payload.ha_residenza = form.ha_residenza;
        payload.ha_un_reddito = form.ha_un_reddito;

        if (hasFollowUpIncome) {
          payload.tipo_di_reddito_3 = form.tipo_di_reddito_3;
          if (needsFollowUpWorkType) payload.tipo_di_lavoro_3 = form.tipo_di_lavoro_3;
        }

        if (isFollowUpDeath) {
          payload.data_decesso_2 = form.data_decesso_2;
          payload.causa_decesso_2 = form.causa_decesso_2;
          payload.causa_decesso = form.causa_decesso_2;
        }
      } else {
        payload.data_uscita = form.data_uscita;
        payload.causa_uscita = form.causa_uscita;
        payload.al_momento_dell_uscita_ha_residenza = form.al_momento_dell_uscita_ha_residenza;
        payload.al_momento_dell_uscita_ha_un_reddito = form.al_momento_dell_uscita_ha_un_reddito;

        if (hasExitIncome) {
          payload.tipo_di_reddito_2 = form.tipo_di_reddito_2;
          if (needsExitWorkType) payload.tipo_di_lavoro_2 = form.tipo_di_lavoro_2;
        }

        if (isExitDeath) {
          payload.data_decesso = form.data_decesso;
          payload.causa_decesso = form.causa_decesso;
        }
      }

      const response = await fetch(`/api/guests/${guestId}/status-events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updateType,
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
        <select
          value={updateType}
          onChange={(event) => setUpdateType(event.target.value as UpdateTypeOption)}
          disabled={isTerminal}
        >
          <option value="followup">Follow-up</option>
          <option value="exit">Uscita</option>
        </select>
      </label>

      {updateType === "followup" ? (
        <>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Data ultimo contatto</span>
            <input
              type="date"
              value={form.data_ultimo_contatto}
              onChange={(event) => setField("data_ultimo_contatto", event.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Dove dorme</span>
            <select value={form.dove_dorme} onChange={(event) => setField("dove_dorme", event.target.value)} required>
              <option value="">Seleziona...</option>
              {DOVE_DORME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {isFollowUpDeath ? (
            <>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Data decesso</span>
                <input
                  type="date"
                  value={form.data_decesso_2}
                  onChange={(event) => setField("data_decesso_2", event.target.value)}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Causa decesso</span>
                <select
                  value={form.causa_decesso_2}
                  onChange={(event) => setField("causa_decesso_2", event.target.value)}
                  required
                >
                  <option value="">Seleziona...</option>
                  {CAUSA_DECESSO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label style={{ display: "grid", gap: 4 }}>
            <span>Ha residenza</span>
            <select value={form.ha_residenza} onChange={(event) => setField("ha_residenza", event.target.value)} required>
              <option value="">Seleziona...</option>
              {RESIDENZA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Ha reddito</span>
            <select value={form.ha_un_reddito} onChange={(event) => setField("ha_un_reddito", event.target.value)} required>
              <option value="">Seleziona...</option>
              {REDDITO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {hasFollowUpIncome ? (
            <>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Tipo di reddito</span>
                <select
                  value={form.tipo_di_reddito_3}
                  onChange={(event) => setField("tipo_di_reddito_3", event.target.value)}
                  required
                >
                  <option value="">Seleziona...</option>
                  {TIPO_REDDITO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {needsFollowUpWorkType ? (
                <label style={{ display: "grid", gap: 4 }}>
                  <span>Tipo di lavoro</span>
                  <select
                    value={form.tipo_di_lavoro_3}
                    onChange={(event) => setField("tipo_di_lavoro_3", event.target.value)}
                    required
                  >
                    <option value="">Seleziona...</option>
                    {TIPO_LAVORO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Data uscita</span>
            <input
              type="date"
              value={form.data_uscita}
              onChange={(event) => setField("data_uscita", event.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Causa uscita</span>
            <select value={form.causa_uscita} onChange={(event) => setField("causa_uscita", event.target.value)} required>
              <option value="">Seleziona...</option>
              {CAUSA_USCITA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {isExitDeath ? (
            <>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Data decesso</span>
                <input
                  type="date"
                  value={form.data_decesso}
                  onChange={(event) => setField("data_decesso", event.target.value)}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Causa decesso</span>
                <select value={form.causa_decesso} onChange={(event) => setField("causa_decesso", event.target.value)} required>
                  <option value="">Seleziona...</option>
                  {CAUSA_DECESSO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label style={{ display: "grid", gap: 4 }}>
            <span>Al momento dell&apos;uscita ha residenza</span>
            <select
              value={form.al_momento_dell_uscita_ha_residenza}
              onChange={(event) => setField("al_momento_dell_uscita_ha_residenza", event.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              {RESIDENZA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span>Al momento dell&apos;uscita ha reddito</span>
            <select
              value={form.al_momento_dell_uscita_ha_un_reddito}
              onChange={(event) => setField("al_momento_dell_uscita_ha_un_reddito", event.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              {REDDITO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {hasExitIncome ? (
            <>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Tipo di reddito</span>
                <select
                  value={form.tipo_di_reddito_2}
                  onChange={(event) => setField("tipo_di_reddito_2", event.target.value)}
                  required
                >
                  <option value="">Seleziona...</option>
                  {TIPO_REDDITO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {needsExitWorkType ? (
                <label style={{ display: "grid", gap: 4 }}>
                  <span>Tipo di lavoro</span>
                  <select
                    value={form.tipo_di_lavoro_2}
                    onChange={(event) => setField("tipo_di_lavoro_2", event.target.value)}
                    required
                  >
                    <option value="">Seleziona...</option>
                    {TIPO_LAVORO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <label style={{ display: "grid", gap: 4 }}>
        <span>Dipendenze</span>
        <select value={form.dipendenze} onChange={(event) => setField("dipendenze", event.target.value)}>
          <option value="">Seleziona...</option>
          {DIPENDENZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Patologie</span>
        <select value={form.patologie} onChange={(event) => setField("patologie", event.target.value)}>
          <option value="">Seleziona...</option>
          {PATOLOGIE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Patologia psichiatrica</span>
        <select
          value={form.patologia_psichiatrica}
          onChange={(event) => setField("patologia_psichiatrica", event.target.value)}
        >
          <option value="">Seleziona...</option>
          {PATOLOGIA_PSICHIATRICA_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Note</span>
        <textarea value={form.note} onChange={(event) => setField("note", event.target.value)} rows={3} />
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
