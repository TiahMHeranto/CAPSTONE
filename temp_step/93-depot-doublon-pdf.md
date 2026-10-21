# 93 — Message de doublon au dépôt

## Ce qui a été fait

Le dépôt d'un PDF déjà connu renvoyait 409 `DOUBLON`. L'écran affichait « Cette action n'a pas abouti. Réessayez. » parce que ce code n'avait pas de traduction.

Le code `DOUBLON` affiche maintenant « Cette facture est déjà enregistrée. » Le dépôt n'est pas retenté sous un autre identifiant.

## Pourquoi

L'identifiant lu sur le PDF est déjà dans `app.factures`. L'écran doit dire que la facture est déjà enregistrée.

## Fichiers

- `frontend/src/i18n/fr.json`
- `frontend/src/features/invoices/formulaire.tsx`
- `frontend/.dockerignore`

## Vérification

Relire `FAC-00050732.pdf` puis déposer. Le message affiché est « Cette facture est déjà enregistrée. »

## Ensuite

Rien.
