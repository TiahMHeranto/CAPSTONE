# 43 — Webhook d'upload, extraction, dépôt habituel

## Ce qui a été fait

Le workflow OCR ne reçoit plus un texte déjà lu par l'API. Le déclencheur est le webhook `POST /webhook/ocr`, avec le PDF dans le champ `data`. À la place d'un déclencheur Google Drive : Garde (clef), Extract from File (PDF), Champs, puis `POST /invoices`. C'est le même dépôt que la saisie : validation, score, alerte si le seuil est atteint.

L'écran Factures envoie le fichier à `POST /invoices/extract`, qui transmet le binaire et le jeton. Un PDF d'essai `FAC-OCR-9` a été extrait puis refusé par la validation habituelle : `422` `REFERENCE_INCONNUE` (assuré inconnu). Sans clef, le webhook répond `401`.

## Fichiers

- `n8n/workflows/ocr.json`, `n8n/workflows/ocr.js`, `ops/build_ocr_workflow.py`
- `backend/app/services/ocr.py`, `backend/app/api/invoices.py`
- `frontend/app/(espace)/factures/page.tsx`
- `docs/04-workflow/fiche-ocr.md`

## Vérification

`pytest backend/tests/test_ocr.py` : 8 tests. Le workflow actif est `S42hzUxzWj7nHPBt`.

## Ensuite

Un PDF sans les étiquettes attendues répond `422` `CHAMPS_INCOMPLETS` et n'est pas déposé. Le score reste indisponible tant que `models/v2/model.joblib` manque.
