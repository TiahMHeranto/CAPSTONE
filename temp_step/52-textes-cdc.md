# Textes alignés sur le CDC

## Fait

Les libellés visibles reprennent le vocabulaire du cahier des charges PrediCare TPA : contrôle des factures, anomalies de remboursement, quatre rôles, tableau de bord (volumes, montants économisés, taux de détection), garanties du contrat.

## Pourquoi

L'écran de connexion affichait « Plateforme de soins de santé », le titre du modèle visuel, pas le produit.

## Fichiers

- `frontend/src/i18n/fr.json`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/pilotage/page.tsx`
- `frontend/src/app/garanties/page.tsx`

## Vérification

Sur `/login`, le titre est « PrediCare TPA », suivi de la mission sur les anomalies de facturation et les remboursements, puis les quatre rôles.

## Ensuite

Rien.
