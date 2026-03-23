import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNationality } from "./nationalities.ts";

test("normalizeNationality canonicalizes casing and accents from imported values", () => {
  assert.equal(normalizeNationality("ITALIA"), "Italia");
  assert.equal(normalizeNationality(" peru "), "Perù");
  assert.equal(normalizeNationality("Sao Tome e Principe"), "Sao Tomè e Principe");
});

test("normalizeNationality returns null for unsupported values", () => {
  assert.equal(normalizeNationality("Atlantide"), null);
});
