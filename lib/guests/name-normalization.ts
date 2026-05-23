export function normalizePersonName(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;

  return normalized
    .toLocaleLowerCase("it-IT")
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) => {
      return `${separator}${letter.toLocaleUpperCase("it-IT")}`;
    });
}
