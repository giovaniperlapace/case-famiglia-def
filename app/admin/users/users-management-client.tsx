"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type AppRole = "admin" | "manager" | "responsabile_casa";

type AdminUser = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email: string;
  telefono: string | null;
  ruolo: AppRole;
  strutture: string[];
};

type UsersManagementClientProps = {
  initialUsers: AdminUser[];
  availableStructures: string[];
};

type FormState = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: AppRole;
  strutture: string[];
};

type SortKey = "nome" | "cognome" | "email" | "telefono" | "ruolo" | "strutture";

type SortDirection = "asc" | "desc";

type Filters = {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: AppRole | "";
  strutture: string[];
};

const EMPTY_FILTERS: Filters = {
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
  ruolo: "",
  strutture: [],
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

function normalizeInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSearchValue(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function getSortValue(user: AdminUser, sortKey: SortKey) {
  if (sortKey === "strutture") {
    return user.strutture.join(", ").toLowerCase();
  }
  return normalizeSearchValue(user[sortKey]);
}

export default function UsersManagementClient({
  initialUsers,
  availableStructures,
}: UsersManagementClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [sortKey, setSortKey] = useState<SortKey>("cognome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [editorMode, setEditorMode] = useState<"create" | "edit" | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter((user) => {
      if (filters.nome && !normalizeSearchValue(user.nome).includes(filters.nome.trim().toLowerCase())) {
        return false;
      }
      if (
        filters.cognome &&
        !normalizeSearchValue(user.cognome).includes(filters.cognome.trim().toLowerCase())
      ) {
        return false;
      }
      if (filters.email && !normalizeSearchValue(user.email).includes(filters.email.trim().toLowerCase())) {
        return false;
      }
      if (
        filters.telefono &&
        !normalizeSearchValue(user.telefono).includes(filters.telefono.trim().toLowerCase())
      ) {
        return false;
      }
      if (filters.ruolo && user.ruolo !== filters.ruolo) {
        return false;
      }
      if (
        filters.strutture.length > 0 &&
        !filters.strutture.some((struttura) => user.strutture.includes(struttura))
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const left = getSortValue(a, sortKey);
      const right = getSortValue(b, sortKey);
      const comparison = left.localeCompare(right, "it-IT");
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filters, sortDirection, sortKey, users]);

  function setSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return "⇅";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function openEditor(user: AdminUser) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setEditorMode("edit");
    setEditingUserId(user.id);
    setForm({
      nome: user.nome ?? "",
      cognome: user.cognome ?? "",
      email: user.email ?? "",
      telefono: user.telefono ?? "",
      ruolo: user.ruolo,
      strutture: [...user.strutture],
    });
    setFeedback(null);
  }

  function openCreator() {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setEditorMode("create");
    setEditingUserId(null);
    setForm({
      nome: "",
      cognome: "",
      email: "",
      telefono: "",
      ruolo: "responsabile_casa",
      strutture: [],
    });
    setFeedback(null);
  }

  function closeEditor() {
    setEditorMode(null);
    setEditingUserId(null);
    setForm(null);
    setIsSaving(false);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }

  useEffect(() => {
    if (!editorMode) return;

    const timer = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditor();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editorMode]);

  function toggleStructure(struttura: string) {
    if (!form) return;

    const exists = form.strutture.includes(struttura);
    const next = exists
      ? form.strutture.filter((value) => value !== struttura)
      : [...form.strutture, struttura];
    setForm({ ...form, strutture: next });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editorMode || !form) return;

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setFeedback({ type: "error", text: "Inserisci un indirizzo email valido." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const isCreate = editorMode === "create";
      if (!isCreate && !editingUserId) {
        setFeedback({ type: "error", text: "Utente non valido per modifica." });
        setIsSaving(false);
        return;
      }
      const targetUrl = isCreate ? "/api/admin/users" : `/api/admin/users/${editingUserId}`;
      const method = isCreate ? "POST" : "PATCH";

      const response = await fetch(targetUrl, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: normalizeInput(form.nome),
          cognome: normalizeInput(form.cognome),
          email: normalizedEmail,
          telefono: normalizeInput(form.telefono),
          ruolo: form.ruolo,
          strutture: form.strutture,
        }),
      });

      const payload = (await response.json()) as
        | {
            user: AdminUser;
          }
        | {
            error: string;
          };

      if (!response.ok || !("user" in payload)) {
        setFeedback({
          type: "error",
          text: "error" in payload ? payload.error : "Salvataggio non riuscito.",
        });
        setIsSaving(false);
        return;
      }

      setUsers((current) =>
        isCreate
          ? [...current, payload.user].sort((a, b) =>
              `${a.cognome ?? ""} ${a.nome ?? ""}`.localeCompare(
                `${b.cognome ?? ""} ${b.nome ?? ""}`,
                "it-IT"
              )
            )
          : current.map((user) => (user.id === payload.user.id ? payload.user : user))
      );
      setFeedback({
        type: "success",
        text: isCreate ? "Utente creato con successo." : "Utente aggiornato con successo.",
      });
      closeEditor();
    } catch {
      setFeedback({ type: "error", text: "Errore di rete durante il salvataggio." });
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Users</h2>
        <button type="button" onClick={openCreator}>
          Nuovo utente
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Gestione utenti e assegnazioni case.
      </p>

      {feedback ? (
        <p style={{ color: feedback.type === "error" ? "var(--danger)" : "var(--accent)" }}>
          {feedback.text}
        </p>
      ) : null}

      {users.length === 0 ? <p className="muted">Nessun utente registrato.</p> : null}

      {users.length > 0 ? (
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
              {filteredAndSortedUsers.length} risultati (su {users.length})
            </p>
            <button
              type="button"
              style={TABLE_TOOL_BUTTON_STYLE}
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Reset filtri
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 980 }}>
              <thead>
                <tr>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("nome")}>
                      First name {sortArrow("nome")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("cognome")}>
                      Last name {sortArrow("cognome")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("email")}>
                      Email {sortArrow("email")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("telefono")}>
                      Phone {sortArrow("telefono")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("ruolo")}>
                      Role {sortArrow("ruolo")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    <button type="button" style={TABLE_HEADER_BUTTON_STYLE} onClick={() => setSort("strutture")}>
                      Houses {sortArrow("strutture")}
                    </button>
                  </th>
                  <th align="left" style={HEADER_CELL_STYLE}>
                    Actions
                  </th>
                </tr>
                <tr>
                  <th align="left" style={CELL_STYLE}>
                    <input
                      value={filters.nome}
                      onChange={(event) => setFilters((prev) => ({ ...prev, nome: event.target.value }))}
                      placeholder="Filtra nome"
                      style={FILTER_INPUT_STYLE}
                    />
                  </th>
                  <th align="left" style={CELL_STYLE}>
                    <input
                      value={filters.cognome}
                      onChange={(event) => setFilters((prev) => ({ ...prev, cognome: event.target.value }))}
                      placeholder="Filtra cognome"
                      style={FILTER_INPUT_STYLE}
                    />
                  </th>
                  <th align="left" style={CELL_STYLE}>
                    <input
                      value={filters.email}
                      onChange={(event) => setFilters((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Filtra email"
                      style={FILTER_INPUT_STYLE}
                    />
                  </th>
                  <th align="left" style={CELL_STYLE}>
                    <input
                      value={filters.telefono}
                      onChange={(event) => setFilters((prev) => ({ ...prev, telefono: event.target.value }))}
                      placeholder="Filtra telefono"
                      style={FILTER_INPUT_STYLE}
                    />
                  </th>
                  <th align="left" style={CELL_STYLE}>
                    <select
                      value={filters.ruolo}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, ruolo: event.target.value as AppRole | "" }))
                      }
                      style={FILTER_INPUT_STYLE}
                    >
                      <option value="">Tutti</option>
                      <option value="responsabile_casa">responsabile_casa</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </th>
                  <th align="left" style={CELL_STYLE}>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 13, userSelect: "none" }}>
                        {filters.strutture.length > 0
                          ? `Case (${filters.strutture.length})`
                          : "Tutte le case"}
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
                        {availableStructures.map((struttura) => {
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
                  <th align="left" style={CELL_STYLE} />
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={CELL_STYLE}>
                      <span className="muted">Nessun utente corrisponde ai filtri.</span>
                    </td>
                  </tr>
                ) : null}
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={CELL_STYLE}>{user.nome ?? "—"}</td>
                    <td style={CELL_STYLE}>{user.cognome ?? "—"}</td>
                    <td style={CELL_STYLE}>{user.email}</td>
                    <td style={CELL_STYLE}>{user.telefono ?? "—"}</td>
                    <td style={CELL_STYLE}>{user.ruolo}</td>
                    <td style={CELL_STYLE}>
                      {user.strutture.length > 0 ? user.strutture.join(", ") : "—"}
                    </td>
                    <td style={CELL_STYLE}>
                      <button type="button" onClick={() => openEditor(user)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {editorMode && form ? (
        <div
          role="presentation"
          onClick={closeEditor}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 30,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100vw)",
              height: "100%",
              background: "var(--panel)",
              borderLeft: "1px solid var(--border)",
              padding: "1rem",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 id="edit-user-title" style={{ margin: 0 }}>
                {editorMode === "create" ? "Nuovo utente" : "Edit user"}
              </h3>
              <button type="button" onClick={closeEditor}>
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
              <label htmlFor="edit-nome">First name</label>
              <input
                ref={firstFieldRef}
                id="edit-nome"
                type="text"
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />

              <label htmlFor="edit-cognome">Last name</label>
              <input
                id="edit-cognome"
                type="text"
                value={form.cognome}
                onChange={(event) => setForm({ ...form, cognome: event.target.value })}
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />

              <label htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />

              <label htmlFor="edit-telefono">Phone</label>
              <input
                id="edit-telefono"
                type="text"
                value={form.telefono}
                onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              />

              <label htmlFor="edit-ruolo">Ruolo</label>
              <select
                id="edit-ruolo"
                value={form.ruolo}
                onChange={(event) =>
                  setForm({
                    ...form,
                    ruolo: event.target.value as AppRole,
                  })
                }
                style={{
                  width: "100%",
                  marginTop: 8,
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <option value="responsabile_casa">responsabile_casa</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>

              <fieldset
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0.75rem",
                  margin: "0 0 1rem",
                }}
              >
                <legend>Houses</legend>
                {availableStructures.length === 0 ? (
                  <p className="muted" style={{ marginTop: 0 }}>
                    Nessuna casa disponibile.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {availableStructures.map((struttura) => (
                      <label key={struttura} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={form.strutture.includes(struttura)}
                          onChange={() => toggleStructure(struttura)}
                        />
                        <span>{struttura}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={closeEditor} disabled={isSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
