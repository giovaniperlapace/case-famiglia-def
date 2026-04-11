import assert from "node:assert/strict";
import test from "node:test";
import { mapCaseAlloggioSubmission } from "./case-alloggio.ts";

test("owner_email uses only compiler contact when it is a valid email", () => {
  const payload = {
    data: {
      submissionId: "sub_1",
      fields: [
        { label: "Contatto compilatore", value: "operatore@example.org" },
        { label: "Contatto della persona", value: "+39 333 123 4567" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.ownerEmail, "operatore@example.org");
  assert.equal(mapped.row.contatto_della_persona, "+39 333 123 4567");
});

test("owner_email stays null when only the guest contact is present", () => {
  const payload = {
    data: {
      submissionId: "sub_2",
      fields: [{ label: "Contatto della persona", value: "+39 333 123 4567" }],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.ownerEmail, null);
  assert.equal(mapped.row.contatto_della_persona, "+39 333 123 4567");
});

test("owner_email stays null when compiler contact is not an email", () => {
  const payload = {
    data: {
      submissionId: "sub_3",
      fields: [{ label: "Contatto compilatore", value: "+39 333 123 4567" }],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.ownerEmail, null);
});

test("mapped nationality is normalized to the canonical option list", () => {
  const payload = {
    data: {
      submissionId: "sub_4",
      fields: [{ label: "Nazionalità", value: "ITALIA" }],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.nazionalita, "ITALIA");
});
