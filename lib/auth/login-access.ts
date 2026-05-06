import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type LoginAccessCheckResult =
  | { ok: true; email: string }
  | { ok: false; status: number; code: string; message?: string };

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeLoginEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function checkLoginAccess(
  emailInput: unknown
): Promise<LoginAccessCheckResult> {
  const email = normalizeLoginEmail(emailInput);

  if (!email || !EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_EMAIL",
      message: "Invalid email",
    };
  }

  const service = createSupabaseServiceClient();
  const { data: appUser, error } = await service
    .from("app_utenti")
    .select("id")
    .ilike("email", email)
    .eq("attivo", true)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      code: "CHECK_FAILED",
      message: "Email check failed",
    };
  }

  if (!appUser) {
    return {
      ok: false,
      status: 403,
      code: "EMAIL_NOT_REGISTERED",
      message:
        "Questo indirizzo email non risulta registrato. Rivolgiti all'amministratore per essere registrato, oppure accedi con un altro indirizzo email.",
    };
  }

  return { ok: true, email };
}
