import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type CheckEmailBody = {
  email?: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function POST(req: Request) {
  let body: CheckEmailBody;
  try {
    body = (await req.json()) as CheckEmailBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: appUser, error } = await supabase
    .from("app_utenti")
    .select("id")
    .ilike("email", email)
    .eq("attivo", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Email check failed" }, { status: 500 });
  }

  if (!appUser) {
    return NextResponse.json(
      {
        code: "email_not_registered",
        error:
          "Questo indirizzo email non risulta registrato. Rivolgiti all'amministratore per essere registrato, oppure accedi con un altro indirizzo email.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
