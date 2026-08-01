import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getIncompleteDataFlags } from "@/lib/guests/incomplete-data";
import { getCurrentStatus } from "@/lib/guests/status";
import { normalizeDoveDormeOption } from "@/lib/guests/status-update-options";
import { needsUpdateBadge } from "@/lib/guests/stale-update";

export const dynamic = "force-dynamic";

type StatsRow = {
  id: string;
  struttura: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  current_status: string | null;
  data_di_nascita: string | null;
  data_ingresso: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  causa_decesso: string | null;
  data_ultimo_contatto: string | null;
  dove_dorme: string | null;
  tipo_aggiornamento: string | null;
};

type IncompleteCounts = {
  missingBirthDate: number;
  exitedWithoutExitDate: number;
  deceasedWithoutDeathDate: number;
  needsUpdate: number;
  privacyCollected: number;
  privacyMissing: number;
};

function parseDateValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const italianMatch = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  let parts: { year: number; month: number; day: number } | null = null;

  if (isoMatch) {
    parts = {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  } else if (italianMatch) {
    parts = {
      year: Number(italianMatch[3]),
      month: Number(italianMatch[2]),
      day: Number(italianMatch[1]),
    };
  }

  if (!parts) return null;

  const time = Date.UTC(parts.year, parts.month - 1, parts.day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== parts.year ||
    parsed.getUTCMonth() !== parts.month - 1 ||
    parsed.getUTCDate() !== parts.day
  ) {
    return null;
  }

  return time;
}

function daysBetween(start: number | null, end: number | null) {
  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 86_400_000);
}

