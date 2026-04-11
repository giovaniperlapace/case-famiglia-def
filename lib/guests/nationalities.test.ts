import assert from "node:assert/strict";
import test from "node:test";
import { NATIONALITY_OPTIONS, normalizeNationality } from "./nationalities.ts";

test("normalizeNationality canonicalizes casing and accents from imported values", () => {
  assert.equal(normalizeNationality("ITALIA"), "ITALIA");
  assert.equal(normalizeNationality(" peru "), "PERU’");
  assert.equal(normalizeNationality("Sao Tome e Principe"), "SAO TOME’ E PRINCIPE");
});

test("normalizeNationality supports legacy spellings that map to the canonical list", () => {
  assert.equal(normalizeNationality("Russia"), "FEDERAZIONE RUSSA");
  assert.equal(normalizeNationality("Kenia"), "KENYA");
  assert.equal(normalizeNationality("Myanmar (Birmania)"), "MYANMAR");
});

test("normalizeNationality returns null for unsupported values", () => {
  assert.equal(normalizeNationality("Atlantide"), null);
});

test("nationality options use the full CSV-backed list", () => {
  assert.equal(NATIONALITY_OPTIONS.length, 197);
  assert.equal(NATIONALITY_OPTIONS[0], "ITALIA");
  assert.ok(NATIONALITY_OPTIONS.includes("AUSTRIA"));
  assert.ok(NATIONALITY_OPTIONS.includes("PAESI BASSI"));
  assert.ok(NATIONALITY_OPTIONS.includes("UNGHERIA"));
});
