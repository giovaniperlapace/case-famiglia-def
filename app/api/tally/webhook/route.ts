import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapCaseAlloggioSubmission } from "@/lib/tally/case-alloggio";
import {
  redactError,
  verifyTallySignature,
  type TallyPayload,
} from "@/lib/tally/webhook";

type WebhookLog = {
  source: string;
  event_type: string;
  submission_id: string | null;
  respondent_id: string | null;
  email: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  payload: unknown;
  normalized: unknown;
};

type UpsertAttemptResult = {
  error: { code?: string | null; message?: string | null } | null;
  droppedColumns: string[];
};

function extractMissingColumnName(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/'([^']+)' column of 'case_alloggio_submissions'/);
  return match?.[1] ?? null;
}

async function upsertCaseAlloggioWithSchemaFallback(
  payload: Record<string, unknown>
): Promise<UpsertAttemptResult> {
  const supabase = createSupabaseServiceClient();
  const row = { ...payload };
  const droppedColumns: string[] = [];

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase
      .from("case_alloggio_submissions")
      .upsert(row, { onConflict: "submission_id" });

    if (!error) {
      return { error: null, droppedColumns };
    }

    if (error.code !== "PGRST204") {
      return { error: { code: error.code ?? null, message: error.message ?? null }, droppedColumns };
    }

    const missingColumn = extractMissingColumnName(error.message);
    if (!missingColumn || !(missingColumn in row)) {
      return { error: { code: error.code ?? null, message: error.message ?? null }, droppedColumns };
    }

    delete row[missingColumn];
    droppedColumns.push(missingColumn);
  }

  return {
    error: { code: "PGRST204", message: "Exceeded schema fallback retries for webhook upsert" },
    droppedColumns,
  };
}

async function logWebhookEvent(entry: WebhookLog) {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("webhook_events").insert(entry);
  } catch (error) {
    console.error("Webhook event logging failed", {
      context: "tally_webhook_log",
      ...redactError(error),
    });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  let payload: TallyPayload = {};

  try {
    payload = JSON.parse(rawBody) as TallyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const webhookSecret = process.env.TALLY_WEBHOOK_SECRET?.trim() ?? "";
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Server webhook secret is not configured" },
      { status: 500 }
    );
  }

  const signatureHeader =
    req.headers.get("tally-signature") ||
    req.headers.get("x-tally-signature") ||
    req.headers.get("tally-signature-v1");

  if (!verifyTallySignature(rawBody, signatureHeader, webhookSecret)) {
    await logWebhookEvent({
      source: "tally",
      event_type: "form_submission",
      submission_id: null,
      respondent_id: null,
      email: null,
      status: "invalid_signature",
      error_code: "401",
      error_message: "Invalid signature",
      payload,
      normalized: null,
    });

    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const mapped = mapCaseAlloggioSubmission(payload);
  if (!mapped.submissionId) {
    await logWebhookEvent({
      source: "tally",
      event_type: "form_submission",
      submission_id: mapped.submissionId || null,
      respondent_id: mapped.respondentId || null,
      email: mapped.ownerEmail || null,
      status: "rejected_missing_fields",
      error_code: "400",
      error_message: "Missing required field (submission_id)",
      payload,
      normalized: mapped.row,
    });

    return NextResponse.json(
      { error: "Missing required field (submission_id)" },
      { status: 400 }
    );
  }

  try {
    const baseRow = {
      ...mapped.row,
      id_utente: mapped.row.id_utente ?? null,
      owner_email: mapped.ownerEmail ?? null,
      raw_payload: payload,
      mapped_answers: mapped.mappedAnswers,
    };

    const primaryUpsert = await upsertCaseAlloggioWithSchemaFallback(baseRow);
    const caseAlloggioError = primaryUpsert.error;

    if (
      caseAlloggioError?.code === "23503" &&
      (caseAlloggioError.message ?? "").includes("case_alloggio_submissions_id_utente_fkey")
    ) {
      const fallbackUpsert = await upsertCaseAlloggioWithSchemaFallback({
        ...baseRow,
        id_utente: null,
      });
      const fallbackError = fallbackUpsert.error;

      if (!fallbackError) {
        await logWebhookEvent({
          source: "tally",
          event_type: "form_submission",
          submission_id: mapped.submissionId,
          respondent_id: mapped.respondentId || null,
          email: mapped.ownerEmail,
          status: "success_id_utente_fallback",
          error_code: caseAlloggioError.code ?? null,
          error_message: caseAlloggioError.message ?? null,
          payload,
          normalized: {
            ...mapped.row,
            id_utente: null,
            _dropped_columns: fallbackUpsert.droppedColumns,
          },
        });

        return NextResponse.json({
          ok: true,
          duplicate_safe: true,
          id_utente_fallback: true,
        });
      }
    }

    if (caseAlloggioError) {
      await logWebhookEvent({
        source: "tally",
        event_type: "form_submission",
        submission_id: mapped.submissionId,
        respondent_id: mapped.respondentId || null,
        email: mapped.ownerEmail,
        status: "error",
        error_code: caseAlloggioError.code ?? null,
        error_message: caseAlloggioError.message ?? "Insert failed",
        payload,
        normalized: {
          ...mapped.row,
          _dropped_columns: primaryUpsert.droppedColumns,
        },
      });

      return NextResponse.json({ error: "Webhook ingestion failed" }, { status: 500 });
    }

    await logWebhookEvent({
      source: "tally",
      event_type: "form_submission",
      submission_id: mapped.submissionId,
      respondent_id: mapped.respondentId || null,
      email: mapped.ownerEmail,
      status: "success",
      error_code: null,
      error_message: null,
      payload,
      normalized: {
        ...mapped.row,
        _dropped_columns: primaryUpsert.droppedColumns,
      },
    });

    return NextResponse.json({ ok: true, duplicate_safe: true });
  } catch (error) {
    console.error("Tally webhook ingestion failed", {
      context: "tally_webhook_ingestion",
      ...redactError(error),
    });

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
