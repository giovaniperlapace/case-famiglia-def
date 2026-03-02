import crypto from "crypto";

export type TallyPayload = Record<string, unknown> & {
  data?: {
    fields?: Array<Record<string, unknown>>;
    submissionId?: unknown;
    respondentId?: unknown;
    createdAt?: unknown;
  };
  fields?: Array<Record<string, unknown>>;
  submissionId?: unknown;
  respondentId?: unknown;
  createdAt?: unknown;
};

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(normalizeText).join(", ");
  return String(value).trim();
}

type TallyOption = {
  id?: string;
  optionId?: string;
  text?: string;
  label?: string;
  value?: unknown;
};

type TallyField = {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  value?: unknown;
  options?: TallyOption[];
};

export function verifyTallySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const cleaned = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const a = Buffer.from(cleaned);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function optionId(option: TallyOption): string {
  return normalizeText(option.id || option.optionId);
}

function optionText(option: TallyOption, fallback: string): string {
  const valueText =
    typeof option.value === "string" ? option.value : normalizeText(option.value);
  return normalizeText(option.text || option.label || valueText || fallback);
}

function mapOptionValue(options: TallyOption[], raw: unknown): string {
  const rawNorm = normalizeText(raw);
  if (!rawNorm) return "";

  const match = options.find((opt) => optionId(opt) === rawNorm);
  if (match) return optionText(match, rawNorm);
  return rawNorm;
}

function extractFieldValue(field: TallyField): string {
  const options = Array.isArray(field.options) ? field.options : [];
  const raw = field.value;

  if (Array.isArray(raw)) {
    if (options.length > 0) {
      return raw.map((value) => mapOptionValue(options, value)).join(", ");
    }
    return raw.map((value) => normalizeText(value)).join(", ");
  }

  if (raw && typeof raw === "object") {
    const objectText = normalizeText((raw as Record<string, unknown>).text);
    if (objectText) return objectText;
  }

  if (options.length > 0) {
    return mapOptionValue(options, raw);
  }

  return normalizeText(raw);
}

export function extractTallyAnswers(payload: TallyPayload): Record<string, string> {
  const answers: Record<string, string> = {};
  const fields = (payload.data?.fields ?? payload.fields ?? []) as TallyField[];

  for (const field of fields) {
    const label = normalizeText(
      field.label ?? field.name ?? field.key ?? field.id ?? ""
    );
    if (!label) continue;
    answers[label] = extractFieldValue(field);
  }

  for (const [key, value] of Object.entries(payload ?? {})) {
    if (!(key in answers)) {
      answers[key] = normalizeText(value);
    }
  }

  return answers;
}

function pickFirst(answers: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = answers[key];
    if (value) return value;
  }
  return "";
}

export function normalizeTallySubmission(payload: TallyPayload) {
  const answers = extractTallyAnswers(payload);
  const submissionId =
    normalizeText(payload.data?.submissionId ?? payload.submissionId) ||
    pickFirst(answers, ["Submission ID", '\ufeff"Submission ID"']);

  const respondentId =
    normalizeText(payload.data?.respondentId ?? payload.respondentId) ||
    pickFirst(answers, ["Respondent ID"]);

  const ownerEmail =
    pickFirst(answers, ["Email", "email", "e-mail"]).toLowerCase() ||
    normalizeText(payload.email).toLowerCase();

  const submittedAt =
    normalizeText(payload.data?.createdAt ?? payload.createdAt) ||
    new Date().toISOString();

  return {
    submissionId,
    respondentId,
    ownerEmail,
    submittedAt,
    answers,
  };
}

export function redactError(error: unknown): { message: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Unexpected error" };
}
