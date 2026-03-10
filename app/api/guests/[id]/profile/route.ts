import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { NATIONALITY_SET } from "@/lib/guests/nationalities";
import {
  DOCUMENTI_OPTIONS,
  DIPENDENZE_OPTIONS,
  DOVE_DORME_OPTIONS,
  PATOLOGIA_PSICHIATRICA_OPTIONS,
  PATOLOGIE_OPTIONS,
  REDDITO_OPTIONS,
  RESIDENZA_OPTIONS,
  TIPO_LAVORO_OPTIONS,
  TIPO_REDDITO_OPTIONS,
  normalizePatologiaPsichiatrica,
} from "@/lib/guests/status-update-options";

type ProfilePatchBody = Record<string, string | null | undefined>;

const ALLOWED_FIELDS = new Set([
  "nome_della_persona",
  "cognome",
  "data_di_nascita",
  "luogo_di_nascita",
  "sesso_della_persona",
  "nazionalita",
  "contatto_della_persona",
  "data_ingresso",
  "e_gia_stato_in_un_accoglienza_della_comunita",
  "al_momento_dell_ingresso_ha_un_reddito",
  "tipo_di_reddito",
  "tipo_di_reddito_pensione",
  "tipo_di_reddito_invalidita",
  "tipo_di_reddito_reddito_di_inclusione",
  "tipo_di_reddito_reddito_da_lavoro",
  "tipo_di_lavoro",
  "al_momento_dell_ingresso_ha_residenza",
  "dove_dormiva",
  "principale_causa_poverta",
  "al_momento_dell_ingresso_ha_i_seguenti_documenti",
  "al_momento_dell_uscita_ha_i_seguenti_documenti",
  "siamo_ancora_in_contatto",
  "chi_e_in_contatto",
  "ha_i_requisiti_per_fare_la_domanda_di_casa_popolare",
  "ha_gia_fatto_domanda_di_casa_popolare",
  "data_domanda_casa_popolare",
  "dipendenze",
  "dipendenze_alcolismo",
  "dipendenze_sostanze",
  "dipendenze_ludopatia",
  "dipendenze_nessuna",
  "patologie",
  "patologie_malattie_infettive_e_parassitarie",
  "patologie_neoplasie_tumori",
  "patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123",
  "patologie_malattie_endocrine_nutrizionali_e_metaboliche",
  "patologie_disturbi_psichici_e_comportamentali",
  "patologie_malattie_del_sistema_nervoso",
  "patologie_malattie_dell_occhio_e_degli_annessi_oculari",
  "patologie_malattie_dell_orecchio_e_del_processo_mastoideo",
  "patologie_malattie_del_sistema_circolatorio",
  "patologie_malattie_del_sistema_respiratorio",
  "patologie_malattie_dell_apparato_digerente",
  "patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo",
  "patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101",
  "patologie_malattie_dell_apparato_genito_urinario",
  "patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a",
  "patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11",
  "patologie_nessuna",
  "patologie_altro",
  "patologia_psichiatrica",
]);

const SEX_OPTIONS = new Set(["Uomo", "Donna", "Altro"]);
const YES_NO_OPTIONS = new Set(["Sì", "No"]);
const POVERTA_OPTIONS = new Set([
  "Economica",
  "Sociale",
  "Psicosi",
  "Alcolismo",
  "Dipendenza",
  "Ludopatia",
  "Salute",
  "Altro",
]);

function isValidItalianDate(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [dayRaw, monthRaw, yearRaw] = value.split("/");
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

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, "");
}

function isAllowed(options: readonly string[], value: string): boolean {
  return options.includes(value);
}

function splitCsvValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function yesFlag(value: string | null | undefined): boolean {
  return value === "Sì";
}

