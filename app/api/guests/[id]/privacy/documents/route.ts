import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const PRIVACY_BUCKET = "guest-privacy-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const DOCUMENT_TYPES = new Set(["photo", "upload", "electronic_signature"]);

type DocumentType = "photo" | "upload" | "electronic_signature";

type PrivacyGuestRow = {
  nome_della_persona: string | null;
  cognome: string | null;
  data_di_nascita: string | null;
};

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extensionForType(type: string): string {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  return "jpg";
}

async function readSignatureFile(formData: FormData): Promise<File | null> {
  const signatureDataUrl = formData.get("signature_data_url");
  if (typeof signatureDataUrl !== "string" || !signatureDataUrl.startsWith("data:image/png;base64,")) {
    return null;
  }

  const base64 = signatureDataUrl.slice("data:image/png;base64,".length);
  const bytes = Buffer.from(base64, "base64");
  return new File([bytes], "firma-privacy.png", { type: "image/png" });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, role, appUserId } = await getServerAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: guest, error: guestError } = await supabase
    .from("case_alloggio_submissions")
    .select("nome_della_persona,cognome,data_di_nascita")
    .eq("id", id)
    .maybeSingle();

  if (guestError) {
    return NextResponse.json({ error: guestError.message }, { status: 400 });
  }

  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const row = guest as PrivacyGuestRow;
  if (!hasValue(row.data_di_nascita)) {
    return NextResponse.json(
      {
        error:
          "Prima di stampare e inserire la privacy è necessario aggiungere la data di nascita.",
      },
      { status: 400 }
    );
  }

  if (!hasValue(row.nome_della_persona) || !hasValue(row.cognome)) {
    return NextResponse.json(
      {
        error:
          "Prima di stampare e inserire la privacy è necessario completare nome, cognome e data di nascita.",
      },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const rawDocumentType = formData.get("document_type");
  if (typeof rawDocumentType !== "string" || !DOCUMENT_TYPES.has(rawDocumentType)) {
    return NextResponse.json({ error: "Tipo documento privacy non valido." }, { status: 400 });
  }

  const documentType = rawDocumentType as DocumentType;
  const consentAccepted = formData.get("consent_accepted") === "true";
  let file = formData.get("file");

  if (documentType === "electronic_signature") {
    if (!consentAccepted) {
      return NextResponse.json(
        { error: "Per firmare in versione elettronica è necessario selezionare il consenso." },
        { status: 400 }
      );
    }
    file = await readSignatureFile(formData);
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Nessun file privacy acquisito." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Il file privacy non può superare 10 MB." }, { status: 400 });
  }

  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato non valido. Usa PDF, JPEG o PNG." },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  const extension = extensionForType(file.type);
  const baseName = sanitizeFileName(file.name || `privacy.${extension}`) || `privacy.${extension}`;
  const storagePath = `${id}/${Date.now()}-${crypto.randomUUID()}-${baseName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await service.storage
    .from(PRIVACY_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await service
    .from("guest_privacy_documents")
    .insert({
      guest_id: id,
      document_type: documentType,
      file_bucket: PRIVACY_BUCKET,
      file_path: storagePath,
      file_name: baseName,
      mime_type: file.type,
      file_size: file.size,
      consent_accepted: documentType === "electronic_signature" ? consentAccepted : null,
      created_by: appUserId,
    })
    .select("id,created_at,document_type,file_name")
    .single();

  if (insertError) {
    await service.storage.from(PRIVACY_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ document: inserted });
}
