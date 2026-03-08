import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGuestTimeline, type GuestTimelineEvent } from "@/lib/guests/server";
import { GUEST_STATUS_LABEL } from "@/lib/guests/schema";
import { getCurrentStatus } from "@/lib/guests/status";
import DeleteGuestButton from "./delete-guest-button";

export const dynamic = "force-dynamic";

type SubmissionDetailRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
  current_status: string | null;
  current_status_at: string | null;
  struttura: string | null;
  nome_della_persona: string | null;
  cognome: string | null;
  data_di_nascita: string | null;
  luogo_di_nascita: string | null;
  sesso_della_persona: string | null;
  nazionalita: string | null;
  contatto_della_persona: string | null;
  data_ingresso: string | null;
  e_gia_stato_in_un_accoglienza_della_comunita: string | null;
  al_momento_dell_ingresso_ha_un_reddito: string | null;
  tipo_di_reddito: string | null;
  tipo_di_reddito_pensione: string | null;
  tipo_di_reddito_invalidita: string | null;
  tipo_di_reddito_reddito_di_inclusione: string | null;
  tipo_di_reddito_reddito_da_lavoro: string | null;
  tipo_di_lavoro: string | null;
  al_momento_dell_ingresso_ha_residenza: string | null;
  dove_dormiva: string | null;
  principale_causa_poverta: string | null;
  al_momento_dell_ingresso_ha_i_seguenti_documenti: string | null;
  data_uscita: string | null;
  causa_uscita: string | null;
  data_decesso: string | null;
  causa_decesso: string | null;
  al_momento_dell_uscita_ha_i_seguenti_documenti: string | null;
  al_momento_dell_uscita_ha_residenza: string | null;
  al_momento_dell_uscita_ha_un_reddito: string | null;
  siamo_ancora_in_contatto: string | null;
  chi_e_in_contatto: string | null;
  ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: string | null;
  ha_gia_fatto_domanda_di_casa_popolare: string | null;
  data_domanda_casa_popolare: string | null;
  data_ultimo_contatto: string | null;
  dove_dorme: string | null;
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

type FieldDef = {
  key: keyof SubmissionDetailRow;
  label: string;
};

const TRUE_VALUES = new Set(["true", "sì", "si", "yes", "1"]);

