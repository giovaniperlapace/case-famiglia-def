import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const PRIVACY_BUCKET = "guest-privacy-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const DOCUMENT_TYPES = new Set(["photo", "upload", "electronic_signature"]);

type DocumentType = "photo" | "upload" | "electronic_signature";

type PrivacyGuestRow = {
  id: string;
  nome_della_persona: string | null;
  cognome: string | null;
  data_di_nascita: string | null;
};

type PrivacyDocumentRow = {
  id: string;
  document_type: DocumentType;
  file_bucket: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  consent_accepted: boolean | null;
  created_at: string;
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

async function requireAuthorizedGuest(id: string) {
  const { supabase, user, role, appUserId } = await getServerAuthContext();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      appUserId,
    };
  }

  if (!role) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      appUserId,
    };
  }

  const { data: guest, error: guestError } = await supabase
    .from("case_alloggio_submissions")
    .select("id,nome_della_persona,cognome,data_di_nascita")
    .eq("id", id)
    .maybeSingle();

  if (guestError) {
    return {
      error: NextResponse.json({ error: guestError.message }, { status: 400 }),
      appUserId,
    };
  }

  if (!guest) {
    return {
      error: NextResponse.json({ error: "Guest not found" }, { status: 404 }),
      appUserId,
    };
  }

  return { guest: guest as PrivacyGuestRow, appUserId };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const authorized = await requireAuthorizedGuest(id);

  if (authorized.error) {
    return authorized.error;
  }

  const service = createSupabaseServiceClient();
  const { data: documents, error } = await service
    .from("guest_privacy_documents")
    .select(
      "id,document_type,file_bucket,file_path,file_name,mime_type,file_size,consent_accepted,created_at"
    )
    .eq("guest_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const documentsWithUrls = await Promise.all(
    ((documents ?? []) as PrivacyDocumentRow[]).map(async (document) => {
      const { data: signed, error: signedError } = await service.storage
        .from(document.file_bucket)
        .createSignedUrl(document.file_path, 60 * 10);

      return {
        id: document.id,
        document_type: document.document_type,
        file_name: document.file_name,
        mime_type: document.mime_type,
        file_size: document.file_size,
        consent_accepted: document.consent_accepted,
        created_at: document.created_at,
        signed_url: signedError ? null : signed.signedUrl,
      };
    })
  );

  return NextResponse.json({ documents: documentsWithUrls });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const authorized = await requireAuthorizedGuest(id);

  if (authorized.error) {
    return authorized.error;
  }

  const row = authorized.guest;
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
      created_by: authorized.appUserId,
    })
    .select("id,created_at,document_type,file_name")
    .single();

  if (insertError) {
    await service.storage.from(PRIVACY_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ document: inserted });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const authorized = await requireAuthorizedGuest(id);

  if (authorized.error) {
    return authorized.error;
  }

  const url = new URL(req.url);
  const documentId = url.searchParams.get("document_id");

  if (!documentId) {
    return NextResponse.json({ error: "Documento privacy mancante." }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: document, error: documentError } = await service
    .from("guest_privacy_documents")
    .select("id,file_bucket,file_path")
    .eq("id", documentId)
    .eq("guest_id", id)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 400 });
  }

  if (!document) {
    return NextResponse.json({ error: "Documento privacy non trovato." }, { status: 404 });
  }

  const row = document as Pick<PrivacyDocumentRow, "file_bucket" | "file_path">;
  const { error: storageError } = await service.storage
    .from(row.file_bucket)
    .remove([row.file_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 400 });
  }

  const { error: deleteError } = await service
    .from("guest_privacy_documents")
    .delete()
    .eq("id", documentId)
    .eq("guest_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
