import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedPovertyCauses,
  hasUnsupportedPovertyCauses,
} from "./profile-edit-values.ts";

test("legacy free-text poverty causes do not hide allowed selections", () => {
  const value = "è stato licenziato, Alcolismo";

  assert.deepEqual(getAllowedPovertyCauses(value), ["Alcolismo"]);
  assert.equal(hasUnsupportedPovertyCauses(value), true);
});

test("poverty causes are normalized and ordered by the canonical options", () => {
  const value = "alcolismo, Sociale, Alcolismo";

  assert.deepEqual(getAllowedPovertyCauses(value), ["Sociale", "Alcolismo"]);
  assert.equal(hasUnsupportedPovertyCauses(value), false);
});
