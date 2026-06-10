"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";

type PrivacyButtonProps = {
  guestId: string;
  nome: string | null;
  cognome: string | null;
  dataDiNascita: string | null;
  initialHasPrivacyDocuments: boolean;
  requiresPrivacy: boolean;
};

type UploadKind = "photo" | "upload";
type PrivacyDocumentType = "photo" | "upload" | "electronic_signature";
type PrivacyDocument = {
  id: string;
  document_type: PrivacyDocumentType;
  file_name: string;
  mime_type: string;
  created_at: string;
  signed_url: string | null;
};

const ERROR_MISSING_BIRTH_DATE =
  "Prima di stampare e inserire la privacy è necessario aggiungere la data di nascita.";
const ERROR_MISSING_REQUIRED_DATA =
  "Prima di stampare e inserire la privacy è necessario completare nome, cognome e data di nascita.";

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function formatDocumentType(type: PrivacyDocumentType): string {
  if (type === "photo") return "Certificato acquisito con foto";
  if (type === "upload") return "File privacy acquisito";
  return "Firma elettronica";
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "n/d";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function PrivacyButton({
  guestId,
  nome,
  cognome,
  dataDiNascita,
  initialHasPrivacyDocuments,
  requiresPrivacy,
}: PrivacyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<PrivacyDocument[]>([]);
  const [hasPrivacyDocuments, setHasPrivacyDocuments] = useState(initialHasPrivacyDocuments);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isMissingRequiredPrivacy = requiresPrivacy && !hasPrivacyDocuments;

  function validateGuest(): boolean {
    setError(null);
    setMessage(null);
    if (!hasValue(dataDiNascita)) {
      setError(ERROR_MISSING_BIRTH_DATE);
      return false;
    }
    if (!hasValue(nome) || !hasValue(cognome)) {
      setError(ERROR_MISSING_REQUIRED_DATA);
      return false;
    }
    return true;
  }

  async function loadDocuments() {
    setIsLoadingDocuments(true);
    setError(null);

    try {
      const response = await fetch(`/api/guests/${guestId}/privacy/documents`, {
        method: "GET",
      });
      const payload = (await response.json()) as {
        documents?: PrivacyDocument[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Impossibile caricare i documenti privacy.");
        return;
      }

      const nextDocuments = payload.documents ?? [];
      setDocuments(nextDocuments);
      setHasPrivacyDocuments(nextDocuments.length > 0);
    } catch {
      setError("Impossibile caricare i documenti privacy.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  function openPrivacyFlow() {
    if (!validateGuest()) return;
    setIsOpen(true);
    void loadDocuments();
  }

  async function printCertificate() {
    if (!validateGuest()) return;
    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/guests/${guestId}/privacy/certificate`, {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Impossibile generare il certificato privacy.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `privacy-${guestId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Certificato privacy generato correttamente.");
    } catch {
      setError("Impossibile generare il certificato privacy.");
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadFile(file: File, documentType: UploadKind) {
    if (!validateGuest()) return;
    setIsUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);

    try {
      const response = await fetch(`/api/guests/${guestId}/privacy/documents`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Impossibile salvare il documento privacy.");
        return;
      }
      setMessage("Documento privacy acquisito correttamente.");
      await loadDocuments();
    } catch {
      setError("Impossibile salvare il documento privacy.");
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadSignature() {
    if (!validateGuest()) return;
    if (!consentAccepted) {
      setError("Seleziona il consenso prima di salvare la firma elettronica.");
      return;
    }
    if (!hasSignature) {
      setError("Inserisci la firma nel riquadro prima di salvarla.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("document_type", "electronic_signature");
    formData.append("consent_accepted", "true");
    formData.append("signature_data_url", canvas.toDataURL("image/png"));

    try {
      const response = await fetch(`/api/guests/${guestId}/privacy/documents`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Impossibile salvare la firma privacy.");
        return;
      }
      setMessage("Firma privacy salvata correttamente.");
      setSignatureOpen(false);
      await loadDocuments();
    } catch {
      setError("Impossibile salvare la firma privacy.");
    } finally {
      setIsUploading(false);
    }
  }

  function resizeSignatureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  useEffect(() => {
    if (!signatureOpen) return;
    resizeSignatureCanvas();
    setHasSignature(false);
    window.addEventListener("resize", resizeSignatureCanvas);
    return () => window.removeEventListener("resize", resizeSignatureCanvas);
  }, [signatureOpen]);

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    drawingRef.current = true;
    lastPointRef.current = point;

    if (context && point) {
      context.beginPath();
      context.arc(point.x, point.y, 1, 0, Math.PI * 2);
      context.fillStyle = "#111827";
      context.fill();
      setHasSignature(true);
    }
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;
    const nextPoint = getCanvasPoint(event);
    if (!context || !lastPoint || !nextPoint) return;
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPointRef.current = nextPoint;
    setHasSignature(true);
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clearSignature() {
    resizeSignatureCanvas();
    setHasSignature(false);
  }

  async function deleteDocument(documentId: string) {
    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/guests/${guestId}/privacy/documents?document_id=${encodeURIComponent(documentId)}`,
        { method: "DELETE" }
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Impossibile cancellare il documento privacy.");
        return;
      }

      setMessage("Documento privacy cancellato.");
      await loadDocuments();
    } catch {
      setError("Impossibile cancellare il documento privacy.");
    } finally {
      setIsUploading(false);
    }
  }

  function openDocument(document: PrivacyDocument) {
    if (!document.signed_url) {
      setError("Documento non disponibile per la visualizzazione.");
      return;
    }
    window.open(document.signed_url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        onClick={openPrivacyFlow}
        style={
          hasPrivacyDocuments
            ? privacyCompletedButtonStyle
            : isMissingRequiredPrivacy
              ? privacyMissingButtonStyle
              : undefined
        }
        title={
          hasPrivacyDocuments
            ? "Privacy acquisita"
            : isMissingRequiredPrivacy
              ? "Privacy da acquisire"
              : "Gestisci privacy"
        }
      >
        Privacy
      </button>

      {error && !isOpen && !signatureOpen ? (
        <div role="alert" style={overlayStyle}>
          <div style={dialogStyle}>
            <h2 style={dialogTitleStyle}>Privacy</h2>
            <p style={{ marginTop: 0 }}>{error}</p>
            <button type="button" onClick={() => setError(null)}>
              Chiudi
            </button>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Gestione privacy" style={overlayStyle}>
          <div style={dialogStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h2 style={dialogTitleStyle}>Privacy</h2>
              <button type="button" onClick={() => setIsOpen(false)} style={secondaryButtonStyle}>
                Chiudi
              </button>
            </div>
            {isLoadingDocuments ? <p className="muted">Caricamento documenti privacy...</p> : null}
            {documents.length > 0 ? (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {documents.map((document) => (
                  <div key={document.id} style={documentRowStyle}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800 }}>{formatDocumentType(document.document_type)}</p>
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                        {formatDateTime(document.created_at)} · {document.file_name}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={isUploading || !document.signed_url}
                        onClick={() => openDocument(document)}
                      >
                        Visualizza
                      </button>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => void deleteDocument(document.id)}
                        style={dangerButtonStyle}
                      >
                        Cancella
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <button type="button" disabled={isUploading} onClick={() => void printCertificate()}>
                  Stampa il certificato in PDF da firmare
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  Acquisisci il certificato con una foto
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Acquisisci un file PDF, JPEG o PNG
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setSignatureOpen(true);
                  }}
                >
                  Firma il form in versione elettronica
                </button>
              </div>
            )}
            {message ? (
              <p role="status" style={{ color: "var(--accent)", fontWeight: 700 }}>
                {message}
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ color: "var(--danger)", fontWeight: 700 }}>
                {error}
              </p>
            ) : null}
            {isUploading ? <p className="muted">Salvataggio in corso...</p> : null}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file, "photo");
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file, "upload");
              }}
            />
          </div>
        </div>
      ) : null}

      {signatureOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Firma privacy"
          style={{ ...overlayStyle, zIndex: 60 }}
        >
          <div style={{ ...dialogStyle, width: "min(680px, calc(100vw - 2rem))" }}>
            <h2 style={dialogTitleStyle}>Firma elettronica privacy</h2>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Acconsento al trattamento dei dati personali e delle categorie particolari di dati
                per le finalità indicate nella liberatoria privacy.
              </span>
            </label>
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              style={{
                width: "100%",
                height: 220,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#ffffff",
                touchAction: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" disabled={isUploading} onClick={uploadSignature}>
                Salva firma
              </button>
              <button type="button" disabled={isUploading} onClick={clearSignature} style={secondaryButtonStyle}>
                Cancella firma
              </button>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setSignatureOpen(false)}
                style={secondaryButtonStyle}
              >
                Annulla
              </button>
            </div>
            {error ? (
              <p role="alert" style={{ color: "var(--danger)", fontWeight: 700 }}>
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  background: "rgba(17, 24, 39, 0.45)",
};

const dialogStyle: CSSProperties = {
  width: "min(520px, calc(100vw - 2rem))",
  maxHeight: "calc(100vh - 2rem)",
  overflow: "auto",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--panel)",
  padding: "1rem",
  boxShadow: "0 20px 50px rgba(17, 24, 39, 0.25)",
};

const dialogTitleStyle: CSSProperties = {
  margin: "0 0 0.75rem",
  fontSize: "1.25rem",
};

const secondaryButtonStyle: CSSProperties = {
  borderColor: "var(--border)",
  background: "#ffffff",
  color: "var(--fg)",
  boxShadow: "none",
};

const privacyCompletedButtonStyle: CSSProperties = {
  borderColor: "#166534",
  background: "linear-gradient(180deg, #22a56f 0%, #166534 100%)",
  boxShadow: "0 1px 2px rgba(22, 101, 52, 0.25)",
};

const privacyMissingButtonStyle: CSSProperties = {
  borderColor: "#991b1b",
  background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
  boxShadow: "0 1px 2px rgba(185, 28, 28, 0.28)",
};

const documentRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 10,
};

const dangerButtonStyle: CSSProperties = {
  borderColor: "var(--danger)",
  background: "#ffffff",
  color: "var(--danger)",
  boxShadow: "none",
};
