# 94 — Remboursements et motifs

## Ce qui a été fait

La validation calcule le montant pris en charge et le reste à charge à partir du barème de la formule (taux, franchise, actes exclus, plafonds annuels). Un rejet verse zéro. L'assuré voit ses factures. Le gestionnaire et l'administrateur voient toutes les factures sur Remboursements.

Le motif d'une décision se choisit dans une liste. Après validation ou rejet, l'écran affiche une confirmation avec les montants.

## Pourquoi

Le dépôt était scoré, mais la décision ne produisait pas de remboursement, et le motif était un texte libre sans confirmation lisible.

## Fichiers

- `backend/app/services/remboursement.py`
- `backend/app/services/flux.py`
- `backend/app/api/pilotage.py`
- `migrations/sql/020_garanties_remboursement.sql`
- `migrations/versions/020_garanties_remboursement.py`
- `frontend/src/features/alerts/decision.tsx`
- `frontend/src/features/alerts/motifs.ts`
- `frontend/src/app/remboursements/page.tsx`
- `frontend/src/app/factures/[id]/page.tsx`
- `frontend/src/i18n/fr.json`
- `frontend/src/lib/rbac.ts`

## Vérification

`pytest backend/tests/test_remboursement.py backend/tests/test_flux.py backend/tests/test_roles.py`

À l'écran : ouvrir une facture, choisir Valider et un motif dans la liste, enregistrer. Le message confirme la validation et le montant pris en charge. Remboursements, connecté en assuré, ne montre que ses factures.

## Ensuite

Rien.
