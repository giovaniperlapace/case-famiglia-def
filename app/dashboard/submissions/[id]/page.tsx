import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SubmissionDetailRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
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
  data_uscita: string | null;
  causa_uscita: string | null;
  data_decesso: string | null;
  causa_decesso: string | null;
  al_momento_dell_uscita_ha_residenza: string | null;
  al_momento_dell_uscita_ha_un_reddito: string | null;
  tipo_di_reddito_2: string | null;
  tipo_di_reddito_pensione_2: string | null;
  tipo_di_reddito_invalidita_2: string | null;
  tipo_di_reddito_reddito_di_inclusione_2: string | null;
  tipo_di_reddito_reddito_da_lavoro_2: string | null;
  tipo_di_lavoro_2: string | null;
  data_ultimo_contatto: string | null;
  dove_dorme: string | null;
  data_decesso_2: string | null;
  causa_decesso_2: string | null;
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

function formatValue(value: string | null | undefined): string {
  if (!value || !value.trim()) return "n/d";
  if (value === "true") return "Sì";
  if (value === "false") return "No";
  return value;
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
            <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{formatValue(data[field.key])}</p>
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

const INGRESSO_FIELDS: FieldDef[] = [
  { key: "data_ingresso", label: "Data ingresso" },
  {
    key: "e_gia_stato_in_un_accoglienza_della_comunita",
    label: "Già stato in accoglienza Comunità",
  },
  { key: "al_momento_dell_ingresso_ha_un_reddito", label: "Reddito all'ingresso" },
  { key: "tipo_di_reddito", label: "Tipo di reddito" },
  { key: "tipo_di_reddito_pensione", label: "Reddito: Pensione" },
  { key: "tipo_di_reddito_invalidita", label: "Reddito: Invalidità" },
  {
    key: "tipo_di_reddito_reddito_di_inclusione",
    label: "Reddito: Reddito di inclusione",
  },
  { key: "tipo_di_reddito_reddito_da_lavoro", label: "Reddito: Da lavoro" },
  { key: "tipo_di_lavoro", label: "Tipo di lavoro" },
  { key: "al_momento_dell_ingresso_ha_residenza", label: "Residenza all'ingresso" },
  { key: "dove_dormiva", label: "Dove dormiva" },
  { key: "principale_causa_poverta", label: "Principale causa povertà" },
];

const USCITA_FIELDS: FieldDef[] = [
  { key: "data_uscita", label: "Data uscita" },
  { key: "causa_uscita", label: "Causa uscita" },
  { key: "data_decesso", label: "Data decesso" },
  { key: "causa_decesso", label: "Causa decesso" },
  { key: "al_momento_dell_uscita_ha_residenza", label: "Residenza all'uscita" },
  { key: "al_momento_dell_uscita_ha_un_reddito", label: "Reddito all'uscita" },
  { key: "tipo_di_reddito_2", label: "Tipo di reddito (uscita)" },
  { key: "tipo_di_reddito_pensione_2", label: "Reddito uscita: Pensione" },
  { key: "tipo_di_reddito_invalidita_2", label: "Reddito uscita: Invalidità" },
  {
    key: "tipo_di_reddito_reddito_di_inclusione_2",
    label: "Reddito uscita: Reddito di inclusione",
  },
  { key: "tipo_di_reddito_reddito_da_lavoro_2", label: "Reddito uscita: Da lavoro" },
  { key: "tipo_di_lavoro_2", label: "Tipo di lavoro (uscita)" },
  { key: "data_ultimo_contatto", label: "Data ultimo contatto" },
  { key: "dove_dorme", label: "Dove dorme" },
  { key: "data_decesso_2", label: "Data decesso (agg.)" },
  { key: "causa_decesso_2", label: "Causa decesso (agg.)" },
];

const DIPENDENZE_FIELDS: FieldDef[] = [
  { key: "dipendenze", label: "Dipendenze (sintesi)" },
  { key: "dipendenze_alcolismo", label: "Alcolismo" },
  { key: "dipendenze_sostanze", label: "Sostanze" },
  { key: "dipendenze_ludopatia", label: "Ludopatia" },
  { key: "dipendenze_nessuna", label: "Nessuna dipendenza" },
];

const PATOLOGIE_FIELDS: FieldDef[] = [
  { key: "patologie", label: "Patologie (sintesi)" },
  { key: "patologie_malattie_infettive_e_parassitarie", label: "Infettive/parassitarie" },
  { key: "patologie_neoplasie_tumori", label: "Neoplasie (tumori)" },
  {
    key: "patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123",
    label: "Sangue/sistema immunitario",
  },
  {
    key: "patologie_malattie_endocrine_nutrizionali_e_metaboliche",
    label: "Endocrine/nutrizionali/metaboliche",
  },
  { key: "patologie_disturbi_psichici_e_comportamentali", label: "Disturbi psichici/comportamentali" },
  { key: "patologie_malattie_del_sistema_nervoso", label: "Sistema nervoso" },
  { key: "patologie_malattie_dell_occhio_e_degli_annessi_oculari", label: "Occhio e annessi" },
  { key: "patologie_malattie_dell_orecchio_e_del_processo_mastoideo", label: "Orecchio/mastoideo" },
  { key: "patologie_malattie_del_sistema_circolatorio", label: "Sistema circolatorio" },
  { key: "patologie_malattie_del_sistema_respiratorio", label: "Sistema respiratorio" },
  { key: "patologie_malattie_dell_apparato_digerente", label: "Apparato digerente" },
  { key: "patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo", label: "Pelle/sottocutaneo" },
  {
    key: "patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101",
    label: "Muscoloscheletrico/connettivo",
  },
  { key: "patologie_malattie_dell_apparato_genito_urinario", label: "Genito-urinario" },
  {
    key: "patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a",
    label: "Malformazioni/deformità/anomalie cromosomiche",
  },
  {
    key: "patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11",
    label: "Traumi/avvelenamenti/altre conseguenze",
  },
  { key: "patologie_nessuna", label: "Nessuna patologia" },
  { key: "patologie_altro", label: "Altro" },
  { key: "patologia_psichiatrica", label: "Patologia psichiatrica" },
];

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
      "id,submission_id,submitted_at,struttura,nome_della_persona,cognome,data_di_nascita,luogo_di_nascita,sesso_della_persona,nazionalita,contatto_della_persona,data_ingresso,e_gia_stato_in_un_accoglienza_della_comunita,al_momento_dell_ingresso_ha_un_reddito,tipo_di_reddito,tipo_di_reddito_pensione,tipo_di_reddito_invalidita,tipo_di_reddito_reddito_di_inclusione,tipo_di_reddito_reddito_da_lavoro,tipo_di_lavoro,al_momento_dell_ingresso_ha_residenza,dove_dormiva,principale_causa_poverta,data_uscita,causa_uscita,data_decesso,causa_decesso,al_momento_dell_uscita_ha_residenza,al_momento_dell_uscita_ha_un_reddito,tipo_di_reddito_2,tipo_di_reddito_pensione_2,tipo_di_reddito_invalidita_2,tipo_di_reddito_reddito_di_inclusione_2,tipo_di_reddito_reddito_da_lavoro_2,tipo_di_lavoro_2,data_ultimo_contatto,dove_dorme,data_decesso_2,causa_decesso_2,dipendenze,dipendenze_alcolismo,dipendenze_sostanze,dipendenze_ludopatia,dipendenze_nessuna,patologie,patologie_malattie_infettive_e_parassitarie,patologie_neoplasie_tumori,patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,patologie_malattie_endocrine_nutrizionali_e_metaboliche,patologie_disturbi_psichici_e_comportamentali,patologie_malattie_del_sistema_nervoso,patologie_malattie_dell_occhio_e_degli_annessi_oculari,patologie_malattie_dell_orecchio_e_del_processo_mastoideo,patologie_malattie_del_sistema_circolatorio,patologie_malattie_del_sistema_respiratorio,patologie_malattie_dell_apparato_digerente,patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,patologie_malattie_dell_apparato_genito_urinario,patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,patologie_nessuna,patologie_altro,patologia_psichiatrica"
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
  const showUscitaSection = Boolean(row.data_uscita && row.data_uscita.trim());

  return (
    <main>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
      <p>
        <Link href={`/dashboard/submissions/${row.id}/edit`}>Go to edit flow</Link>
      </p>
      <h1>Scheda ospite</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {row.struttura ?? "n/d"} | Scheda:{" "}
        {row.submission_id ?? row.id}
      </p>

      <Section title="Dati personali" data={row} fields={PERSONAL_FIELDS} />
      <Section title="Situazione all'ingresso" data={row} fields={INGRESSO_FIELDS} />

      {showUscitaSection ? (
        <Section title="Dati di uscita e contatti successivi" data={row} fields={USCITA_FIELDS} />
      ) : null}

      <Section title="Dipendenze" data={row} fields={DIPENDENZE_FIELDS} />
      <Section title="Patologie" data={row} fields={PATOLOGIE_FIELDS} />
    </main>
  );
}
