import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/server";
import { createPrivacyCertificatePdf } from "@/lib/privacy/certificate-pdf";

type PrivacyGuestRow = {
  nome_della_persona: string | null;
  cognome: string | null;
  data_di_nascita: string | null;
  luogo_di_nascita: string | null;
};

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { supabase, user, role } = await getServerAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: guest, error } = await supabase
    .from("case_alloggio_submissions")
    .select("nome_della_persona,cognome,data_di_nascita,luogo_di_nascita")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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

  const pdf = createPrivacyCertificatePdf({
    nome: row.nome_della_persona,
    cognome: row.cognome,
    dataDiNascita: row.data_di_nascita,
    luogoDiNascita: row.luogo_di_nascita,
  });
  const fileName = `privacy-${id}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
