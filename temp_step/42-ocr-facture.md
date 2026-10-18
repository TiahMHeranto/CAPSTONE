# 42 — Deux entrées de facture : saisie et PDF

## Ce qui a été fait

Une facture peut être saisie dans le formulaire, ou lue depuis un PDF. La lecture ne dépose rien : elle remplit les champs. Le dépôt reste `POST /invoices`.

`POST /invoices/extract` (prestataire, gestionnaire, administrateur) reçoit un PDF d'au plus 8 Mo. Le texte intégré est lu avec pypdf. Si la page n'a pas de texte, Tesseract (français et anglais, paquets Debian) lit l'image via pypdfium2. Pas de service payant. Le PDF n'est pas enregistré.

Le texte part au workflow n8n `PrediCare OCR facture` (`POST /webhook/ocr`, en-tête `X-Ocr-Key`). Le nœud Extraire reprend les étiquettes (`Identifiant`, `Type`, `Date de soin`, `Date de facture`, `Montant total`, `Assure`, `Prestataire`, `Ordonnance`) et les lignes `code | ACTE ou MEDICAMENT | quantité | prix | montant`. La réponse porte `complet`, `champs_manquants` et `facture`. L'API ajoute `canal_reception: pdf` et `moteur` (`pypdf` ou `tesseract`). La saisie envoie `canal_reception: saisie`.

Un fichier qui n'est pas un PDF : `422` `FICHIER_REFUSE`. Un PDF sans ligne lisible : `422` `PDF_SANS_TEXTE`. n8n absent : `503` `WORKFLOW_INDISPONIBLE`.

## Pourquoi

Le gestionnaire et le professionnel doivent pouvoir déposer une facture déjà imprimée, sans ressaisir chaque champ, tout en relisant le résultat avant le score.

## Fichiers

- `n8n/workflows/ocr.json`, `n8n/workflows/ocr.js`
- `docs/04-workflow/fiche-ocr.md`
- `backend/app/services/ocr.py`, `backend/app/api/invoices.py`
- `backend/tests/test_ocr.py`
- `frontend/app/(espace)/factures/page.tsx`, `frontend/lib/api.ts`
- `backend/requirements.txt`, `backend/Dockerfile` (Tesseract et `python-multipart`)

## Vérification

`pytest backend/tests/test_ocr.py` : 8 tests. Sur la pile : le workflow répond `complet` pour `FAC-OCR-1`, et `POST /invoices/extract` répond `moteur=pypdf`. Le workflow est actif (`S42hzUxzWj7nHPBt`). Tesseract 5.5 est installé dans le conteneur API en cours. Une image reconstruite le reprend via le Dockerfile.

## Ensuite

Un PDF doit porter les étiquettes ci-dessus, ou le formulaire reste à compléter. Une page seulement scannée dépend de Tesseract, déjà dans l'image.
