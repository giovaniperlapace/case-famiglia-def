"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { hasIncompleteData, matchesIncompleteDataFilter } from "@/lib/guests/incomplete-data";
import { getCurrentStatus } from "@/lib/guests/status";
import { STALE_UPDATE_BADGE_LABEL, needsUpdateBadge } from "@/lib/guests/stale-update";

export type SubmissionRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
  updated_at: string;
  current_status: string | null;
  struttura: string | null;
  nome_della_persona: string | null;
  cognome: string | null;
  tipo_aggiornamento: string | null;
  data_di_nascita: string | null;
  data_ingresso: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  data_ultimo_contatto: string | null;
  dove_dorme: string | null;
  privacy_documents_count: number;
};

type SortKey =
  | "guest"
  | "struttura"
  | "stato"
  | "submitted_at"
  | "updated_at";

type SortDirection = "asc" | "desc";

type Filters = {
  guest: string;
  strutture: string[];
  stato: string;
  submitted_at: string;
  updated_at: string;
};

type IncompleteFilter = "data_nascita" | "data_uscita" | "data_morte";
type AttentionFilter = "" | "completion" | "update" | "privacy";

type RowView = {
  row: SubmissionRow;
  guest: string;
  struttura: string;
  stato: string;
  doveDorme: string;
  submittedAtLabel: string;
  updatedAtLabel: string;
  submittedAtTs: number;
  updatedAtTs: number;
  needsUpdate: boolean;
  needsCompletion: boolean;
  needsPrivacy: boolean;
};

function formatDateTime(value: string | null) {
  if (!value) return "n/d";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function deriveGuestStatus(row: SubmissionRow) {
  const status = getCurrentStatus(row);
  if (status === "DECEDUTO") return "Deceduto";
  if (status === "USCITO") return "Uscito";
  return "In accoglienza";
}

function toTimestamp(value: string | null) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function getIncompleteFilter(value: string | null): IncompleteFilter | "" {
  if (value === "data_nascita" || value === "data_uscita" || value === "data_morte") {
    return value;
  }
  return "";
}

function getInitialStato(filter: IncompleteFilter | "") {
  if (filter === "data_uscita") return "Uscito";
  if (filter === "data_morte") return "Deceduto";
  return "";
}

const INCOMPLETE_FILTER_LABEL: Record<IncompleteFilter, string> = {
  data_nascita: "Senza data di nascita",
  data_uscita: "Uscito senza data uscita",
  data_morte: "Deceduto senza data morte",
};

const CELL_STYLE: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "10px 12px",
  verticalAlign: "top",
};

const HEADER_CELL_STYLE: CSSProperties = {
  ...CELL_STYLE,
  paddingTop: 0,
  fontWeight: 700,
};

const FILTER_INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
};

const TABLE_HEADER_BUTTON_STYLE: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  padding: 0,
  boxShadow: "none",
  borderRadius: 0,
  fontWeight: 700,
  fontSize: "inherit",
};

const TABLE_TOOL_BUTTON_STYLE: CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--panel)",
  color: "var(--fg)",
  borderRadius: 8,
  padding: "0.45rem 0.65rem",
  boxShadow: "none",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const ACTIVE_TABLE_TOOL_BUTTON_STYLE: CSSProperties = {
  ...TABLE_TOOL_BUTTON_STYLE,
  borderColor: "var(--accent)",
  background: "rgba(15, 118, 110, 0.1)",
  color: "var(--accent)",
};

const EDIT_LINK_STYLE: CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--muted)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const STALE_UPDATE_BADGE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #facc15",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#854d0e",
  fontSize: "0.72rem",
  fontWeight: 800,
  lineHeight: 1,
  padding: "0.22rem 0.45rem",
  whiteSpace: "nowrap",
};

const INCOMPLETE_DATA_BADGE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #dc2626",
  borderRadius: 999,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: "0.72rem",
  fontWeight: 800,
  lineHeight: 1,
  padding: "0.22rem 0.45rem",
  whiteSpace: "nowrap",
};

const PRIVACY_BADGE_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #2563eb",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1e40af",
  fontSize: "0.72rem",
  fontWeight: 800,
  lineHeight: 1,
  padding: "0.22rem 0.45rem",
  whiteSpace: "nowrap",
};

