import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditDataClient from "./edit-data-client";

export const dynamic = "force-dynamic";

export default async function SubmissionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,nome_della_persona,cognome,data_di_nascita,luogo_di_nascita,sesso_della_persona,nazionalita,contatto_della_persona,data_ingresso,e_gia_stato_in_un_accoglienza_della_comunita,al_momento_dell_ingresso_ha_un_reddito,tipo_di_reddito,tipo_di_reddito_pensione,tipo_di_reddito_invalidita,tipo_di_reddito_reddito_di_inclusione,tipo_di_reddito_reddito_da_lavoro,tipo_di_lavoro,al_momento_dell_ingresso_ha_residenza,dove_dormiva,principale_causa_poverta,dipendenze,dipendenze_alcolismo,dipendenze_sostanze,dipendenze_ludopatia,dipendenze_nessuna,patologie,patologie_malattie_infettive_e_parassitarie,patologie_neoplasie_tumori,patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,patologie_malattie_endocrine_nutrizionali_e_metaboliche,patologie_disturbi_psichici_e_comportamentali,patologie_malattie_del_sistema_nervoso,patologie_malattie_dell_occhio_e_degli_annessi_oculari,patologie_malattie_dell_orecchio_e_del_processo_mastoideo,patologie_malattie_del_sistema_circolatorio,patologie_malattie_del_sistema_respiratorio,patologie_malattie_dell_apparato_digerente,patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,patologie_malattie_dell_apparato_genito_urinario,patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,patologie_nessuna,patologie_altro,patologia_psichiatrica,struttura,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const guestName = `${data.nome_della_persona ?? ""} ${data.cognome ?? ""}`.trim();

  return (
    <main>
      <p>
        <Link href={`/dashboard/submissions/${data.id}`}>Back to detail</Link>
      </p>
      <h1>Edit data</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {data.struttura ?? "n/d"} | Ultima modifica:{" "}
        {data.updated_at ?? "n/d"}
      </p>
      <EditDataClient
        guestId={data.id}
        initialValues={{
          nome_della_persona: data.nome_della_persona,
          cognome: data.cognome,
          data_di_nascita: data.data_di_nascita,
          luogo_di_nascita: data.luogo_di_nascita,
          sesso_della_persona: data.sesso_della_persona,
          nazionalita: data.nazionalita,
          contatto_della_persona: data.contatto_della_persona,
          data_ingresso: data.data_ingresso,
          e_gia_stato_in_un_accoglienza_della_comunita:
            data.e_gia_stato_in_un_accoglienza_della_comunita,
          al_momento_dell_ingresso_ha_un_reddito: data.al_momento_dell_ingresso_ha_un_reddito,
          tipo_di_reddito: data.tipo_di_reddito,
          tipo_di_reddito_pensione: data.tipo_di_reddito_pensione,
          tipo_di_reddito_invalidita: data.tipo_di_reddito_invalidita,
          tipo_di_reddito_reddito_di_inclusione: data.tipo_di_reddito_reddito_di_inclusione,
          tipo_di_reddito_reddito_da_lavoro: data.tipo_di_reddito_reddito_da_lavoro,
          tipo_di_lavoro: data.tipo_di_lavoro,
          al_momento_dell_ingresso_ha_residenza: data.al_momento_dell_ingresso_ha_residenza,
          dove_dormiva: data.dove_dormiva,
          principale_causa_poverta: data.principale_causa_poverta,
          dipendenze: data.dipendenze,
          dipendenze_alcolismo: data.dipendenze_alcolismo,
          dipendenze_sostanze: data.dipendenze_sostanze,
          dipendenze_ludopatia: data.dipendenze_ludopatia,
          dipendenze_nessuna: data.dipendenze_nessuna,
          patologie: data.patologie,
          patologie_malattie_infettive_e_parassitarie:
            data.patologie_malattie_infettive_e_parassitarie,
          patologie_neoplasie_tumori: data.patologie_neoplasie_tumori,
          patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123:
            data.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,
          patologie_malattie_endocrine_nutrizionali_e_metaboliche:
            data.patologie_malattie_endocrine_nutrizionali_e_metaboliche,
          patologie_disturbi_psichici_e_comportamentali:
            data.patologie_disturbi_psichici_e_comportamentali,
          patologie_malattie_del_sistema_nervoso: data.patologie_malattie_del_sistema_nervoso,
          patologie_malattie_dell_occhio_e_degli_annessi_oculari:
            data.patologie_malattie_dell_occhio_e_degli_annessi_oculari,
          patologie_malattie_dell_orecchio_e_del_processo_mastoideo:
            data.patologie_malattie_dell_orecchio_e_del_processo_mastoideo,
          patologie_malattie_del_sistema_circolatorio:
            data.patologie_malattie_del_sistema_circolatorio,
          patologie_malattie_del_sistema_respiratorio:
            data.patologie_malattie_del_sistema_respiratorio,
          patologie_malattie_dell_apparato_digerente:
            data.patologie_malattie_dell_apparato_digerente,
          patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo:
            data.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,
          patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101:
            data.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,
          patologie_malattie_dell_apparato_genito_urinario:
            data.patologie_malattie_dell_apparato_genito_urinario,
          patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a:
            data.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,
          patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11:
            data.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,
          patologie_nessuna: data.patologie_nessuna,
          patologie_altro: data.patologie_altro,
          patologia_psichiatrica: data.patologia_psichiatrica,
        }}
      />
    </main>
  );
}