function median(values: number[]) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatDays(value: number | null) {
  if (value === null) return "n/d";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function normalizeDeathCause(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  return normalized || "Causa non indicata";
}

function incompleteHref(casa: string | null, filter: string) {
  const params = new URLSearchParams({ dati_incompleti: filter });
  if (casa) params.set("struttura", casa);
  return `/dashboard?${params.toString()}`;
}

function attentionHref(casa: string | null, filter: string) {
  const params = new URLSearchParams({ attenzione: filter });
  if (casa) params.set("struttura", casa);
  return `/dashboard?${params.toString()}`;
}

function IncompleteCountLink({
  casa,
  count,
  filter,
  label,
}: {
  casa: string | null;
  count: number;
  filter: string;
  label: string;
}) {
  return (
    <Link
      href={incompleteHref(casa, filter)}
      aria-label={`${label}: ${count}`}
      title={label}
      style={{ color: "inherit", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}
    >
      {count}
    </Link>
  );
}

function AttentionCountLink({
  casa,
  count,
  filter,
  label,
}: {
  casa: string | null;
  count: number;
  filter: string;
  label: string;
}) {
  return (
    <Link
      href={attentionHref(casa, filter)}
      aria-label={`${label}: ${count}`}
      title={label}
      style={{ color: "inherit", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}
    >
      {count}
    </Link>
  );
}

export default async function AdminStatisticsPage() {
  const supabase = await createSupabaseServerClient();

  const [guestResult, privacyResult] = await Promise.all([
    supabase
      .from("case_alloggio_submissions")
      .select(
        "id,struttura,submitted_at,updated_at,current_status,data_di_nascita,data_ingresso,data_uscita,data_decesso,causa_decesso,data_ultimo_contatto,dove_dorme,tipo_aggiornamento"
      ),
    supabase.from("guest_privacy_documents").select("guest_id"),
  ]);

  const { data, error: guestError } = guestResult;
  const { data: privacyDocuments, error: privacyError } = privacyResult;
  const error = guestError ?? privacyError;

  const rows = (data ?? []) as StatsRow[];
  const privacyDocumentCounts = new Map<string, number>();

  for (const document of (privacyDocuments ?? []) as Array<{ guest_id: string }>) {
    privacyDocumentCounts.set(
      document.guest_id,
      (privacyDocumentCounts.get(document.guest_id) ?? 0) + 1
    );
  }
  const grouped = new Map<string, { inAccoglienza: number; storico: number }>();
  const incompleteGrouped = new Map<string, IncompleteCounts>();
  const durationGrouped = new Map<string, { exited: number[]; inAccoglienza: number[] }>();
  const deathCauseCounts = new Map<string, number>();
  const exitedHousingCounts = new Map<string, number>();
  const statusCounts = {
    inAccoglienza: 0,
    uscitiVivi: 0,
    uscitiMorti: 0,
  };
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  for (const row of rows) {
    const casa = row.struttura?.trim() || "n/d";
    const status = getCurrentStatus(row);
    const prev = grouped.get(casa) ?? { inAccoglienza: 0, storico: 0 };
    const incomplete = incompleteGrouped.get(casa) ?? {
      missingBirthDate: 0,
      exitedWithoutExitDate: 0,
      deceasedWithoutDeathDate: 0,
      needsUpdate: 0,
      privacyCollected: 0,
      privacyMissing: 0,
    };
    const durations = durationGrouped.get(casa) ?? { exited: [], inAccoglienza: [] };
    const ingresso = parseDateValue(row.data_ingresso);

    if (status === "IN_ACCOGLIENZA") {
      prev.inAccoglienza += 1;
      statusCounts.inAccoglienza += 1;
      if ((privacyDocumentCounts.get(row.id) ?? 0) > 0) {
        incomplete.privacyCollected += 1;
      } else {
        incomplete.privacyMissing += 1;
      }
      const currentStayDays = daysBetween(ingresso, today);
      if (currentStayDays !== null) {
        durations.inAccoglienza.push(currentStayDays);
      }
    } else {
      prev.storico += 1;
      if (status === "USCITO") {
        statusCounts.uscitiVivi += 1;
        const housing = normalizeDoveDormeOption(row.dove_dorme) ?? "Dato non indicato";
        exitedHousingCounts.set(housing, (exitedHousingCounts.get(housing) ?? 0) + 1);
      } else {
        statusCounts.uscitiMorti += 1;
        const deathCause = normalizeDeathCause(row.causa_decesso);
        deathCauseCounts.set(deathCause, (deathCauseCounts.get(deathCause) ?? 0) + 1);
      }
    }

    if (status === "USCITO") {
      const exitedStayDays = daysBetween(ingresso, parseDateValue(row.data_uscita));
      if (exitedStayDays !== null) {
        durations.exited.push(exitedStayDays);
      }
    }

    const incompleteFlags = getIncompleteDataFlags(row);

    if (incompleteFlags.missingBirthDate) {
      incomplete.missingBirthDate += 1;
    }

    if (incompleteFlags.exitedWithoutExitDate) {
      incomplete.exitedWithoutExitDate += 1;
    }

    if (incompleteFlags.deceasedWithoutDeathDate) {
      incomplete.deceasedWithoutDeathDate += 1;
    }

    if (needsUpdateBadge(row, now)) {
      incomplete.needsUpdate += 1;
    }

    grouped.set(casa, prev);
    incompleteGrouped.set(casa, incomplete);
    durationGrouped.set(casa, durations);
  }

  const items = Array.from(grouped.entries())
    .map(([casa, counts]) => ({ casa, ...counts }))
    .sort((a, b) => a.casa.localeCompare(b.casa, "it-IT"));
  const incompleteItems = Array.from(incompleteGrouped.entries())
    .map(([casa, counts]) => ({ casa, ...counts }))
    .sort((a, b) => a.casa.localeCompare(b.casa, "it-IT"));
  const stayDurationItems = Array.from(durationGrouped.entries())
    .map(([casa, durations]) => ({
      casa,
      exitedMedian: median(durations.exited),
      inAccoglienzaMedian: median(durations.inAccoglienza),
      exitedCount: durations.exited.length,
      inAccoglienzaCount: durations.inAccoglienza.length,
    }))
    .filter((item) => item.exitedMedian !== null || item.inAccoglienzaMedian !== null)
    .sort((a, b) => {
      if (a.exitedMedian !== null && b.exitedMedian !== null) {
        return b.exitedMedian - a.exitedMedian || a.casa.localeCompare(b.casa, "it-IT");
      }
      if (a.exitedMedian !== null) return -1;
      if (b.exitedMedian !== null) return 1;
      if (a.inAccoglienzaMedian !== null && b.inAccoglienzaMedian !== null) {
        return b.inAccoglienzaMedian - a.inAccoglienzaMedian || a.casa.localeCompare(b.casa, "it-IT");
      }
      return a.casa.localeCompare(b.casa, "it-IT");
    });
  const allStayDurations = Array.from(durationGrouped.values()).reduce(
    (acc, durations) => ({
      exited: acc.exited.concat(durations.exited),
      inAccoglienza: acc.inAccoglienza.concat(durations.inAccoglienza),
    }),
    { exited: [] as number[], inAccoglienza: [] as number[] }
  );
  const overallStayDurations = {
    exitedMedian: median(allStayDurations.exited),
    inAccoglienzaMedian: median(allStayDurations.inAccoglienza),
    exitedCount: allStayDurations.exited.length,
    inAccoglienzaCount: allStayDurations.inAccoglienza.length,
  };
  const maxStayDuration = Math.max(
    1,
    ...stayDurationItems.flatMap((item) => [item.exitedMedian ?? 0, item.inAccoglienzaMedian ?? 0])
  );

  const totals = items.reduce(
    (acc, item) => ({
      inAccoglienza: acc.inAccoglienza + item.inAccoglienza,
      storico: acc.storico + item.storico,
    }),
    { inAccoglienza: 0, storico: 0 }
  );
  const statusTotal =
    statusCounts.inAccoglienza + statusCounts.uscitiVivi + statusCounts.uscitiMorti;
  const statusChartItems = [
    { label: "In accoglienza", count: statusCounts.inAccoglienza, color: "#2563eb" },
    { label: "Usciti vivi", count: statusCounts.uscitiVivi, color: "#0f766e" },
    { label: "Usciti morti", count: statusCounts.uscitiMorti, color: "#64748b" },
  ].map((item) => ({
    ...item,
    percentage: statusTotal > 0 ? (item.count / statusTotal) * 100 : 0,
  }));
  const deathCauseItems = Array.from(deathCauseCounts.entries())
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause, "it-IT"));
  const maxDeathCauseCount = Math.max(1, ...deathCauseItems.map((item) => item.count));
  const exitedHousingItems = Array.from(exitedHousingCounts.entries())
    .map(([housing, count]) => ({ housing, count }))
    .sort((a, b) => b.count - a.count || a.housing.localeCompare(b.housing, "it-IT"));
  const maxExitedHousingCount = Math.max(1, ...exitedHousingItems.map((item) => item.count));
  const incompleteTotals = incompleteItems.reduce(
    (acc, item) => ({
      missingBirthDate: acc.missingBirthDate + item.missingBirthDate,
      exitedWithoutExitDate: acc.exitedWithoutExitDate + item.exitedWithoutExitDate,
      deceasedWithoutDeathDate: acc.deceasedWithoutDeathDate + item.deceasedWithoutDeathDate,
      needsUpdate: acc.needsUpdate + item.needsUpdate,
      privacyCollected: acc.privacyCollected + item.privacyCollected,
      privacyMissing: acc.privacyMissing + item.privacyMissing,
    }),
    {
      missingBirthDate: 0,
      exitedWithoutExitDate: 0,
      deceasedWithoutDeathDate: 0,
      needsUpdate: 0,
      privacyCollected: 0,
      privacyMissing: 0,
    }
  );

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Statistiche</h1>
      <div
        className="card"
        style={{ display: "inline-block", width: "fit-content", maxWidth: "100%", marginBottom: "1rem" }}
      >
        <h2 style={{ marginTop: 0 }}>Persone per accoglienza e stato</h2>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && items.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun dato disponibile.
          </p>
        ) : null}

        {!error && items.length > 0 ? (
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "auto", borderCollapse: "collapse", marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th
                    style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: "8px 6px" }}
                  >
                    Accoglienza
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 130,
                    }}
                  >
                    In accoglienza
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 90,
                    }}
                  >
                    Storico
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.casa}>
                    <td
                      style={{
                        borderBottom: "1px solid var(--border)",
                        padding: "8px 6px",
                        whiteSpace: "nowrap",
                        paddingRight: 18,
                      }}
                    >
                      {item.casa}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      {item.inAccoglienza}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      {item.storico}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700 }}>Totale</td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    {totals.inAccoglienza}
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    {totals.storico}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <div className="card" style={{ marginBottom: "1rem", maxWidth: 900 }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Stato delle persone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Distribuzione sul totale di {statusTotal} persone. Gli usciti vivi e gli usciti morti
          sono conteggiati separatamente in base allo stato corrente.
        </p>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && statusTotal === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun dato disponibile.
          </p>
        ) : null}

        {!error && statusTotal > 0 ? (
          <>
            <div
              role="img"
              aria-label={statusChartItems
                .map((item) => `${item.label}: ${item.count}`)
                .join(", ")}
              style={{
                display: "flex",
                width: "100%",
                height: 42,
                overflow: "hidden",
                borderRadius: 8,
                background: "#eef2f7",
                margin: "1rem 0",
              }}
            >
              {statusChartItems.map((item) =>
                item.count > 0 ? (
                  <div
                    key={item.label}
                    title={`${item.label}: ${item.count} (${item.percentage.toLocaleString("it-IT", {
                      maximumFractionDigits: 1,
                    })}%)`}
                    style={{
                      width: `${item.percentage}%`,
                      height: "100%",
                      background: item.color,
                    }}
                  />
                ) : null
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {statusChartItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "0.7rem 0.8rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: item.color,
                        display: "inline-block",
                        flex: "0 0 auto",
                      }}
                    />
                    {item.label}
                  </div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: 4 }}>
                    {item.count}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {item.percentage.toLocaleString("it-IT", { maximumFractionDigits: 1 })}% del totale
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="card" style={{ marginBottom: "1rem", maxWidth: 900 }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Cause di decesso</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Cause registrate per tutte le {statusCounts.uscitiMorti} persone decedute.
        </p>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && deathCauseItems.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun decesso registrato.
          </p>
        ) : null}

        {!error && deathCauseItems.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: "1rem", overflowX: "auto", paddingBottom: 4 }}>
            {deathCauseItems.map((item) => {
              const percentage =
                statusCounts.uscitiMorti > 0 ? (item.count / statusCounts.uscitiMorti) * 100 : 0;

              return (
                <div
                  key={item.cause}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(150px, 230px) minmax(120px, 1fr) 92px",
                    gap: 10,
                    alignItems: "center",
                    minWidth: 520,
                  }}
                >
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{item.cause}</div>
                  <div
                    aria-hidden="true"
                    style={{ height: 22, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}
                  >
                    <div
                      style={{
                        width: `${(item.count / maxDeathCauseCount) * 100}%`,
                        height: "100%",
                        minWidth: 3,
                        background: "#64748b",
                        borderRadius: 5,
                      }}
                    />
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <strong>{item.count}</strong>{" "}
                    <span className="muted" style={{ fontSize: "0.82rem" }}>
                      ({percentage.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="card" style={{ marginBottom: "1rem", maxWidth: 900 }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Dove dormono gli usciti vivi</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Situazione abitativa attuale registrata per tutte le {statusCounts.uscitiVivi} persone
          uscite vive. “Dato non indicato” e “Non lo sappiamo” restano categorie distinte.
        </p>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && exitedHousingItems.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessuna persona uscita viva registrata.
          </p>
        ) : null}

        {!error && exitedHousingItems.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: "1rem", overflowX: "auto", paddingBottom: 4 }}>
            {exitedHousingItems.map((item) => {
              const percentage =
                statusCounts.uscitiVivi > 0 ? (item.count / statusCounts.uscitiVivi) * 100 : 0;

              return (
                <div
                  key={item.housing}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(170px, 250px) minmax(120px, 1fr) 92px",
                    gap: 10,
                    alignItems: "center",
                    minWidth: 540,
                  }}
                >
                  <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{item.housing}</div>
                  <div
                    aria-hidden="true"
                    style={{ height: 22, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}
                  >
                    <div
                      style={{
                        width: `${(item.count / maxExitedHousingCount) * 100}%`,
                        height: "100%",
                        minWidth: 3,
                        background: "#0f766e",
                        borderRadius: 5,
                      }}
                    />
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <strong>{item.count}</strong>{" "}
                    <span className="muted" style={{ fontSize: "0.82rem" }}>
                      ({percentage.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="card" style={{ marginBottom: "1rem", maxWidth: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Tempo mediano di permanenza</h2>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && stayDurationItems.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun dato disponibile con date di permanenza valide.
          </p>
        ) : null}

        {!error && stayDurationItems.length > 0 ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0.65rem 0.8rem",
                  minWidth: 190,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 14, height: 14, borderRadius: 3, background: "#0f766e", display: "inline-block" }}
                  />
                  Mediana usciti
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: 4 }}>
                  {formatDays(overallStayDurations.exitedMedian)} giorni
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {overallStayDurations.exitedCount} record validi
                </div>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0.65rem 0.8rem",
                  minWidth: 190,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 14, height: 14, borderRadius: 3, background: "#2563eb", display: "inline-block" }}
                  />
                  Mediana in accoglienza
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: 4 }}>
                  {formatDays(overallStayDurations.inAccoglienzaMedian)} giorni
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {overallStayDurations.inAccoglienzaCount} record validi
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
                <span
                  aria-hidden="true"
                  style={{ width: 14, height: 14, borderRadius: 3, background: "#0f766e", display: "inline-block" }}
                />
                Già usciti
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--muted)" }}>
                <span
                  aria-hidden="true"
                  style={{ width: 14, height: 14, borderRadius: 3, background: "#2563eb", display: "inline-block" }}
                />
                In accoglienza
              </span>
            </div>
            <div style={{ overflowX: "auto", maxWidth: "100%", paddingBottom: 6 }}>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  minWidth: 720,
                  padding: "0.25rem 0",
                }}
              >
                {stayDurationItems.map((item) => {
                  const exitedWidth = `${Math.max(2, ((item.exitedMedian ?? 0) / maxStayDuration) * 100)}%`;
                  const activeWidth = `${Math.max(2, ((item.inAccoglienzaMedian ?? 0) / maxStayDuration) * 100)}%`;

                  return (
                    <div
                      key={item.casa}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px minmax(420px, 1fr)",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        title={item.casa}
                        style={{
                          fontWeight: 600,
                          lineHeight: 1.2,
                          overflowWrap: "anywhere",
                          textAlign: "right",
                        }}
                      >
                        {item.casa}
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          title={`${item.casa}, già usciti: ${formatDays(item.exitedMedian)} giorni (${item.exitedCount} record validi)`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 64px",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ height: 18, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}>
                            {item.exitedMedian !== null ? (
                              <div
                                style={{
                                  width: exitedWidth,
                                  height: "100%",
                                  minWidth: 3,
                                  background: "#0f766e",
                                  borderRadius: 5,
                                }}
                              />
                            ) : null}
                          </div>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {formatDays(item.exitedMedian)}
                          </span>
                        </div>
                        <div
                          title={`${item.casa}, in accoglienza: ${formatDays(item.inAccoglienzaMedian)} giorni (${item.inAccoglienzaCount} record validi)`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 64px",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ height: 18, background: "#eef2f7", borderRadius: 5, overflow: "hidden" }}>
                            {item.inAccoglienzaMedian !== null ? (
                              <div
                                style={{
                                  width: activeWidth,
                                  height: "100%",
                                  minWidth: 3,
                                  background: "#2563eb",
                                  borderRadius: 5,
                                }}
                              />
                            ) : null}
                          </div>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {formatDays(item.inAccoglienzaMedian)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="card" style={{ display: "inline-block", width: "fit-content", maxWidth: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Record con dati incompleti</h2>

        {error ? <p style={{ color: "var(--danger)" }}>{error.message}</p> : null}

        {!error && incompleteItems.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Nessun dato disponibile.
          </p>
        ) : null}

        {!error && incompleteItems.length > 0 ? (
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "auto", borderCollapse: "collapse", marginTop: "0.75rem" }}>
              <thead>
                <tr>
                  <th
                    style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: "8px 6px" }}
                  >
                    Accoglienza
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 150,
                    }}
                  >
                    Senza data di nascita
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 150,
                    }}
                  >
                    Uscito senza data uscita
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 160,
                    }}
                  >
                    Deceduto senza data morte
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 130,
                    }}
                  >
                    Da aggiornare
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 150,
                    }}
                  >
                    Privacy raccolta
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid var(--border)",
                      padding: "8px 6px",
                      width: 150,
                    }}
                  >
                    Privacy mancante
                  </th>
                </tr>
              </thead>
              <tbody>
                {incompleteItems.map((item) => (
                  <tr key={item.casa}>
                    <td
                      style={{
                        borderBottom: "1px solid var(--border)",
                        padding: "8px 6px",
                        whiteSpace: "nowrap",
                        paddingRight: 18,
                      }}
                    >
                      {item.casa}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <IncompleteCountLink
                        casa={item.casa}
                        count={item.missingBirthDate}
                        filter="data_nascita"
                        label={`${item.casa}: senza data di nascita`}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <IncompleteCountLink
                        casa={item.casa}
                        count={item.exitedWithoutExitDate}
                        filter="data_uscita"
                        label={`${item.casa}: uscito senza data uscita`}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <IncompleteCountLink
                        casa={item.casa}
                        count={item.deceasedWithoutDeathDate}
                        filter="data_morte"
                        label={`${item.casa}: deceduto senza data morte`}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <AttentionCountLink
                        casa={item.casa}
                        count={item.needsUpdate}
                        filter="update"
                        label={`${item.casa}: da aggiornare`}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <AttentionCountLink
                        casa={item.casa}
                        count={item.privacyCollected}
                        filter="privacy_collected"
                        label={`${item.casa}: privacy raccolta`}
                      />
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "8px 6px", textAlign: "right" }}>
                      <AttentionCountLink
                        casa={item.casa}
                        count={item.privacyMissing}
                        filter="privacy_missing"
                        label={`${item.casa}: privacy mancante`}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700 }}>Totale</td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <IncompleteCountLink
                      casa={null}
                      count={incompleteTotals.missingBirthDate}
                      filter="data_nascita"
                      label="Totale: senza data di nascita"
                    />
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <IncompleteCountLink
                      casa={null}
                      count={incompleteTotals.exitedWithoutExitDate}
                      filter="data_uscita"
                      label="Totale: uscito senza data uscita"
                    />
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <IncompleteCountLink
                      casa={null}
                      count={incompleteTotals.deceasedWithoutDeathDate}
                      filter="data_morte"
                      label="Totale: deceduto senza data morte"
                    />
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <AttentionCountLink
                      casa={null}
                      count={incompleteTotals.needsUpdate}
                      filter="update"
                      label="Totale: da aggiornare"
                    />
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <AttentionCountLink
                      casa={null}
                      count={incompleteTotals.privacyCollected}
                      filter="privacy_collected"
                      label="Totale: privacy raccolta"
                    />
                  </td>
                  <td style={{ padding: "10px 6px 0", fontWeight: 700, textAlign: "right" }}>
                    <AttentionCountLink
                      casa={null}
                      count={incompleteTotals.privacyMissing}
                      filter="privacy_missing"
                      label="Totale: privacy mancante"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