export default function DashboardTableClient({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const strutturaParam = searchParams.get("struttura")?.trim() ?? "";
  const incompleteFilter = getIncompleteFilter(searchParams.get("dati_incompleti"));
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showDoveDorme, setShowDoveDorme] = useState(false);
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("");
  const [filters, setFilters] = useState<Filters>({
    guest: "",
    strutture: strutturaParam ? [strutturaParam] : [],
    stato: getInitialStato(incompleteFilter),
    submitted_at: "",
    updated_at: "",
  });

  const allStructures = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.struttura ?? "n/d"))).sort((a, b) =>
        a.localeCompare(b, "it-IT")
      ),
    [rows]
  );

  const tableRows = useMemo<RowView[]>(
    () =>
      rows.map((row) => {
        const guest =
          `${row.nome_della_persona ?? ""} ${row.cognome ?? ""}`.trim() ||
          row.submission_id ||
          row.id;
        const submittedAtLabel = formatDateTime(row.submitted_at);
        const updatedAtLabel = formatDateTime(row.updated_at);
        const stato = deriveGuestStatus(row);
        return {
          row,
          guest,
          struttura: row.struttura ?? "n/d",
          stato,
          doveDorme: row.dove_dorme?.trim() || "n/d",
          submittedAtLabel,
          updatedAtLabel,
          submittedAtTs: toTimestamp(row.submitted_at),
          updatedAtTs: toTimestamp(row.updated_at),
          needsUpdate: needsUpdateBadge(row),
          needsCompletion: hasIncompleteData(row),
          needsPrivacy: stato === "In accoglienza" && row.privacy_documents_count === 0,
        };
      }),
    [rows]
  );

  const filteredAndSorted = useMemo(() => {
    const filtered = tableRows.filter((item) => {
      if (
        filters.guest &&
        !item.guest.toLowerCase().includes(filters.guest.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filters.strutture.length > 0 &&
        !filters.strutture.includes(item.struttura)
      ) {
        return false;
      }
      if (filters.stato && item.stato !== filters.stato) {
        return false;
      }
      if (attentionFilter === "completion" && !item.needsCompletion) {
        return false;
      }
      if (attentionFilter === "update" && !item.needsUpdate) {
        return false;
      }
      if (attentionFilter === "privacy" && !item.needsPrivacy) {
        return false;
      }
      if (incompleteFilter && !matchesIncompleteDataFilter(item.row, incompleteFilter)) {
        return false;
      }
      if (
        filters.submitted_at &&
        !item.submittedAtLabel
          .toLowerCase()
          .includes(filters.submitted_at.trim().toLowerCase())
      ) {
        return false;
      }
      if (
        filters.updated_at &&
        !item.updatedAtLabel.toLowerCase().includes(filters.updated_at.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";

      if (sortKey === "guest") {
        left = a.guest.toLowerCase();
        right = b.guest.toLowerCase();
      } else if (sortKey === "struttura") {
        left = a.struttura.toLowerCase();
        right = b.struttura.toLowerCase();
      } else if (sortKey === "stato") {
        left = a.stato.toLowerCase();
        right = b.stato.toLowerCase();
      } else if (sortKey === "submitted_at") {
        left = a.submittedAtTs;
        right = b.submittedAtTs;
      } else if (sortKey === "updated_at") {
        left = a.updatedAtTs;
        right = b.updatedAtTs;
      }

      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tableRows, filters, attentionFilter, incompleteFilter, sortKey, sortDirection]);

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "submitted_at" || nextKey === "updated_at" ? "desc" : "asc");
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return "⇅";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  return (
    <>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p className="muted" style={{ margin: 0 }}>
          {filteredAndSorted.length} risultati (su {rows.length})
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={
              attentionFilter === "completion"
                ? ACTIVE_TABLE_TOOL_BUTTON_STYLE
                : TABLE_TOOL_BUTTON_STYLE
            }
            onClick={() =>
              setAttentionFilter((prev) => (prev === "completion" ? "" : "completion"))
            }
            aria-pressed={attentionFilter === "completion"}
          >
            Solo Da completare
          </button>
          <button
            type="button"
            style={
              attentionFilter === "update" ? ACTIVE_TABLE_TOOL_BUTTON_STYLE : TABLE_TOOL_BUTTON_STYLE
            }
            onClick={() => setAttentionFilter((prev) => (prev === "update" ? "" : "update"))}
            aria-pressed={attentionFilter === "update"}
          >
            Solo Da aggiornare
          </button>
          <button
            type="button"
            style={
              attentionFilter === "privacy"
                ? ACTIVE_TABLE_TOOL_BUTTON_STYLE
                : TABLE_TOOL_BUTTON_STYLE
            }
            onClick={() => setAttentionFilter((prev) => (prev === "privacy" ? "" : "privacy"))}
            aria-pressed={attentionFilter === "privacy"}
          >
            Solo Privacy
          </button>
          <button
            type="button"
            style={TABLE_TOOL_BUTTON_STYLE}
            onClick={() => setShowDoveDorme((prev) => !prev)}
            aria-pressed={showDoveDorme}
          >
            {showDoveDorme ? "Nascondi Dove dorme" : "Mostra Dove dorme"}
          </button>
          <button
            type="button"
            style={TABLE_TOOL_BUTTON_STYLE}
            onClick={() => {
              setFilters({
                guest: "",
                strutture: [],
                stato: "",
                submitted_at: "",
                updated_at: "",
              });
              setAttentionFilter("");
              router.replace(pathname);
            }}
          >
            Reset filtri
          </button>
        </div>
      </div>

      {incompleteFilter ? (
        <p className="muted" style={{ margin: "0 0 0.75rem" }}>
          Filtro da statistiche: {INCOMPLETE_FILTER_LABEL[incompleteFilter]}
          {filters.strutture.length === 1 ? ` - ${filters.strutture[0]}` : ""}
        </p>
      ) : null}

      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            minWidth: showDoveDorme ? 1100 : 940,
          }}
        >
          <thead>
            <tr>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("guest")}>
                  Ospite {sortArrow("guest")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("struttura")}>
                  Struttura {sortArrow("struttura")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("stato")}>
                  Stato {sortArrow("stato")}
                </button>
              </th>
              {showDoveDorme ? (
                <th align="left" style={HEADER_CELL_STYLE}>
                  Dove dorme
                </th>
              ) : null}
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("submitted_at")}>
                  Inviato {sortArrow("submitted_at")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("updated_at")}>
                  Ultima modifica {sortArrow("updated_at")}
                </button>
              </th>
            </tr>
            <tr>
              <th align="left" style={CELL_STYLE}>
                <input
                  value={filters.guest}
                  onChange={(event) => setFilters((prev) => ({ ...prev, guest: event.target.value }))}
                  placeholder="Filtra ospite"
                  style={FILTER_INPUT_STYLE}
                />
              </th>
              <th align="left" style={CELL_STYLE}>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, userSelect: "none" }}>
                    {filters.strutture.length > 0
                      ? `Strutture (${filters.strutture.length})`
                      : "Tutte le strutture"}
                  </summary>
                  <div
                    style={{
                      marginTop: 8,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 8,
                      display: "grid",
                      gap: 6,
                      maxHeight: 180,
                      overflowY: "auto",
                      background: "var(--panel)",
                    }}
                  >
                    {allStructures.map((struttura) => {
                      const checked = filters.strutture.includes(struttura);
                      return (
                        <label
                          key={struttura}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const isChecked = event.target.checked;
                              setFilters((prev) => ({
                                ...prev,
                                strutture: isChecked
                                  ? [...prev.strutture, struttura]
                                  : prev.strutture.filter((value) => value !== struttura),
                              }));
                            }}
                          />
                          <span>{struttura}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              </th>
              <th align="left" style={CELL_STYLE}>
                <select
                  value={filters.stato}
                  onChange={(event) => setFilters((prev) => ({ ...prev, stato: event.target.value }))}
                  style={FILTER_INPUT_STYLE}
                >
                  <option value="">Tutti</option>
                  <option value="In accoglienza">In accoglienza</option>
                  <option value="Uscito">Uscito</option>
                  <option value="Deceduto">Deceduto</option>
                </select>
              </th>
              {showDoveDorme ? <th align="left" style={CELL_STYLE} /> : null}
              <th align="left" style={CELL_STYLE}>
                <input
                  value={filters.submitted_at}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, submitted_at: event.target.value }))
                  }
                  placeholder="Filtra inviato"
                  style={FILTER_INPUT_STYLE}
                />
              </th>
              <th align="left" style={CELL_STYLE}>
                <input
                  value={filters.updated_at}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, updated_at: event.target.value }))
                  }
                  placeholder="Filtra modifica"
                  style={FILTER_INPUT_STYLE}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((item) => (
              <tr key={item.row.id}>
                <td style={CELL_STYLE}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Link
                      href={`/dashboard/submissions/${item.row.id}`}
                      aria-label={`Apri dettaglio di ${item.guest}`}
                      title={`Dettaglio: ${item.guest}`}
                      style={EDIT_LINK_STYLE}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </Link>
                    <strong>{item.guest}</strong>
                    {item.needsUpdate ? (
                      <span
                        style={STALE_UPDATE_BADGE_STYLE}
                        title="Nessun aggiornamento da più di sei mesi"
                      >
                        {STALE_UPDATE_BADGE_LABEL}
                      </span>
                    ) : null}
                    {item.needsCompletion ? (
                      <span
                        style={INCOMPLETE_DATA_BADGE_STYLE}
                        title="Record con dati obbligatori mancanti"
                      >
                        Da completare
                      </span>
                    ) : null}
                    {item.needsPrivacy ? (
                      <span
                        style={PRIVACY_BADGE_STYLE}
                        title="Privacy non ancora acquisita"
                      >
                        Privacy
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={CELL_STYLE}>{item.struttura}</td>
                <td style={CELL_STYLE}>{item.stato}</td>
                {showDoveDorme ? <td style={CELL_STYLE}>{item.doveDorme}</td> : null}
                <td style={{ ...CELL_STYLE, whiteSpace: "nowrap" }}>{item.submittedAtLabel}</td>
                <td style={{ ...CELL_STYLE, whiteSpace: "nowrap" }}>{item.updatedAtLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