function formatValue(value: string | null | undefined): string {
  if (!value || !value.trim()) return "n/d";
  const trimmed = value.trim();
  if (trimmed === "true") return "Sì";
  if (trimmed === "false") return "No";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

function isTruthy(value: string | null | undefined): boolean {
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLatestPayloadValue(
  events: GuestTimelineEvent[],
  keys: readonly string[]
): string | null {
  for (const event of events) {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    for (const key of keys) {
      const raw = payload[key];
      if (typeof raw === "string" && raw.trim()) {
        return raw.trim();
      }
    }
  }
  return null;
}

function SummaryCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const showItems = items.length > 0 ? items : ["n/d"];
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {showItems.map((item, index) => (
          <span
            key={`${title}-${index}-${item}`}
            style={{
              padding: "0.2rem 0.55rem",
              borderRadius: 999,
              background: "rgba(15, 118, 110, 0.08)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  data,
  fields,
}: {
  title: string;
  data: SubmissionDetailRow;
  fields: FieldDef[];
}) {
  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>{title}</h2>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {fields.map((field) => (
          <div key={String(field.key)} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {field.label}
            </p>
            <p style={{ margin: "4px 0 0", fontWeight: 600, wordBreak: "break-word" }}>
              {formatValue(data[field.key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const PERSONAL_FIELDS: FieldDef[] = [
  { key: "nome_della_persona", label: "Nome" },
  { key: "cognome", label: "Cognome" },
  { key: "data_di_nascita", label: "Data di nascita" },
  { key: "luogo_di_nascita", label: "Luogo di nascita" },
  { key: "sesso_della_persona", label: "Sesso" },
  { key: "nazionalita", label: "Nazionalità" },
  { key: "contatto_della_persona", label: "Contatto persona" },
];

const USCITA_FIELDS: FieldDef[] = [
  { key: "data_uscita", label: "Data uscita" },
  { key: "causa_uscita", label: "Causa uscita" },
  { key: "siamo_ancora_in_contatto", label: "Siamo ancora in contatto" },
  { key: "chi_e_in_contatto", label: "Chi è in contatto" },
  { key: "al_momento_dell_uscita_ha_residenza", label: "Residenza all'uscita" },
  { key: "al_momento_dell_uscita_ha_un_reddito", label: "Reddito all'uscita" },
  {
    key: "ha_i_requisiti_per_fare_la_domanda_di_casa_popolare",
    label: "Requisiti per domanda casa popolare",
  },
  { key: "ha_gia_fatto_domanda_di_casa_popolare", label: "Ha già fatto domanda casa popolare" },
  { key: "data_domanda_casa_popolare", label: "In data" },
  { key: "data_decesso", label: "Data decesso" },
  { key: "causa_decesso", label: "Causa decesso" },
  { key: "data_ultimo_contatto", label: "Data ultimo contatto" },
  { key: "dove_dorme", label: "Dove dorme" },
];

const STATUS_HIGHLIGHT_STYLE: Record<string, { color: string; background: string }> = {
  IN_ACCOGLIENZA: { color: "#166534", background: "#dcfce7" },
  USCITO: { color: "#b91c1c", background: "#fee2e2" },
  DECEDUTO: { color: "#111827", background: "#e5e7eb" },
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,submitted_at,current_status,current_status_at,struttura,nome_della_persona,cognome,data_di_nascita,luogo_di_nascita,sesso_della_persona,nazionalita,contatto_della_persona,data_ingresso,e_gia_stato_in_un_accoglienza_della_comunita,al_momento_dell_ingresso_ha_un_reddito,tipo_di_reddito,tipo_di_reddito_pensione,tipo_di_reddito_invalidita,tipo_di_reddito_reddito_di_inclusione,tipo_di_reddito_reddito_da_lavoro,tipo_di_lavoro,al_momento_dell_ingresso_ha_residenza,dove_dormiva,principale_causa_poverta,al_momento_dell_ingresso_ha_i_seguenti_documenti,data_uscita,causa_uscita,data_decesso,causa_decesso,al_momento_dell_uscita_ha_i_seguenti_documenti,al_momento_dell_uscita_ha_residenza,al_momento_dell_uscita_ha_un_reddito,siamo_ancora_in_contatto,chi_e_in_contatto,ha_i_requisiti_per_fare_la_domanda_di_casa_popolare,ha_gia_fatto_domanda_di_casa_popolare,data_domanda_casa_popolare,data_ultimo_contatto,dove_dorme,dipendenze,dipendenze_alcolismo,dipendenze_sostanze,dipendenze_ludopatia,dipendenze_nessuna,patologie,patologie_malattie_infettive_e_parassitarie,patologie_neoplasie_tumori,patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,patologie_malattie_endocrine_nutrizionali_e_metaboliche,patologie_disturbi_psichici_e_comportamentali,patologie_malattie_del_sistema_nervoso,patologie_malattie_dell_occhio_e_degli_annessi_oculari,patologie_malattie_dell_orecchio_e_del_processo_mastoideo,patologie_malattie_del_sistema_circolatorio,patologie_malattie_del_sistema_respiratorio,patologie_malattie_dell_apparato_digerente,patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,patologie_malattie_dell_apparato_genito_urinario,patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,patologie_nessuna,patologie_altro,patologia_psichiatrica"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const row = data as SubmissionDetailRow;
  const guestName = `${row.nome_della_persona ?? ""} ${row.cognome ?? ""}`.trim();
  const currentStatus = getCurrentStatus(row);
  const timeline = await getGuestTimeline(supabase, row.id);
  const showUscitaSection = Boolean(row.data_uscita && row.data_uscita.trim());
  const ingressoIncomeTypes = [
    isTruthy(row.tipo_di_reddito_pensione) ? "Pensione" : null,
    isTruthy(row.tipo_di_reddito_invalidita) ? "Invalidità" : null,
    isTruthy(row.tipo_di_reddito_reddito_di_inclusione) ? "Reddito di inclusione" : null,
    isTruthy(row.tipo_di_reddito_reddito_da_lavoro) ? "Reddito da lavoro" : null,
    ...splitCsv(row.tipo_di_reddito),
  ]
    .filter(Boolean) as string[];
  const ingressoIncomeTypesUnique = Array.from(new Set(ingressoIncomeTypes));
  const documentiIngresso = Array.from(
    new Set(splitCsv(row.al_momento_dell_ingresso_ha_i_seguenti_documenti))
  );
  const uscitaIncomeTypeRaw = getLatestPayloadValue(timeline, [
    "tipo_di_reddito_uscita",
    "tipo_di_reddito_2",
  ]);
  const uscitaIncomeTypesUnique = Array.from(new Set(splitCsv(uscitaIncomeTypeRaw)));
  const documentiUscita = Array.from(
    new Set(splitCsv(row.al_momento_dell_uscita_ha_i_seguenti_documenti))
  );
  const uscitaWorkType = getLatestPayloadValue(timeline, ["tipo_di_lavoro_uscita", "tipo_di_lavoro_2"]);
  const decessoUpdateDate = getLatestPayloadValue(timeline, [
    "data_decesso_followup",
    "data_decesso_2",
  ]);
  const decessoUpdateCause = getLatestPayloadValue(timeline, [
    "causa_decesso_followup",
    "causa_decesso_2",
  ]);

  const dipendenzeSelected = [
    isTruthy(row.dipendenze_alcolismo) ? "Alcolismo" : null,
    isTruthy(row.dipendenze_sostanze) ? "Sostanze" : null,
    isTruthy(row.dipendenze_ludopatia) ? "Ludopatia" : null,
    isTruthy(row.dipendenze_nessuna) ? "Nessuna" : null,
    ...splitCsv(row.dipendenze),
  ]
    .filter(Boolean) as string[];
  const dipendenzeUnique = Array.from(new Set(dipendenzeSelected));

  const patologieSelected = [
    isTruthy(row.patologie_malattie_infettive_e_parassitarie) ? "Malattie infettive e parassitarie" : null,
    isTruthy(row.patologie_neoplasie_tumori) ? "Neoplasie" : null,
    isTruthy(row.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123)
      ? "Malattie del sangue e sistema immunitario"
      : null,
    isTruthy(row.patologie_malattie_endocrine_nutrizionali_e_metaboliche)
      ? "Malattie endocrine, nutrizionali e metaboliche"
      : null,
    isTruthy(row.patologie_disturbi_psichici_e_comportamentali) ? "Disturbi psichici e comportamentali" : null,
    isTruthy(row.patologie_malattie_del_sistema_nervoso) ? "Malattie del sistema nervoso" : null,
    isTruthy(row.patologie_malattie_dell_occhio_e_degli_annessi_oculari) ? "Malattie dell'occhio e annessi" : null,
    isTruthy(row.patologie_malattie_dell_orecchio_e_del_processo_mastoideo) ? "Malattie dell'orecchio e mastoideo" : null,
    isTruthy(row.patologie_malattie_del_sistema_circolatorio) ? "Malattie del sistema circolatorio" : null,
    isTruthy(row.patologie_malattie_del_sistema_respiratorio) ? "Malattie del sistema respiratorio" : null,
    isTruthy(row.patologie_malattie_dell_apparato_digerente) ? "Malattie dell'apparato digerente" : null,
    isTruthy(row.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo) ? "Malattie della pelle e tessuto sottocutaneo" : null,
    isTruthy(row.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101)
      ? "Malattie del sistema muscoloscheletrico e connettivo"
      : null,
    isTruthy(row.patologie_malattie_dell_apparato_genito_urinario) ? "Malattie dell'apparato genito-urinario" : null,
    isTruthy(row.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a)
      ? "Malformazioni congenite/anomalie cromosomiche"
      : null,
    isTruthy(row.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11)
      ? "Traumi/avvelenamenti/altre conseguenze"
      : null,
    isTruthy(row.patologie_nessuna) ? "Nessuna" : null,
    isTruthy(row.patologie_altro) || (row.patologie_altro?.trim() && row.patologie_altro !== "false")
      ? "Altro"
      : null,
    ...splitCsv(row.patologie),
  ]
    .filter(Boolean) as string[];
  const patologieUnique = Array.from(new Set(patologieSelected));

  return (
    <main>
      <p>
        <Link href="/dashboard" aria-label="Torna alla dashboard" title="Torna alla dashboard">
          ← Dashboard
        </Link>
      </p>
      <h1>Scheda ospite</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {row.struttura ?? "n/d"} | Scheda:{" "}
        {row.submission_id ?? row.id}
      </p>
      <div
        style={{
          marginTop: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.45rem 0.8rem",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: "0.95rem",
              letterSpacing: 0.2,
              ...(STATUS_HIGHLIGHT_STYLE[currentStatus] ?? STATUS_HIGHLIGHT_STYLE.IN_ACCOGLIENZA),
            }}
            aria-label={`Stato ospite: ${GUEST_STATUS_LABEL[currentStatus]}`}
            title={`Stato ospite: ${GUEST_STATUS_LABEL[currentStatus]}`}
          >
            {GUEST_STATUS_LABEL[currentStatus]}
          </span>
          <Link href={`/dashboard/submissions/${row.id}/edit`}>
            <button type="button">Modifica i dati</button>
          </Link>
          {currentStatus === "DECEDUTO" ? (
            <button type="button" disabled title="Guest deceduto: status update non disponibile.">
              Aggiorna lo stato
            </button>
          ) : (
            <Link href={`/dashboard/submissions/${row.id}/status-update`}>
              <button type="button">Aggiorna lo stato</button>
            </Link>
          )}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <DeleteGuestButton guestId={row.id} />
        </div>
      </div>

      <Section title="Dati personali" data={row} fields={PERSONAL_FIELDS} />
      <Section
        title="Situazione all'ingresso"
        data={row}
        fields={[
          { key: "data_ingresso", label: "Data ingresso" },
          {
            key: "e_gia_stato_in_un_accoglienza_della_comunita",
            label: "Già stato in accoglienza Comunità",
          },
          { key: "al_momento_dell_ingresso_ha_un_reddito", label: "Reddito all'ingresso" },
          { key: "tipo_di_lavoro", label: "Tipo di lavoro" },
          { key: "al_momento_dell_ingresso_ha_residenza", label: "Residenza all'ingresso" },
          { key: "dove_dormiva", label: "Dove dormiva" },
          { key: "principale_causa_poverta", label: "Principale causa povertà" },
        ]}
      />
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Reddito all&apos;ingresso</h2>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <SummaryCard title="Tipi selezionati" items={ingressoIncomeTypesUnique} />
          <SummaryCard title="Documenti all'ingresso" items={documentiIngresso} />
        </div>
      </div>

      {showUscitaSection ? (
        <>
          <Section title="Dati di uscita e contatti successivi" data={row} fields={USCITA_FIELDS} />
          <div className="card" style={{ marginTop: "1rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Reddito all&apos;uscita</h2>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <SummaryCard title="Tipi selezionati" items={uscitaIncomeTypesUnique} />
              <SummaryCard title="Documenti all'uscita" items={documentiUscita} />
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Tipo di lavoro (uscita)
                </p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{formatValue(uscitaWorkType)}</p>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Data decesso (agg.)
                </p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{formatValue(decessoUpdateDate)}</p>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  Causa decesso (agg.)
                </p>
                <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{formatValue(decessoUpdateCause)}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Patologie e Dipendenze</h2>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <SummaryCard title="Dipendenze" items={dipendenzeUnique} />
          <SummaryCard title="Patologie" items={patologieUnique} />
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Patologia psichiatrica</p>
            <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{formatValue(row.patologia_psichiatrica)}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>History / Timeline</h2>
        {timeline.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun evento registrato.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {timeline.map((event) => {
              const transition =
                event.to_status && event.from_status !== event.to_status
                  ? `${event.from_status ?? "n/d"} -> ${event.to_status}`
                  : event.from_status ?? event.to_status ?? "n/d";
              const payload = event.payload ?? {};
              const summary =
                (payload.causa_uscita as string | undefined) ||
                (payload.causa_decesso as string | undefined) ||
                (payload.note as string | undefined) ||
                "Nessun dettaglio sintetico";

              return (
                <div key={event.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {event.event_type} | {transition}
                  </p>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    Data evento: {event.effective_date ?? "n/d"} | Creato: {event.created_at}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>{summary}</p>
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ cursor: "pointer" }}>View details</summary>
                    <pre style={{ margin: "8px 0 0", overflowX: "auto" }}>
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
