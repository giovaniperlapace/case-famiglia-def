import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { checkLoginAccess } from "@/lib/auth/login-access";
import { sendGmailEmail } from "@/lib/email/gmail";
import { loadEmailSenderRuntimeSettings } from "@/lib/email/settings";

type MagicLinkBody = {
  email?: unknown;
  next?: unknown;
};

type GenerateLinkResponse = {
  hashed_token?: string;
  verification_type?: EmailOtpType;
  msg?: string;
  error?: string;
  error_description?: string;
};

const requestTimestampsByEmail = new Map<string, number>();
const REQUEST_INTERVAL_MS = 60_000;

function sanitizeNextPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (!input.startsWith("/") || input.startsWith("//")) return null;
  return input;
}

function getAppBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return origin.replace(/\/+$/, "");
}

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  return url.replace(/\/+$/, "");
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return key;
}

function getErrorMessage(payload: GenerateLinkResponse): string {
  return payload.msg || payload.error_description || payload.error || "Unable to generate magic link";
}

async function generateMagicLinkToken(email: string): Promise<{
  tokenHash: string;
  type: EmailOtpType;
}> {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GenerateLinkResponse;
  if (!response.ok || !payload.hashed_token || !payload.verification_type) {
    throw new Error(getErrorMessage(payload));
  }

  return {
    tokenHash: payload.hashed_token,
    type: payload.verification_type,
  };
}

function buildCallbackUrl(
  request: Request,
  input: { tokenHash: string; type: EmailOtpType; nextPath: string | null }
): string {
  const callbackUrl = new URL("/auth/callback", getAppBaseUrl(request));
  callbackUrl.searchParams.set("token_hash", input.tokenHash);
  callbackUrl.searchParams.set("type", input.type);
  if (input.nextPath) {
    callbackUrl.searchParams.set("next", input.nextPath);
  }
  return callbackUrl.toString();
}

function buildEmailHtml(link: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Accoglienze Comunità di Sant'Egidio</h1>
      <p>Hai richiesto l'accesso alla piattaforma Accoglienze della Comunità di Sant'Egidio.</p>
      <p><strong>Clicca sul link qui sotto per accedere in modo sicuro:</strong></p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Accedi alla piattaforma
        </a>
      </p>
      <p>Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
      <p style="word-break: break-all;"><a href="${link}">${link}</a></p>
      <p>Se usi Safari in modalità privata e il login non funziona, prova con Chrome.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MagicLinkBody;
    const access = await checkLoginAccess(body.email);

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, code: access.code, message: access.message },
        { status: access.status }
      );
    }

    const lastRequestAt = requestTimestampsByEmail.get(access.email) ?? 0;
    const now = Date.now();
    if (now - lastRequestAt < REQUEST_INTERVAL_MS) {
      return NextResponse.json({ ok: false, code: "RATE_LIMITED" }, { status: 429 });
    }
    requestTimestampsByEmail.set(access.email, now);

    const token = await generateMagicLinkToken(access.email);
    const link = buildCallbackUrl(request, {
      tokenHash: token.tokenHash,
      type: token.type,
      nextPath: sanitizeNextPath(body.next),
    });
    const settings = await loadEmailSenderRuntimeSettings();

    if (!settings.gmailAppPassword) {
      throw new Error("Missing Gmail app password");
    }

    await sendGmailEmail(
      {
        to: access.email,
        from: settings.senderEmail,
        subject: "Accoglienze Sant'Egidio - Magic link",
        text: [
          "Accoglienze Comunità di Sant'Egidio",
          "",
          "Hai richiesto l'accesso alla piattaforma Accoglienze della Comunità di Sant'Egidio.",
          "",
          "Clicca sul link qui sotto per accedere in modo sicuro:",
          link,
          "",
          "Se usi Safari in modalità privata e il login non funziona, prova con Chrome.",
        ].join("\n"),
        html: buildEmailHtml(link),
      },
      {
        gmailUser: settings.gmailUser,
        gmailAppPassword: settings.gmailAppPassword,
        senderEmail: settings.senderEmail,
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "MAGIC_LINK_FAILED",
        message: error instanceof Error ? error.message : "Unable to send magic link",
      },
      { status: 500 }
    );
  }
}
