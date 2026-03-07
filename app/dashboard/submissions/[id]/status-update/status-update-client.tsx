"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  RIENTRO_STESSA_STRUTTURA_OPTIONS,
  STRUTTURA_RIENTRO_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  TIPO_REDDITO_OPTIONS,
  normalizePatologiaPsichiatrica,
  type UpdateTypeOption,
} from "@/lib/guests/status-update-options";
import {
  buildStatusUpdatePayload,
  isTrueLike,
  normalizeToIsoDate,
  normalizeYesNo,
  splitCsvValues,
  toggleCsvOption,
  toggleExclusiveCsvOption,
  toCsvValue,
  type StatusUpdateFormValues,
  validateStatusUpdateForm,
} from "@/lib/guests/status-update-form-logic";

type StatusUpdateInitialValues = {
  data_ultimo_contatto: string | null;
  dove_dorme: string | null;
  ha_residenza: string | null;
  ha_un_reddito: string | null;
  al_momento_dell_uscita_ha_residenza: string | null;
  al_momento_dell_uscita_ha_un_reddito: string | null;
  dipendenze: string | null;
  dipendenze_alcolismo: string | null;
  dipendenze_sostanze: string | null;
  dipendenze_ludopatia: string | null;
  dipendenze_nessuna: string | null;
  patologie: string | null;
  patologie_malattie_infettive_e_parassitarie: string | null;
  patologie_neoplasie_tumori: string | null;
  patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123: string | null;
  patologie_malattie_endocrine_nutrizionali_e_metaboliche: string | null;
  patologie_disturbi_psichici_e_comportamentali: string | null;
  patologie_malattie_del_sistema_nervoso: string | null;
  patologie_malattie_dell_occhio_e_degli_annessi_oculari: string | null;
  patologie_malattie_dell_orecchio_e_del_processo_mastoideo: string | null;
  patologie_malattie_del_sistema_circolatorio: string | null;
  patologie_malattie_del_sistema_respiratorio: string | null;
  patologie_malattie_dell_apparato_digerente: string | null;
  patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo: string | null;
  patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101: string | null;
  patologie_malattie_dell_apparato_genito_urinario: string | null;
  patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a: string | null;
  patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11: string | null;
  patologie_nessuna: string | null;
  patologie_altro: string | null;
  patologia_psichiatrica: string | null;
};

type StatusUpdateClientProps = {
  guestId: string;
  currentStatus: GuestStatus;
  currentStruttura: string;
  initialValues: StatusUpdateInitialValues;
};

const UPDATE_TYPE_LABELS: Record<UpdateTypeOption, string> = {
  followup: "Follow-up",
  exit: "Uscita",
  death: "Deceduto",
  reentry: "Rientro",
};

const PATOLOGIE_FLAG_MAPPING = [
  { option: "Malattie infettive e parassitarie", key: "patologie_malattie_infettive_e_parassitarie" },
  { option: "Neoplasie", key: "patologie_neoplasie_tumori" },
  {
    option: "Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario",
    key: "patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123",
  },
  {
    option: "Malattie endocrine, nutrizionali e metaboliche",
    key: "patologie_malattie_endocrine_nutrizionali_e_metaboliche",
  },
  { option: "Disturbi psichici e comportamentali", key: "patologie_disturbi_psichici_e_comportamentali" },
  { option: "Malattie del sistema nervoso", key: "patologie_malattie_del_sistema_nervoso" },
  { option: "Malattie dell'occhio e degli annessi oculari", key: "patologie_malattie_dell_occhio_e_degli_annessi_oculari" },
  { option: "Malattie dell'orecchio e del processo mastoideo", key: "patologie_malattie_dell_orecchio_e_del_processo_mastoideo" },
  { option: "Malattie del sistema circolatorio", key: "patologie_malattie_del_sistema_circolatorio" },
  { option: "Malattie del sistema respiratorio", key: "patologie_malattie_del_sistema_respiratorio" },
  { option: "Malattie dell'apparato digerente", key: "patologie_malattie_dell_apparato_digerente" },
  { option: "Malattie della pelle e del tessuto sottocutaneo", key: "patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo" },
  {
    option: "Malattie del sistema muscoloscheletrico e del tessuto connettivo",
    key: "patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101",
  },
  { option: "Malattie dell'apparato genito-urinario", key: "patologie_malattie_dell_apparato_genito_urinario" },
  {
    option: "Malformazioni congenite, deformità e anomalie cromosomiche",
    key: "patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a",
  },
  {
    option: "Traumi, avvelenamenti e alcune altre conseguenze di cause esterne",
    key: "patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11",
  },
  { option: "Nessuna", key: "patologie_nessuna" },
] as const;

const sectionGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  alignItems: "start",
} as const;

function normalizeExclusiveSelections(options: readonly string[], selected: string[]): string[] {
  const unique = options.filter((option) => selected.includes(option));
  if (unique.includes("Nessuna")) {
    return ["Nessuna"];
  }
  return unique;
}

function initForm(initialValues: StatusUpdateInitialValues): StatusUpdateFormValues {
  const dependencySelections = normalizeExclusiveSelections(DIPENDENZE_OPTIONS, [
    initialValues.dipendenze_alcolismo === "Sì" || initialValues.dipendenze_alcolismo === "Si"
      ? "Alcolismo"
      : "",
    initialValues.dipendenze_sostanze === "Sì" || initialValues.dipendenze_sostanze === "Si"
      ? "Sostanze"
      : "",
    initialValues.dipendenze_ludopatia === "Sì" || initialValues.dipendenze_ludopatia === "Si"
      ? "Ludopatia"
      : "",
    initialValues.dipendenze_nessuna === "Sì" || initialValues.dipendenze_nessuna === "Si"
      ? "Nessuna"
      : "",
    ...splitCsvValues(initialValues.dipendenze),
  ]);

  const pathologySelections = normalizeExclusiveSelections(PATOLOGIE_OPTIONS, [
    ...PATOLOGIE_FLAG_MAPPING.filter(({ key }) => isTrueLike(initialValues[key])).map(({ option }) => option),
    initialValues.patologie_altro && initialValues.patologie_altro !== "false" ? "Altro" : "",
    ...splitCsvValues(initialValues.patologie),
  ]);

  return {
    data_ultimo_contatto: normalizeToIsoDate(initialValues.data_ultimo_contatto),
    dove_dorme: initialValues.dove_dorme ?? "",
    data_decesso_followup: "",
    causa_decesso_followup: "",
    ha_residenza: initialValues.ha_residenza ?? "",
    ha_un_reddito: normalizeYesNo(initialValues.ha_un_reddito),
    tipo_di_reddito_followup: "",
    tipo_di_lavoro_followup: "",
    data_uscita: "",
    causa_uscita: "",
    data_decesso: "",
    causa_decesso: "",
    al_momento_dell_uscita_ha_residenza: initialValues.al_momento_dell_uscita_ha_residenza ?? "",
    al_momento_dell_uscita_ha_un_reddito: normalizeYesNo(initialValues.al_momento_dell_uscita_ha_un_reddito),
    tipo_di_reddito_uscita: "",
    tipo_di_lavoro_uscita: "",
    data_rientro: "",
    rientro_stessa_struttura: "",
    struttura_rientro: "",
    dipendenze: toCsvValue(dependencySelections),
    patologie: toCsvValue(pathologySelections),
    patologia_psichiatrica: normalizePatologiaPsichiatrica(initialValues.patologia_psichiatrica) ?? "",
    note: "",
  };
}