function trueFlag(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "sì" || normalized === "si";
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, role, appUserId } = await getServerAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ProfilePatchBody;
  try {
    body = (await req.json()) as ProfilePatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    patch[key] = typeof value === "string" ? value.trim() : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  if (patch.data_di_nascita && !isValidItalianDate(patch.data_di_nascita)) {
    return NextResponse.json(
      { error: "Data di nascita non valida. Usa il formato gg/mm/aaaa." },
      { status: 400 }
    );
  }

  if (patch.data_ingresso && !isValidItalianDate(patch.data_ingresso)) {
    return NextResponse.json(
      { error: "Data ingresso non valida. Usa il formato gg/mm/aaaa." },
      { status: 400 }
    );
  }

  if (patch.data_domanda_casa_popolare && !isValidItalianDate(patch.data_domanda_casa_popolare)) {
    return NextResponse.json(
      { error: "In data non valida. Usa il formato gg/mm/aaaa." },
      { status: 400 }
    );
  }

  if (patch.nazionalita && !NATIONALITY_SET.has(patch.nazionalita)) {
    return NextResponse.json(
      { error: "Nazionalità non valida. Seleziona un valore dall'elenco previsto." },
      { status: 400 }
    );
  }

  if (patch.sesso_della_persona && !SEX_OPTIONS.has(patch.sesso_della_persona)) {
    return NextResponse.json(
      { error: "Sesso non valido. Valori ammessi: Uomo, Donna, Altro." },
      { status: 400 }
    );
  }

  if (patch.contatto_della_persona) {
    const normalizedPhone = normalizePhone(patch.contatto_della_persona);
    if (!/^\+\d{6,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Contatto non valido. Usa il formato internazionale, es. +3932678766." },
        { status: 400 }
      );
    }
    patch.contatto_della_persona = normalizedPhone;
  }

  if (
    patch.e_gia_stato_in_un_accoglienza_della_comunita &&
    !YES_NO_OPTIONS.has(patch.e_gia_stato_in_un_accoglienza_della_comunita)
  ) {
    return NextResponse.json(
      { error: "Valore non valido per 'Già stato in accoglienza Comunità'. Usa Sì/No." },
      { status: 400 }
    );
  }

  if (
    patch.al_momento_dell_ingresso_ha_un_reddito &&
    !isAllowed(REDDITO_OPTIONS, patch.al_momento_dell_ingresso_ha_un_reddito)
  ) {
    return NextResponse.json(
      { error: "Valore non valido per 'Reddito all'ingresso'. Usa Sì/No." },
      { status: 400 }
    );
  }

  if (patch.tipo_di_reddito) {
    const splitValues = patch.tipo_di_reddito
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (splitValues.length > 0 && splitValues.some((value) => !isAllowed(TIPO_REDDITO_OPTIONS, value))) {
      return NextResponse.json({ error: "Tipo di reddito non valido." }, { status: 400 });
    }
  }

  if (patch.tipo_di_lavoro && !isAllowed(TIPO_LAVORO_OPTIONS, patch.tipo_di_lavoro)) {
    return NextResponse.json({ error: "Tipo di lavoro non valido." }, { status: 400 });
  }

  if (
    patch.al_momento_dell_ingresso_ha_residenza &&
    !isAllowed(RESIDENZA_OPTIONS, patch.al_momento_dell_ingresso_ha_residenza)
  ) {
    return NextResponse.json({ error: "Residenza all'ingresso non valida." }, { status: 400 });
  }

  if (patch.dove_dormiva && !isAllowed(DOVE_DORME_OPTIONS, patch.dove_dormiva)) {
    return NextResponse.json({ error: "Dove dormiva non valido." }, { status: 400 });
  }

  if (patch.principale_causa_poverta) {
    const causes = splitCsvValues(patch.principale_causa_poverta);
    if (causes.length > 2 || causes.some((cause) => !POVERTA_OPTIONS.has(cause))) {
      return NextResponse.json(
        { error: "Principale causa povertà non valida. Seleziona massimo 2 opzioni previste." },
        { status: 400 }
      );
    }
  }

  for (const field of [
    "al_momento_dell_ingresso_ha_i_seguenti_documenti",
    "al_momento_dell_uscita_ha_i_seguenti_documenti",
  ] as const) {
    const value = patch[field];
    if (!value) continue;
    const tokens = splitCsvValues(value);
    if (tokens.some((token) => !isAllowed(DOCUMENTI_OPTIONS, token))) {
      return NextResponse.json({ error: "Documenti non validi." }, { status: 400 });
    }
    patch[field] = tokens.join(", ");
  }

  if (patch.patologia_psichiatrica) {
    const normalizedPsych = normalizePatologiaPsichiatrica(patch.patologia_psichiatrica);
    if (!normalizedPsych || !isAllowed(PATOLOGIA_PSICHIATRICA_OPTIONS, normalizedPsych)) {
      return NextResponse.json({ error: "Patologia psichiatrica non valida." }, { status: 400 });
    }
    patch.patologia_psichiatrica = normalizedPsych;
  }

  const yesNoFields = [
    "tipo_di_reddito_pensione",
    "tipo_di_reddito_invalidita",
    "tipo_di_reddito_reddito_di_inclusione",
    "tipo_di_reddito_reddito_da_lavoro",
    "dipendenze_alcolismo",
    "dipendenze_sostanze",
    "dipendenze_ludopatia",
    "dipendenze_nessuna",
    "siamo_ancora_in_contatto",
    "ha_i_requisiti_per_fare_la_domanda_di_casa_popolare",
    "ha_gia_fatto_domanda_di_casa_popolare",
  ] as const;

  for (const field of yesNoFields) {
    const value = patch[field];
    if (value && !YES_NO_OPTIONS.has(value)) {
      return NextResponse.json(
        { error: `Valore non valido per ${field}. Usa Sì/No.` },
        { status: 400 }
      );
    }
  }

  const pathologyTokens = patch.patologie ? splitCsvValues(patch.patologie) : [];
  if (pathologyTokens.some((token) => !isAllowed(PATOLOGIE_OPTIONS, token))) {
    return NextResponse.json({ error: "Patologie non valide." }, { status: 400 });
  }

  let patInfettive = trueFlag(patch.patologie_malattie_infettive_e_parassitarie);
  let patNeoplasie = trueFlag(patch.patologie_neoplasie_tumori);
  let patSangue = trueFlag(patch.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123);
  let patEndocrine = trueFlag(patch.patologie_malattie_endocrine_nutrizionali_e_metaboliche);
  let patDisturbi = trueFlag(patch.patologie_disturbi_psichici_e_comportamentali);
  let patNervoso = trueFlag(patch.patologie_malattie_del_sistema_nervoso);
  let patOcchio = trueFlag(patch.patologie_malattie_dell_occhio_e_degli_annessi_oculari);
  let patOrecchio = trueFlag(patch.patologie_malattie_dell_orecchio_e_del_processo_mastoideo);
  let patCircolatorio = trueFlag(patch.patologie_malattie_del_sistema_circolatorio);
  let patRespiratorio = trueFlag(patch.patologie_malattie_del_sistema_respiratorio);
  let patDigerente = trueFlag(patch.patologie_malattie_dell_apparato_digerente);
  let patPelle = trueFlag(patch.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo);
  let patMuscolo = trueFlag(patch.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101);
  let patGenito = trueFlag(patch.patologie_malattie_dell_apparato_genito_urinario);
  let patMalformazioni = trueFlag(patch.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a);
  let patTraumi = trueFlag(patch.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11);
  let patNessuna = trueFlag(patch.patologie_nessuna);
  let patAltro = trueFlag(patch.patologie_altro);

  if (!patInfettive && pathologyTokens.includes("Malattie infettive e parassitarie")) patInfettive = true;
  if (!patNeoplasie && pathologyTokens.includes("Neoplasie")) patNeoplasie = true;
  if (!patSangue && pathologyTokens.includes("Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario")) patSangue = true;
  if (!patEndocrine && pathologyTokens.includes("Malattie endocrine, nutrizionali e metaboliche")) patEndocrine = true;
  if (!patDisturbi && pathologyTokens.includes("Disturbi psichici e comportamentali")) patDisturbi = true;
  if (!patNervoso && pathologyTokens.includes("Malattie del sistema nervoso")) patNervoso = true;
  if (!patOcchio && pathologyTokens.includes("Malattie dell'occhio e degli annessi oculari")) patOcchio = true;
  if (!patOrecchio && pathologyTokens.includes("Malattie dell'orecchio e del processo mastoideo")) patOrecchio = true;
  if (!patCircolatorio && pathologyTokens.includes("Malattie del sistema cardio-circolatorio")) patCircolatorio = true;
  if (!patRespiratorio && pathologyTokens.includes("Malattie del sistema respiratorio")) patRespiratorio = true;
  if (!patDigerente && pathologyTokens.includes("Malattie dell'apparato digerente")) patDigerente = true;
  if (!patPelle && pathologyTokens.includes("Malattie della pelle e del tessuto sottocutaneo")) patPelle = true;
  if (!patMuscolo && pathologyTokens.includes("Malattie del sistema muscoloscheletrico e del tessuto connettivo")) patMuscolo = true;
  if (!patGenito && pathologyTokens.includes("Malattie dell'apparato genito-urinario")) patGenito = true;
  if (!patMalformazioni && pathologyTokens.includes("Malformazioni congenite, deformità e anomalie cromosomiche")) patMalformazioni = true;
  if (!patTraumi && pathologyTokens.includes("Traumi, avvelenamenti e alcune altre conseguenze di cause esterne")) patTraumi = true;
  if (!patNessuna && pathologyTokens.includes("Nessuna")) patNessuna = true;
  if (!patAltro && pathologyTokens.includes("Altro")) patAltro = true;

  if (patNessuna) {
    patInfettive = false;
    patNeoplasie = false;
    patSangue = false;
    patEndocrine = false;
    patDisturbi = false;
    patNervoso = false;
    patOcchio = false;
    patOrecchio = false;
    patCircolatorio = false;
    patRespiratorio = false;
    patDigerente = false;
    patPelle = false;
    patMuscolo = false;
    patGenito = false;
    patMalformazioni = false;
    patTraumi = false;
    patAltro = false;
  }

  const pathologySummary = patNessuna
    ? "Nessuna"
    : [
        patInfettive ? "Malattie infettive e parassitarie" : null,
        patNeoplasie ? "Neoplasie" : null,
        patSangue ? "Malattie del sangue e degli organi ematopoietici e alcuni disturbi del sistema immunitario" : null,
        patEndocrine ? "Malattie endocrine, nutrizionali e metaboliche" : null,
        patDisturbi ? "Disturbi psichici e comportamentali" : null,
        patNervoso ? "Malattie del sistema nervoso" : null,
        patOcchio ? "Malattie dell'occhio e degli annessi oculari" : null,
        patOrecchio ? "Malattie dell'orecchio e del processo mastoideo" : null,
        patCircolatorio ? "Malattie del sistema cardio-circolatorio" : null,
        patRespiratorio ? "Malattie del sistema respiratorio" : null,
        patDigerente ? "Malattie dell'apparato digerente" : null,
        patPelle ? "Malattie della pelle e del tessuto sottocutaneo" : null,
        patMuscolo ? "Malattie del sistema muscoloscheletrico e del tessuto connettivo" : null,
        patGenito ? "Malattie dell'apparato genito-urinario" : null,
        patMalformazioni ? "Malformazioni congenite, deformità e anomalie cromosomiche" : null,
        patTraumi ? "Traumi, avvelenamenti e alcune altre conseguenze di cause esterne" : null,
        patAltro ? "Altro" : null,
      ]
        .filter(Boolean)
        .join(", ");

  patch.patologie_malattie_infettive_e_parassitarie = patInfettive ? "true" : "false";
  patch.patologie_neoplasie_tumori = patNeoplasie ? "true" : "false";
  patch.patologie_malattie_del_sangue_e_degli_organi_ematopoieti_0e7123 = patSangue ? "true" : "false";
  patch.patologie_malattie_endocrine_nutrizionali_e_metaboliche = patEndocrine ? "true" : "false";
  patch.patologie_disturbi_psichici_e_comportamentali = patDisturbi ? "true" : "false";
  patch.patologie_malattie_del_sistema_nervoso = patNervoso ? "true" : "false";
  patch.patologie_malattie_dell_occhio_e_degli_annessi_oculari = patOcchio ? "true" : "false";
  patch.patologie_malattie_dell_orecchio_e_del_processo_mastoideo = patOrecchio ? "true" : "false";
  patch.patologie_malattie_del_sistema_circolatorio = patCircolatorio ? "true" : "false";
  patch.patologie_malattie_del_sistema_respiratorio = patRespiratorio ? "true" : "false";
  patch.patologie_malattie_dell_apparato_digerente = patDigerente ? "true" : "false";
  patch.patologie_malattie_della_pelle_e_del_tessuto_sottocutaneo = patPelle ? "true" : "false";
  patch.patologie_malattie_del_sistema_muscoloscheletrico_e_del_55e101 = patMuscolo ? "true" : "false";
  patch.patologie_malattie_dell_apparato_genito_urinario = patGenito ? "true" : "false";
  patch.patologie_malformazioni_congenite_deformita_e_anomalie_c_84cf9a = patMalformazioni ? "true" : "false";
  patch.patologie_traumi_avvelenamenti_e_alcune_altre_conseguenz_85ac11 = patTraumi ? "true" : "false";
  patch.patologie_nessuna = patNessuna ? "true" : "false";
  patch.patologie_altro = patAltro ? "true" : "false";
  patch.patologie = pathologySummary || null;

  const dependencyTokens = patch.dipendenze ? splitCsvValues(patch.dipendenze) : [];
  if (dependencyTokens.some((token) => !isAllowed(DIPENDENZE_OPTIONS, token))) {
    return NextResponse.json({ error: "Dipendenze non valide." }, { status: 400 });
  }

  let depAlcolismo = yesFlag(patch.dipendenze_alcolismo);
  let depSostanze = yesFlag(patch.dipendenze_sostanze);
  let depLudopatia = yesFlag(patch.dipendenze_ludopatia);
  let depNessuna = yesFlag(patch.dipendenze_nessuna);

  if (!depAlcolismo && dependencyTokens.includes("Alcolismo")) depAlcolismo = true;
  if (!depSostanze && dependencyTokens.includes("Sostanze")) depSostanze = true;
  if (!depLudopatia && dependencyTokens.includes("Ludopatia")) depLudopatia = true;
  if (!depNessuna && dependencyTokens.includes("Nessuna")) depNessuna = true;

  if (depNessuna) {
    depAlcolismo = false;
    depSostanze = false;
    depLudopatia = false;
  }

  const dependencySummary = depNessuna
    ? "Nessuna"
    : [depAlcolismo ? "Alcolismo" : null, depSostanze ? "Sostanze" : null, depLudopatia ? "Ludopatia" : null]
        .filter(Boolean)
        .join(", ");

  patch.dipendenze_alcolismo = depAlcolismo ? "Sì" : "No";
  patch.dipendenze_sostanze = depSostanze ? "Sì" : "No";
  patch.dipendenze_ludopatia = depLudopatia ? "Sì" : "No";
  patch.dipendenze_nessuna = depNessuna ? "Sì" : "No";
  patch.dipendenze = dependencySummary || null;

  if (patch.al_momento_dell_ingresso_ha_un_reddito === "No") {
    patch.tipo_di_reddito = null;
    patch.tipo_di_lavoro = null;
    patch.tipo_di_reddito_pensione = "No";
    patch.tipo_di_reddito_invalidita = "No";
    patch.tipo_di_reddito_reddito_di_inclusione = "No";
    patch.tipo_di_reddito_reddito_da_lavoro = "No";
  }

  if (patch.siamo_ancora_in_contatto === "Sì" && !patch.chi_e_in_contatto) {
    return NextResponse.json(
      { error: "Se siamo ancora in contatto, indica chi è in contatto." },
      { status: 400 }
    );
  }

  if (patch.siamo_ancora_in_contatto === "No") {
    patch.chi_e_in_contatto = null;
  }

  if (patch.ha_gia_fatto_domanda_di_casa_popolare === "Sì" && !patch.data_domanda_casa_popolare) {
    return NextResponse.json(
      { error: "Se ha già fatto domanda di casa popolare, indica 'In data'." },
      { status: 400 }
    );
  }

  if (patch.ha_gia_fatto_domanda_di_casa_popolare === "No") {
    patch.data_domanda_casa_popolare = null;
  }

  const { data, error } = await supabase.rpc("update_guest_profile_with_audit", {
    p_guest_id: id,
    p_patch: patch,
    p_changed_by: appUserId,
  });

  if (error) {
    const status = error.message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true, result: data });
}
