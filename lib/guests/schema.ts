export type GuestStatus = "IN_ACCOGLIENZA" | "USCITO" | "DECEDUTO";

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  IN_ACCOGLIENZA: "In accoglienza",
  USCITO: "Uscito",
  DECEDUTO: "Deceduto",
};

export type GuestProfileFieldKey =
  | "nome_della_persona"
  | "cognome"
  | "data_di_nascita"
  | "luogo_di_nascita"
  | "sesso_della_persona"
  | "nazionalita"
  | "contatto_della_persona";

export const GUEST_PROFILE_FIELDS: Array<{ key: GuestProfileFieldKey; label: string }> = [
  { key: "nome_della_persona", label: "Nome" },
  { key: "cognome", label: "Cognome" },
  { key: "data_di_nascita", label: "Data di nascita" },
  { key: "luogo_di_nascita", label: "Luogo di nascita" },
  { key: "sesso_della_persona", label: "Sesso" },
  { key: "nazionalita", label: "Nazionalità" },
  { key: "contatto_della_persona", label: "Contatto persona" },
];

export type FollowUpFieldKey =
  | "al_momento_dell_uscita_ha_residenza"
  | "al_momento_dell_uscita_ha_un_reddito"
  | "data_ultimo_contatto"
  | "dove_dorme";

export const FOLLOW_UP_FIELDS: Array<{ key: FollowUpFieldKey; label: string }> = [
  { key: "al_momento_dell_uscita_ha_residenza", label: "Residenza (follow-up)" },
  { key: "al_momento_dell_uscita_ha_un_reddito", label: "Reddito (follow-up)" },
  { key: "data_ultimo_contatto", label: "Data ultimo contatto" },
  { key: "dove_dorme", label: "Dove dorme" },
];

export type ClinicalFieldKey =
  | "dipendenze"
  | "dipendenze_alcolismo"
  | "dipendenze_sostanze"
  | "dipendenze_ludopatia"
  | "dipendenze_nessuna"
  | "patologie"
  | "patologie_altro"
  | "patologie_nessuna"
  | "patologia_psichiatrica";

export const CLINICAL_FIELDS: Array<{ key: ClinicalFieldKey; label: string }> = [
  { key: "dipendenze", label: "Dipendenze (sintesi)" },
  { key: "dipendenze_alcolismo", label: "Dipendenze: Alcolismo" },
  { key: "dipendenze_sostanze", label: "Dipendenze: Sostanze" },
  { key: "dipendenze_ludopatia", label: "Dipendenze: Ludopatia" },
  { key: "dipendenze_nessuna", label: "Dipendenze: Nessuna" },
  { key: "patologie", label: "Patologie (sintesi)" },
  { key: "patologie_altro", label: "Patologie: Altro" },
  { key: "patologie_nessuna", label: "Patologie: Nessuna" },
  { key: "patologia_psichiatrica", label: "Patologia psichiatrica" },
];
