import { getCurrentStatus } from "./status.ts";

export type IncompleteDataSource = {
  current_status?: string | null;
  data_di_nascita?: string | null;
  data_uscita?: string | null;
  data_decesso?: string | null;
};

export type IncompleteDataFilter = "data_nascita" | "data_uscita" | "data_morte";

export type IncompleteDataFlags = {
  missingBirthDate: boolean;
  exitedWithoutExitDate: boolean;
  deceasedWithoutDeathDate: boolean;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getIncompleteDataFlags(source: IncompleteDataSource): IncompleteDataFlags {
  const status = getCurrentStatus(source);
  return {
    missingBirthDate: !hasValue(source.data_di_nascita),
    exitedWithoutExitDate: status === "USCITO" && !hasValue(source.data_uscita),
    deceasedWithoutDeathDate: status === "DECEDUTO" && !hasValue(source.data_decesso),
  };
}

export function hasIncompleteData(source: IncompleteDataSource): boolean {
  const flags = getIncompleteDataFlags(source);
  return flags.missingBirthDate || flags.exitedWithoutExitDate || flags.deceasedWithoutDeathDate;
}

export function matchesIncompleteDataFilter(
  source: IncompleteDataSource,
  filter: IncompleteDataFilter
): boolean {
  const flags = getIncompleteDataFlags(source);
  if (filter === "data_nascita") return flags.missingBirthDate;
  if (filter === "data_uscita") return flags.exitedWithoutExitDate;
  return flags.deceasedWithoutDeathDate;
}
