# Saisie manuelle des champs facture

## Fait

Sur l'écran Factures, assuré, ordonnance, contrat, prestataire, code et type de ligne sont des champs saisis à la main. Chaque ligne renvoyée par l'OCR (code, type, quantité, prix, montant) s'affiche et reste modifiable. Le montant total ne réécrit plus les lignes.

## Pourquoi

Les listes ne montraient que les valeurs déjà connues du compte. Un identifiant lu sur le PDF, absent de la liste, disparaissait. La saisie conserve tout ce que le workflow renvoie.

## Fichiers

- `frontend/app/(espace)/factures/page.tsx`

## Vérification

Connecté en gestionnaire, `http://localhost:3000/factures` : le formulaire ne contient plus de liste déroulante. Assuré, ordonnance, contrat, prestataire, code et type de ligne sont des zones de texte. Déposer et scorer reste inactif tant qu'aucune ligne n'a de code.

## Ensuite

Rien côté API ni n8n. Le dépôt d'un PDF réel passe toujours par Lire le PDF, puis Déposer et scorer.
