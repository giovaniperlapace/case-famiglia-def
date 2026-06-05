import { getCurrentStatus } from "./status.ts";

export const STALE_UPDATE_BADGE_LABEL = "Da aggiornare";

export type GuestUpdateDateSource = {
  current_status?: string | null;
  submitted_at?: string | null;
  data_ingresso?: string | null;
  data_uscita?: string | null;
  data_decesso?: string | null;
  data_ultimo_contatto?: string | null;
};

export function isOlderThanSixMonths(value: string | null | undefined, now = new Date()): boolean {
  if (!value) return true;
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return true;

  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - 6);
  return updatedAt < threshold;
}

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getLatestGuestUpdateDate(source: GuestUpdateDateSource): string | null {
  const status = getCurrentStatus(source);
  const candidates = [
    source.data_ultimo_contatto,
    status === "USCITO" ? source.data_uscita : null,
    status === "DECEDUTO" ? source.data_decesso : null,
    source.data_ingresso,
  ];

  const latestOperationalDate = candidates
    .map(toValidDate)
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latestOperationalDate?.toISOString() ?? toValidDate(source.submitted_at)?.toISOString() ?? null;
}

export function needsUpdateBadge(source: GuestUpdateDateSource, now = new Date()): boolean {
  if (getCurrentStatus(source) === "DECEDUTO") return false;
  return isOlderThanSixMonths(getLatestGuestUpdateDate(source), now);
}
