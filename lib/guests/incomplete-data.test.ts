import assert from "node:assert/strict";
import test from "node:test";
import { getIncompleteDataFlags, hasIncompleteData } from "./incomplete-data.ts";

test("missing birth date is incomplete for every guest status", () => {
  assert.equal(
    getIncompleteDataFlags({ current_status: "IN_ACCOGLIENZA", data_di_nascita: "" })
      .missingBirthDate,
    true
  );
});

test("exit date is required only for exited guests", () => {
  assert.equal(hasIncompleteData({ current_status: "USCITO", data_di_nascita: "1980-01-01" }), true);
  assert.equal(
    hasIncompleteData({
      current_status: "IN_ACCOGLIENZA",
      data_di_nascita: "1980-01-01",
      data_uscita: "",
    }),
    false
  );
});

test("death date is required only for deceased guests", () => {
  assert.equal(
    hasIncompleteData({ current_status: "DECEDUTO", data_di_nascita: "1980-01-01" }),
    true
  );
  assert.equal(
    hasIncompleteData({
      current_status: "USCITO",
      data_di_nascita: "1980-01-01",
      data_uscita: "2026-01-01",
      data_decesso: "",
    }),
    false
  );
});
