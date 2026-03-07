import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStatus } from "@/lib/guests/status";
import { type GuestStatus } from "@/lib/guests/schema";
import StatusUpdateClient from "./status-update-client";

export const dynamic = "force-dynamic";

export default async function SubmissionStatusUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,submission_id,nome_della_persona,cognome,struttura,current_status,data_uscita,data_decesso,tipo_aggiornamento,data_ultimo_contatto,dove_dorme,ha_residenza,ha_un_reddito,al_momento_dell_uscita_ha_residenza,al_momento_dell_uscita_ha_un_reddito,dipendenze,dipendenze_alcolismo,dipendenze_sostanze,dipendenze_ludopatia,dipendenze_nessuna,patologie,patologie_malattie_infettive_e_parassitarie,patologie_neoplasie_tumori,patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123,patologie_malattie_endocrine_nutrizionali_e_metaboliche,patologie_disturbi_psichici_e_comportamentali,patologie_malattie_del_sistema_nervoso,patologie_malattie_dell_occhio_e_degli_annessi_oculari,patologie_malattie_dell_orecchio_e_del_processo_mastoideo,patologie_malattie_del_sistema_circolatorio,patologie_malattie_del_sistema_respiratorio,patologie_malattie_dell_apparato_digerente,patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo,patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101,patologie_malattie_dell_apparato_genito_urinario,patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a,patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11,patologie_nessuna,patologie_altro,patologia_psichiatrica"
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
  const currentStatus = getCurrentStatus(data) as GuestStatus;

  return (
    <main>
      <p>
        <Link href={`/dashboard/submissions/${data.id}`}>Back to detail</Link>
      </p>
      <h1>Update status</h1>
      <p className="muted">
        Ospite: {guestName || "n/d"} | Struttura: {data.struttura ?? "n/d"} | Scheda:{" "}
        {data.submission_id ?? data.id}
      </p>
      <StatusUpdateClient
        guestId={data.id}
        currentStatus={currentStatus}
        currentStruttura={data.struttura ?? ""}
        initialValues={{
          data_ultimo_contatto: data.data_ultimo_contatto,
          dove_dorme: data.dove_dorme,
          ha_residenza: data.ha_residenza,
          ha_un_reddito: data.ha_un_reddito,
          al_momento_dell_uscita_ha_residenza: data.al_momento_dell_uscita_ha_residenza,
          al_momento_dell_uscita_ha_un_reddito: data.al_momento_dell_uscita_ha_un_reddito,
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
