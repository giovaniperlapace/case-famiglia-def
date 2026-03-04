"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type AdminUser = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email: string;
  telefono: string | null;
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
  strutture: string[];
};

function normalizeInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function UsersManagementClient({
  initialUsers,
  availableStructures,
}: UsersManagementClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) ?? null,
    [users, editingUserId]
  );

  function openEditor(user: AdminUser) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setEditingUserId(user.id);
    setForm({
      nome: user.nome ?? "",
      cognome: user.cognome ?? "",
      email: user.email ?? "",
      telefono: user.telefono ?? "",
      strutture: [...user.strutture],
    });
    setFeedback(null);
  }

  function closeEditor() {
    setEditingUserId(null);
    setForm(null);
    setIsSaving(false);
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }

  useEffect(() => {
    if (!editingUserId) return;

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
  }, [editingUserId]);

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
    if (!editingUserId || !form) return;

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setFeedback({ type: "error", text: "Inserisci un indirizzo email valido." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: normalizeInput(form.nome),
          cognome: normalizeInput(form.cognome),
          email: normalizedEmail,
          telefono: normalizeInput(form.telefono),
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
        current.map((user) => (user.id === payload.user.id ? payload.user : user))
      );
      setFeedback({ type: "success", text: "Utente aggiornato con successo." });
      closeEditor();
    } catch {
      setFeedback({ type: "error", text: "Errore di rete durante il salvataggio." });
      setIsSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Users</h2>
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
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  First name
                </th>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  Last name
                </th>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  Email
                </th>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  Phone
                </th>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  Houses
                </th>
                <th align="left" style={{ borderBottom: "1px solid var(--border)", padding: "0 0 10px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    {user.nome ?? "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    {user.cognome ?? "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    {user.email}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    {user.telefono ?? "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    {user.strutture.length > 0 ? user.strutture.join(", ") : "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
                    <button type="button" onClick={() => openEditor(user)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editingUser && form ? (
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
                Edit user
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
