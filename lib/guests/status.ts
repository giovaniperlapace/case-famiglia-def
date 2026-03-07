import type { GuestStatus } from "@/lib/guests/schema";

type StatusSource = {
  current_status?: string | null;
  data_uscita?: string | null;
  data_decesso?: string | null;
  tipo_aggiornamento?: string | null;
};

export function getCurrentStatus(source: StatusSource): GuestStatus {
  if (source.current_status === "IN_ACCOGLIENZA") return "IN_ACCOGLIENZA";
  if (source.current_status === "USCITO") return "USCITO";
  if (source.current_status === "DECEDUTO") return "DECEDUTO";

  if (source.data_decesso) return "DECEDUTO";
  if (source.data_uscita) return "USCITO";

  const updateType = (source.tipo_aggiornamento ?? "").toLowerCase();
  if (updateType.includes("decesso")) return "DECEDUTO";
  if (updateType.includes("uscita")) return "USCITO";

  return "IN_ACCOGLIENZA";
}
