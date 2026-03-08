import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStatusUpdatePayload,
  validateStatusUpdateForm,
  type StatusUpdateFormValues,
} from "./status-update-form-logic.ts";

function baseForm(): StatusUpdateFormValues {
  return {
    data_ultimo_contatto: "2026-03-01",
    dove_dorme: "Strada",
    data_decesso_followup: "",
    causa_decesso_followup: "",
    ha_residenza: "No",
    ha_un_reddito: "No",
    al_momento_dell_ingresso_ha_i_seguenti_documenti: "",
    tipo_di_reddito_followup: "",
    tipo_di_lavoro_followup: "",
    data_uscita: "",
    causa_uscita: "",
    data_decesso: "",
    causa_decesso: "",
    al_momento_dell_uscita_ha_i_seguenti_documenti: "",
    al_momento_dell_uscita_ha_residenza: "No",
    al_momento_dell_uscita_ha_un_reddito: "No",
    tipo_di_reddito_uscita: "",
    tipo_di_lavoro_uscita: "",
    siamo_ancora_in_contatto: "",
    chi_e_in_contatto: "",
    ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: "",
    ha_gia_fatto_domanda_di_casa_popolare: "",
    data_domanda_casa_popolare: "",
    data_rientro: "",
    rientro_stessa_struttura: "",
    struttura_rientro: "",
    dipendenze: "",
    patologie: "",
    patologia_psichiatrica: "",
    note: "",
  };
}

test("followup validates multi-reddito parity with work-type dependency", () => {
  const missingIncomeType = {
    ...baseForm(),
    ha_un_reddito: "Sì",
    tipo_di_reddito_followup: "",
  };
  assert.equal(
    validateStatusUpdateForm("followup", missingIncomeType),
    "Se Ha reddito è Sì, seleziona almeno un tipo di reddito."
  );

  const missingWorkType = {
    ...baseForm(),
    ha_un_reddito: "Sì",
    tipo_di_reddito_followup: "Reddito da lavoro",
    tipo_di_lavoro_followup: "",
  };
  assert.equal(
    validateStatusUpdateForm("followup", missingWorkType),
    "Tipo di lavoro non valido."
  );

  const valid = {
    ...baseForm(),
    ha_un_reddito: "Sì",
    tipo_di_reddito_followup: "Pensione, Reddito da lavoro",
    tipo_di_lavoro_followup: "Lavoro subordinato",
  };
  assert.equal(validateStatusUpdateForm("followup", valid), null);
});

test("exclusive 'Nessuna' logic matches edit behavior for dipendenze/patologie", () => {
  const invalidDependencies = {
    ...baseForm(),
    dipendenze: "Nessuna, Alcolismo",
  };
  assert.equal(validateStatusUpdateForm("followup", invalidDependencies), "Dipendenze non valido.");

  const invalidPathologies = {
    ...baseForm(),
    patologie: "Nessuna, Neoplasie",
  };
  assert.equal(validateStatusUpdateForm("followup", invalidPathologies), "Patologie non valido.");
});

test("payload builder preserves historical update semantics by update type", () => {
  const followupDeathForm = {
    ...baseForm(),
    dove_dorme: "Deceduto",
    data_decesso_followup: "2026-03-02",
    causa_decesso_followup: "Neoplasia",
    ha_un_reddito: "Sì",
    tipo_di_reddito_followup: "Pensione, Reddito da lavoro",
    tipo_di_lavoro_followup: "Lavoro subordinato",
    dipendenze: "Alcolismo, Sostanze",
    patologie: "Neoplasie",
  };

  const followupPayload = buildStatusUpdatePayload("followup", followupDeathForm, "San Calisto");
  assert.equal(followupPayload.data_decesso_followup, "2026-03-02");
  assert.equal(followupPayload.causa_decesso_followup, "Neoplasia");
  assert.equal(followupPayload.causa_decesso, "Neoplasia");
  assert.equal(followupPayload.tipo_di_reddito_followup, "Pensione, Reddito da lavoro");
  assert.equal(followupPayload.tipo_di_lavoro_followup, "Lavoro subordinato");
  assert.equal(followupPayload.dipendenze, "Alcolismo, Sostanze");

  const exitDeathForm = {
    ...baseForm(),
    data_uscita: "2026-03-03",
    causa_uscita: "Decesso",
    data_decesso: "2026-03-03",
    causa_decesso: "Neoplasia",
    al_momento_dell_uscita_ha_un_reddito: "Sì",
    tipo_di_reddito_uscita: "Pensione, Invalidità",
  };
  const exitPayload = buildStatusUpdatePayload("exit", exitDeathForm, "San Calisto");
  assert.equal(exitPayload.tipo_di_reddito_uscita, "Pensione, Invalidità");
  assert.equal(exitPayload.data_decesso, "2026-03-03");
  assert.equal(exitPayload.causa_decesso, "Neoplasia");

  const reentryForm = {
    ...baseForm(),
    data_rientro: "2026-03-04",
    rientro_stessa_struttura: "Sì",
    struttura_rientro: "Buon Pastore",
  };
  const reentryPayload = buildStatusUpdatePayload("reentry", reentryForm, "San Calisto");
  assert.equal(reentryPayload.data_rientro, "2026-03-04");
  assert.equal(reentryPayload.rientro_stessa_struttura, "Sì");
  assert.equal(reentryPayload.struttura_rientro, "San Calisto");
});

test("followup validates conditional contact/housing fields and emits them in payload", () => {
  const missingContactName = {
    ...baseForm(),
    siamo_ancora_in_contatto: "Sì",
  };
  assert.equal(
    validateStatusUpdateForm("followup", missingContactName),
    "Se siamo ancora in contatto, indica chi è in contatto."
  );

  const missingHouseDate = {
    ...baseForm(),
    ha_gia_fatto_domanda_di_casa_popolare: "Sì",
  };
  assert.equal(validateStatusUpdateForm("followup", missingHouseDate), "In data obbligatoria.");

  const valid = {
    ...baseForm(),
    al_momento_dell_ingresso_ha_i_seguenti_documenti: "Carta d’identità, Codice fiscale",
    al_momento_dell_uscita_ha_i_seguenti_documenti: "Nessuno",
    siamo_ancora_in_contatto: "Sì",
    chi_e_in_contatto: "Volontario Centro X",
    ha_i_requisiti_per_fare_la_domanda_di_casa_popolare: "Sì",
    ha_gia_fatto_domanda_di_casa_popolare: "Sì",
    data_domanda_casa_popolare: "2026-02-15",
  };
  assert.equal(validateStatusUpdateForm("followup", valid), null);

  const payload = buildStatusUpdatePayload("followup", valid, "Villetta");
  assert.equal(
    payload.al_momento_dell_ingresso_ha_i_seguenti_documenti,
    "Carta d’identità, Codice fiscale"
  );
  assert.equal(payload.siamo_ancora_in_contatto, "Sì");
  assert.equal(payload.chi_e_in_contatto, "Volontario Centro X");
  assert.equal(payload.ha_gia_fatto_domanda_di_casa_popolare, "Sì");
  assert.equal(payload.data_domanda_casa_popolare, "2026-02-15");
});
