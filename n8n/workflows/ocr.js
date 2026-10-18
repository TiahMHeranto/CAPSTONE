const source = $('Reception').first().json;
const entetes = source.headers || {};
const clef = entetes['x-ocr-key'] || '';
if (!clef || clef !== ($env.ADMIN_API_KEY || '')) {
  return [{ json: { ok: false, code: 'CLEF_REFUSEE', motif: 'clef absente', complet: false, champs_manquants: [], facture: {} } }];
}
const enveloppe = source.body && source.body.texte !== undefined ? source.body : source;
const texte = String(enveloppe.texte || '').slice(0, 20000);

function norm(valeur) {
  return valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function dateIso(valeur) {
  const propre = valeur.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(propre)) return propre;
  const morceau = propre.match(/^(\d{2})[\/. -](\d{2})[\/. -](\d{4})$/);
  if (morceau) return morceau[3] + '-' + morceau[2] + '-' + morceau[1];
  return null;
}

function entier(valeur) {
  const propre = valeur.trim().replace(/\u00a0/g, ' ').replace(/\s*(mga|ar)$/i, '').trim();
  if (/^\d{1,3}(?:[ .]\d{3})+$/.test(propre)) return Number(propre.replace(/[ .]/g, ''));
  if (/^\d+$/.test(propre)) return Number(propre);
  return null;
}

const libelles = {
  identifiant: 'facture_id',
  numero: 'facture_id',
  'numero facture': 'facture_id',
  'n facture': 'facture_id',
  facture: 'facture_id',
  'facture id': 'facture_id',
  type: 'type_facture',
  'type facture': 'type_facture',
  'type de facture': 'type_facture',
  'date de soin': 'date_soin',
  'date soin': 'date_soin',
  'date des soins': 'date_soin',
  'date de facture': 'date_facture',
  'date facture': 'date_facture',
  'date de reception': 'date_reception',
  'montant total': 'montant_total',
  montant: 'montant_total',
  total: 'montant_total',
  devise: 'devise',
  prestataire: 'prestataire_id',
  'prestataire id': 'prestataire_id',
  assure: 'assure_id',
  'assure id': 'assure_id',
  contrat: 'contrat_id',
  'contrat id': 'contrat_id',
  ordonnance: 'ordonnance_id',
  'ordonnance id': 'ordonnance_id',
  'mode de reglement': 'mode_reglement'
};

const trouves = {};
const lignes = [];
const ligneRe = /^([A-Za-z0-9._-]{1,64})\s*[|;,]\s*(ACTE|MEDICAMENT)\s*[|;,]\s*(\d+(?:[.,]\d+)?)\s*[|;,]\s*(\d[\d .]*)\s*[|;,]\s*(\d[\d .]*)\s*$/i;
for (const brute of texte.split(/\r?\n/)) {
  const ligne = brute.trim();
  if (!ligne) continue;
  const morceau = ligne.match(ligneRe);
  if (morceau) {
    const prix = entier(morceau[4]);
    const montant = entier(morceau[5]);
    const quantite = Number(morceau[3].replace(',', '.'));
    if (prix === null || montant === null || !Number.isFinite(quantite)) continue;
    lignes.push({
      code: morceau[1],
      type_ligne: morceau[2].toUpperCase(),
      quantite,
      prix_unitaire: prix,
      montant
    });
    continue;
  }
  const separe = ligne.match(/^(.+?)\s*[:=]\s*(.+)$/) || ligne.match(/^(.+?)\s+-\s+(.+)$/);
  if (!separe) continue;
  const champ = libelles[norm(separe[1])];
  if (!champ || Object.prototype.hasOwnProperty.call(trouves, champ)) continue;
  const valeur = separe[2].trim().replace(/[.,;]+$/, '');
  if (champ === 'date_soin' || champ === 'date_facture' || champ === 'date_reception') {
    const iso = dateIso(valeur);
    if (iso) trouves[champ] = iso;
    continue;
  }
  if (champ === 'montant_total') {
    const nombre = entier(valeur);
    if (nombre !== null) trouves[champ] = nombre;
    continue;
  }
  if (champ === 'devise') {
    if (/^[A-Za-z]{3}$/.test(valeur)) trouves.devise = valeur.toUpperCase();
    continue;
  }
  if (champ === 'type_facture' && /^[A-Za-z0-9 ._-]{1,40}$/.test(valeur)) {
    trouves[champ] = valeur.replace(/\s+/g, '_').toUpperCase();
    continue;
  }
  if (/^[A-Za-z0-9._-]{1,64}$/.test(valeur)) trouves[champ] = valeur;
}
if (trouves.montant_total === undefined && lignes.length) {
  trouves.montant_total = lignes.reduce((somme, ligne) => somme + ligne.montant, 0);
}
const requis = ['facture_id', 'type_facture', 'date_soin', 'date_facture', 'montant_total'];
const manquants = requis.filter((champ) => trouves[champ] === undefined);
if (!lignes.length) manquants.push('lignes');
return [{
  json: {
    ok: true,
    complet: manquants.length === 0,
    champs_manquants: manquants,
    facture: Object.assign({ lignes }, trouves)
  }
}];