export default function StatusUpdateClient({
  guestId,
  currentStatus,
  currentStruttura,
  initialValues,
}: StatusUpdateClientProps) {
  const router = useRouter();
  const availableUpdateTypes = useMemo<UpdateTypeOption[]>(() => {
    if (currentStatus === "USCITO") return ["followup", "death", "reentry"];
    if (currentStatus === "IN_ACCOGLIENZA") return ["followup", "exit"];
    return [];
  }, [currentStatus]);

  const [updateType, setUpdateType] = useState<UpdateTypeOption>(
    availableUpdateTypes[0] ?? "followup"
  );
  const [form, setForm] = useState<StatusUpdateFormValues>(() => initForm(initialValues));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = currentStatus === "DECEDUTO";
  const canSubmit = useMemo(() => !loading && !isTerminal, [loading, isTerminal]);

  const selectedFollowUpIncome = splitCsvValues(form.tipo_di_reddito_followup);
  const selectedExitIncome = splitCsvValues(form.tipo_di_reddito_uscita);
  const selectedDependencies = splitCsvValues(form.dipendenze);
  const selectedPathologies = splitCsvValues(form.patologie);

  const isFollowUpDeath = updateType === "followup" && form.dove_dorme === DECESSO_DOVE_DORME;
  const isExitDeath = updateType === "exit" && form.causa_uscita === DECESSO_CAUSA_USCITA;
  const hasFollowUpIncome = form.ha_un_reddito === "Sì";
  const hasExitIncome = form.al_momento_dell_uscita_ha_un_reddito === "Sì";
  const needsFollowUpWorkType =
    hasFollowUpIncome && selectedFollowUpIncome.includes("Reddito da lavoro");
  const needsExitWorkType = hasExitIncome && selectedExitIncome.includes("Reddito da lavoro");
  const needsReentryStructure =
    updateType === "reentry" && form.rientro_stessa_struttura === "No";

  useEffect(() => {
    if (availableUpdateTypes.length > 0 && !availableUpdateTypes.includes(updateType)) {
      setUpdateType(availableUpdateTypes[0]);
    }
  }, [availableUpdateTypes, updateType]);

  function setField<K extends keyof StatusUpdateFormValues>(
    key: K,
    value: StatusUpdateFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isTerminal) {
      setError("Lo stato è DECEDUTO. Non è possibile registrare nuovi status update.");
      return;
    }

    const validationError = validateStatusUpdateForm(updateType, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = buildStatusUpdatePayload(updateType, form, currentStruttura);

      const response = await fetch(`/api/guests/${guestId}/status-events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updateType, payload }),
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
    <form
      onSubmit={onSubmit}
      className="card"
      style={{ marginTop: "1rem", display: "grid", gap: 12 }}
    >
      <p className="muted" style={{ margin: 0 }}>
        Stato attuale: {GUEST_STATUS_LABEL[currentStatus]}
      </p>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Tipo aggiornamento</span>
        <select
          value={updateType}
          onChange={(event) => setUpdateType(event.target.value as UpdateTypeOption)}
          disabled={isTerminal || availableUpdateTypes.length === 0}
        >
          {availableUpdateTypes.length === 0 ? (
            <option value="followup">Nessun aggiornamento disponibile</option>
          ) : (
            availableUpdateTypes.map((option) => (
              <option key={option} value={option}>
                {UPDATE_TYPE_LABELS[option]}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Dati aggiornamento</h2>

        {updateType === "followup" ? (
          <div style={sectionGridStyle}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Data ultimo contatto</span>
              <input
                type="date"
                value={form.data_ultimo_contatto}
                onChange={(event) => setField("data_ultimo_contatto", event.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Dove dorme</span>
              <select
                value={form.dove_dorme}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    dove_dorme: value,
                    data_decesso_followup:
                      value === DECESSO_DOVE_DORME ? prev.data_decesso_followup : "",
                    causa_decesso_followup:
                      value === DECESSO_DOVE_DORME ? prev.causa_decesso_followup : "",
                  }));
                }}
              >
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
                    value={form.data_decesso_followup}
                    onChange={(event) => setField("data_decesso_followup", event.target.value)}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>Causa decesso</span>
                  <select
                    value={form.causa_decesso_followup}
                    onChange={(event) => setField("causa_decesso_followup", event.target.value)}
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
              <select
                value={form.ha_residenza}
                onChange={(event) => setField("ha_residenza", event.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={form.ha_residenza || "Seleziona..."}
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
              <span>Ha reddito</span>
              <select
                value={form.ha_un_reddito}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    ha_un_reddito: value,
                    tipo_di_reddito_followup: value === "Sì" ? prev.tipo_di_reddito_followup : "",
                    tipo_di_lavoro_followup: value === "Sì" ? prev.tipo_di_lavoro_followup : "",
                  }));
                }}
              >
                <option value="">Seleziona...</option>
                {REDDITO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gap: 6,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                gridColumn: "1 / -1",
              }}
            >
              <span style={{ fontWeight: 600 }}>Tipo di reddito</span>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                }}
              >
                {TIPO_REDDITO_OPTIONS.map((option) => (
                  <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      disabled={!hasFollowUpIncome}
                      checked={selectedFollowUpIncome.includes(option)}
                      onChange={() =>
                        setField(
                          "tipo_di_reddito_followup",
                          toggleCsvOption(
                            form.tipo_di_reddito_followup,
                            option,
                            TIPO_REDDITO_OPTIONS
                          )
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Tipo di lavoro</span>
              <select
                value={form.tipo_di_lavoro_followup}
                onChange={(event) => setField("tipo_di_lavoro_followup", event.target.value)}
                disabled={!needsFollowUpWorkType}
              >
                <option value="">Seleziona...</option>
                {TIPO_LAVORO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {updateType === "exit" ? (
          <div style={sectionGridStyle}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Data uscita</span>
              <input
                type="date"
                value={form.data_uscita}
                onChange={(event) => setField("data_uscita", event.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Causa uscita</span>
              <select
                value={form.causa_uscita}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    causa_uscita: value,
                    data_decesso: value === DECESSO_CAUSA_USCITA ? prev.data_decesso : "",
                    causa_decesso: value === DECESSO_CAUSA_USCITA ? prev.causa_decesso : "",
                  }));
                }}
              >
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
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span>Causa decesso</span>
                  <select
                    value={form.causa_decesso}
                    onChange={(event) => setField("causa_decesso", event.target.value)}
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
              <span>Al momento dell&apos;uscita ha residenza</span>
              <select
                value={form.al_momento_dell_uscita_ha_residenza}
                onChange={(event) =>
                  setField("al_momento_dell_uscita_ha_residenza", event.target.value)
                }
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={form.al_momento_dell_uscita_ha_residenza || "Seleziona..."}
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
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    al_momento_dell_uscita_ha_un_reddito: value,
                    tipo_di_reddito_uscita: value === "Sì" ? prev.tipo_di_reddito_uscita : "",
                    tipo_di_lavoro_uscita: value === "Sì" ? prev.tipo_di_lavoro_uscita : "",
                  }));
                }}
              >
                <option value="">Seleziona...</option>
                {REDDITO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gap: 6,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                gridColumn: "1 / -1",
              }}
            >
              <span style={{ fontWeight: 600 }}>Tipo di reddito</span>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                }}
              >
                {TIPO_REDDITO_OPTIONS.map((option) => (
                  <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      disabled={!hasExitIncome}
                      checked={selectedExitIncome.includes(option)}
                      onChange={() =>
                        setField(
                          "tipo_di_reddito_uscita",
                          toggleCsvOption(form.tipo_di_reddito_uscita, option, TIPO_REDDITO_OPTIONS)
                        )
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Tipo di lavoro</span>
              <select
                value={form.tipo_di_lavoro_uscita}
                onChange={(event) => setField("tipo_di_lavoro_uscita", event.target.value)}
                disabled={!needsExitWorkType}
              >
                <option value="">Seleziona...</option>
                {TIPO_LAVORO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {updateType === "death" ? (
          <div style={sectionGridStyle}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Data decesso</span>
              <input
                type="date"
                value={form.data_decesso}
                onChange={(event) => setField("data_decesso", event.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Causa decesso</span>
              <select
                value={form.causa_decesso}
                onChange={(event) => setField("causa_decesso", event.target.value)}
              >
                <option value="">Seleziona...</option>
                {CAUSA_DECESSO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {updateType === "reentry" ? (
          <div style={sectionGridStyle}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>Data rientro</span>
              <input
                type="date"
                value={form.data_rientro}
                onChange={(event) => setField("data_rientro", event.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span>Rientrato nella stessa struttura</span>
              <select
                value={form.rientro_stessa_struttura}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    rientro_stessa_struttura: value,
                    struttura_rientro: value === "No" ? prev.struttura_rientro : "",
                  }));
                }}
              >
                <option value="">Seleziona...</option>
                {RIENTRO_STESSA_STRUTTURA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {needsReentryStructure ? (
              <label style={{ display: "grid", gap: 4 }}>
                <span>Struttura di rientro</span>
                <select
                  value={form.struttura_rientro}
                  onChange={(event) => setField("struttura_rientro", event.target.value)}
                >
                  <option value="">Seleziona...</option>
                  {STRUTTURA_RIENTRO_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.rientro_stessa_struttura === "Sì" ? (
              <p className="muted" style={{ margin: 0 }}>
                Struttura di rientro: {currentStruttura || "n/d"}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="card" style={{ background: "rgba(15, 118, 110, 0.04)" }}>
        <h2 style={{ marginTop: 0 }}>Patologie e Dipendenze</h2>
        <div style={sectionGridStyle}>
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

          <div
            style={{
              display: "grid",
              gap: 6,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
            }}
          >
            <span style={{ fontWeight: 600 }}>Dipendenze</span>
            {DIPENDENZE_OPTIONS.map((option) => (
              <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedDependencies.includes(option)}
                  onChange={() =>
                    setField(
                      "dipendenze",
                      toggleExclusiveCsvOption(form.dipendenze, option, DIPENDENZE_OPTIONS)
                    )
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gap: 6,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 10,
              gridColumn: "1 / -1",
            }}
          >
            <span style={{ fontWeight: 600 }}>Patologie</span>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {PATOLOGIE_OPTIONS.map((option) => (
                <label key={option} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={selectedPathologies.includes(option)}
                    onChange={() =>
                      setField(
                        "patologie",
                        toggleExclusiveCsvOption(form.patologie, option, PATOLOGIE_OPTIONS)
                      )
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: "grid", gap: 4, gridColumn: "1 / -1" }}>
            <span>Note</span>
            <textarea value={form.note} onChange={(event) => setField("note", event.target.value)} rows={3} />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={!canSubmit}>
          {loading ? "Salvataggio..." : "Registra aggiornamento"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/submissions/${guestId}`)}
          disabled={loading}
        >
          Annulla
        </button>
      </div>

      {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
