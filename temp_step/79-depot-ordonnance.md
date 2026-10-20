# Dépôt glisser-déposer

## Fait

La page Factures a deux zones : facture et ordonnance. Le fichier déposé reste en attente. Le bouton Scanner lance la lecture, puis les champs se remplissent. Rien n'est enregistré avant confirmation. L'ordonnance confirmée par un professionnel est créée puis reportée sur la facture. Un gestionnaire reporte seulement la référence lue.

## Pourquoi

Le dépôt était un champ fichier. Une facture peut maintenant être accompagnée de son ordonnance, avec la même relecture humaine.

## Fichiers

- `frontend/src/features/invoices/depot.tsx`
- `frontend/src/features/invoices/formulaire.tsx`
- `frontend/src/features/invoices/api.ts`
- `frontend/src/app/factures/page.tsx`
- `frontend/src/i18n/fr.json`
- `backend/app/services/ocr.py`
- `backend/app/api/invoices.py`
- `backend/tests/test_ocr.py`

## Vérification

`pytest tests/test_ocr.py::test_analyse_une_ordonnance`. Ouvrir Factures : les deux zones acceptent un PDF, le formulaire se remplit, la confirmation reste manuelle.

## Ensuite

Rien.
