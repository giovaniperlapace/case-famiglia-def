"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type SubmissionRow = {
  id: string;
  submission_id: string | null;
  submitted_at: string | null;
  updated_at: string;
  struttura: string | null;
  nome_della_persona: string | null;
  cognome: string | null;
  tipo_aggiornamento: string | null;
  data_uscita: string | null;
  data_decesso: string | null;
  data_decesso_2: string | null;
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

type RowView = {
  row: SubmissionRow;
  guest: string;
  struttura: string;
  stato: string;
  submittedAtLabel: string;
  updatedAtLabel: string;
  submittedAtTs: number;
  updatedAtTs: number;
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
  if (row.data_decesso || row.data_decesso_2) return "Deceduto";
  if (row.data_uscita) return "Uscito";
  const updateType = (row.tipo_aggiornamento ?? "").toLowerCase();
  if (updateType.includes("decesso")) return "Deceduto";
  if (updateType.includes("uscita")) return "Uscito";
  return "In accoglienza";
}

function toTimestamp(value: string | null) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

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

export default function DashboardTableClient({ rows }: { rows: SubmissionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<Filters>({
    guest: "",
    strutture: [],
    stato: "",
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
        return {
          row,
          guest,
          struttura: row.struttura ?? "n/d",
          stato: deriveGuestStatus(row),
          submittedAtLabel,
          updatedAtLabel,
          submittedAtTs: toTimestamp(row.submitted_at),
          updatedAtTs: toTimestamp(row.updated_at),
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
  }, [tableRows, filters, sortKey, sortDirection]);

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
        <button
          type="button"
          onClick={() =>
            setFilters({
              guest: "",
              strutture: [],
              stato: "",
              submitted_at: "",
              updated_at: "",
            })
          }
        >
          Reset filtri
        </button>
      </div>

      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 940 }}>
          <thead>
            <tr>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" onClick={() => setSort("guest")}>
                  Ospite {sortArrow("guest")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" onClick={() => setSort("struttura")}>
                  Struttura {sortArrow("struttura")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" onClick={() => setSort("stato")}>
                  Stato {sortArrow("stato")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" onClick={() => setSort("submitted_at")}>
                  Inviato {sortArrow("submitted_at")}
                </button>
              </th>
              <th align="left" style={HEADER_CELL_STYLE}>
                <button type="button" onClick={() => setSort("updated_at")}>
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
                    <strong>{item.guest}</strong>
                    <Link
                      href={`/dashboard/submissions/${item.row.id}`}
                      aria-label={`Apri dettaglio di ${item.guest}`}
                      title={`Dettaglio: ${item.guest}`}
                      style={{
                        width: 28,
                        height: 28,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: "var(--panel)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      👁
                    </Link>
                  </div>
                </td>
                <td style={CELL_STYLE}>{item.struttura}</td>
                <td style={CELL_STYLE}>{item.stato}</td>
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
