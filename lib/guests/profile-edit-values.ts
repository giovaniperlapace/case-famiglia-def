export const POVERTA_OPTIONS = [
  "Economica",
  "Sociale",
  "Psicosi",
  "Alcolismo",
  "Dipendenza",
  "Ludopatia",
  "Salute",
  "Altro",
] as const;

export function splitCsvValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTokensToAllowed(value: string, options: readonly string[]): string[] {
  const selected = new Set(
    splitCsvValues(value)
      .map((token) => {
        const normalized = normalizeOptionValue(token);
        return options.find((option) => normalizeOptionValue(option) === normalized) ?? null;
      })
      .filter((token): token is string => Boolean(token))
  );

  return options.filter((option) => selected.has(option));
}

export function hasUnsupportedCsvTokens(value: string, options: readonly string[]): boolean {
  const allowed = new Set(options.map((option) => normalizeOptionValue(option)));
  return splitCsvValues(value).some((token) => !allowed.has(normalizeOptionValue(token)));
}

export function getAllowedPovertyCauses(value: string): string[] {
  return normalizeTokensToAllowed(value, POVERTA_OPTIONS);
}

export function hasUnsupportedPovertyCauses(value: string): boolean {
  return hasUnsupportedCsvTokens(value, POVERTA_OPTIONS);
}
