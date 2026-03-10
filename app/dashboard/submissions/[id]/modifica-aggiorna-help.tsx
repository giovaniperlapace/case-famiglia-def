"use client";

import { useState } from "react";

export default function ModificaAggiornaHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--primary)",
          textDecoration: "underline",
          cursor: "pointer",
          padding: 0,
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.2,
          textAlign: "left",
          maxWidth: 220,
        }}
        title="Spiegazione differenza tra Modifica e Aggiorna"
      >
        Che differenza c&apos;è tra
        <br />
        Modifica e Aggiorna?
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Differenza tra Modifica e Aggiorna"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 640,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface, #fff)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)",
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>Quando usare “Modifica” e quando “Aggiorna”</h3>

            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Modifica i dati</p>
              <p style={{ margin: "4px 0 0" }}>
                Da usare per correggere dati già inseriti ma errati o non completi
                (es. data di nascita, contatto, nazionalità, altre informazioni anagrafiche).
              </p>
            </div>

            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Aggiorna lo stato</p>
              <p style={{ margin: "4px 0 0" }}>
                Da usare quando la situazione dell&apos;ospite cambia nel tempo
                (es. uscita dall&apos;accoglienza, nuovo lavoro, pensione, rientro).
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)}>
                Ho capito
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
