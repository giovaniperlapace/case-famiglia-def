export const REFERRAL_SOURCE_OTHER = "Altro..." as const;

export const REFERRAL_SOURCE_OPTIONS = [
  "Altri servizi della Comunità",
  "Servizi sociali municipio",
  "Servizi sociali ospedale",
  "Servizi sociali ASL",
  "Parrocchie e altri enti no-profit",
  REFERRAL_SOURCE_OTHER,
] as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeReferralSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalize(value);
  return REFERRAL_SOURCE_OPTIONS.find((option) => normalize(option) === normalized) ?? null;
}
