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

test("guest name and surname are normalized when mapped from Tally", () => {
  const payload = {
    data: {
      submissionId: "sub_5",
      fields: [
        { label: "Nome della persona", value: "  MARIA   luisa " },
        { label: "Cognome", value: "d'ANGELO-ROSSI" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.nome_della_persona, "Maria Luisa");
  assert.equal(mapped.row.cognome, "D'Angelo-Rossi");
});

test("legacy Casa housing answers are mapped to autonomously found housing", () => {
  const payload = {
    data: {
      submissionId: "sub_6",
      fields: [
        { label: "Dove dormiva", value: "Casa" },
        { label: "Dove dorme", value: "Casa" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.dove_dormiva, "Casa trovata autonomamente");
  assert.equal(mapped.row.dove_dorme, "Casa trovata autonomamente");
});

test("legacy Convivenza housing answers are mapped to Sant'Egidio housing", () => {
  const payload = {
    data: {
      submissionId: "sub_7",
      fields: [
        { label: "Dove dormiva", value: "Convivenza" },
        { label: "Dove dorme", value: "Convivenza" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.dove_dormiva, "Convivenza di Sant'Egidio");
  assert.equal(mapped.row.dove_dorme, "Convivenza di Sant'Egidio");
});

test("external criminal sentence entry fields are mapped from Tally labels", () => {
  const payload = {
    data: {
      submissionId: "sub_8",
      fields: [
        {
          label: "Al momento dell'ingresso è in esecuzione penale esterna",
          value: "Sì",
        },
        { label: "Data di inizio esecuzione penale esterna", value: "01/06/2026" },
        { label: "Data di fine esecuzione penale esterna", value: "30/09/2026" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.in_esecuzione_penale_esterna, "Sì");
  assert.equal(mapped.row.esecuzione_penale_esterna_data_inizio, "01/06/2026");
  assert.equal(mapped.row.esecuzione_penale_esterna_data_fine, "30/09/2026");
});

test("free notes are mapped from the Tally Note field", () => {
  const payload = {
    data: {
      submissionId: "sub_9",
      fields: [{ label: "Note", value: "Informazione utile sulla persona" }],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.note_libere, "Informazione utile sulla persona");
});

test("referral source and its free-text detail are mapped from Tally", () => {
  const payload = {
    data: {
      submissionId: "sub_10",
      fields: [
        { label: "Da chi è stata segnalata la persona?", value: "Altro..." },
        { label: "Specificare chi ha segnalato la persona", value: "Associazione locale" },
      ],
    },
  };

  const mapped = mapCaseAlloggioSubmission(payload);
  assert.equal(mapped.row.segnalato_da, "Altro...");
  assert.equal(mapped.row.segnalato_da_altro, "Associazione locale");
});

test("referral detail is discarded when the selected source is not Other", () => {
  const mapped = mapCaseAlloggioSubmission({
    data: {
      submissionId: "sub_11",
      fields: [
        { label: "Da chi è stata segnalata la persona?", value: "Servizi sociali ASL" },
        { label: "Specificare chi ha segnalato la persona", value: "Dato non pertinente" },
      ],
    },
  });

  assert.equal(mapped.row.segnalato_da, "Servizi sociali ASL");
  assert.equal(mapped.row.segnalato_da_altro, null);
});

test("legacy voluntary departure is normalized to the renamed exit cause", () => {
  const mapped = mapCaseAlloggioSubmission({
    data: {
      submissionId: "sub_12",
      fields: [{ label: "Causa uscita", value: "Allontanamento volontario" }],
    },
  });

  assert.equal(
    mapped.row.causa_uscita,
    "Allontanamento volontario - destinazione ignota"
  );
});
