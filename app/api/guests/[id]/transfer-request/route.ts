import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { sendGmailEmail } from "@/lib/email/gmail";
import { loadEmailSenderRuntimeSettings } from "@/lib/email/settings";
import { getCurrentStatus } from "@/lib/guests/status";
import { STRUTTURA_OPTIONS } from "@/lib/guests/status-update-options";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type TransferRequestBody = {
  targetStruttura?: string;
};

type AppUserRow = {
  id: string;
  email: string | null;
  nome: string | null;
  cognome: string | null;
  nome_completo: string | null;
};

function isAllowedStructure(value: string): boolean {
  return STRUTTURA_OPTIONS.includes(value as (typeof STRUTTURA_OPTIONS)[number]);
}

function displayUser(user: AppUserRow | null | undefined, fallbackEmail: string | null | undefined): string {
  const fullName = [user?.nome, user?.cognome].filter(Boolean).join(" ").trim();
  return fullName || user?.nome_completo || fallbackEmail || "un coordinatore";
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

  let body: TransferRequestBody = {};
  try {
    body = (await req.json()) as TransferRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const targetStruttura = (body.targetStruttura ?? "").trim();
  if (!targetStruttura || !isAllowedStructure(targetStruttura)) {
    return NextResponse.json({ error: "Accoglienza di destinazione non valida." }, { status: 400 });
  }

  if (role !== "admin" && role !== "manager") {
    const { data: canAccessTarget, error: targetAccessError } = await supabase.rpc(
      "can_access_struttura",
      { target_struttura: targetStruttura }
    );

    if (targetAccessError || !canAccessTarget) {
      return NextResponse.json(
        { error: "Non sei autorizzato sulla struttura di destinazione selezionata." },
        { status: 403 }
      );
    }
  }

  const serviceSupabase = createSupabaseServiceClient();
  const { data: guest, error: guestError } = await serviceSupabase
    .from("case_alloggio_submissions")
    .select("id,current_status,data_uscita,data_decesso,tipo_aggiornamento,struttura,nome_della_persona,cognome")
    .eq("id", id)
    .maybeSingle();

  if (guestError) {
    return NextResponse.json({ error: "Errore durante la lettura della scheda." }, { status: 500 });
  }

  if (!guest) {
    return NextResponse.json({ error: "Scheda non trovata." }, { status: 404 });
  }

  const currentStatus = getCurrentStatus(guest);
  if (currentStatus !== "IN_ACCOGLIENZA") {
    return NextResponse.json(
      { error: "La richiesta di trasferimento è disponibile solo per persone in accoglienza." },
      { status: 400 }
    );
  }

  const currentStruttura = guest.struttura?.trim() ?? "";
  if (!currentStruttura) {
    return NextResponse.json({ error: "La scheda non ha una struttura attuale." }, { status: 400 });
  }

  if (currentStruttura.toLowerCase() === targetStruttura.toLowerCase()) {
    return NextResponse.json(
      { error: "La struttura di destinazione deve essere diversa da quella attuale." },
      { status: 400 }
    );
  }

  const { data: assignments } = await serviceSupabase
    .from("app_utenti_strutture")
    .select("utente_id")
    .eq("struttura", currentStruttura);

  const coordinatorIds = Array.from(
    new Set((assignments ?? []).map((item) => item.utente_id).filter(Boolean))
  );

  if (coordinatorIds.length === 0) {
    return NextResponse.json(
      { error: "Nessun coordinatore trovato per la struttura attuale." },
      { status: 404 }
    );
  }

  const { data: coordinators } = await serviceSupabase
    .from("app_utenti")
    .select("id,email,nome,cognome,nome_completo")
    .in("id", coordinatorIds)
    .eq("attivo", true);

  const recipients = ((coordinators ?? []) as AppUserRow[])
    .map((coordinator) => coordinator.email?.trim())
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Nessun indirizzo email attivo trovato per i coordinatori della struttura attuale." },
      { status: 404 }
    );
  }

  const { data: requester } = appUserId
    ? await serviceSupabase
        .from("app_utenti")
        .select("id,email,nome,cognome,nome_completo")
        .eq("id", appUserId)
        .maybeSingle()
    : { data: null };

  const settings = await loadEmailSenderRuntimeSettings();
  if (!settings.gmailAppPassword) {
    return NextResponse.json({ error: "Configurazione email non disponibile." }, { status: 500 });
  }

  const guestName = `${guest.nome_della_persona ?? ""} ${guest.cognome ?? ""}`.trim() || "ospite";
  const requesterName = displayUser(requester as AppUserRow | null, user.email);
  const requesterEmail = requester?.email || user.email || null;
  const subject = `Richiesta trasferimento ospite: ${guestName}`;
  const text = [
    "Ciao,",
    "",
    `${requesterName} chiede il trasferimento di ${guestName}.`,
    "",
    `Struttura attuale: ${currentStruttura}`,
    `Nuova accoglienza richiesta: ${targetStruttura}`,
    "",
    "Per completare l'operazione, apri la scheda dell'ospite, scegli “Aggiorna lo stato” e seleziona “Trasferimento in altra accoglienza”.",
    "",
    requesterEmail ? `Contatto richiedente: ${requesterEmail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendGmailEmail(
    {
      to: recipients.join(", "),
      from: settings.senderEmail,
      replyTo: requesterEmail,
      subject,
      text,
    },
    {
      gmailUser: settings.gmailUser,
      gmailAppPassword: settings.gmailAppPassword,
      senderEmail: settings.senderEmail,
    }
  );

  return NextResponse.json({ ok: true, sentTo: recipients.length });
}
