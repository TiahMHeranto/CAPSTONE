const ligneRe = /^([A-Za-z0-9._-]{1,64})\s*[|;,]\s*(ACTE|MEDICAMENT)\s*[|;,]\s*(\d+(?:[.,]\d+)?)\s*[|;,]\s*(\d[\d .]*)\s*[|;,]\s*(\d[\d .]*)\s*$/i;

function entier(valeur) {
  const propre = String(valeur).trim().replace(/\u00a0/g, ' ').replace(/\s*(mga|ar)$/i, '').trim();
  if (/^\d{1,3}(?:[ .]\d{3})+$/.test(propre)) return Number(propre.replace(/[ .]/g, ''));
  if (/^\d+$/.test(propre)) return Number(propre);
  return null;
}

function norm(valeur) {
  return String(valeur || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function jeton(valeur) {
  const propre = String(valeur || '').trim().replace(/[\\/]/g, '-').replace(/\s+/g, '');
  if (/^[A-Za-z0-9._-]{1,64}$/.test(propre)) return propre;
  return null;
}

function lignesTableau(texte) {
  const brut = String(texte || '').split(/\r?\n/).map((ligne) => ligne.trim()).filter(Boolean);
  const lignes = [];
  const codeRe = /^[A-Z]{2,12}-[A-Z0-9]{2,16}$/;
  for (let i = 0; i < brut.length; i += 1) {
    if (!codeRe.test(brut[i]) || norm(brut[i]) === 'total') continue;
    let curseur = i + 1;
    if (curseur < brut.length && !codeRe.test(brut[curseur]) && entier(brut[curseur]) === null) curseur += 1;
    const quantite = entier(brut[curseur]);
    const prix = entier(brut[curseur + 1]);
    const montant = entier(brut[curseur + 2]);
    if (quantite === null || prix === null || montant === null) continue;
    lignes.push({
      code: brut[i],
      type_ligne: brut[i].startsWith('MED') ? 'MEDICAMENT' : 'ACTE',
      quantite,
      prix_unitaire: prix,
      montant
    });
    i = curseur + 2;
  }
  return lignes;
}

function champSuivant(brut, etiquettes) {
  for (let i = 0; i < brut.length - 1; i += 1) {
    if (etiquettes.includes(norm(brut[i]))) return brut[i + 1];
  }
  return null;
}

function completer(invoice, extrait) {
  const texte = String((extrait && extrait.texte) || '');
  const brut = texte.split(/\r?\n/).map((ligne) => ligne.trim()).filter(Boolean);
  const numero = texte.match(/FACTURE\s+N.?\s*([A-Za-z0-9][A-Za-z0-9./_-]*)/i);
  const fichier = String((extrait && extrait.filename) || '').replace(/\.pdf$/i, '');
  invoice.facture_id = jeton(numero && numero[1]) || jeton(invoice.facture_id) || jeton(fichier);
  const type = champSuivant(brut, ['type']);
  if (type && /^[A-Za-z0-9 ._-]{1,40}$/.test(type)) invoice.type_facture = type.replace(/\s+/g, '_').toUpperCase();
  const soin = champSuivant(brut, ['date des soins', 'date de soin']);
  if (/^\d{4}-\d{2}-\d{2}$/.test(soin || '')) invoice.date_soin = soin;
  const dateFacture = champSuivant(brut, ['date de facture']);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFacture || '')) invoice.date_facture = dateFacture;
  invoice.assure_id = jeton(champSuivant(brut, ['n assure'])) || jeton(invoice.assure_id);
  invoice.ordonnance_id = jeton(champSuivant(brut, ['ordonnance'])) || jeton(invoice.ordonnance_id);
  const tableau = lignesTableau(texte);
  const pipes = lignesDuTexte([{ texte }]);
  if (tableau.length) invoice.lignes = tableau;
  else if (!Array.isArray(invoice.lignes) || !invoice.lignes.length) invoice.lignes = pipes;
  const total = entier(champSuivant(brut, ['total']));
  invoice.montant_total = total !== null ? total : entier(invoice.montant_total);
  if (invoice.montant_total === null && invoice.lignes.length) {
    invoice.montant_total = invoice.lignes.reduce((somme, ligne) => somme + Number(ligne.montant), 0);
  }
}

function lignesDuTexte(extraits) {
  const lignes = [];
  for (const extrait of extraits || []) {
    for (const brute of String(extrait.texte || '').split(/\r?\n/)) {
      const morceau = brute.trim().match(ligneRe);
      if (!morceau) continue;
      const prix = entier(morceau[4]);
      const montant = entier(morceau[5]);
      if (prix === null || montant === null) continue;
      lignes.push({
        code: morceau[1],
        type_ligne: morceau[2].toUpperCase(),
        quantite: Number(morceau[3].replace(',', '.')),
        prix_unitaire: prix,
        montant
      });
    }
  }
  return lignes;
}

const items = $input.all();
const results = [];

for (const item of items) {
  if (item.json.code === 'MODELE_INDISPONIBLE') {
    results.push({ json: item.json });
    continue;
  }
  const secours = lignesDuTexte(item.json.extraits);
  const raw = item.json.raw ?? item.json.message?.content ?? item.json.output ?? item.json.text ?? '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    const debut = cleaned.indexOf('{');
    const fin = cleaned.lastIndexOf('}');
    try {
      parsed = JSON.parse(cleaned.slice(debut, fin + 1));
    } catch (encore) {
      results.push({ json: { error: 'JSON invalide renvoye par le modele', raw: cleaned.slice(0, 500) } });
      continue;
    }
  }
  let invoices;
  if (Array.isArray(parsed)) invoices = parsed;
  else if (Array.isArray(parsed.invoices)) invoices = parsed.invoices;
  else invoices = [parsed];
  for (const invoice of invoices) {
    const recues = Array.isArray(invoice.lignes) ? invoice.lignes : [];
    const valides = recues.filter((ligne) => {
      return ligne && jeton(ligne.code) && entier(ligne.prix_unitaire) !== null && entier(ligne.montant) !== null;
    });
    invoice.lignes = valides;
    const index = Number.isInteger(invoice.index) ? invoice.index : 0;
    completer(invoice, (item.json.extraits || [])[index] || (item.json.extraits || [])[0]);
    if (!invoice.lignes.length) invoice.lignes = secours;
    results.push({ json: invoice });
  }
}

return results.length ? results : [{ json: { error: 'aucune facture' } }];
