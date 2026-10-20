const factures = $input.all().map((item) => item.json);
const modele = factures.find((facture) => facture.code === 'MODELE_INDISPONIBLE');
if (modele) {
  return [{ json: { ok: false, code: 'MODELE_INDISPONIBLE', stop: true, factures: [] } }];
}
const invalide = factures.some((facture) => facture.error);
if (invalide) {
  return [{ json: { ok: false, code: 'EXTRACTION_ILLISIBLE', stop: true, factures: [] } }];
}
return [{ json: { ok: true, moteur: 'api', factures } }];
