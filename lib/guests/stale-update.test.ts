import assert from "node:assert/strict";
import test from "node:test";
import { getLatestGuestUpdateDate, needsUpdateBadge } from "./stale-update.ts";

const NOW = new Date("2026-06-05T12:00:00.000Z");

test("needsUpdateBadge marks guests without recent contact for update", () => {
  assert.equal(needsUpdateBadge({ data_ultimo_contatto: "2025-12-04" }, NOW), true);
  assert.equal(needsUpdateBadge({ data_ultimo_contatto: "2025-12-06" }, NOW), false);
});

test("needsUpdateBadge uses exit date for exited guests", () => {
  assert.equal(
    needsUpdateBadge(
      { current_status: "USCITO", data_uscita: "2025-12-04", submitted_at: "2026-05-01" },
      NOW
    ),
    true
  );
  assert.equal(
    needsUpdateBadge(
      { current_status: "USCITO", data_uscita: "2025-12-06", submitted_at: "2025-01-01" },
      NOW
    ),
    false
  );
});

test("needsUpdateBadge never marks deceased guests for update", () => {
  assert.equal(
    needsUpdateBadge(
      { current_status: "DECEDUTO", data_decesso: "2025-01-01", submitted_at: "2026-05-01" },
      NOW
    ),
    false
  );
});

test("latest follow-up contact wins over older status dates", () => {
  const latest = getLatestGuestUpdateDate({
    current_status: "USCITO",
    data_uscita: "2025-01-01",
    data_ultimo_contatto: "2026-03-01",
  });

  assert.equal(latest?.startsWith("2026-03-01"), true);
  assert.equal(
    needsUpdateBadge(
      { current_status: "USCITO", data_uscita: "2025-01-01", data_ultimo_contatto: "2026-03-01" },
      NOW
    ),
    false
  );
});

test("needsUpdateBadge falls back to entry or submission date when no later event exists", () => {
  assert.equal(needsUpdateBadge({ data_ingresso: "2025-12-04", submitted_at: "2026-06-01" }, NOW), true);
  assert.equal(needsUpdateBadge({ data_ingresso: null, submitted_at: "2026-01-01T00:00:00.000Z" }, NOW), false);
});
