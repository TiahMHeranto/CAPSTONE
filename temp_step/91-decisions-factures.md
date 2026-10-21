# 91 — Liste des factures et décision sur une alerte

## Ce qui a été fait

Le gestionnaire et l'administrateur voient maintenant la liste complète des factures (identifiant, date, type, montant, statut, score, niveau d'alerte, décision). La file d'alertes reprend les mêmes colonnes pour les factures encore sans décision.

Sur le détail d'une alerte (et de toute facture, pour ces deux rôles), le dossier affiche les champs, les lignes, les anomalies de prescription et le score expliqué. Le formulaire propose **Valider quand même**, **Rejeter** et **Demander un complément**, avec un motif d'au moins 10 caractères. L'administrateur y a accès, comme le gestionnaire. La décision est déjà enregistrée par `POST /invoices/{id}/decisions`.

## Pourquoi

Une alerte n'est pas un refus automatique. Il fallait voir le dossier entier, son statut et son niveau, puis pouvoir valider malgré le score ou rejeter.

## Fichiers touchés

- `backend/app/services/flux.py` : type de facture dans la liste ; statut, montant, date et type dans la file d'alertes. Les montants des lignes sont convertis en nombre, sinon le détail répondait 500.
- `backend/tests/test_flux.py` : le faux de base renvoie ces colonnes.
- `frontend/src/app/factures/page.tsx`, `frontend/src/app/factures/[id]/page.tsx`, `frontend/src/app/alertes/page.tsx`
- `frontend/src/features/alerts/decision.tsx`
- `frontend/src/i18n/fr.json`

## Comment vérifier

Connexion gestionnaire ou administrateur. Écran Factures : tableau avec statut et niveau. Écran Alertes : ouvrir une ligne, puis Valider quand même ou Rejeter. Le statut de la liste passe à Validée ou Rejetée, et la facture sort de la file.

`pytest tests/test_flux.py::test_liste_complete_des_factures tests/test_flux.py::test_file_alerte_puis_decision` : 2 passés.

## Ce qui reste

Les images Docker en cours d'exécution ne prennent le code qu'après reconstruction de `api` et `frontend`.
