const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (EMAIL_REGEX.test(normalized)) return normalized;

  const bracketMatch = normalized.match(/<([^>]+)>/);
  const bracketEmail = bracketMatch?.[1]?.trim() ?? "";
  return EMAIL_REGEX.test(bracketEmail) ? bracketEmail : null;
}

function normalizeAppPassword(value: unknown): string {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/\s+/g, "") : "";
}

export const DEFAULT_GMAIL_SENDER_EMAIL =
  normalizeEmail(process.env.GMAIL_USER) || "accoglienzesantegidio@gmail.com";

export type EmailSenderRuntimeSettings = {
  senderEmail: string;
  gmailUser: string;
  gmailAppPassword: string;
};

export async function loadEmailSenderRuntimeSettings(): Promise<EmailSenderRuntimeSettings> {
  const senderEmail = DEFAULT_GMAIL_SENDER_EMAIL;
  const gmailUser = normalizeEmail(process.env.GMAIL_USER) || senderEmail;
  const gmailAppPassword = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD);

  return {
    senderEmail,
    gmailUser,
    gmailAppPassword,
  };
}
