#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="${1:-}"

cat <<'MSG'
Local webhook verification script.

1) Start app: npm run dev
2) Set payload below and generate signature.
3) Send same payload twice to prove idempotent upsert on tally_submission_id.
MSG

PAYLOAD='{"data":{"submissionId":"subm_001","respondentId":"resp_001","createdAt":"2026-03-02T18:00:00Z","fields":[{"label":"Email","value":"alice@example.com"},{"label":"Name","value":"Alice"}]}}'

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "Dry run OK: webhook verification script is present."
  echo "Sample payload: $PAYLOAD"
  exit 0
fi

if [[ -z "${TALLY_WEBHOOK_SECRET:-}" ]]; then
  echo "TALLY_WEBHOOK_SECRET is required"
  exit 1
fi

SIGNATURE=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$TALLY_WEBHOOK_SECRET" -binary | openssl base64)

echo "\nFirst call:"
curl -sS -X POST "http://localhost:3000/api/tally/webhook" \
  -H "content-type: application/json" \
  -H "tally-signature: sha256=$SIGNATURE" \
  --data "$PAYLOAD"

echo "\n\nSecond call (same payload; should not duplicate):"
curl -sS -X POST "http://localhost:3000/api/tally/webhook" \
  -H "content-type: application/json" \
  -H "tally-signature: sha256=$SIGNATURE" \
  --data "$PAYLOAD"

echo "\n\nThen verify in SQL:"
echo "select tally_submission_id, count(*) from public.submissions group by tally_submission_id;"
