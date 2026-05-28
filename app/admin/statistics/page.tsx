import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentStatus } from "@/lib/guests/status";

export const dynamic = "force-dynamic";

type StatsRow = {
  id: string;
  struttura: string | null;
  current_status: string | null;
  data_di_nascita: string | null;
  data_ingresso: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  tipo_aggiornamento: string | null;
};

type IncompleteCounts = {
  missingBirthDate: number;
  exitedWithoutExitDate: number;
  deceasedWithoutDeathDate: number;
};

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

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

function incompleteHref(casa: string | null, filter: string) {
  const params = new URLSearchParams({ dati_incompleti: filter });
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

export default async function AdminStatisticsPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("case_alloggio_submissions")
    .select(
      "id,struttura,current_status,data_di_nascita,data_ingresso,data_uscita,data_decesso,tipo_aggiornamento"
    );

  const rows = (data ?? []) as StatsRow[];
  const grouped = new Map<string, { inAccoglienza: number; storico: number }>();
  const incompleteGrouped = new Map<string, IncompleteCounts>();
  const durationGrouped = new Map<string, { exited: number[]; inAccoglienza: number[] }>();
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
    };
    const durations = durationGrouped.get(casa) ?? { exited: [], inAccoglienza: [] };
    const ingresso = parseDateValue(row.data_ingresso);

    if (status === "IN_ACCOGLIENZA") {
      prev.inAccoglienza += 1;
      const currentStayDays = daysBetween(ingresso, today);
      if (currentStayDays !== null) {
        durations.inAccoglienza.push(currentStayDays);
      }
    } else {
      prev.storico += 1;
    }

    if (status === "USCITO") {
      const exitedStayDays = daysBetween(ingresso, parseDateValue(row.data_uscita));
      if (exitedStayDays !== null) {
        durations.exited.push(exitedStayDays);
      }
    }

    if (!hasValue(row.data_di_nascita)) {
      incomplete.missingBirthDate += 1;
    }

    if (status === "USCITO" && !hasValue(row.data_uscita)) {
      incomplete.exitedWithoutExitDate += 1;
    }

    if (status === "DECEDUTO" && !hasValue(row.data_decesso)) {
      incomplete.deceasedWithoutDeathDate += 1;
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
  const incompleteTotals = incompleteItems.reduce(
    (acc, item) => ({
      missingBirthDate: acc.missingBirthDate + item.missingBirthDate,
      exitedWithoutExitDate: acc.exitedWithoutExitDate + item.exitedWithoutExitDate,
      deceasedWithoutDeathDate: acc.deceasedWithoutDeathDate + item.deceasedWithoutDeathDate,
    }),
    { missingBirthDate: 0, exitedWithoutExitDate: 0, deceasedWithoutDeathDate: 0 }
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
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
