# Explicabilité après le dépôt

## Fait

Après « Déposer la facture », l'écran reste sur le formulaire et affiche le score, la classe, la version du modèle et les contributions qui expliquent le score. Un lien ouvre le dossier.

## Pourquoi

La réponse du dépôt contenait déjà ces contributions. L'écran les ignorait et changeait de page avant qu'elles soient visibles.

## Fichiers

- `frontend/src/features/invoices/formulaire.tsx`
- `frontend/src/i18n/fr.json`
- `frontend/src/app/factures/[id]/page.tsx`

## Vérification

Connecté en gestionnaire, le dépôt `FAC-UI-EXPL-1` affiche « Résultat du dépôt », « Modèle v2 » et huit contributions, dont le montant total et le type de facture.

## Ensuite

Rien.
