import assert from "node:assert/strict";
import test from "node:test";
import { normalizePersonName } from "./name-normalization.ts";

test("normalizes simple uppercase and lowercase person names", () => {
  assert.equal(normalizePersonName("mario"), "Mario");
  assert.equal(normalizePersonName("ROSSI"), "Rossi");
});

test("normalizes multi-part names and surnames", () => {
  assert.equal(normalizePersonName("  MARIA   luisa "), "Maria Luisa");
  assert.equal(normalizePersonName("d'ANGELO-ROSSI"), "D'Angelo-Rossi");
});

test("returns null for empty person names", () => {
  assert.equal(normalizePersonName("   "), null);
  assert.equal(normalizePersonName(null), null);
});
