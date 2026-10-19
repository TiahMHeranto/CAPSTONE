const files = Array.isArray($json.files) ? $json.files : [];
const utiles = files.filter((fichier) => String(fichier.texte || '').trim());
if (!utiles.length) {
  return [{ json: { ok: false, code: 'PDF_SANS_TEXTE', stop: true } }];
}

const extraits = utiles.map((fichier) => ({
  index: fichier.index,
  filename: fichier.filename,
  texte: String(fichier.texte).slice(0, 20000)
}));
const consigne = [
  'Tu recois le texte de factures de tiers payant, deja lu par OCR.',
  'Reponds UNIQUEMENT avec un JSON, sans Markdown.',
  'Forme attendue : {"invoices":[{"index":0,"filename":"","facture_id":null,',
  '"type_facture":null,"date_soin":null,"date_facture":null,"montant_total":null,',
  '"devise":"MGA","prestataire_id":null,"assure_id":null,"contrat_id":null,',
  '"ordonnance_id":null,"lignes":[{"code":null,"type_ligne":"ACTE","quantite":1,',
  '"prix_unitaire":null,"montant":null}]}]}',
  'Un objet par facture, dans le meme ordre. Les dates sont YYYY-MM-DD.',
  'type_ligne vaut ACTE ou MEDICAMENT. Les montants sont des entiers, sans espace.',
  'Chaque ligne du texte qui contient un code, ACTE ou MEDICAMENT, une quantite et deux montants va dans lignes.',
  'N invente pas un identifiant absent du texte.',
  'N extrais ni nom, ni adresse, ni telephone, ni e-mail, ni CIN.',
  'Textes :',
  JSON.stringify(extraits)
].join('\n');

return [{
  json: {
    ok: true,
    stop: false,
    moteur: utiles[0].moteur || 'pypdf',
    extraits,
    requete: {
      contents: [{ role: 'user', parts: [{ text: consigne }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'minimal' }
      }
    }
  }
}];
